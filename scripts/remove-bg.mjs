/**
 * remove-bg.mjs — Remove image background using flood-fill from corners.
 *
 * More accurate than a global threshold: only removes pixels that are
 * reachable from the image edges and are "light enough" (near-white or
 * near-transparent). Preserves light colours inside the actual sprite.
 *
 * Usage:
 *   node scripts/remove-bg.mjs path/to/image.png
 *
 * Or import:
 *   import { removeBg } from './scripts/remove-bg.mjs';
 *   removeBg('games/foo/assets/sprite.png');
 */

import fs   from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const THRESHOLD = 210; // pixels with R,G,B all above this are "background-like"

/**
 * Remove background from a PNG file in-place using edge flood-fill.
 * @param {string} filePath
 */
export function removeBg(filePath) {
  const src = fs.readFileSync(filePath);
  const png = PNG.sync.read(src);
  const { width, height, data } = png;

  const idx   = (x, y) => (y * width + x) * 4;
  const isLight = (i) => data[i] > THRESHOLD && data[i+1] > THRESHOLD && data[i+2] > THRESHOLD;

  // BFS flood-fill starting from all edge pixels
  const visited = new Uint8Array(width * height);
  const queue   = [];

  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pos = y * width + x;
    if (visited[pos]) return;
    visited[pos] = 1;
    const i = pos * 4;
    if (data[i+3] === 0 || isLight(i)) queue.push(x, y);
  };

  // Seed from all four edges
  for (let x = 0; x < width;  x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y);  }

  while (queue.length) {
    const y = queue.pop();
    const x = queue.pop();
    data[idx(x, y) + 3] = 0; // make transparent
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  fs.writeFileSync(filePath, PNG.sync.write(png));
  console.log(`✅ ${path.basename(filePath)} — background removed`);
}

// CLI mode: node scripts/remove-bg.mjs path/to/image.png
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/remove-bg.mjs path/to/image.png'); process.exit(1); }
  removeBg(file);
}
