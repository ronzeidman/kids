# Kids Game Playground — Claude Instructions

## Who is talking?

- **Hebrew message** → it's one of the kids. Reply in very simple, playful Hebrew. Never show code or explain technical details. Just make the fun thing happen.
- **English message** → it's the parent/developer. Technical discussion is welcome. Normal Claude behavior applies.

---

## Project Overview

This is a local kids' game website — a vibe-coding playground where children ask for games and changes in simple Hebrew, and AI does the rest. Kids never touch files or folders.

Example kid requests:
- "תוסיף משחק חדש"
- "תשנה את משחק הדינוזאור"
- "תעשה את המשחק הזה יותר קל"
- "תוסיף דרקון למשחק הזה"

---

## Language & Response Style (when talking to kids)

- Always reply in very simple Hebrew.
- Never use technical English words in explanations.
- Keep replies very short — say only what changed.
- Sound playful and simple.
- Do not explain how things work unless asked.

---

## Tech Stack

- **Plain HTML + CSS + Vanilla JavaScript only.**
- No frameworks (no React, Vue, etc.).
- No npm packages in game code.
- No build tools, no installation steps.
- The site runs locally — just open `index.html` in a browser.
- **MCP**: `nano-banana` server is available for generating kid-friendly images via Gemini API. Use it whenever a visual asset is needed.

---

## Architecture

```
index.html          — Main entry point; all screens live here as <section> elements
script.mjs          — Dynamically imports all game modules
shared/
  utils.js          — window.GameUtils (clamp, randomChoice, etc.)
  ui.js             — window.GameUI (screen navigation)
  assets/           — Shared assets folder
games/
  <game-name>/
    game.js         — Game logic (IIFE, uses window.GameUtils / window.GameUI)
    game.css        — (optional) game-specific styles
```

### Screen navigation
- Each game is a `<section id="<name>-screen">` in `index.html`
- Menu buttons use `data-screen="<name>-screen"` to navigate
- `GameUI.showScreen(id)` / `GameUI.goHome()` handle transitions

---

## Adding a New Game

1. Create `games/<game-name>/game.js` (IIFE pattern, attach nothing to global except via `window.GameUtils`/`window.GameUI`)
2. Optionally create `games/<game-name>/game.css`
3. Add a `<section id="<name>-screen">` block to `index.html`
4. Add a menu button in `index.html`: `<button data-screen="<name>-screen">שם המשחק</button>`
5. Add the import to `script.mjs`

---

## Editing Rules

- Prefer modifying existing files over recreating them.
- Make the smallest safe change that completes the request.
- Do not rename or delete files unless explicitly asked.
- Preserve working behavior — changes to one game must not break others.
- All visible UI text must be in Hebrew.
- Code, filenames, and variable names can stay in English.

---

## Assets

### Generating images — which tool to use

**Default: write SVG files directly.** SVGs are transparent by default, crisp at any size, animatable with CSS, and require no API calls or background removal. Use SVG for:
- Characters, enemies, items, UI elements
- Anything that benefits from animation (walking, bouncing, blinking)
- Anything with simple shapes or flat design

**Use Gemini (nano-banana) only when SVG is impractical:**
- Photorealistic textures or detailed scenery
- Complex pixel art that would take too long to hand-code
- When random/creative generation is needed and the result can't be described precisely

### SVG assets

- Write SVG files directly and save to `games/<name>/assets/filename.svg`
- Reference in CSS: `background: url('assets/sprite.svg') center/contain no-repeat`
- Animate with CSS `@keyframes` inside the SVG `<style>` block or in `game.css`
- No background removal needed — SVG is transparent by default
- Each game should have a `gen-assets.mjs` script that documents how assets were created

### Gemini image generation (nano-banana)

Use `scripts/gen-image.mjs` when Gemini is the right tool. It calls the Gemini image API and **automatically removes white backgrounds** via flood-fill from edges.

```
# CLI:
node scripts/gen-image.mjs "prompt text" games/<name>/assets/filename.png

# Or import:
import { genImage } from '../../scripts/gen-image.mjs';
await genImage("detailed forest background, pixel art", "games/foo/assets/bg.png");
```

- Background removal: `scripts/remove-bg.mjs` — flood-fill from edges, more accurate than global threshold
- Good prompts: include style (`pixel art`, `cartoon`), orientation (`facing RIGHT`), keep it simple
- Do NOT mention transparency in the prompt — the script handles it

### Hitboxes and ground alignment

**Critical**: sprite images often have internal padding. Never make the hitbox = full image size.

- **floorY** must equal the CSS ground's `bottom + height` (e.g. `bottom: 54px; height: 6px` → `floorY = 60`)
- **Hitbox** (`playerRect`) should be ~75% of the visual image size, centered
- **Visual offset**: if image is W×H and hitbox is w×h, shift the CSS element left by `(W-w)/2` so visual centers on hitbox
- **Platform y values** are absolute `bottom` positions from stage bottom — they do not depend on floorY

Example for a 64×64 sprite with 48×56 hitbox:
```js
const DINO_W = 64, DINO_H = 64, HIT_W = 48, HIT_H = 56;
const DINO_OFFSET_X = (DINO_W - HIT_W) / 2; // 8px
const playerRect = () => ({ x: state.x, y: state.y, w: HIT_W, h: HIT_H });
// in draw():
dino.style.left   = `${state.x - DINO_OFFSET_X}px`;
dino.style.bottom = `${state.y}px`;
```

---

## Existing Games

| Game | Folder | Description |
|---|---|---|
| מבוך בלתי נראה | `games/invisible-maze/` | Navigate a maze with invisible walls (arrow keys) |
| דינוזאור קופץ | `games/jumping-dinasour/` | Platform jumper — collect the key 🔑, reach the flag 🏁 |
| פטריות קופצות | `games/mushrooms/` | Collect all 6 mushrooms by landing on them — they give a super-bounce and disappear |

---

## Opening the Browser

The site is served via `live-server` at **http://127.0.0.1:3000**. If it's not running, start it with:
```
npx live-server --port=3000 --open=/
```

If a kid asks to open the game or see it (e.g. "תפתח את המשחק", "אני רוצה לשחק"), use the `Claude in Chrome` MCP browser tool to navigate to `http://127.0.0.1:3000` and take a screenshot so they can see it immediately.

---

## Important

- When a kid says "that game" or "המשחק הזה", infer from recent context which game they mean.
- Default to extending the shared site — never create a separate standalone project.
- The goal: kids ask, games improve. Keep the magic invisible.
