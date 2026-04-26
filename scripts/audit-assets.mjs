import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const manifestPath = new URL('../public/assets/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const required = [
  'id',
  'kind',
  'biome',
  'promptPath',
  'sourceInputs',
  'rawSource',
  'processedPath',
  'finalSize',
  'palette',
  'cropNotes',
  'matteOrMaskNotes',
  'humanEditNotes',
  'inGamePreview',
  'approvalState',
  'rejectionNotes',
];

if (manifest.version !== 1 || !Array.isArray(manifest.assets)) {
  throw new Error('Asset manifest must be version 1 with an assets array.');
}

const ids = new Set();
for (const asset of manifest.assets) {
  for (const key of required) {
    if (!(key in asset)) throw new Error(`${asset.id ?? 'unknown asset'} is missing ${key}.`);
  }
  if (ids.has(asset.id)) throw new Error(`Duplicate asset id: ${asset.id}`);
  ids.add(asset.id);
  if (!asset.id.match(/^[a-z0-9.-]+$/)) throw new Error(`Invalid asset id: ${asset.id}`);
  if (!Number.isInteger(asset.finalSize.w) || !Number.isInteger(asset.finalSize.h)) {
    throw new Error(`${asset.id} finalSize must use integer w/h.`);
  }
  if (asset.rawSource && asset.approvalState === 'placeholder') {
    throw new Error(`${asset.id} cannot have rawSource while approvalState is placeholder.`);
  }
  if (!existsSync(asset.promptPath)) {
    throw new Error(`${asset.id} promptPath does not exist: ${asset.promptPath}`);
  }
}

console.log(`Asset manifest OK: ${manifest.assets.length} assets`);
