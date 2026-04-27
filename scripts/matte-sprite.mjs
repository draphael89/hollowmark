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
    for (let index = 0; index < pixels.data.length; index += 4) {
      const r = pixels.data[index];
      const g = pixels.data[index + 1];
      const b = pixels.data[index + 2];
      if (Math.max(r, g, b) <= threshold) pixels.data[index + 3] = 0;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png');
  }, { sourceDataUrl, targetW, targetH, threshold });
  await writeFile(output, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`Matted sprite: ${output}`);
} finally {
  await browser.close();
}
