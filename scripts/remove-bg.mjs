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

/**
 * Strip thin uniform-dark frame borders that Gemini sometimes draws around
 * reference-image generations. Iteratively peels 1px from any edge whose
 * pixels are overwhelmingly dark+opaque, up to a max depth. Stops when edges
 * become non-uniform (real character outline reached).
 *
 * Pass a PNG instance (mutated in place is OK, but we return a new one cropped
 * because each peel reduces dimensions).
 */
export function stripDarkBorder(png, { maxPeel = 30, darkThreshold = 220, darkRatio = 0.7 } = {}) {
  let { width, height, data } = png;

  // Reads alpha of a pixel
  const A = (x, y) => data[(y * width + x) * 4 + 3];
  const DARK = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i + 3] > 100 && (data[i] + data[i+1] + data[i+2]) < darkThreshold;
  };

  const edgeDarkRatio = (which) => {
    let dark = 0, total = 0;
    if (which === "top" || which === "bottom") {
      const y = which === "top" ? 0 : height - 1;
      for (let x = 0; x < width; x++) {
        if (A(x, y) > 100) { total++; if (DARK(x, y)) dark++; }
      }
    } else {
      const x = which === "left" ? 0 : width - 1;
      for (let y = 0; y < height; y++) {
        if (A(x, y) > 100) { total++; if (DARK(x, y)) dark++; }
      }
    }
    return total > 0 ? dark / total : 0;
  };

  // Crop returns a new Buffer-backed view. We rebuild a smaller buffer.
  function crop({ top = 0, bottom = 0, left = 0, right = 0 }) {
    const nw = width - left - right;
    const nh = height - top - bottom;
    const nbuf = Buffer.alloc(nw * nh * 4);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const si = ((y + top) * width + (x + left)) * 4;
        const di = (y * nw + x) * 4;
        nbuf[di]     = data[si];
        nbuf[di + 1] = data[si + 1];
        nbuf[di + 2] = data[si + 2];
        nbuf[di + 3] = data[si + 3];
      }
    }
    width = nw; height = nh; data = nbuf;
  }

  for (let iter = 0; iter < maxPeel; iter++) {
    if (width < 4 || height < 4) break;
    const peel = { top: 0, bottom: 0, left: 0, right: 0 };
    if (edgeDarkRatio("top") > darkRatio)    peel.top = 1;
    if (edgeDarkRatio("bottom") > darkRatio) peel.bottom = 1;
    if (edgeDarkRatio("left") > darkRatio)   peel.left = 1;
    if (edgeDarkRatio("right") > darkRatio)  peel.right = 1;
    if (!peel.top && !peel.bottom && !peel.left && !peel.right) break;
    crop(peel);
  }

  const out = new PNG({ width, height });
  data.copy(out.data);
  return out;
}

// CLI mode: node scripts/remove-bg.mjs path/to/image.png
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/remove-bg.mjs path/to/image.png'); process.exit(1); }
  removeBg(file);
}
