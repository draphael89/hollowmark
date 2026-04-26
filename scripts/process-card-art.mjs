import { copyFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const [, , input, output] = process.argv;
if (!input || !output) {
  throw new Error('Usage: node scripts/process-card-art.mjs <input> <output>');
}

await mkdir(dirname(output), { recursive: true });
await copyFile(input, output);
console.log(`Processed card-art placeholder: ${output}`);
