import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await Promise.all([
  build({ entryPoints: ['src/content/index.js'], outfile: 'dist/content.js', bundle: true, format: 'iife', target: 'chrome120' }),
  build({ entryPoints: ['src/background/index.js'], outfile: 'dist/background.js', bundle: true, format: 'esm', target: 'chrome120' }),
  copyFile('manifest.json', 'dist/manifest.json'),
]);
console.log('Built dist/ — load this directory in chrome://extensions');
