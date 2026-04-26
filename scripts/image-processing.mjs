import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function cropAndResize(inputPath, outputPath, targetW, targetH) {
  if (!Number.isInteger(targetW) || !Number.isInteger(targetH)) throw new Error('Target size must use integer width and height.');
  const { stdout } = await execFileAsync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', inputPath]);
  const sourceW = Number(stdout.match(/pixelWidth: (\d+)/)?.[1]);
  const sourceH = Number(stdout.match(/pixelHeight: (\d+)/)?.[1]);
  if (!sourceW || !sourceH) throw new Error(`Could not read image size for ${inputPath}`);

  const targetAspect = targetW / targetH;
  const sourceAspect = sourceW / sourceH;
  const cropW = sourceAspect > targetAspect ? Math.round(sourceH * targetAspect) : sourceW;
  const cropH = sourceAspect > targetAspect ? sourceH : Math.round(sourceW / targetAspect);

  await execFileAsync('sips', [
    '--cropToHeightWidth', String(cropH), String(cropW),
    '--resampleHeightWidth', String(targetH), String(targetW),
    inputPath,
    '--out', outputPath,
  ]);
}
