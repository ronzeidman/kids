/**
 * Regenerate cat-mario-v2 GAME-SPECIFIC assets only.
 *
 *   GEMINI_API_KEY=... node games/cat-mario-v2/gen-assets.mjs
 *
 * Shared tiles, props, and the dog enemy come from `shared/assets/` — see
 * `shared/assets/MANIFEST.md`. We only regenerate the cat sprite sheet here
 * because it's the only character unique to this game.
 *
 * If you copy this game as a starting point for a new platformer, point a
 * new prompt at THIS file's character (cat → fox / dragon / whatever) and
 * keep all loadSprite("ground" / "brick" / "fish" / "flag" / "dog") calls in
 * game.js pointing at `../../shared/assets/...`.
 */
import { genSpriteSheet } from "../../scripts/gen-sprite-sheet.mjs";

const OUT = "games/cat-mario-v2/assets";

await genSpriteSheet({
  masterPrompt:
    "Cute cartoon orange tabby cat character, anthropomorphic, standing on " +
    "two hind legs like a video game hero, 2D platformer pixel art sprite, " +
    "bold black outlines 2 pixels wide, flat colors, orange fur with darker " +
    "stripes, white belly, green eyes, side view facing RIGHT, standing idle " +
    "with both feet flat on the ground, arms relaxed at sides. " +
    "TAIL IS HELD STRAIGHT UP behind the back, never below the feet. " +
    "Feet are the LOWEST point of the character — nothing extends below the feet line. " +
    "Solid white background. Whole character fully visible. " +
    "NO gradients, NO drop shadows, NO motion blur, NO background scenery.",
  posePrompts: [
    "Same cat hero, mid-walk stride — RIGHT leg LIFTED HIGH and bent forward, " +
    "LEFT leg planted straight back, RIGHT arm swung dramatically BACK, " +
    "LEFT arm swung dramatically FORWARD, body leaning forward, tail UP. " +
    "Feet (or the planted back leg) are the LOWEST point of the character. " +
    "Very obvious walking pose, dramatically different from idle.",
    "Same cat hero, passing pose mid-walk — both legs nearly together but RIGHT " +
    "leg slightly back and LEFT leg slightly forward, both arms hanging neutral, " +
    "body fully upright, tail UP. Feet are the LOWEST point of the character. " +
    "Clearly mid-stride, NOT idle.",
    "Same cat hero, mid-walk stride — LEFT leg LIFTED HIGH and bent forward, " +
    "RIGHT leg planted straight back, LEFT arm swung dramatically BACK, " +
    "RIGHT arm swung dramatically FORWARD, body leaning forward, tail UP. " +
    "Feet (or the planted back leg) are the LOWEST point of the character. " +
    "Mirror of the first walk pose, dramatically different from idle.",
  ],
  outPath: `${OUT}/cat.png`,
});
