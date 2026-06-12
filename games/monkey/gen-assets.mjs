/**
 * Regenerate monkey-game assets.
 *   GEMINI_API_KEY=... node games/monkey/gen-assets.mjs
 *
 * Reuses shared/assets/ground.png and shared/assets/flag.png — those are NOT
 * generated here, they're loaded directly in game.js via "../../shared/assets/".
 */
import { genImage } from "../../scripts/gen-image.mjs";
import { genSpriteSheet, genTallStructure } from "../../scripts/gen-sprite-sheet.mjs";

const OUT = "games/monkey/assets";

// --- Monkey hero: 5 frames (idle, 3-frame run cycle, punch) ---
await genSpriteSheet({
  masterPrompt:
    "Cute cartoon brown monkey character, 2D platformer pixel art sprite, " +
    "bold black outlines 2 pixels wide, flat colors, light tan face and belly, " +
    "darker brown fur, long curly tail, big friendly eyes, small smile, " +
    "side view facing RIGHT, standing idle on two feet with arms relaxed at sides. " +
    "Solid white background. Whole monkey fully visible, centered with margin. " +
    "NO gradients, NO drop shadows, NO motion blur, NO background scenery.",
  posePrompts: [
    "Same brown monkey, mid-walk stride — RIGHT leg LIFTED HIGH bent forward, " +
    "LEFT leg planted back, RIGHT arm swung BACK, LEFT arm swung FORWARD, " +
    "tail curving up behind, body leaning slightly forward. Very obvious walking pose. " +
    "Facing RIGHT. Same character, same colors, white background.",
    "Same brown monkey, passing pose mid-walk — both legs nearly together " +
    "under body, arms hanging neutral at sides, tail straight down, body upright. " +
    "Facing RIGHT. Same character, same colors, white background.",
    "Same brown monkey, mid-walk stride — LEFT leg LIFTED HIGH bent forward, " +
    "RIGHT leg planted back, LEFT arm swung BACK, RIGHT arm swung FORWARD, " +
    "tail curving up behind, body leaning slightly forward. Mirror of first walk pose. " +
    "Facing RIGHT. Same character, same colors, white background.",
    "Same brown monkey, PUNCHING pose — RIGHT arm THRUST FORWARD with clenched fist " +
    "extended fully to the RIGHT, LEFT arm pulled back at side, body twisted into " +
    "the punch, legs in wide stable stance, angry determined face with mouth open. " +
    "Facing RIGHT. Same character, same colors, white background.",
  ],
  outPath: `${OUT}/monkey.png`,
});

// --- Snake: 2-frame slither (jungle green) ---
await genSpriteSheet({
  masterPrompt:
    "Cartoon bright green jungle snake enemy, side view facing LEFT, coiled S-shape " +
    "body on the ground, 2D platformer pixel art sprite, bold black outlines 2 pixels " +
    "wide, flat colors, vivid green scales, yellow underbelly, red forked tongue " +
    "sticking out LEFT, angry red eyes. Solid white background. Whole snake fully " +
    "visible. NO gradients, NO shadows, NO scenery.",
  posePrompts: [
    "Same green snake, body in mirrored S-shape — head still up and forward " +
    "facing LEFT with tongue out, but the curves of the body flipped to the opposite " +
    "side. Same angry face. White background.",
  ],
  outPath: `${OUT}/snake.png`,
});

// --- Tiger: 2-frame walk cycle ---
await genSpriteSheet({
  masterPrompt:
    "Cartoon orange tiger enemy, side view facing LEFT, standing on all four legs " +
    "evenly, 2D platformer pixel art sprite, bold black outlines 2 pixels wide, " +
    "flat colors, bright orange fur with black tiger stripes, white belly and chin, " +
    "mean angry expression with bared white fangs and yellow eyes. Solid white " +
    "background. Whole tiger fully visible. NO gradients, NO shadows, NO scenery.",
  posePrompts: [
    "Same orange tiger facing LEFT, mid-stride walking pose — front-left leg LIFTED " +
    "HIGH and stretched forward, back-right leg LIFTED back, other two legs planted, " +
    "tail flicking up behind. Same mean face with fangs. White background.",
  ],
  outPath: `${OUT}/tiger.png`,
});

// --- Climbable tree ---
// ONE tall image sliced into 3 segments (canopy / trunk / roots) — stacking a
// single tile never seams and looks like blobs patched on top of each other.
// game.js loads this with sliceY: 3 and assigns frames by column position.
await genTallStructure({
  prompt:
    "Cartoon jungle tree for a 2D platformer: leafy green canopy at the top, " +
    "thick brown bark trunk with vertical wood grain and a few hanging green " +
    "vines, visible roots flaring out at the base. Bold black outlines, flat " +
    "colors, pixel art style",
  outPath: `${OUT}/tree.png`,
  segments: 3,
});

await genImage(
  "Pixel art yellow banana collectible, single curved banana with bright yellow " +
    "peel and small brown stem at the top, bold black outline, cartoon platformer " +
    "style, centered on solid white background. NO gradients, NO shadows.",
  `${OUT}/banana.png`,
  { trimAlpha: true }
);
