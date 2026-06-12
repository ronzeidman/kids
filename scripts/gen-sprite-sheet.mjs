/**
 * gen-sprite-sheet.mjs — Generate an animation-ready sprite sheet via Gemini.
 *
 * Workflow:
 *   1. Generate a "master" frame from a text prompt (pose 0, idle).
 *   2. For each additional pose, call Gemini with the master frame as a
 *      REFERENCE image (img2img — keeps the character identical, only the
 *      pose changes).
 *   3. **Alpha-trim each frame** to its tight bounding box of non-transparent
 *      pixels. This removes the empty canvas margins Gemini leaves around the
 *      character so the sprite goes edge-to-edge in the final strip — feet at
 *      the bottom of the cell, head at the top.
 *   4. Pick a uniform cell size = max(trimmedW, trimmedH) across frames.
 *   5. **Bottom-align** each trimmed frame into its cell so feet sit on a
 *      stable baseline across the cycle (essential for walk animation).
 *   6. Stitch into a horizontal strip ready for Kaplay's `sliceX`.
 */

import fs   from "node:fs";
import path from "node:path";
import os   from "node:os";
import { PNG } from "pngjs";
import { genImage } from "./gen-image.mjs";
import { stripDarkBorder } from "./remove-bg.mjs";

/**
 * @param {object} opts
 * @param {string}   opts.masterPrompt
 * @param {string[]} opts.posePrompts
 * @param {string}   opts.outPath
 * @param {boolean} [opts.keepFrames=false]
 */
export async function genSpriteSheet({ masterPrompt, posePrompts, outPath, keepFrames = false }) {
  if (!masterPrompt || !Array.isArray(posePrompts) || !outPath) {
    throw new Error("genSpriteSheet: requires { masterPrompt, posePrompts[], outPath }");
  }

  const workDir = keepFrames
    ? path.join(path.dirname(outPath), `_${path.basename(outPath, ".png")}_frames`)
    : fs.mkdtempSync(path.join(os.tmpdir(), "sprite-"));
  fs.mkdirSync(workDir, { recursive: true });

  // 1) Master frame
  const masterPath = path.join(workDir, "frame_0_master.png");
  await genImage(masterPrompt, masterPath);

  // 2) Reference-image frames
  const framePaths = [masterPath];
  for (let i = 0; i < posePrompts.length; i++) {
    const framePath = path.join(workDir, `frame_${i + 1}.png`);
    await genImage(posePrompts[i], framePath, { referenceImage: masterPath });
    framePaths.push(framePath);
  }

  // 3) For each frame: alpha-trim → strip decorative dark border → re-alpha-trim
  //    → foot-line trim. The foot-line step removes anything dangling below the
  //    feet (long tails, drooping ears) so every frame's *visible bottom* is
  //    the foot baseline — required for clean bottom-alignment across frames.
  const trimmed = framePaths.map(p => {
    const raw = PNG.sync.read(fs.readFileSync(p));
    const bbox1 = trimToAlphaBbox(raw);
    const noBorder = stripDarkBorder(bbox1);
    const bbox2 = trimToAlphaBbox(noBorder);
    return trimToFootLine(bbox2);
  });

  // 4) Uniform cell size = max of trimmed dimensions
  const cellW = Math.max(...trimmed.map(t => t.width));
  const cellH = Math.max(...trimmed.map(t => t.height));

  // 5+6) Stitch with bottom-align so feet are on a stable baseline
  const N = trimmed.length;
  const strip = new PNG({ width: cellW * N, height: cellH });
  for (let i = 0; i < strip.data.length; i += 4) strip.data[i + 3] = 0;

  for (let i = 0; i < N; i++) {
    const frame = trimmed[i];
    const cellX = i * cellW;
    const offX = cellX + Math.floor((cellW - frame.width) / 2);   // horizontal: center
    const offY = cellH - frame.height;                            // vertical: bottom-align
    blit(strip, frame, offX, offY);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, PNG.sync.write(strip));

  if (!keepFrames) fs.rmSync(workDir, { recursive: true, force: true });

  writeSheetMeta(outPath, { frames: N, cellW, cellH, aspect: round3(cellW / cellH) });

  console.log(`🎞  Strip saved: ${outPath} (${N} frames, ${cellW}x${cellH} each, bottom-aligned)`);
  return { path: outPath, frames: N, frameWidth: cellW, frameHeight: cellH };
}

/**
 * genTallStructure — generate a vertically-segmented structure (climbable tree,
 * pillar, tower, vine, waterfall) as ONE tall Gemini image sliced into equal
 * segments, saved as a vertical strip for Kaplay's `sliceY`.
 *
 * Why: stacking copies of a single tile NEVER seams — independently generated
 * tiles can't visually connect, producing the "blobs patched on top of each
 * other" look. One tall image sliced after the fact seams perfectly and gives
 * a real top (canopy), middle (trunk) and base (roots).
 *
 * Level usage: keep ONE grid symbol per cell, load with `sliceY: segments`,
 * then after addLevel() set each tile's `frame` by its position in the column
 * (topmost → 0, bottom → segments-1, middle rows → the middle frame).
 *
 * @param {object} opts
 * @param {string} opts.prompt     - Structure description (no aspect/background talk needed)
 * @param {string} opts.outPath    - Destination strip PNG
 * @param {number} [opts.segments=3]
 * @returns {Promise<{path:string, segments:number, segW:number, segH:number}>}
 */
export async function genTallStructure({ prompt, outPath, segments = 3 }) {
  if (!prompt || !outPath) throw new Error("genTallStructure: requires { prompt, outPath }");

  const fullPrompt =
    `${prompt}. ONE single tall vertical structure, the full structure visible ` +
    `from its very top to its base in one image. TALL and NARROW portrait shape: ` +
    `the structure must be at least ${segments} times TALLER than it is wide. ` +
    `Any top part (crown, foliage, cap) must be COMPACT and only slightly wider ` +
    `than the body below it. The base sits at the very bottom of the image. ` +
    `NO shadows, NO background scenery, NO border, NO frame.`;

  const tmpPath = path.join(path.dirname(outPath), `_${path.basename(outPath, ".png")}_tall.png`);
  await genImage(fullPrompt, tmpPath);

  const raw = PNG.sync.read(fs.readFileSync(tmpPath));
  const trimmed = trimToAlphaBbox(raw);
  const bands = sliceVertical(trimmed, segments);

  // Stitch bands into a vertical strip (Kaplay: sliceY: segments, frame 0 = top)
  const segW = bands[0].width;
  const segH = bands[0].height;
  const strip = new PNG({ width: segW, height: segH * segments });
  for (let i = 0; i < strip.data.length; i += 4) strip.data[i + 3] = 0;
  bands.forEach((band, i) => blit(strip, band, 0, i * segH));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, PNG.sync.write(strip));
  fs.rmSync(tmpPath, { force: true });

  writeSheetMeta(outPath, { kind: "tall", segments, segW, segH, aspect: round3(segW / segH) });

  console.log(`🌲 Tall structure saved: ${outPath} (${segments} segments, ${segW}x${segH} each)`);
  return { path: outPath, segments, segW, segH };
}

/**
 * Slice a PNG into `n` equal-height horizontal bands, top band first.
 * Trailing rows that don't divide evenly are dropped (at most n-1 px).
 */
export function sliceVertical(png, n) {
  const bandH = Math.floor(png.height / n);
  if (bandH < 1) throw new Error(`sliceVertical: image too short (${png.height}px) for ${n} bands`);
  const bands = [];
  for (let i = 0; i < n; i++) {
    const band = new PNG({ width: png.width, height: bandH });
    PNG.bitblt(png, band, 0, i * bandH, png.width, bandH, 0, 0);
    bands.push(band);
  }
  return bands;
}

/**
 * Write <base>.sheet.json next to the strip and regenerate the directory's
 * sheet-meta.js so game code can read frame dimensions synchronously via a
 * plain <script src="assets/sheet-meta.js"> include — no fetch, no guessing.
 */
function writeSheetMeta(outPath, meta) {
  const dir = path.dirname(outPath);
  const base = path.basename(outPath, ".png");
  fs.writeFileSync(path.join(dir, `${base}.sheet.json`), JSON.stringify(meta, null, 2) + "\n");
  regenSheetMetaJs(dir);
}

/**
 * Rebuild <dir>/sheet-meta.js from every *.sheet.json sidecar in the dir.
 * Idempotent — rerunning any one sheet regenerates the whole file.
 */
export function regenSheetMetaJs(dir) {
  const entries = fs.readdirSync(dir)
    .filter(f => f.endsWith(".sheet.json") && !f.startsWith(".")) // skip macOS ._* sidecars
    .sort()
    .map(f => {
      const name = f.replace(/\.sheet\.json$/, "");
      const meta = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return `  ${JSON.stringify(name)}: ${JSON.stringify(meta)},`;
    });
  const js =
    `// AUTO-GENERATED by gen-sprite-sheet.mjs — do not edit by hand.\n` +
    `// Regenerated whenever any sheet in this folder is rebuilt.\n` +
    `window.SHEET_META = Object.assign(window.SHEET_META || {}, {\n` +
    entries.join("\n") + `\n});\n`;
  fs.writeFileSync(path.join(dir, "sheet-meta.js"), js);
}

const round3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Find the bounding box of pixels with alpha > 0, return a new PNG cropped
 * to that bbox. If the image is entirely transparent, returns it unchanged.
 */
export function trimToAlphaBbox(png) {
  const { width, height, data } = png;
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return png; // all transparent

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((minY + y) * width + (minX + x)) * 4;
      const di = (y * w + x) * 4;
      out.data[di]     = data[si];
      out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2];
      out.data[di + 3] = data[si + 3];
    }
  }
  return out;
}

/**
 * Foot-line trim. Removes anything hanging below the character's feet (long
 * tails, drooping appendages) so the sprite's visible bottom equals the foot
 * baseline. Algorithm:
 *   1. For each column, find the y of its lowest opaque pixel.
 *   2. Build a histogram of those bottom-y values.
 *   3. The MODE of the histogram is the foot baseline — feet occupy more
 *      columns than thin appendages dangling underneath.
 *   4. Crop the PNG to (top..footLine). Discard rows below the foot line.
 * If the histogram is too flat (no clear mode), leave the frame unchanged.
 */
export function trimToFootLine(png) {
  const { width, height, data } = png;
  if (height < 8 || width < 4) return png;

  const colBottom = new Array(width).fill(-1);
  for (let x = 0; x < width; x++) {
    for (let y = height - 1; y >= 0; y--) {
      if (data[(y * width + x) * 4 + 3] > 64) { colBottom[x] = y; break; }
    }
  }

  const hist = new Array(height).fill(0);
  let occupiedCols = 0;
  for (const y of colBottom) if (y >= 0) { hist[y]++; occupiedCols++; }
  if (occupiedCols < 4) return png;

  // Find the highest-y mode in the LOWER 30% of the sprite (where feet live).
  // Picking the mode within the foot zone avoids accidentally cutting at a
  // head/shoulder line on characters with very symmetric silhouettes.
  const footZoneStart = Math.floor(height * 0.5);
  let bestY = -1, bestCount = 0;
  for (let y = footZoneStart; y < height; y++) {
    if (hist[y] > bestCount) { bestCount = hist[y]; bestY = y; }
  }
  // Require the mode to cover at least 25% of occupied columns — otherwise the
  // silhouette has no clear foot line and we leave the frame as-is.
  if (bestY < 0 || bestCount < occupiedCols * 0.25) return png;

  const newH = bestY + 1;
  if (newH >= height) return png;

  const out = new PNG({ width, height: newH });
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = (y * width + x) * 4;
      out.data[di]     = data[si];
      out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2];
      out.data[di + 3] = data[si + 3];
    }
  }
  return out;
}

/**
 * Copy `src` into `dst` at (dx, dy) preserving alpha. No scaling.
 */
function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    const dyy = dy + y;
    if (dyy < 0 || dyy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dxx = dx + x;
      if (dxx < 0 || dxx >= dst.width) continue;
      const si = (y * src.width + x) * 4;
      const di = (dyy * dst.width + dxx) * 4;
      dst.data[di]     = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}

// CLI smoke test mode
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node scripts/gen-sprite-sheet.mjs "<master>" "<pose1>" ["<pose2>" ...] <out.png>');
    process.exit(1);
  }
  const outPath = args.pop();
  const masterPrompt = args.shift();
  const posePrompts = args;
  genSpriteSheet({ masterPrompt, posePrompts, outPath })
    .catch(e => { console.error(e.message); process.exit(1); });
}
