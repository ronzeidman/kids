/**
 * gen-shared-asset.mjs — Generate a PNG into shared/assets/ and append a
 * row to shared/assets/MANIFEST.md so other games discover it.
 *
 * Usage (from project root):
 *   GEMINI_API_KEY=... node scripts/gen-shared-asset.mjs \
 *     <name>           name of the file (no extension)
 *     "<short label>"  one-line what-is-it for the manifest
 *     "<prompt>"       the prompt for Gemini
 *
 * Example:
 *   node scripts/gen-shared-asset.mjs coin "Spinning gold coin collectible" \
 *     "Pixel art spinning gold coin, side view, bright yellow, bold black outline..."
 *
 * For sprite-sheets, use scripts/gen-sprite-sheet.mjs directly with an outPath
 * inside shared/assets/, then add a row to MANIFEST.md manually.
 */
import fs   from "node:fs";
import path from "node:path";
import { genImage } from "./gen-image.mjs";

const SHARED_DIR = "shared/assets";
const MANIFEST   = path.join(SHARED_DIR, "MANIFEST.md");

async function main() {
  const [, , name, label, prompt] = process.argv;
  if (!name || !label || !prompt) {
    console.error('Usage: node scripts/gen-shared-asset.mjs <name> "<label>" "<prompt>"');
    process.exit(1);
  }
  const outPath = path.join(SHARED_DIR, `${name}.png`);

  if (fs.existsSync(outPath)) {
    console.error(`✋ ${outPath} already exists — refusing to overwrite. Reuse it or pick a new name.`);
    process.exit(2);
  }

  await genImage(prompt, outPath, { trimAlpha: true });

  const manifest = fs.readFileSync(MANIFEST, "utf8");
  const row = `\n| \`${name}.png\` | ${label} | ${prompt.slice(0, 140).replace(/\|/g, "\\|")}${prompt.length > 140 ? "…" : ""} |`;
  // Append to the Props section if present, otherwise to the end.
  const propsSection = "## Props / collectibles (single-frame PNGs, alpha-trimmed)";
  if (manifest.includes(propsSection)) {
    // Find the next blank line after the props table and insert before it
    const idx = manifest.indexOf(propsSection);
    // Walk past the header table line(s) until we hit a blank line
    let i = idx;
    while (i < manifest.length && manifest.slice(i, i + 2) !== "\n\n") i++;
    const before = manifest.slice(0, i);
    const after  = manifest.slice(i);
    fs.writeFileSync(MANIFEST, before + row + after);
  } else {
    fs.appendFileSync(MANIFEST, row + "\n");
  }
  console.log(`📝 Manifest updated: ${MANIFEST}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
