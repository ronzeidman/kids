/**
 * Regenerate platformer template assets.
 * Run from project root:
 *   node shared/platformer-template/gen-assets.mjs
 *
 * When you copy this template to games/<name>/, change OUT and the hero
 * prompts to the new game's character. Everything else (ground, brick, fish,
 * flag, dog enemy) loads from shared/assets/ — check MANIFEST.md there
 * BEFORE generating anything new.
 *
 * genSpriteSheet also writes assets/<name>.sheet.json + assets/sheet-meta.js
 * with the real frame dimensions — game.js reads those instead of guessing.
 *
 * For tall climbable structures (trees, pillars, vines) use genTallStructure
 * from scripts/gen-sprite-sheet.mjs — NEVER a single tile stacked vertically.
 */
import { genSpriteSheet } from "../../scripts/gen-sprite-sheet.mjs";

const OUT = "shared/platformer-template/assets";

// Hero — 4-frame walk cycle via reference-image chain so every frame is the
// same character. Frame 0 = idle, frames 1-3 = walk cycle.
await genSpriteSheet({
  masterPrompt:
    "Cute cartoon hero kid character, 2D platformer pixel art sprite, " +
    "bold black outlines 2 pixels wide, flat colors, side view facing RIGHT, " +
    "standing idle with both feet flat on the ground, arms relaxed at sides. " +
    "Feet are the LOWEST point of the character — nothing extends below the feet line. " +
    "Solid white background. Whole character fully visible, centered, with margin. " +
    "NO gradients, NO drop shadows, NO motion blur, NO background scenery.",
  posePrompts: [
    "same hero kid, mid-walk stride — RIGHT leg LIFTED HIGH bent forward, " +
    "LEFT leg planted back, RIGHT arm swung BACK, LEFT arm swung FORWARD, " +
    "body leaning slightly forward. Very obvious walking pose. " +
    "Facing RIGHT, same character, same colors, white background.",
    "same hero kid, passing pose mid-walk — both legs nearly together under " +
    "body, arms hanging neutral at sides, body upright. Clearly mid-stride, NOT idle. " +
    "Facing RIGHT, same character, same colors, white background.",
    "same hero kid, mid-walk stride — LEFT leg LIFTED HIGH bent forward, " +
    "RIGHT leg planted back, LEFT arm swung BACK, RIGHT arm swung FORWARD, " +
    "body leaning slightly forward. Mirror of the first walk pose. " +
    "Facing RIGHT, same character, same colors, white background.",
  ],
  outPath: `${OUT}/hero.png`,
});
