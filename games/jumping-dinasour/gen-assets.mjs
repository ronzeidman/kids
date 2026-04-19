/**
 * Regenerate all jumping-dinosaur game assets.
 * Run from project root: node games/jumping-dinasour/gen-assets.mjs
 */
import { genImage } from "../../scripts/gen-image.mjs";

const OUT = "games/jumping-dinasour/assets";

await genImage(
  "Cute cartoon dinosaur facing RIGHT, pixel art game sprite, bright green, big friendly eyes, small arms, standing upright",
  `${OUT}/dino.png`
);

await genImage(
  "Shiny golden key, pixel art game icon, bright gold color, detailed ornate design",
  `${OUT}/key.png`
);

await genImage(
  "Colorful checkered finish flag on a pole, pixel art game icon",
  `${OUT}/flag.png`
);
