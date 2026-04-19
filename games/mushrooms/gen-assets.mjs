/**
 * Regenerate all mushroom-game assets.
 * Run from project root: node games/mushrooms/gen-assets.mjs
 */
import { genImage } from "../../scripts/gen-image.mjs";

const OUT = "games/mushrooms/assets";

await genImage(
  "Cute cartoon child character facing RIGHT, pixel art game sprite, colorful clothes, big head, small body, standing upright, friendly smile",
  `${OUT}/person.png`
);

await genImage(
  "Super cute cartoon mushroom, pixel art, red cap with white spots, smiling happy face, chubby round shape",
  `${OUT}/mushroom.png`
);
