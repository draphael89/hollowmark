import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const [, , input, output, widthArg = '96', heightArg = '128', thresholdArg = '18'] = process.argv;
if (!input || !output) {
  throw new Error('Usage: node scripts/matte-sprite.mjs <input> <output> [width] [height] [black-threshold]');
}

const targetW = Number(widthArg);
const targetH = Number(heightArg);
const threshold = Number(thresholdArg);
if (!Number.isInteger(targetW) || !Number.isInteger(targetH) || !Number.isInteger(threshold)) {
  throw new Error('Width, height, and threshold must be integers.');
}

await mkdir(dirname(output), { recursive: true });
const sourceDataUrl = `data:image/png;base64,${(await readFile(input)).toString('base64')}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(async ({ sourceDataUrl, targetW, targetH, threshold }) => {
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
    const transparent = new Uint8Array(targetW * targetH);
    const edgeTransparent = new Uint8Array(targetW * targetH);
    const queue = [];

    for (let pixel = 0; pixel < transparent.length; pixel += 1) {
      const index = pixel * 4;
      const r = pixels.data[index];
      const g = pixels.data[index + 1];
      const b = pixels.data[index + 2];
      if (Math.max(r, g, b) <= threshold) transparent[pixel] = 1;
    }

    const enqueue = (x, y) => {
      if (x < 0 || y < 0 || x >= targetW || y >= targetH) return;
      const pixel = y * targetW + x;
      if (edgeTransparent[pixel] || !transparent[pixel]) return;
      edgeTransparent[pixel] = 1;
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

    for (let pixel = 0; pixel < transparent.length; pixel += 1) {
      const index = pixel * 4;
      if (edgeTransparent[pixel]) {
        pixels.data[index + 3] = 0;
        continue;
      }
      const x = pixel % targetW;
      const y = Math.floor(pixel / targetW);
      const touchesMatte =
        (x > 0 && edgeTransparent[pixel - 1]) ||
        (x < targetW - 1 && edgeTransparent[pixel + 1]) ||
        (y > 0 && edgeTransparent[pixel - targetW]) ||
        (y < targetH - 1 && edgeTransparent[pixel + targetW]);
      if (touchesMatte) pixels.data[index + 3] = Math.round(pixels.data[index + 3] * 0.82);
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png');
  }, { sourceDataUrl, targetW, targetH, threshold });
  await writeFile(output, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`Matted sprite: ${output}`);
} finally {
  await browser.close();
}
