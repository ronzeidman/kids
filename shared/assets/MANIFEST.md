# Shared Assets Manifest

**Read this before generating any new asset.** Each entry below is a PNG that any game can load via `../../shared/assets/<name>.png`. If your game needs a tile or prop already listed here, **reuse it — do not regenerate**.

If a prompt below is close to what you need but not exact, prefer reusing the existing asset and adapting your game to its style over spending Gemini calls on a near-duplicate.

To add a new shared asset, use `scripts/gen-shared-asset.mjs` (which generates into this folder and appends a row here automatically) or copy a useful one-off out of `games/<name>/assets/` and add a row manually.

**Tiles: always alpha-trim after generating.** Even with "edge-to-edge" prompts Gemini leaves a thin transparent margin around the tile, which makes the tile's hitbox top sit above the visible grass and causes characters to look like they float. Trim with `trimToAlphaBbox` from `scripts/gen-sprite-sheet.mjs`. The existing `ground.png` and `brick.png` have already been trimmed.

## Tiles (32×32–64×64, designed to tile seamlessly)

| File | What | Prompt summary |
|---|---|---|
| `ground.png` | Grass-topped dirt floor tile | Pixel art ground tile, 64px square, top quarter green grass with tufts, bottom three-quarters brown dirt with speckles, fully edge-to-edge with NO outer border. Seamless when tiled. |
| `brick.png`  | Orange-brown brick block tile | Pixel art brick block tile, 64px square, orange-brown brick pattern with thin darker mortar lines, edge-to-edge with NO outer border. Seamless when tiled. |

## Props / collectibles (single-frame PNGs, alpha-trimmed)

| File | What | Prompt summary |
|---|---|---|
| `flag.png` | Goal flag — tall wooden pole with red triangular flag near top | Pixel art platformer goal flag, wooden pole + bright red triangular flag near top, bold black outline, white background (auto-trimmed). |
| `fish.png` | Yellow/orange fish collectible | Pixel art golden fish collectible, yellow body with orange fins, big friendly eye, bold black outlines. |

## Generic enemies (sprite sheets, sliceX>=2)

| File | What | Frames | Prompt summary |
|---|---|---|---|
| `dog.png` | Brown dog enemy, side view, 2-frame walk cycle | sliceX: 2 | Cartoon brown dog enemy, side view facing LEFT, 4 legs, angry expression, bared teeth. Frame 0: standing. Frame 1: dramatic mid-trot. |

## Loading example

```js
// In games/<name>/game.js:
k.loadSprite("ground", "../../shared/assets/ground.png");
k.loadSprite("brick",  "../../shared/assets/brick.png");
k.loadSprite("flag",   "../../shared/assets/flag.png");
k.loadSprite("fish",   "../../shared/assets/fish.png");
k.loadSprite("dog",    "../../shared/assets/dog.png", {
  sliceX: 2,
  anims: { walk: { from: 0, to: 1, loop: true, speed: 6 } },
});
```
