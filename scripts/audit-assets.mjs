import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const manifestPath = new URL('../public/assets/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const required = [
  'id',
  'kind',
  'title',
  'biome',
  'promptPath',
  'reviewFocus',
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
const allowedStates = new Set(['placeholder', 'raw_generated', 'candidate', 'processed', 'in_game_previewed', 'approved', 'rejected', 'manifested']);

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
  if (!allowedStates.has(asset.approvalState)) throw new Error(`${asset.id} has invalid approvalState: ${asset.approvalState}`);
  if (!Number.isInteger(asset.finalSize.w) || !Number.isInteger(asset.finalSize.h)) {
    throw new Error(`${asset.id} finalSize must use integer w/h.`);
  }
  if (asset.rawSource && asset.approvalState === 'placeholder') {
    throw new Error(`${asset.id} cannot have rawSource while approvalState is placeholder.`);
  }
  if (!existsSync(asset.promptPath)) {
    throw new Error(`${asset.id} promptPath does not exist: ${asset.promptPath}`);
  }
  if (asset.rawSource && !existsSync(asset.rawSource)) {
    throw new Error(`${asset.id} rawSource does not exist: ${asset.rawSource}`);
  }
  if (asset.processedPath && !existsSync(asset.processedPath)) {
    throw new Error(`${asset.id} processedPath does not exist: ${asset.processedPath}`);
  }
  if (asset.approvalState === 'rejected' && !asset.rejectionNotes) {
    throw new Error(`${asset.id} rejected assets must include rejectionNotes.`);
  }
  if ((asset.approvalState === 'approved' || asset.approvalState === 'manifested') && asset.rejectionNotes) {
    throw new Error(`${asset.id} approved/manifested assets cannot include rejectionNotes.`);
  }
}

console.log(`Asset manifest OK: ${manifest.assets.length} assets`);
