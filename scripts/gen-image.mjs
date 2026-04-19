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
 * Requirements:
 *   - GEMINI_API_KEY env var, or hardcode it in .claude/mcp.json
 *   - pngjs installed: npm install pngjs
 *
 * The script always produces a PNG with transparent background by removing
 * all near-white pixels (R>230, G>230, B>230) from the generated image.
 */

import fs   from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { removeBg } from "./remove-bg.mjs";

const API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Generate a single image and save it with transparent background.
 * @param {string} prompt   - Description of the image to generate
 * @param {string} outPath  - Destination file path (must end in .png)
 * @returns {Promise<string>} - Resolved output path
 */
export async function genImage(prompt, outPath) {
  // Append transparency hints to every prompt so Gemini tries harder
  const fullPrompt = `${prompt}. Isolated object only, NO background, transparent background, PNG with alpha channel.`;

  console.log(`⏳ Generating: ${path.basename(outPath)} …`);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(data)}`);
  }

  const imagePart = data?.candidates?.[0]?.content?.parts?.find(
    (p) => p?.inlineData?.data
  );

  if (!imagePart) {
    throw new Error(`No image returned for "${prompt}". Response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  // Save raw image first, then remove background via flood-fill
  const rawBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rawBuffer);
  removeBg(outPath); // flood-fill from edges — more accurate than global threshold

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
