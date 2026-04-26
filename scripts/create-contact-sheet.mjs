import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';

const manifestPath = new URL('../public/assets/manifest.json', import.meta.url);
const outPath = new URL('../.curation/contact_sheets/underroot-batch-01.svg', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.version !== 1 || !Array.isArray(manifest.assets)) {
  throw new Error('Asset manifest must be version 1 with an assets array.');
}

const rows = await Promise.all(manifest.assets.map(async (asset, index) => {
  const prompt = await readFile(asset.promptPath, 'utf8');
  return row(asset, prompt, index);
}));

const height = 94 + rows.length * 112;
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">
  <rect width="1200" height="${height}" fill="#09080d"/>
  <text x="36" y="44" fill="#d9c69a" font-family="monospace" font-size="24">HOLLOWMARK Underroot Batch 01</text>
  <text x="36" y="72" fill="#8b8174" font-family="monospace" font-size="14">Draft contact sheet: source generation candidates must beat these contracts before processing.</text>
${rows.join('\n')}
</svg>
`;

await mkdir(dirname(outPath.pathname), { recursive: true });
await writeFile(outPath, svg);
console.log(`Contact sheet written: ${outPath.pathname}`);

function row(asset, prompt, index) {
  const y = 104 + index * 112;
  return `  <g>
    <rect x="32" y="${y}" width="1136" height="92" rx="0" fill="#14111a" stroke="#702231" stroke-width="2"/>
    ${swatch(asset.kind, 74, y + 46)}
    <text x="126" y="${y + 24}" fill="#d9c69a" font-family="monospace" font-size="18">${escapeXml(asset.title)}</text>
    <text x="126" y="${y + 46}" fill="#b8aa91" font-family="monospace" font-size="13">${escapeXml(asset.id)}</text>
    <text x="126" y="${y + 66}" fill="#6fb6b4" font-family="monospace" font-size="13">${escapeXml(asset.kind)} / ${escapeXml(asset.approvalState)} / ${escapeXml(asset.finalSize.w)}x${escapeXml(asset.finalSize.h)}</text>
    <text x="520" y="${y + 28}" fill="#e0d4bd" font-family="monospace" font-size="14">Focus: ${escapeXml(asset.reviewFocus)}</text>
    <text x="520" y="${y + 50}" fill="#8b8174" font-family="monospace" font-size="12">Prompt: ${escapeXml(basename(asset.promptPath))}</text>
    <text x="520" y="${y + 70}" fill="#8b8174" font-family="monospace" font-size="12">${escapeXml(firstPromptLine(prompt))}</text>
  </g>`;
}

function swatch(kind, x, y) {
  if (kind === 'background') {
    return `<rect x="${x - 32}" y="${y - 24}" width="64" height="48" fill="#252638"/><rect x="${x - 24}" y="${y + 6}" width="48" height="8" fill="#31483c"/><rect x="${x - 8}" y="${y - 18}" width="16" height="36" fill="#702231"/>`;
  }
  if (kind === 'sprite') {
    return `<path d="M ${x - 30} ${y + 28} L ${x} ${y - 30} L ${x + 30} ${y + 28} Z" fill="#702231"/><circle cx="${x - 10}" cy="${y - 4}" r="4" fill="#d9c69a"/><circle cx="${x + 10}" cy="${y - 4}" r="4" fill="#d9c69a"/>`;
  }
  if (kind === 'card-art') {
    return `<rect x="${x - 20}" y="${y - 30}" width="40" height="60" rx="4" fill="#252638" stroke="#d9a441"/><rect x="${x - 10}" y="${y - 10}" width="20" height="26" fill="#9f3341"/>`;
  }
  return `<circle cx="${x}" cy="${y}" r="24" fill="#9f3341" stroke="#d9a441" stroke-width="3"/>`;
}

function firstPromptLine(prompt) {
  return prompt.split('\n').find((line) => line.trim().length > 0)?.trim().slice(0, 84) ?? 'No prompt text.';
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
