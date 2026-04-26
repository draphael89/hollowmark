import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cropAndResize } from './image-processing.mjs';

const [, , input, output, widthArg = '64', heightArg = '48'] = process.argv;
if (!input || !output) {
  throw new Error('Usage: node scripts/process-card-art.mjs <input> <output> [width] [height]');
}

await mkdir(dirname(output), { recursive: true });
await cropAndResize(input, output, Number(widthArg), Number(heightArg));
console.log(`Processed card art: ${output}`);
