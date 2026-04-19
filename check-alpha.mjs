import fs from 'node:fs';
import { PNG } from 'pngjs';

for (const file of ['games/mushrooms/assets/person.png', 'games/mushrooms/assets/mushroom.png']) {
  const src = fs.readFileSync(file);
  const png = PNG.sync.read(src);
  const { width, height, data } = png;
  let transparent = 0, opaque = 0;
  for (let i = 0; i < width * height; i++) {
    const a = data[i*4+3];
    if (a === 0) transparent++; else opaque++;
  }
  console.log(file, '— transparent px:', transparent, '/ opaque px:', opaque, '/ corner alpha:', data[3]);
}
