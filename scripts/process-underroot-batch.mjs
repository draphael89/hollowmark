import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cropAndResize } from './image-processing.mjs';

const manifestPath = new URL('../public/assets/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.version !== 1 || !Array.isArray(manifest.assets)) {
  throw new Error('Asset manifest must be version 1 with an assets array.');
}

for (const asset of manifest.assets) {
  if (!asset.rawSource || !asset.processedPath) continue;
  await mkdir(dirname(asset.processedPath), { recursive: true });
  await cropAndResize(asset.rawSource, asset.processedPath, asset.finalSize.w, asset.finalSize.h);
  console.log(`Processed ${asset.id}: ${asset.processedPath}`);
}
