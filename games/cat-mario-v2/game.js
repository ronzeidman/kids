// Cat Mario — Kaplay edition.
// All physics, collision, animation: handled by Kaplay.
// All sprites: generated PNGs from nano-banana via gen-assets.mjs.

const k = kaplay({
  canvas: document.getElementById("game-canvas"),
  width: 900,
  height: 500,
  background: [135, 206, 235],
  letterbox: true,
  global: false,
});

// --- Physics defaults ---
const GRAVITY        = 1800;
const FALL_MULT      = 1.6;
const JUMP_FORCE     = 900;
const MOVE_SPEED     = 260;
const CUT_JUMP_SPEED = 250;
const COYOTE_TIME    = 0.10;
const JUMP_BUFFER    = 0.10;
const DOG_SPEED      = 60;

k.setGravity(GRAVITY);

// --- Assets ---
// Game-specific: only the cat sprite (stays in this folder).
// Everything else loads from shared/assets/ — see shared/assets/MANIFEST.md.
k.loadSprite("cat", "assets/cat.png", {
  sliceX: 4,
  anims: {
    idle: 0,
    run:  { from: 1, to: 3, loop: true, speed: 14 },
  },
});
k.loadSprite("dog", "../../shared/assets/dog.png", {
  sliceX: 2,
  anims: { walk: { from: 0, to: 1, loop: true, speed: 6 } },
});
k.loadSprite("fish",   "../../shared/assets/fish.png");
k.loadSprite("ground", "../../shared/assets/ground.png");
k.loadSprite("brick",  "../../shared/assets/brick.png");
k.loadSprite("flag",   "../../shared/assets/flag.png");

// --- Level ---
const TILE = 48;
const LEVEL = [
  "                                                            ",
  "                                                            ",
  "                                                            ",
  "                                                            ",
  "         f                f                                F",
  "      ===                                f         ===     =",
  "                            ===     ===                    =",
  "  P            d                                d          =",
  "==========================  ====  ============  ===========",
];

const FISH_TOTAL = LEVEL.join("").split("f").length - 1;
document.getElementById("fish-total").textContent = FISH_TOTAL;

// Tiles are anchored topleft of their cell by Kaplay's addLevel. Sprite sizes
// here are chosen to look right at that anchor — sprites that should "stand on"
// a row are placed one row ABOVE the ground row in the LEVEL grid so they
// visually sit on top of it.
const level = k.addLevel(LEVEL, {
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
      "brick",
    ],
    "f": () => [
      k.sprite("fish", { width: TILE * 0.7, height: TILE * 0.7 }),
      k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.7, TILE * 0.7) }),
      k.scale(1, 1),   // required for the pop animation on collect
      k.opacity(1),    // required for the fade on collect
      "fish",
    ],
    "F": () => [
      k.sprite("flag", { width: TILE, height: TILE * 2 }),
      k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 2) }),
      "flag",
    ],
    "d": () => [
      k.sprite("dog", { width: TILE, height: TILE }),
      // Hitbox is fully inside the sprite (sprite is TILE×TILE = 48×48):
      // 4..44 vertically, 4..44 horizontally → 4px margin all around.
      k.area({ shape: new k.Rect(k.vec2(4, 4), TILE - 8, TILE - 8) }),
      k.body(),
      { dir: -1 },
      "dog",
    ],
    "P": () => [
      // Cat sprite cells are ~845×759 (aspect 1.113 wide). Render width:height
      // proportionally so the cat isn't stretched.
      k.sprite("cat", { width: TILE * 1.15, height: TILE }),
      // Hitbox fully inside the sprite (sprite is 55 × 48). Leave 4px margin
      // top/bottom and 10px each side. Press D to verify the blue rect is
      // fully inside the cat — no pixels below feet.
      k.area({ shape: new k.Rect(k.vec2(10, 4), TILE * 1.15 - 20, TILE - 8) }),
      k.body({ jumpForce: JUMP_FORCE }),
      k.scale(1, 1),   // required for procedural squash-and-stretch
      { facing: 1, jumpBufferT: 0, coyoteT: 0, dead: false },
      "player",
    ],
  },
});

const player = level.get("player")[0];
player.play("idle");

// --- Player control ---
k.onKeyDown("left",  () => { if (!player.dead) { player.move(-MOVE_SPEED, 0); player.facing = -1; player.flipX = true;  } });
k.onKeyDown("right", () => { if (!player.dead) { player.move( MOVE_SPEED, 0); player.facing =  1; player.flipX = false; } });

k.onKeyPress("space", () => { if (!player.dead) player.jumpBufferT = JUMP_BUFFER; });
k.onKeyPress("up",    () => { if (!player.dead) player.jumpBufferT = JUMP_BUFFER; });
k.onKeyRelease("space", () => {
  if (player.vel.y < -CUT_JUMP_SPEED) player.vel.y = -CUT_JUMP_SPEED;
});

player.onUpdate(() => {
  if (player.dead) return;

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

  // Use real input state — Kaplay's body().move() in 3001 doesn't update
  // player.vel.x, so checking velocity would never trigger the run anim.
  const inputMoving = k.isKeyDown("left") || k.isKeyDown("right");
  const moving = inputMoving && player.isGrounded();
  const want = moving ? "run" : "idle";
  if (player.curAnim() !== want) player.play(want);

  // Procedural squash-and-stretch on top of the frame animation — gives the
  // cat a visible bouncy gait even when the walk frames are subtle. flipX
  // handles facing direction independently of scale.
  if (moving) {
    const s = Math.sin(k.time() * 16);
    player.scale = k.vec2(1 + s * 0.06, 1 - s * 0.06);
  } else if (player.scale.x !== 1 || player.scale.y !== 1) {
    player.scale = k.vec2(1, 1);
  }

  // Fall into the void → die.
  if (player.pos.y > 800) die();
});

// --- Fish bob (visual life, no API calls) ---
k.onUpdate("fish", (f) => {
  if (f.baseY === undefined) { f.baseY = f.pos.y; f.phase = f.pos.x * 0.01; }
  f.pos.y = f.baseY + Math.sin(k.time() * 3 + f.phase) * 4;
});

// --- Dogs patrol; reverse on wall hits and edges ---
k.onUpdate("dog", (d) => {
  d.move(DOG_SPEED * d.dir, 0);
  if (d.curAnim() !== "walk") d.play("walk");
  d.flipX = d.dir > 0;
});

k.onCollide("dog", "ground", (d, _, col) => {
  if (col?.isLeft())  d.dir =  1;
  if (col?.isRight()) d.dir = -1;
});
k.onCollide("dog", "brick", (d, _, col) => {
  if (col?.isLeft())  d.dir =  1;
  if (col?.isRight()) d.dir = -1;
});

// --- Player vs fish: collect ---
let fishCount = 0;
const fishCountEl = document.getElementById("fish-count");

player.onCollide("fish", (f) => {
  if (f.collected) return;
  f.collected = true;
  fishCount++;
  fishCountEl.textContent = fishCount;
  // Pop: scale up + fade out + sparkle burst, then destroy
  k.tween(f.scale, k.vec2(1.8), 0.22, v => f.scale = v, k.easings.easeOutQuad);
  k.tween(f.opacity, 0, 0.22, v => f.opacity = v);
  const cx = f.pos.x + TILE * 0.35;
  const cy = f.pos.y + TILE * 0.35;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
    k.add([
      k.rect(5, 5),
      k.color(255, 230, 120),
      k.pos(cx, cy),
      k.anchor("center"),
      k.opacity(1),
      k.lifespan(0.45, { fade: 0.35 }),
      k.move(angle, 220),
    ]);
  }
  k.wait(0.22, () => k.destroy(f));
});

// --- Player vs dog: stomp from above kills; sideways kills player ---
player.onCollide("dog", (d, col) => {
  if (col?.isBottom() || player.vel.y > 100) {
    // Stomp: player was falling onto the dog
    k.destroy(d);
    player.jump(JUMP_FORCE * 0.7);
  } else {
    die();
  }
});

// --- Goal flag ---
player.onCollide("flag", () => {
  if (player.dead) return;
  player.dead = true;
  // DOM overlay — Kaplay's canvas text doesn't handle Hebrew RTL, and
  // a colored backdrop gives real contrast.
  const msg = fishCount >= FISH_TOTAL
    ? "🎉 ניצחת!"
    : `🐟 חסרו ${FISH_TOTAL - fishCount} דגים — ניצחת בכל זאת!`;
  const overlay = document.createElement("div");
  overlay.lang = "he";
  overlay.dir = "rtl";
  overlay.textContent = msg;
  // Position over the canvas only (not the whole viewport) so the text
  // centers on the GAME, not the page.
  const canvas = document.getElementById("game-canvas");
  const r = canvas.getBoundingClientRect();
  Object.assign(overlay.style, {
    position: "fixed",
    top:  `${r.top}px`,
    left: `${r.left}px`,
    width:  `${r.width}px`,
    height: `${r.height}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.65)",
    color: "#ffe666",
    fontSize: "clamp(1.8rem, 5vw, 3.5rem)",
    fontWeight: "bold",
    fontFamily: "system-ui, sans-serif",
    textShadow: "0 3px 10px rgba(0,0,0,0.9)",
    padding: "0 1rem",
    textAlign: "center",
    borderRadius: "12px",
    zIndex: 9999,
  });
  document.body.appendChild(overlay);
  k.wait(2.5, () => location.reload());
});

// --- Camera follows the cat ---
k.onUpdate(() => {
  const target = player.pos;
  const cam = k.getCamPos();
  k.setCamPos(cam.lerp(target, 0.15));
});

// --- Death + restart ---
function die() {
  if (player.dead) return;
  player.dead = true;
  player.use(k.color(180, 60, 60));
  player.vel.x = 0;
  player.jump(JUMP_FORCE * 1.1);
  k.wait(1.2, () => location.reload());
}

// --- Debug ---
k.onKeyPress("d", () => { k.debug.inspect = !k.debug.inspect; });
if (location.search.includes("debug")) k.debug.inspect = true;
