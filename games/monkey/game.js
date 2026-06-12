// הקוף — jungle platformer with multiple levels + hidden bonus areas.
// Monkey can run, jump, climb trees, and punch enemies.

const k = kaplay({
  canvas: document.getElementById("game-canvas"),
  width: 900,
  height: 500,
  background: [44, 148, 66],
  letterbox: true,
  global: false,
});

// --- Physics ---
const GRAVITY        = 1800;
const FALL_MULT      = 1.6;
const JUMP_FORCE     = 900;
const MOVE_SPEED     = 240;
const CUT_JUMP_SPEED = 250;
const COYOTE_TIME    = 0.10;
const JUMP_BUFFER    = 0.10;

const PUNCH_DURATION = 0.30;
const PUNCH_ACTIVE   = 0.18;
const PUNCH_REACH    = 50;
const CLIMB_SPEED    = 200;

k.setGravity(GRAVITY);

// --- Sprites ---
k.loadSprite("monkey", "assets/monkey.png", {
  sliceX: 5,
  anims: {
    idle:  0,
    run:   { from: 1, to: 3, loop: true, speed: 10 },
    punch: 4,
  },
});
k.loadSprite("snake", "assets/snake.png", {
  sliceX: 2,
  anims: { walk: { from: 0, to: 1, loop: true, speed: 5 } },
});
k.loadSprite("tiger", "assets/tiger.png", {
  sliceX: 2,
  anims: { walk: { from: 0, to: 1, loop: true, speed: 6 } },
});
// Tree is ONE tall image sliced into 3 segments (0=canopy, 1=trunk, 2=roots)
// by genTallStructure — frames get assigned per column position in buildLevel.
k.loadSprite("tree",   "assets/tree.png", { sliceY: 3 });
k.loadSprite("banana", "assets/banana.png");
k.loadSprite("ground", "../../shared/assets/ground.png");
k.loadSprite("flag",   "../../shared/assets/flag.png");

const TILE = 48;

// '=' ground | 'T' climbable tree | 'P' player spawn
// 's' snake  | 't' tiger          | 'b' banana | 'h' hidden banana
// 'F' goal flag
//
// Hidden bananas ('h') only appear inside secret nooks reachable by climbing.
const LEVELS = [
  // ───────────── שלב 1 — ג'ונגל קל, יער של עצים ────────────
  [
    "                                                                           ",
    "                                                                           ",
    "             T          h h         T                                      ",
    "             T                      T                                      ",
    "      b      T          b b         T          b b b                       ",
    "             T  ===                 T                                      ",
    "             T                      T                T                 F   ",
    "             T          b           T      b   b     T                ===  ",
    "  P          T   s              t   T              s T          t          ",
    "===============================================================  =========",
  ],
  // ───────────── שלב 2 — חדר סודי גבוה ────────────
  [
    "                                                                                ",
    "                T   h h h h h           T                                       ",
    "                T   =======             T            T                          ",
    "                T                       T            T                          ",
    "                T          b b          T            T   h h h                  ",
    "                T                       T            T   =====                  ",
    "                T                       T            T                          ",
    "       b b      T          b            T      b b   T          b b b      F    ",
    "                T                       T            T                  ====    ",
    "  P             T     s       t         T        s   T   t      s          =    ",
    "===============================================================================",
  ],
  // ───────────── שלב 3 — קשה, הרבה אויבים ────────────
  [
    "                                                                                        ",
    "        T            T            T            T            T              T            ",
    "        T   h h      T            T   h h      T            T   h h h      T            ",
    "        T   ====     T            T   ====     T            T   ======     T            ",
    "        T            T            T            T            T              T            ",
    "        T            T   b b      T            T   b b      T              T   b b   F  ",
    "        T            T            T   b b b    T            T              T        ====",
    "        T   b b      T            T            T            T              T            ",
    "  P     T  s   t  b  T  t  s  b   T  s  t  b   T   s   t  b T   s  t   b   T b   s   t  ",
    "========================================================================================",
  ],
];

const statusEl = document.getElementById("status");
let bananas = 0;
let levelIndex = 0;
let levelDone = false;
let level = null;
let player = null;

function updateStatus() {
  if (!statusEl) return;
  statusEl.textContent = `שלב ${levelIndex + 1}/${LEVELS.length} · 🍌 ${bananas}`;
}

// --- Level construction ---
function buildLevel(idx) {
  // Tear down previous level + any stray entities (enemies, punchboxes, overlays)
  if (level) k.destroyAll("ground");
  k.destroyAll("tree");
  k.destroyAll("player");
  k.destroyAll("enemy");
  k.destroyAll("banana");
  k.destroyAll("flag");
  k.destroyAll("punchbox");
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
      "T": () => [
        k.sprite("tree", { frame: 1, width: TILE, height: TILE }),
        k.area(),
        "tree",
      ],
      "P": () => [
        k.sprite("monkey", { width: TILE, height: TILE * 1.2 }),
        k.area({ shape: new k.Rect(k.vec2(10, 8), TILE - 20, TILE * 1.15) }),
        k.body({ jumpForce: JUMP_FORCE }),
        k.z(10), // monkey draws on top of tree tiles when climbing
        {
          facing: 1, jumpBufferT: 0, coyoteT: 0,
          climbing: false, punchT: 0, dead: false,
        },
        "player",
      ],
      "s": () => [
        k.sprite("snake", { width: TILE * 1.1, height: TILE * 0.7 }),
        k.area({ shape: new k.Rect(k.vec2(4, 6), TILE * 1.1 - 8, TILE * 0.7 - 8) }),
        k.body(),
        { dir: -1 },
        "enemy", "snake",
      ],
      "t": () => [
        k.sprite("tiger", { width: TILE * 1.3, height: TILE * 0.95 }),
        k.area({ shape: new k.Rect(k.vec2(6, 8), TILE * 1.3 - 12, TILE * 0.95 - 12) }),
        k.body(),
        { dir: -1 },
        "enemy", "tiger",
      ],
      "b": () => [
        k.sprite("banana", { width: TILE * 0.6, height: TILE * 0.6 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 0.6) }),
        "banana",
      ],
      "h": () => [
        // Hidden banana: same as 'b' but slightly bigger + sparkly tint to feel special
        k.sprite("banana", { width: TILE * 0.7, height: TILE * 0.7 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.7, TILE * 0.7) }),
        k.color(255, 230, 120),
        { secret: true },
        "banana",
      ],
      "F": () => [
        k.sprite("flag", { width: TILE, height: TILE * 2 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 2) }),
        "flag",
      ],
    },
  });

  // Assign tree segments by column position: topmost tile shows the canopy
  // (frame 0), bottom tile the roots (frame 2), everything between the trunk.
  // Single-tile trees keep the trunk frame.
  const treeCols = new Map();
  for (const t of k.get("tree", { recursive: true })) {
    if (!treeCols.has(t.pos.x)) treeCols.set(t.pos.x, []);
    treeCols.get(t.pos.x).push(t);
  }
  for (const col of treeCols.values()) {
    col.sort((a, b) => a.pos.y - b.pos.y);
    if (col.length > 1) {
      col[0].frame = 0;
      col[col.length - 1].frame = 2;
    }
  }

  player = level.get("player")[0];
  player.play("idle");
  wirePlayer();
  updateStatus();
}

// --- Climb / punch helpers ---
function onTree() {
  // Tree tiles are children of the addLevel() object, so the get must be
  // recursive — a flat k.get("tree") returns [] and climbing never triggers.
  return k.get("tree", { recursive: true }).some((t) => player.isColliding(t));
}
function startClimb() {
  if (player.climbing) return;
  // Snap monkey to the tree he's overlapping, so he hugs the trunk instead
  // of floating inside it at an awkward offset.
  // Pick the closest overlapping tree (in case two trees overlap horizontally)
  const trees = k.get("tree", { recursive: true }).filter((t) => player.isColliding(t));
  const tree = trees.reduce((best, t) =>
    !best || Math.abs(t.pos.x - player.pos.x) < Math.abs(best.pos.x - player.pos.x) ? t : best,
  null);
  if (tree) {
    // Tree and player are both anchored top-left and have the same TILE width,
    // so matching pos.x centers the monkey's sprite over the trunk.
    player.pos.x = tree.pos.x;
  }
  player.climbing = true;
  player.gravityScale = 0;
  player.vel.x = 0;
  player.vel.y = 0;
}
function stopClimb() {
  if (!player.climbing) return;
  player.climbing = false;
  player.gravityScale = 1;
}
function doPunch() {
  if (player.dead || player.climbing) return;
  if (player.punchT > 0) return;
  player.punchT = PUNCH_DURATION;
  player.play("punch");
  const hb = k.add([
    k.rect(PUNCH_REACH, TILE * 0.9),
    k.pos(
      player.pos.x + (player.facing > 0 ? TILE * 0.5 : -PUNCH_REACH - TILE * 0.1),
      player.pos.y,
    ),
    k.area(),
    k.opacity(0),
    { life: PUNCH_ACTIVE },
    "punchbox",
  ]);
  hb.onUpdate(() => {
    hb.life -= k.dt();
    if (hb.life <= 0) k.destroy(hb);
  });
}

// --- Per-player wiring (re-attached on every level rebuild) ---
function wirePlayer() {
  player.onUpdate(() => {
    if (player.dead) return;

    if (player.punchT > 0) {
      player.punchT -= k.dt();
      if (player.punchT <= 0 && player.curAnim() === "punch") {
        player.play("idle");
      }
    }

    if (player.climbing) {
      if (!onTree()) stopClimb();
      if (player.curAnim() === "run") player.play("idle");
    } else {
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
      if (player.punchT <= 0) {
        const inputMoving = k.isKeyDown("left") || k.isKeyDown("right");
        const moving = inputMoving && player.isGrounded();
        const want = moving ? "run" : "idle";
        if (player.curAnim() !== want) player.play(want);
      }
    }

    if (player.pos.y > 1000) die();
  });

  // Stomp / side hit
  player.onCollide("enemy", (e, col) => {
    if (player.dead) return;
    if (col?.isBottom() || player.vel.y > 80) {
      k.destroy(e);
      player.jump(JUMP_FORCE * 0.7);
      bananas += 1;
      updateStatus();
      return;
    }
    if (player.punchT > 0) {
      k.destroy(e);
      bananas += 1;
      updateStatus();
      return;
    }
    die();
  });

  player.onCollide("banana", (b) => {
    k.destroy(b);
    bananas += b.secret ? 3 : 1;
    updateStatus();
  });

  player.onCollide("flag", () => {
    if (player.dead || levelDone) return;
    levelDone = true;
    if (levelIndex + 1 < LEVELS.length) {
      showOverlay(`✅ שלב ${levelIndex + 1} עבר! 🍌 ${bananas}`, () => buildLevel(levelIndex + 1));
    } else {
      showOverlay(`🎉 ניצחת! 🍌 ${bananas}`, () => { bananas = 0; buildLevel(0); });
    }
  });
}

// --- Global input (one-time bind; uses the current `player` reference) ---
k.onKeyDown("left", () => {
  if (!player || player.dead) return;
  if (player.climbing) stopClimb();
  if (player.punchT > 0) return;
  player.move(-MOVE_SPEED, 0);
  player.facing = -1;
  player.flipX = true;
});
k.onKeyDown("right", () => {
  if (!player || player.dead) return;
  if (player.climbing) stopClimb();
  if (player.punchT > 0) return;
  player.move(MOVE_SPEED, 0);
  player.facing = 1;
  player.flipX = false;
});
k.onKeyDown("up", () => {
  if (!player || player.dead) return;
  if (player.climbing) {
    player.move(0, -CLIMB_SPEED);
  } else if (onTree()) {
    startClimb();
  }
});
k.onKeyDown("down", () => {
  if (!player || player.dead) return;
  if (player.climbing) player.move(0, CLIMB_SPEED);
});
k.onKeyPress("space", () => {
  if (!player || player.dead) return;
  if (player.climbing) {
    stopClimb();
    player.jump();
    return;
  }
  player.jumpBufferT = JUMP_BUFFER;
});
k.onKeyRelease("space", () => {
  if (!player) return;
  if (player.vel.y < -CUT_JUMP_SPEED) player.vel.y = -CUT_JUMP_SPEED;
});
k.onKeyPress("x", doPunch);

// --- Global game systems (also bound once) ---
k.onUpdate("snake", (s) => {
  s.move(50 * s.dir, 0);
  if (s.curAnim() !== "walk") s.play("walk");
  s.flipX = s.dir > 0;
});
k.onUpdate("tiger", (t) => {
  t.move(80 * t.dir, 0);
  if (t.curAnim() !== "walk") t.play("walk");
  t.flipX = t.dir > 0;
});
k.onCollide("enemy", "ground", (e, _g, col) => {
  if (col?.isLeft())  e.dir =  1;
  if (col?.isRight()) e.dir = -1;
});
k.onCollide("punchbox", "enemy", (hb, e) => {
  k.destroy(e);
  k.destroy(hb);
  bananas += 1;
  updateStatus();
});

// Camera follows the current player
k.onUpdate(() => {
  if (!player) return;
  const cam = k.getCamPos();
  k.setCamPos(cam.lerp(player.pos, 0.15));
});

// --- Death ---
function die() {
  if (player.dead) return;
  player.dead = true;
  stopClimb();
  player.use(k.color(180, 60, 60));
  player.vel.x = 0;
  player.jump(JUMP_FORCE * 1.1);
  k.wait(1.2, () => buildLevel(levelIndex));
}

// --- Debug ---
k.onKeyPress("d", () => { k.debug.inspect = !k.debug.inspect; });
if (location.search.includes("debug")) k.debug.inspect = true;

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

// --- Boot ---
buildLevel(0);
