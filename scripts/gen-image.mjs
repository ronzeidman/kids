/**
 * gen-image.mjs — Reusable Gemini image generator with auto background removal
 *
 * Usage:
 *   node scripts/gen-image.mjs "prompt text" path/to/output.png
 *
 * Or import as a module:
 *   import { genImage } from './scripts/gen-image.mjs';
 *   await genImage("a golden key, pixel art", "games/foo/assets/key.png");
 *
 *   // Reference-image mode (img2img — keeps character consistent across calls):
 *   await genImage("same character, mid-walk pose", "frame1.png",
 *                  { referenceImage: "master.png" });
 *
 * Requirements:
 *   - GEMINI_API_KEY env var, or hardcode it in .claude/mcp.json
 *   - pngjs installed: npm install pngjs
 *
 * The script always produces a PNG with transparent background by removing
 * all near-white pixels (R>210, G>210, B>210) reachable from edges.
 */

import fs   from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { removeBg } from "./remove-bg.mjs";
import { trimToAlphaBbox } from "./gen-sprite-sheet.mjs";

const API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Generate a single image and save it with transparent background.
 * @param {string} prompt    - Description of the image to generate
 * @param {string} outPath   - Destination file path (must end in .png)
 * @param {object} [opts]
 * @param {string} [opts.referenceImage]  - Path to a PNG to use as visual reference
 *                                          (enables img2img / character consistency).
 *                                          When set, Gemini receives both the text
 *                                          prompt AND the reference image and is told
 *                                          to keep the character identical.
 * @param {boolean} [opts.removeBackground=true]  - Run edge flood-fill to make
 *                                                   white background transparent.
 * @param {boolean} [opts.trimAlpha=false]  - After bg-removal, crop the PNG to
 *                                            the tight bounding box of non-
 *                                            transparent pixels. Use for
 *                                            character/object PNGs so the
 *                                            visible content fills the file
 *                                            edge-to-edge (no float-above-tile
 *                                            bug when used as a Kaplay sprite).
 *                                            Skip for tile PNGs that should
 *                                            stay 1:1 with the source canvas.
 * @returns {Promise<string>} - Resolved output path
 */
export async function genImage(prompt, outPath, opts = {}) {
  const { referenceImage, removeBackground = true, trimAlpha = false } = opts;

  // Build prompt + parts
  const fullPrompt = referenceImage
    ? `${prompt}. IMPORTANT: keep the character's identity consistent with the reference image — same proportions, colors, outline style, and overall scale. BUT the POSE must be CLEARLY AND DRAMATICALLY DIFFERENT from the reference — exaggerate the pose change so the difference is obvious. Solid WHITE background — JUST the character on a plain empty white field. NO gradients, NO drop shadows, NO motion blur, NO frame, NO border, NO box around the character, NO outline rectangle around the image, NO decorative edge.`
    : `${prompt}. Isolated object only on solid WHITE background. NO gradients, NO drop shadows. PNG image.`;

  const parts = [{ text: fullPrompt }];
  if (referenceImage) {
    const refBuf = fs.readFileSync(referenceImage);
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: refBuf.toString("base64"),
      },
    });
  }

  console.log(`⏳ Generating: ${path.basename(outPath)}${referenceImage ? ` (ref: ${path.basename(referenceImage)})` : ""} …`);

  // Retry on transient 5xx / no-image responses — Gemini occasionally errors
  // out mid-generation. Up to 3 attempts with short backoff.
  let imagePart, data;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });
    data = await res.json();

    if (res.ok) {
      imagePart = data?.candidates?.[0]?.content?.parts?.find(p => p?.inlineData?.data);
      if (imagePart) break;
    }

    if (attempt < 3) {
      console.log(`   ⚠️  attempt ${attempt} failed (${res.status}), retrying in ${attempt}s…`);
      await new Promise(r => setTimeout(r, attempt * 1000));
    } else {
      if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(data)}`);
      throw new Error(`No image returned for "${prompt}". Response: ${JSON.stringify(data).slice(0, 300)}`);
    }
  }

  const rawBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rawBuffer);
  if (removeBackground) removeBg(outPath);
  if (trimAlpha) {
    const png = PNG.sync.read(fs.readFileSync(outPath));
    const trimmed = trimToAlphaBbox(png);
    fs.writeFileSync(outPath, PNG.sync.write(trimmed));
    console.log(`✂️  ${path.basename(outPath)} — trimmed to ${trimmed.width}x${trimmed.height}`);
  }

  console.log(`✅ Saved: ${outPath}`);
  return outPath;
}

// CLI mode: node scripts/gen-image.mjs "prompt" output/path.png
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [, , prompt, outPath] = process.argv;
  if (!prompt || !outPath) {
    console.error('Usage: node scripts/gen-image.mjs "prompt text" path/to/output.png');
    process.exit(1);
  }
  genImage(prompt, outPath).catch((e) => { console.error(e.message); process.exit(1); });
}
