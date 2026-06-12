// Platformer template — Kaplay-based. This is the starting point for EVERY new
// platformer: copy this folder to games/<name>/, then change ONLY the sections
// marked "CHANGE THIS". Physics, camera, death, levels and win flow are done.
// Do NOT hand-roll AABB collision, gravity, or animation.

const k = kaplay({
  canvas: document.getElementById("game-canvas"),
  width: 900,
  height: 500,
  background: [135, 206, 235], // CHANGE THIS — sky color per theme
  letterbox: true,
  global: false,
});

// ===== KNOBS — physics feel (DO NOT TOUCH unless the kid asked for a feel change) =====
const GRAVITY        = 1800;   // "יותר כבד" / falls too slow → raise
const FALL_MULT      = 1.6;    // "נופל מהר מדי" → lower toward 1
const JUMP_FORCE     = 900;    // "קפיצה גבוהה יותר" → raise
const MOVE_SPEED     = 240;    // "רץ יותר מהר" → raise
const CUT_JUMP_SPEED = 250;    // "קפיצה ארוכה כשמחזיקים רווח" → raise
const COYOTE_TIME    = 0.10;   // "קופץ אחרי שיוצא מהקצה" → raise to ~0.18
const JUMP_BUFFER    = 0.10;   // "הקפיצה לא קולטת אם לוחצים מוקדם" → raise to ~0.18
const ENEMY_SPEED    = 60;     // enemy patrol speed

const TILE = 48;               // DO NOT TOUCH — all sizes & hitboxes derive from it

k.setGravity(GRAVITY);

// ===== THEME — sprites (CHANGE THIS for a new game) =====
// Hero is a generated sprite sheet. Its frame dimensions come from
// assets/sheet-meta.js (written by gen-sprite-sheet.mjs) — never guess them.
const HERO_META = window.SHEET_META?.hero;
k.loadSprite("hero", "assets/hero.png", {
  sliceX: HERO_META?.frames ?? 4,
  anims: {
    idle: 0,
    run:  { from: 1, to: 3, loop: true, speed: 10 },
  },
});
// Reusable art — check shared/assets/MANIFEST.md before generating new sprites.
k.loadSprite("ground", "../../shared/assets/ground.png");
k.loadSprite("brick",  "../../shared/assets/brick.png");
k.loadSprite("fish",   "../../shared/assets/fish.png");
k.loadSprite("flag",   "../../shared/assets/flag.png");
k.loadSprite("dog",    "../../shared/assets/dog.png", {
  sliceX: 2,
  anims: { walk: { from: 0, to: 1, loop: true, speed: 6 } },
});

// Display size: pick the gameplay HEIGHT, derive width from the sheet's real
// aspect ratio so the sprite is never stretched.
const HERO_H = TILE * 1.2;
const HERO_W = Math.round(HERO_H * (HERO_META?.aspect ?? 0.9));
// Hitbox: smaller than the visual — centered horizontally, feet-aligned.
const HIT_W = TILE - 20;
const HIT_H = TILE * 1.15;

// ===== LEVELS (CHANGE THIS — this is most of what makes a new game) =====
// Symbols:  '=' ground   '#' brick platform   'P' player spawn
//           'e' enemy    'c' collectible      'F' goal flag    ' ' empty
const LEVELS = [
  // ── שלב 1 — קל: ללמוד לקפוץ ולאסוף ──
  [
    "                                              ",
    "                                              ",
    "                                              ",
    "              c                               ",
    "             ###          c c                 ",
    "                         #####                ",
    "      c                            c       F  ",
    "     ###                                  ### ",
    "  P            e                  e           ",
    "==============================================",
  ],
  // ── שלב 2 — בורות! ליפול = למות ──
  [
    "                                                    ",
    "                                                    ",
    "               c                  c c               ",
    "              ###                #####              ",
    "         c                                  c       ",
    "        ###        c c                     ###      ",
    "                  #####                          F  ",
    "  P                          e        e         ### ",
    "         e                                          ",
    "======    ==========    ================    ========",
  ],
];

// ===== HUD =====
const statusEl = document.getElementById("status");
let collected = 0;
let levelIndex = 0;
let levelDone = false;
let level = null;
let player = null;

function updateStatus() {
  if (!statusEl) return;
  statusEl.textContent = `שלב ${levelIndex + 1}/${LEVELS.length} · 🐟 ${collected}`;
}

// ===== Level construction (DO NOT TOUCH — add tile types, don't restructure) =====
function buildLevel(idx) {
  // Tear down the previous level completely before rebuilding.
  for (const tag of ["ground", "player", "enemy", "collect", "flag"]) k.destroyAll(tag);
  if (level) { try { k.destroy(level); } catch {} }

  levelIndex = idx;
  levelDone = false;

  level = k.addLevel(LEVELS[idx], {
    tileWidth:  TILE,
    tileHeight: TILE,
    tiles: {
      "=": () => [
        k.sprite("ground", { width: TILE, height: TILE }),
        k.area(),
        k.body({ isStatic: true }),
        "ground",
      ],
      "#": () => [
        k.sprite("brick", { width: TILE, height: TILE }),
        k.area(),
        k.body({ isStatic: true }),
        "ground",
      ],
      "P": () => [
        k.sprite("hero", { width: HERO_W, height: HERO_H }),
        // Hitbox is ALWAYS a sub-rect of the visual sprite. Press D to verify
        // the red rect hugs the body. Never use the full sprite as the hitbox.
        k.area({ shape: new k.Rect(k.vec2((HERO_W - HIT_W) / 2, HERO_H - HIT_H), HIT_W, HIT_H) }),
        k.body({ jumpForce: JUMP_FORCE }),
        k.z(10),
        { facing: 1, jumpBufferT: 0, coyoteT: 0, dead: false },
        "player",
      ],
      "e": () => [
        k.sprite("dog", { width: TILE, height: TILE }),
        k.area({ shape: new k.Rect(k.vec2(4, 4), TILE - 8, TILE - 8) }),
        k.body(),
        { dir: -1 },
        "enemy",
      ],
      "c": () => [
        k.sprite("fish", { width: TILE * 0.6, height: TILE * 0.6 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 0.6) }),
        "collect",
      ],
      "F": () => [
        k.sprite("flag", { width: TILE, height: TILE * 2 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 2) }),
        "flag",
      ],
    },
  });

  player = level.get("player")[0];
  player.play("idle");
  wirePlayer();
  updateStatus();
}

// ===== Per-player wiring — re-attached on every level rebuild (DO NOT TOUCH) =====
function wirePlayer() {
  player.onUpdate(() => {
    if (player.dead) return;

    // Coyote time + jump buffer + asymmetric fall gravity
    if (player.isGrounded()) {
      player.coyoteT = COYOTE_TIME;
    } else {
      player.coyoteT = Math.max(0, player.coyoteT - k.dt());
      if (player.vel.y > 0) player.vel.y += GRAVITY * (FALL_MULT - 1) * k.dt();
    }
    player.jumpBufferT = Math.max(0, player.jumpBufferT - k.dt());
    if (player.jumpBufferT > 0 && player.coyoteT > 0) {
      player.jump();
      player.jumpBufferT = 0;
      player.coyoteT = 0;
    }

    // Animation: drive from INPUT, not velocity — Kaplay 3001's body().move()
    // never updates vel.x, so a velocity check would never trigger "run".
    const moving = (k.isKeyDown("left") || k.isKeyDown("right")) && player.isGrounded();
    const want = moving ? "run" : "idle";
    if (player.curAnim() !== want) player.play(want);

    // Fell off the world
    if (player.pos.y > 1000) die();
  });

  // Stomp kills the enemy; touching it from the side kills you.
  player.onCollide("enemy", (e, col) => {
    if (player.dead) return;
    if (col?.isBottom() || player.vel.y > 80) {
      k.destroy(e);
      player.jump(JUMP_FORCE * 0.7);
      return;
    }
    die();
  });

  player.onCollide("collect", (c) => {
    k.destroy(c);
    collected += 1;
    updateStatus();
  });

  player.onCollide("flag", () => {
    if (player.dead || levelDone) return;
    levelDone = true;
    if (levelIndex + 1 < LEVELS.length) {
      showOverlay(`✅ שלב ${levelIndex + 1} עבר! 🐟 ${collected}`, () => buildLevel(levelIndex + 1));
    } else {
      showOverlay(`🎉 ניצחת! 🐟 ${collected}`, () => { collected = 0; buildLevel(0); });
    }
  });
}

// ===== Global input — bound once, uses the current `player` (DO NOT TOUCH) =====
k.onKeyDown("left", () => {
  if (!player || player.dead) return;
  player.move(-MOVE_SPEED, 0);
  player.facing = -1;
  player.flipX = true;
});
k.onKeyDown("right", () => {
  if (!player || player.dead) return;
  player.move(MOVE_SPEED, 0);
  player.facing = 1;
  player.flipX = false;
});
k.onKeyPress("space", () => {
  if (!player || player.dead) return;
  player.jumpBufferT = JUMP_BUFFER;
});
k.onKeyRelease("space", () => {
  // Release-to-cut variable jump height
  if (player && player.vel.y < -CUT_JUMP_SPEED) player.vel.y = -CUT_JUMP_SPEED;
});

// ===== Enemy patrol — flips direction on wall hit (DO NOT TOUCH) =====
k.onUpdate("enemy", (e) => {
  e.move(ENEMY_SPEED * e.dir, 0);
  if (e.curAnim() !== "walk") e.play("walk");
  e.flipX = e.dir > 0;
});
k.onCollide("enemy", "ground", (e, _g, col) => {
  if (col?.isLeft())  e.dir =  1;
  if (col?.isRight()) e.dir = -1;
});

// ===== Camera — smooth follow (DO NOT TOUCH) =====
k.onUpdate(() => {
  if (!player) return;
  k.setCamPos(k.getCamPos().lerp(player.pos, 0.15));
});

// ===== Death — red tint, hop, rebuild the level (DO NOT TOUCH) =====
function die() {
  if (player.dead) return;
  player.dead = true;
  player.use(k.color(180, 60, 60));
  player.vel.x = 0;
  player.jump(JUMP_FORCE * 1.1);
  k.wait(1.2, () => buildLevel(levelIndex));
}

// ===== Hebrew overlay between levels (DO NOT TOUCH) =====
function showOverlay(text, after) {
  const overlay = document.createElement("div");
  overlay.lang = "he"; overlay.dir = "rtl";
  overlay.textContent = text;
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", display: "flex", alignItems: "center",
    justifyContent: "center", background: "rgba(0,0,0,0.65)", color: "#ffe666",
    fontSize: "clamp(2rem, 6vw, 4rem)", fontWeight: "bold",
    fontFamily: "system-ui, sans-serif", textShadow: "0 3px 10px rgba(0,0,0,0.9)",
    zIndex: 9999,
  });
  document.body.appendChild(overlay);
  setTimeout(() => { overlay.remove(); after?.(); }, 2000);
}

// ===== Debug — press D (or ?debug in URL) to see hitboxes in red =====
k.onKeyPress("d", () => { k.debug.inspect = !k.debug.inspect; });
if (location.search.includes("debug")) k.debug.inspect = true;

// ===== Boot =====
buildLevel(0);

// Test hook: lets browser-automation verification reach the live game state
// (window.__game.player.pos, .teleport(x,y), etc.). Harmless in production.
window.__game = {
  k,
  get player() { return player; },
  get levelIndex() { return levelIndex; },
  teleport(x, y) { player.pos.x = x; player.pos.y = y; },
};
