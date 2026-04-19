import fs from "node:fs";
import { PNG } from "pngjs";

const ASSETS = "/Volumes/KINGSTON/kids/games/jumping-dinasour/assets";
const files = ["dino.png", "key.png", "flag.png"];

// Remove near-white background pixels (make them transparent)
function removeBg(filename) {
  const src = fs.readFileSync(`${ASSETS}/${filename}`);
  const png = PNG.sync.read(src);
  const { width, height, data } = png;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      // If pixel is near-white, make transparent
      if (r > 230 && g > 230 && b > 230) {
        data[i+3] = 0;
      }
    }
  }

  const out = PNG.sync.write(png);
  fs.writeFileSync(`${ASSETS}/${filename}`, out);
  console.log(`✓ ${filename}`);
}

files.forEach(removeBg);
console.log("Done!");
