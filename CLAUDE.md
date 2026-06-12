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

- **Plain HTML + CSS + Vanilla JavaScript only.** No frameworks, no npm packages in game code, no build tools.
- Platformers use **Kaplay** via CDN (no build step) — through the template, never hand-rolled.
- The site runs locally — `npx live-server --port=3000` serves it at http://127.0.0.1:3000.
- Sprites are PNGs generated via Gemini (`scripts/gen-image.mjs` and friends).

---

## Architecture

Multi-page app, not an SPA. Each game lives at its own URL under `/games/<name>/` — the menu page only links to them.

```
index.html                    — Menu page; just links out to each game
style.css                     — Shared site-wide styles
shared/
  utils.js                    — window.GameUtils (clamp, randomChoice, etc.)
  ui.js                       — window.GameUI.goHome() + [data-back] auto-bind
  assets/                     — Reusable PNGs + MANIFEST.md index
  platformer-template/        — Kaplay starting point for every new platformer
games/
  <game-name>/
    index.html                — Standalone page (entry point)
    game.js                   — Game logic (IIFE)
    game.css                  — (optional) game-specific styles
    gen-assets.mjs            — Regenerates this game's sprites (required)
    assets/                   — Generated PNGs + sheet-meta.js
```

- Menu links (`<a class="game-card" href="games/<name>/">`) are real page navigations; the browser back button returns to the menu. Game state initializes fresh on every visit.
- Inside a game, `<button class="back-btn" data-back>חזרה</button>` is auto-bound by `shared/ui.js`.

---

## Building or changing a game? A skill has the full playbook — use it, don't improvise.

1. **Any new visual asset needed** → use the **`game-assets`** skill FIRST (sprites before logic). It has the proven prompt templates, the sprite-sheet/metadata pipeline, and the tall-structure generator for climbable trees/pillars.
2. **Jumping / gravity / platforms / climbing / swimming / flying / riding** → use the **`kaplay-platformer`** skill. Start from `shared/platformer-template/` — never hand-roll physics, never copy the legacy emoji games.
3. **Everything else** (throwing, top-down, puzzle, sandbox, drawing, reaction) → use the **`vanilla-arcade`** skill.

Finish line for EVERY game (the game is not done until all three):
- Menu link added in `/index.html`.
- Row added to the Existing Games table below.
- `games/<name>/gen-assets.mjs` exists and regenerates the game's art.

---

## Editing Rules

- Prefer modifying existing files over recreating them.
- Make the smallest safe change that completes the request.
- Do not rename or delete files unless explicitly asked.
- Preserve working behavior — changes to one game must not break others.
- All visible UI text must be in Hebrew. Code, filenames, and variable names stay in English.

---

## Asset Hard Rules

- **No emoji sprites.** Players, enemies, collectibles, and anything persistent on screen are generated PNGs. Emoji is allowed only for momentary particle bursts (✨💥) and tiny HUD accents. The full generation guide is in the `game-assets` skill.
- **Check `shared/assets/MANIFEST.md` before generating anything.** Reuse listed assets (ground, brick, flag, fish, dog enemy...) — never regenerate near-duplicates.

---

## Existing Games

The ⚠ marker means "currently uses emoji sprites — this is debt, not a model to copy." New games must use PNG assets via `gen-assets.mjs`. New platformers must use the Kaplay template.

| Game | Folder | Description | Assets | Engine |
|---|---|---|---|---|
| מבוך בלתי נראה | `games/invisible-maze/` | Navigate a maze with invisible walls | none needed | vanilla |
| פטריות קופצות | `games/mushrooms/` | Collect 6 mushrooms by landing on them | PNG ✓ | vanilla (legacy) |
| בננה | `games/banana/` | Toss a banana to the monkey | PNG ✓ | vanilla |
| מפתח הגיבור | `games/hero-key/` | Grab the key, dodge enemies | PNG ✓ | vanilla (legacy) |
| הרפתקאות | `games/adventure/` | Canvas platformer, 5 transformable characters | emoji ⚠ | vanilla (legacy) |
| חול | `games/sandbox/` | Falling-sand cellular automaton, 10 elements | procedural pixels | vanilla |
| חיות | `games/animals/` | Emoji animal interaction | emoji ⚠ | vanilla |
| גורילה | `games/gorilla/` | Throw bananas between gorillas | emoji ⚠ | vanilla |
| קירבי | `games/kirby/` | Kirby-style platformer | emoji ⚠ | vanilla (legacy) |
| מריו | `games/mario/` | Mario-style platformer | emoji ⚠ | vanilla (legacy) |
| חתול מריו | `games/cat-mario/` | Cat platformer | emoji ⚠ | vanilla (legacy) |
| מריו חתולים החדש | `games/cat-mario-v2/` | Kaplay rebuild of cat platformer with generated sprites | PNG ✓ (sprite sheet) | kaplay |
| רוכב החיות | `games/animal-rider/` | Boy mounts horse (faster) or dragon (higher jump); snakes on ground, bats in sky; star shield + fireball power | PNG ✓ (sprite sheets) | kaplay |
| הקוף | `games/monkey/` | Monkey punches enemies, climbs trees (T tiles, segmented tall-tree sprite), collects bananas; jungle level with snakes & tigers | PNG ✓ (sprite sheet) | kaplay |
| חלל | `games/space-beam/` | Space platformer-shooter | emoji ⚠ | vanilla (legacy) |
| יורה | `games/shooter/` | Phaser shooter | generated shapes | phaser |
| משנה צורות | `games/shapeshift/` | Transform puzzle-platformer: boy turns into bird (flap up through top-gap doors) or fish (swim through water channels; non-fish drown). No enemies — animal-gated puzzles | PNG ✓ (sprite sheets) | kaplay |

"legacy" = predates the Kaplay template. New platformers should use the template at `shared/platformer-template/`, not copy these.

---

## Opening the Browser

The site is served via `live-server` at **http://127.0.0.1:3000**. If it's not running:
```
npx live-server --port=3000 --open=/
```

If a kid asks to open the game or see it (e.g. "תפתח את המשחק", "אני רוצה לשחק"), use the `Claude in Chrome` MCP browser tool to navigate to `http://127.0.0.1:3000` and take a screenshot so they can see it immediately.

When verifying a game yourself, prefer the preview server (`.claude/launch.json`, name `kids-games`) — a hidden Chrome tab never fires `requestAnimationFrame`, so canvas games look blank there even when they work.

---

## Important

- When a kid says "that game" or "המשחק הזה", infer from recent context which game they mean.
- Default to extending the shared site — never create a separate standalone project.
- The goal: kids ask, games improve. Keep the magic invisible.
