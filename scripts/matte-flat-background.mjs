import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

const [, , input, output, widthArg = '96', heightArg = '128', toleranceArg = '54'] = process.argv;
if (!input || !output) {
  throw new Error('Usage: node scripts/matte-flat-background.mjs <input> <output> [width] [height] [tolerance]');
}

const targetW = Number(widthArg);
const targetH = Number(heightArg);
const tolerance = Number(toleranceArg);
if (!Number.isInteger(targetW) || !Number.isInteger(targetH) || !Number.isInteger(tolerance)) {
  throw new Error('Width, height, and tolerance must be integers.');
}

await mkdir(dirname(output), { recursive: true });
const sourceDataUrl = `data:image/png;base64,${(await readFile(input)).toString('base64')}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(async ({ sourceDataUrl, targetW, targetH, tolerance }) => {
    const image = new Image();
    image.src = sourceDataUrl;
    await image.decode();

    const sourceAspect = image.naturalWidth / image.naturalHeight;
    const targetAspect = targetW / targetH;
    const sourceW = sourceAspect > targetAspect ? Math.round(image.naturalHeight * targetAspect) : image.naturalWidth;
    const sourceH = sourceAspect > targetAspect ? image.naturalHeight : Math.round(image.naturalWidth / targetAspect);
    const sourceX = Math.round((image.naturalWidth - sourceW) / 2);
    const sourceY = Math.round((image.naturalHeight - sourceH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create canvas context.');
    context.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, targetW, targetH);

    const pixels = context.getImageData(0, 0, targetW, targetH);
    const cornerSamples = [
      [2, 2],
      [targetW - 3, 2],
      [2, targetH - 3],
      [targetW - 3, targetH - 3],
    ];
    const bg = cornerSamples.reduce((sum, [x, y]) => {
      const index = (y * targetW + x) * 4;
      return {
        r: sum.r + pixels.data[index] / cornerSamples.length,
        g: sum.g + pixels.data[index + 1] / cornerSamples.length,
        b: sum.b + pixels.data[index + 2] / cornerSamples.length,
      };
    }, { r: 0, g: 0, b: 0 });
    const matte = new Uint8Array(targetW * targetH);
    const edgeMatte = new Uint8Array(targetW * targetH);
    const queue = [];

    for (let pixel = 0; pixel < matte.length; pixel += 1) {
      const index = pixel * 4;
      const distance = Math.hypot(
        pixels.data[index] - bg.r,
        pixels.data[index + 1] - bg.g,
        pixels.data[index + 2] - bg.b,
      );
      if (distance <= tolerance) matte[pixel] = 1;
    }

    const enqueue = (x, y) => {
      if (x < 0 || y < 0 || x >= targetW || y >= targetH) return;
      const pixel = y * targetW + x;
      if (edgeMatte[pixel] || !matte[pixel]) return;
      edgeMatte[pixel] = 1;
      queue.push(pixel);
    };

    for (let x = 0; x < targetW; x += 1) {
      enqueue(x, 0);
      enqueue(x, targetH - 1);
    }
    for (let y = 0; y < targetH; y += 1) {
      enqueue(0, y);
      enqueue(targetW - 1, y);
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const pixel = queue[cursor];
      const x = pixel % targetW;
      const y = Math.floor(pixel / targetW);
      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }

    for (let pixel = 0; pixel < edgeMatte.length; pixel += 1) {
      const index = pixel * 4;
      if (edgeMatte[pixel]) {
        pixels.data[index + 3] = 0;
        continue;
      }
      const x = pixel % targetW;
      const y = Math.floor(pixel / targetW);
      const touchesMatte =
        (x > 0 && edgeMatte[pixel - 1]) ||
        (x < targetW - 1 && edgeMatte[pixel + 1]) ||
        (y > 0 && edgeMatte[pixel - targetW]) ||
        (y < targetH - 1 && edgeMatte[pixel + targetW]);
      if (touchesMatte) pixels.data[index + 3] = Math.round(pixels.data[index + 3] * 0.88);
    }

    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png');
  }, { sourceDataUrl, targetW, targetH, tolerance });
  await writeFile(output, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`Matted flat background: ${output}`);
} finally {
  await browser.close();
}
