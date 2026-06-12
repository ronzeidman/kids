/**
 * Regenerate "משנה צורות" (Shapeshift) assets.
 * Run from project root:
 *   GEMINI_API_KEY=... node games/shapeshift/gen-assets.mjs
 *
 * The three player forms are 4-frame sprite sheets (sliceX: 4 in game.js):
 * frame 0 = idle, frames 1-3 = move/swim cycle.
 * Ground / brick wall / flag are reused from shared/assets; water is drawn as a
 * translucent rect in game.js — no asset needed.
 */
import { genSpriteSheet } from "../../scripts/gen-sprite-sheet.mjs";

const OUT = "games/shapeshift/assets";

// --- Form 1: the boy ---
await genSpriteSheet({
  masterPrompt:
    "Cute cartoon boy character, 2D platformer pixel art sprite, blue shirt and " +
    "brown shorts, bold black outlines 2 pixels wide, flat colors, side view " +
    "facing RIGHT, standing idle pose, arms relaxed, on a clean solid white " +
    "background. Whole character fully visible, centered, with margin. " +
    "NO gradients, NO drop shadows, NO motion blur, NO background scenery.",
  posePrompts: [
    "same boy, mid-walk stride: right leg forward, left leg back, arms swinging",
    "same boy, passing pose: both legs together under body, arms neutral, upright",
    "same boy, mid-walk stride: left leg forward, right leg back, arms swinging",
  ],
  outPath: `${OUT}/boy.png`,
});

// --- Form 2: the bird (light, flaps to fly UP over walls) ---
await genSpriteSheet({
  masterPrompt:
    "Cute cartoon bird character, 2D platformer pixel art sprite, round red robin " +
    "with orange belly and tiny legs, bold black outlines 2 pixels wide, flat " +
    "colors, side view facing RIGHT, wings folded resting pose, on a clean solid " +
    "white background. Whole character fully visible, centered, with margin. " +
    "NO gradients, NO drop shadows, NO motion blur, NO background scenery.",
  posePrompts: [
    "same bird, wings spread WIDE and raised UP high in a big flap, body lifting",
    "same bird, wings stretched fully DOWN in a powerful downstroke flap",
    "same bird, wings half-open gliding pose, gentle",
  ],
  outPath: `${OUT}/bird.png`,
});

// --- Form 3: the fish (swims through water) ---
await genSpriteSheet({
  masterPrompt:
    "Cute cartoon fish character, 2D platformer pixel art sprite, chubby " +
    "orange-and-white clownfish with big friendly eye, side view facing RIGHT, " +
    "fins out, on a clean solid white background. Whole character fully visible, " +
    "centered, with margin. NO gradients, NO drop shadows, NO background scenery.",
  posePrompts: [
    "same clownfish, tail swished UP and body curved, swimming wiggle",
    "same clownfish, tail swished DOWN and body curved the other way, swimming wiggle",
    "same clownfish, tail straight, gliding forward calmly",
  ],
  outPath: `${OUT}/fish-form.png`,
});

console.log("✅ shapeshift assets done");
