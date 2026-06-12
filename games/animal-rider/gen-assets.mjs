/**
 * Regenerate animal-rider assets.
 *   GEMINI_API_KEY=... node games/animal-rider/gen-assets.mjs
 */
import { genImage } from "../../scripts/gen-image.mjs";
import { genSpriteSheet } from "../../scripts/gen-sprite-sheet.mjs";

const OUT = "games/animal-rider/assets";

// --- Hero boy: 4-frame walk cycle ---
await genSpriteSheet({
  masterPrompt:
    "Cute cartoon boy hero character, 2D platformer pixel art sprite, " +
    "bold black outlines 2 pixels wide, flat colors, brown hair, blue shirt, " +
    "red pants, side view facing RIGHT, standing idle with both feet flat, " +
    "arms relaxed at sides. Solid white background. Whole character fully visible. " +
    "NO gradients, NO drop shadows, NO motion blur, NO background scenery.",
  posePrompts: [
    "Same boy hero, mid-walk stride — RIGHT leg LIFTED HIGH bent forward, " +
    "LEFT leg planted back, RIGHT arm swung BACK, LEFT arm swung FORWARD, " +
    "body leaning forward. Very obvious walking pose.",
    "Same boy hero, passing pose mid-walk — legs nearly together but RIGHT " +
    "slightly back LEFT slightly forward, arms hanging neutral, body upright.",
    "Same boy hero, mid-walk stride — LEFT leg LIFTED HIGH bent forward, " +
    "RIGHT leg planted back, LEFT arm swung BACK, RIGHT arm swung FORWARD, " +
    "body leaning forward. Mirror of first walk pose.",
  ],
  outPath: `${OUT}/hero.png`,
});

// --- Horse: 4-frame gallop ---
await genSpriteSheet({
  masterPrompt:
    "Cartoon brown horse, side view facing RIGHT, standing on all four legs " +
    "evenly, 2D platformer pixel art sprite, bold black outlines 2 pixels wide, " +
    "flat colors, brown coat, black mane and tail, friendly face. Solid white " +
    "background. Whole horse fully visible. NO gradients, NO shadows, NO scenery.",
  posePrompts: [
    "Same brown horse, mid-gallop — front legs LIFTED HIGH and stretched forward, " +
    "back legs stretched far back, mane flowing, facing RIGHT.",
    "Same brown horse, passing pose — all legs nearly under body but front-left " +
    "and back-right lifted slightly, facing RIGHT.",
    "Same brown horse, mid-gallop — back legs LIFTED HIGH and tucked forward " +
    "under belly, front legs stretched forward planted, facing RIGHT.",
  ],
  outPath: `${OUT}/horse.png`,
});

// --- Dragon: 4-frame wing flap ---
await genSpriteSheet({
  masterPrompt:
    "Cute friendly cartoon baby dragon, side view facing RIGHT, standing on " +
    "two hind legs, 2D platformer pixel art sprite, bold black outlines 2 pixels " +
    "wide, flat colors, bright green scales, small white belly, tiny purple wings " +
    "folded at sides, big friendly eyes, small smile. Solid white background. " +
    "Whole dragon fully visible. NO gradients, NO shadows, NO scenery.",
  posePrompts: [
    "Same baby dragon, wings SPREAD OPEN WIDE upward, body crouched slightly, " +
    "facing RIGHT, ready to leap.",
    "Same baby dragon, wings at horizontal mid-flap, body upright, facing RIGHT.",
    "Same baby dragon, wings SPREAD WIDE DOWNWARD, body lifted slightly off " +
    "ground, facing RIGHT.",
  ],
  outPath: `${OUT}/dragon.png`,
});

// --- Snake: 2-frame slither ---
await genSpriteSheet({
  masterPrompt:
    "Cartoon green snake enemy, side view facing LEFT, coiled S-shape body on " +
    "the ground, 2D platformer pixel art sprite, bold black outlines 2 pixels " +
    "wide, flat colors, bright green scales, yellow underbelly, red forked " +
    "tongue sticking out, angry eyes. Solid white background. Whole snake " +
    "fully visible. NO gradients, NO shadows, NO scenery.",
  posePrompts: [
    "Same green snake, body in mirrored S-shape — head still up and forward " +
    "facing LEFT, tongue out, but the curves of the body flipped to the opposite " +
    "side. Same angry face.",
  ],
  outPath: `${OUT}/snake.png`,
});

// --- Bat: 2-frame wing flap ---
await genSpriteSheet({
  masterPrompt:
    "Cartoon purple bat enemy, front view facing the camera, wings SPREAD WIDE " +
    "horizontally, 2D platformer pixel art sprite, bold black outlines 2 pixels " +
    "wide, flat colors, dark purple body, lighter purple wings, two small " +
    "white fangs, angry red eyes. Solid white background. Whole bat fully " +
    "visible. NO gradients, NO shadows, NO scenery.",
  posePrompts: [
    "Same purple bat, wings FOLDED DOWN below body in mid-flap, same angry " +
    "front-facing pose, fangs visible.",
  ],
  outPath: `${OUT}/bat.png`,
});

// --- Static collectibles & props ---
await genImage(
  "Pixel art gold star power-up, classic five-pointed star, bright yellow with " +
    "thick black outline, simple cartoon, centered on solid white background. " +
    "NO gradients, NO shadows.",
  `${OUT}/star.png`,
  { trimAlpha: true }
);

await genImage(
  "Pixel art red fire flower power-up, cartoon flower with red and orange " +
    "petals shaped like flames, green stem and leaves, big friendly eyes in " +
    "center, bold black outline, solid white background. NO gradients, NO shadows.",
  `${OUT}/fire.png`,
  { trimAlpha: true }
);

await genImage(
  "Pixel art orange fireball projectile, round ball of fire with yellow center " +
    "and orange-red flames, bold black outline, cartoon style, solid white " +
    "background. NO gradients, NO shadows.",
  `${OUT}/fireball.png`,
  { trimAlpha: true }
);

await genImage(
  "Pixel art goal flag for a platformer, tall thin wooden pole with bright " +
    "rainbow-striped triangular flag near the top, cartoon style, bold black " +
    "outline, solid white background. NO gradients, NO shadows.",
  `${OUT}/flag.png`,
  { trimAlpha: true }
);

// --- Tiles ---
await genImage(
  "Pixel art ground tile, 64 pixels square, FULLY FILLED with grass and dirt " +
    "edge to edge. ABSOLUTELY NO black outline, NO border, NO frame. Grass and " +
    "dirt MUST touch all four edges with NO gap. Top quarter bright green grass " +
    "with tufts. Bottom three quarters solid brown dirt with speckles. Cartoon " +
    "platformer style. Tileable seamlessly.",
  `${OUT}/ground.png`
);

await genImage(
  "Pixel art stone platform tile, 64 pixels square, FULLY FILLED with grey " +
    "cobblestone pattern edge to edge. ABSOLUTELY NO outer outline, NO border. " +
    "Grey stones with thin darker mortar lines. Stones MUST touch all four " +
    "edges with NO gap. Cartoon platformer style. Tileable seamlessly.",
  `${OUT}/stone.png`
);
