(function () {
  const screen = document.getElementById('gorilla-screen');
  if (!screen) return;

  const canvas = document.getElementById('gorilla-canvas');
  const ctx = canvas.getContext('2d');
  const livesEl  = document.getElementById('gorilla-lives');
  const bananasEl = document.getElementById('gorilla-bananas');
  const levelEl  = document.getElementById('gorilla-level');
  const overlay  = document.getElementById('gorilla-overlay');
  const overlayTitle = document.getElementById('gorilla-overlay-title');
  const overlayMsg   = document.getElementById('gorilla-overlay-msg');
  const overlayBtn   = document.getElementById('gorilla-overlay-btn');
  const homeBtn  = document.getElementById('gorilla-home-btn');

  // ── Audio ──────────────────────────────────────────────────────────────────
  let ac;
  function getAC() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function tone(f, type, dur, vol, sweep) {
    try {
      const a = getAC(), o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = type; o.frequency.value = f;
      if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, a.currentTime + dur * .6);
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur);
      o.start(); o.stop(a.currentTime + dur);
    } catch (_) {}
  }
  function sfxBanana() { tone(600, 'sine', .12, .2, 900); }
  function sfxHurt()   { [280, 180, 100].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', .18, .18), i * 70)); }
  function sfxJump()   { tone(300, 'sine', .14, .15, 600); }
  function sfxBreak()  { [400, 300, 200, 100].forEach((f, i) => setTimeout(() => tone(f, 'square', .1, .2), i * 55)); }
  function sfxWin()    { [500, 700, 900, 1200].forEach((f, i) => setTimeout(() => tone(f, 'triangle', .2, .18), i * 90)); }
  function sfxLife()   { [400, 600, 800].forEach((f, i) => setTimeout(() => tone(f, 'triangle', .15, .2), i * 60)); }

  // ── Coordinate system ──────────────────────────────────────────────────────
  // logY = logical world Y, 0 = ground surface, positive = UP
  // screenY = pixels from canvas top, positive = DOWN
  // Conversion: screenY = H - MARGIN - logY
  const MARGIN = 80; // pixels from canvas bottom to ground surface

  function toSY(H, logY) { return H - MARGIN - logY; }

  // ── Constants ──────────────────────────────────────────────────────────────
  const GRAVITY  = 0.6;   // subtracted from vy each frame (pulls down)
  const JUMP_SPD = 14;    // positive = upward in logical space
  const SPEED    = 4;
  const P_W = 40, P_H = 48; // player hitbox

  // ── Level data ─────────────────────────────────────────────────────────────
  // Platform logY = top surface in logical coords
  // Snake/banana logY = feet/bottom in logical coords
  function makeLevelData(lvl) {
    const W = 3000;
    const platforms = [
      { x: 0,    logY: 0, w: 600 },
      { x: 640,  logY: 0, w: 300 },
      { x: 980,  logY: 0, w: 300 },
      { x: 1320, logY: 0, w: 300 },
      { x: 1660, logY: 0, w: 300 },
      { x: 2000, logY: 0, w: 300 },
      { x: 2340, logY: 0, w: 300 },
      { x: 2680, logY: 0, w: 320 },
      // raised platforms
      { x: 220,  logY: 120, w: 160 },
      { x: 500,  logY: 160, w: 140 },
      { x: 750,  logY: 130, w: 160 },
      { x: 1050, logY: 150, w: 120 },
      { x: 1300, logY: 190, w: 150 },
      { x: 1550, logY: 130, w: 130 },
      { x: 1800, logY: 170, w: 160 },
      { x: 2100, logY: 150, w: 130 },
      { x: 2350, logY: 190, w: 140 },
      { x: 2550, logY: 120, w: 120 },
    ];

    // Bananas: some on ground level (+20), some on raised platforms (+20 above platTop)
    const bananaItems = [
      // ground level
      [150, 20], [400, 20], [700, 20], [1050, 20], [1400, 20],
      [1750, 20], [2050, 20], [2450, 20], [2750, 20], [2820, 20],
      // on raised platforms
      [240, 140], [520, 180], [780, 150],
      [1070, 170], [1330, 210], [1570, 150],
      [1820, 190], [2120, 170], [2380, 210], [2570, 140],
    ].map(([x, logY]) => ({ x, logY, collected: false }));

    // Snakes on ground (logY = 0 = ground surface = their feet)
    const snakeCount = 3 + lvl * 2;
    const snakeXs = [420, 700, 1100, 1500, 1900, 2200, 2500, 2700, 350, 1350];
    const snakes = [];
    for (let i = 0; i < snakeCount && i < snakeXs.length; i++) {
      snakes.push({
        x: snakeXs[i], logY: 0,
        dir: 1, range: 120 + Math.random() * 80, ox: snakeXs[i],
      });
    }

    const wall = { x: W - 130, logY: 0, w: 80, h: 260, hp: 3 + lvl, maxHp: 3 + lvl, shakeT: 0, hitCooldown: 0 };

    return { platforms, bananaItems, snakes, wall, worldW: W };
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let state;

  function initGame(lvl = 1) {
    const ld = makeLevelData(lvl);
    state = {
      level: lvl,
      lives: 3,
      bananas: 0,
      bananaBatch: 0,
      // player: logY = feet (bottom), vy = vertical velocity (positive = up)
      player: { x: 80, logY: 0, vx: 0, vy: 0, onGround: true, facing: 1, hurtT: 0 },
      camX: 0,
      particles: [],
      gameOver: false,
      won: false,
      ...ld,
    };
    updateHUD();
  }

  function updateHUD() {
    livesEl.textContent  = '❤️'.repeat(Math.max(0, state.lives));
    bananasEl.textContent = `🍌 ${state.bananaBatch}/10`;
    levelEl.textContent   = `שלב ${state.level}`;
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  const keys = {};
  const held = { left: false, right: false, jump: false };

  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  function isLeft()  { return keys['ArrowLeft']  || keys['a'] || held.left; }
  function isRight() { return keys['ArrowRight'] || keys['d'] || held.right; }
  function isJump()  { return keys['ArrowUp'] || keys[' '] || keys['w'] || held.jump; }

  document.getElementById('gorilla-left-btn').addEventListener('touchstart',  e => { e.preventDefault(); held.left  = true;  }, { passive: false });
  document.getElementById('gorilla-left-btn').addEventListener('touchend',    e => { e.preventDefault(); held.left  = false; }, { passive: false });
  document.getElementById('gorilla-right-btn').addEventListener('touchstart', e => { e.preventDefault(); held.right = true;  }, { passive: false });
  document.getElementById('gorilla-right-btn').addEventListener('touchend',   e => { e.preventDefault(); held.right = false; }, { passive: false });
  document.getElementById('gorilla-jump-btn').addEventListener('touchstart',  e => { e.preventDefault(); held.jump  = true;  }, { passive: false });
  document.getElementById('gorilla-jump-btn').addEventListener('touchend',    e => { e.preventDefault(); held.jump  = false; }, { passive: false });

  // ── Overlap (logY = bottom of object, h = height going up) ─────────────────
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // ── Platform landing ───────────────────────────────────────────────────────
  // Returns the logY to land on, or null
  function tryLand(px, logY, vy) {
    if (vy > 0) return null; // only when falling or stationary
    const cx = px + P_W / 2;
    for (const pl of state.platforms) {
      if (cx < pl.x || cx > pl.x + pl.w) continue;
      const top = pl.logY; // top surface in logical coords
      // player was above (or at) platform, will cross it this frame
      if (logY >= top && logY + vy <= top) {
        return top;
      }
    }
    return null;
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  let prevJump = false;

  function update() {
    if (state.gameOver || state.won) return;
    const p = state.player;

    // Jump (rising edge)
    const jumpNow = isJump();
    if (jumpNow && !prevJump && p.onGround) {
      p.vy = JUMP_SPD;
      p.onGround = false;
      sfxJump();
    }
    prevJump = jumpNow;

    // Horizontal
    if (isLeft())        { p.vx = -SPEED; p.facing = -1; }
    else if (isRight())  { p.vx =  SPEED; p.facing =  1; }
    else                  p.vx = 0;

    p.x = Math.max(0, Math.min(state.worldW - P_W, p.x + p.vx));

    // Gravity (pulls down = reduces logY velocity)
    p.vy -= GRAVITY;

    // Platform landing
    const landY = tryLand(p.x, p.logY, p.vy);
    if (landY !== null) {
      p.logY    = landY;
      p.vy      = 0;
      p.onGround = true;
    } else {
      p.logY   += p.vy;
      p.onGround = false;
    }

    // Ground clamp
    if (p.logY <= 0) { p.logY = 0; p.vy = 0; p.onGround = true; }

    // Fell into a pit
    if (p.logY < -350) { loseLife(); return; }

    // ── Snakes ──
    if (p.hurtT <= 0) {
      for (const sn of state.snakes) {
        sn.x += sn.dir * 1.5;
        if (sn.x > sn.ox + sn.range || sn.x < sn.ox - sn.range) sn.dir *= -1;
        // snake box: feet at sn.logY, 32px tall
        if (rectsOverlap(p.x, p.logY, P_W, P_H, sn.x, sn.logY, 36, 30)) {
          loseLife(); return;
        }
      }
    } else {
      p.hurtT--;
    }

    // ── Bananas ──
    for (const bn of state.bananaItems) {
      if (bn.collected) continue;
      if (rectsOverlap(p.x, p.logY, P_W, P_H, bn.x - 14, bn.logY, 28, 28)) {
        bn.collected = true;
        state.bananas++;
        state.bananaBatch++;
        sfxBanana();
        spawnParticles(bn.x, bn.logY + 14, '🍌');
        if (state.bananaBatch >= 10) {
          state.bananaBatch -= 10;
          state.lives++;
          sfxLife();
          spawnParticles(p.x + P_W / 2, p.logY + P_H / 2, '❤️');
        }
        updateHUD();
      }
    }

    // ── Wall ──
    const w = state.wall;
    if (w.hitCooldown > 0) w.hitCooldown--;
    if (w.hp > 0) {
      if (rectsOverlap(p.x + P_W - 6, p.logY + 4, 8, P_H - 4, w.x, w.logY, w.w, w.h)) {
        if (p.vx > 0 || isRight()) {
          p.x = w.x - P_W + 6;
          if (Math.abs(p.vx) >= SPEED && w.hitCooldown <= 0) {
            hitWall();
            w.hitCooldown = 40;
          }
        }
      }
    } else if (p.x + P_W > state.worldW - 200) {
      winLevel();
    }
    if (w.shakeT > 0) w.shakeT--;

    // ── Particles ──
    for (const pt of state.particles) {
      pt.x    += pt.vx;
      pt.logY += pt.vy;
      pt.vy   -= 0.15; // gravity on particles
      pt.life -= 0.025;
    }
    state.particles = state.particles.filter(pt => pt.life > 0);

    // ── Camera ──
    const targetCam = p.x - canvas.width * 0.35;
    state.camX += (targetCam - state.camX) * 0.1;
    state.camX = Math.max(0, Math.min(state.worldW - canvas.width, state.camX));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function hitWall() {
    const w = state.wall;
    w.hp--;
    w.shakeT = 18;
    sfxBreak();
    spawnParticles(w.x + w.w / 2, w.logY + w.h / 2, '💥');
    if (w.hp <= 0) {
      spawnParticles(w.x + w.w / 2, w.logY + w.h / 2, '✨');
      spawnParticles(w.x + w.w / 2, w.logY + w.h / 2, '⭐');
    }
  }

  function loseLife() {
    const p = state.player;
    p.hurtT = 90;
    state.lives--;
    sfxHurt();
    updateHUD();
    p.x = Math.max(80, state.camX + 80);
    p.logY = 0; p.vx = 0; p.vy = 0; p.onGround = true;
    if (state.lives <= 0) {
      state.gameOver = true;
      setTimeout(() => showOverlay('😢 המשחק נגמר!', `אספת ${state.bananas} בננות`, 'שחק שוב', false), 600);
    }
  }

  function winLevel() {
    sfxWin();
    state.won = true;
    const next = state.level + 1;
    setTimeout(() => showOverlay('🎉 כל הכבוד!', `עברת את שלב ${state.level}!`, 'לשלב הבא ▶', true, next), 800);
  }

  function showOverlay(title, msg, btnText, isWin, nextLvl) {
    overlayTitle.textContent = title;
    overlayMsg.textContent   = msg;
    overlayBtn.textContent   = btnText;
    overlayBtn.onclick = () => {
      overlay.style.display = 'none';
      initGame(isWin ? nextLvl : state.level);
    };
    overlay.style.display = 'flex';
  }

  function spawnParticles(x, logY, emoji) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
      state.particles.push({ x, logY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 2, life: 1, e: emoji });
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  let frame = 0;

  function drawBg(W, H) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a0a2e');
    sky.addColorStop(1, '#3a1a5e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + 50) % W;
      const sy = (i * 97  + 30) % (H * 0.55);
      ctx.globalAlpha = Math.sin(frame * 0.05 + i) * 0.4 + 0.6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Parallax jungle hills
    ctx.fillStyle = '#2d4a1e';
    for (let i = 0; i < 8; i++) {
      const hx = ((i * 420) - (state.camX * 0.2) % 420 + 420) % (W + 420);
      ctx.beginPath(); ctx.arc(hx, H, 180, Math.PI, 0); ctx.fill();
    }
    ctx.fillStyle = '#1e3314';
    for (let i = 0; i < 6; i++) {
      const hx = ((i * 560 + 200) - (state.camX * 0.15) % 560 + 560) % (W + 560);
      ctx.beginPath(); ctx.arc(hx, H, 220, Math.PI, 0); ctx.fill();
    }
  }

  function drawPlatforms(W, H) {
    for (const pl of state.platforms) {
      const sx = pl.x - state.camX;
      if (sx + pl.w < 0 || sx > W) continue;
      const sy = toSY(H, pl.logY); // screen Y of top surface

      const grad = ctx.createLinearGradient(0, sy, 0, sy + 28);
      grad.addColorStop(0, '#5d8a2a');
      grad.addColorStop(0.3, '#3d6a18');
      grad.addColorStop(1, '#2a4a10');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, sy, pl.w, H - sy); // fill from top surface down to bottom

      // Grass stripe on top
      ctx.fillStyle = '#7ab83a';
      ctx.fillRect(sx, sy, pl.w, 12);

      // Dirt dots
      ctx.fillStyle = '#2a4a1080';
      for (let dx = 8; dx < pl.w; dx += 20) {
        ctx.fillRect(sx + dx, sy + 18, 8, 6);
      }
    }
  }

  function drawSnakes(H) {
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const sn of state.snakes) {
      const sx = sn.x + 18 - state.camX;
      if (sx < -50 || sx > canvas.width + 50) continue;
      // feet at sn.logY → bottom of emoji at toSY(H, sn.logY)
      const sy = toSY(H, sn.logY);
      const wiggle = Math.sin(frame * 0.18 + sn.x * 0.05) * 3;
      ctx.save();
      if (sn.dir < 0) { ctx.scale(-1, 1); ctx.translate(-sx * 2, 0); }
      ctx.fillText('🐍', sx, sy + wiggle);
      ctx.restore();
    }
  }

  function drawBananas(H) {
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const bn of state.bananaItems) {
      if (bn.collected) continue;
      const sx = bn.x - state.camX;
      if (sx < -30 || sx > canvas.width + 30) continue;
      const sy = toSY(H, bn.logY);
      const bob = Math.sin(frame * 0.06 + bn.x * 0.03) * 4;
      ctx.fillText('🍌', sx, sy + bob);
    }
  }

  function drawWall(H) {
    const w = state.wall;
    if (w.hp <= 0) return;
    const sx = w.x - state.camX;
    if (sx + w.w < -10 || sx > canvas.width + 10) return;
    const shake = w.shakeT > 0 ? (Math.random() - 0.5) * 6 : 0;

    // Wall base is at ground (w.logY = 0), goes UP by w.h
    const wallBottom = toSY(H, w.logY);      // screen Y of base
    const wallTop    = toSY(H, w.logY + w.h); // screen Y of top

    const ratio = w.hp / w.maxHp;
    ctx.fillStyle = ratio > 0.6 ? '#888' : ratio > 0.3 ? '#a06040' : '#c04030';
    ctx.fillRect(sx + shake, wallTop, w.w, wallBottom - wallTop);

    // Brick lines
    ctx.strokeStyle = '#00000040';
    ctx.lineWidth = 2;
    for (let row = 0; row < w.h; row += 24) {
      const ry = toSY(H, w.logY + w.h - row);
      ctx.beginPath(); ctx.moveTo(sx + shake, ry); ctx.lineTo(sx + shake + w.w, ry); ctx.stroke();
    }

    // Cracks
    if (w.hp < w.maxHp) {
      ctx.strokeStyle = '#0009'; ctx.lineWidth = 2;
      for (let c = 0; c < w.maxHp - w.hp; c++) {
        const cy = wallTop + 20 + c * 40;
        ctx.beginPath();
        ctx.moveTo(sx + shake + 10 + c * 18, cy);
        ctx.lineTo(sx + shake + 30 + c * 12, cy + 30);
        ctx.lineTo(sx + shake + 15 + c * 14, cy + 55);
        ctx.stroke();
      }
    }

    // Strength indicator above wall
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < w.hp; i++) {
      ctx.fillText('🧱', sx + shake + 10 + i * 22, wallTop - 6);
    }
  }

  function drawPlayer(H) {
    const p = state.player;
    if (p.hurtT > 0 && Math.floor(p.hurtT / 6) % 2 === 0) return;

    // feet at p.logY → bottom of emoji at toSY(H, p.logY)
    const sx = p.x + P_W / 2 - state.camX;
    const sy = toSY(H, p.logY); // bottom of player on screen

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const sqX = p.onGround && Math.abs(p.vx) > 1 ? 1.1 : 1;
    const sqY = !p.onGround && p.vy > 2 ? 1.15 : p.onGround ? 0.92 : 1;
    ctx.translate(sx, sy);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.scale(sqX, sqY);

    ctx.font = '44px serif';
    ctx.fillText('🦍', 0, 0);
    ctx.restore();
  }

  function drawParticles(H) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pt of state.particles) {
      ctx.globalAlpha = pt.life;
      ctx.font = `${(20 + (1 - pt.life) * 8) | 0}px serif`;
      const sx = pt.x - state.camX;
      const sy = toSY(H, pt.logY);
      ctx.fillText(pt.e, sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  function drawArrow(H) {
    const p = state.player;
    // Point toward wall if alive, else toward nearest banana
    let targetX;
    if (state.wall.hp > 0) {
      targetX = state.wall.x + state.wall.w / 2;
    } else {
      let nearest = null;
      for (const bn of state.bananaItems) {
        if (!bn.collected && (!nearest || Math.abs(bn.x - p.x) < Math.abs(nearest.x - p.x))) nearest = bn;
      }
      if (!nearest) return;
      targetX = nearest.x;
    }
    const targetSX = targetX - state.camX;
    const dir = targetSX < 20 ? -1 : targetSX > canvas.width - 20 ? 1 : 0;
    if (dir === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(frame * 0.1) * 0.3;
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dir < 0 ? '◀' : '▶', dir < 0 ? 50 : canvas.width - 50, 60);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    drawBg(W, H);
    drawPlatforms(W, H);
    drawSnakes(H);
    drawBananas(H);
    drawWall(H);
    drawPlayer(H);
    drawParticles(H);
    drawArrow(H);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  function resize() {
    canvas.width  = screen.clientWidth  || window.innerWidth;
    canvas.height = screen.clientHeight || window.innerHeight;
  }
  window.addEventListener('resize', resize);

  homeBtn.addEventListener('click', () => window.GameUI.goHome());

  resize();
  initGame(1);
  overlay.style.display = 'none';

  // ── Loop ───────────────────────────────────────────────────────────────────
  function loop() {
    frame++; update(); draw();
    requestAnimationFrame(loop);
  }
  loop();
})();
