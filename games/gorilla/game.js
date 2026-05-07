(function () {
  const screen = document.getElementById('gorilla-screen');
  if (!screen) return;

  const canvas = document.getElementById('gorilla-canvas');
  const ctx = canvas.getContext('2d');
  const livesEl = document.getElementById('gorilla-lives');
  const bananasEl = document.getElementById('gorilla-bananas');
  const levelEl = document.getElementById('gorilla-level');
  const overlay = document.getElementById('gorilla-overlay');
  const overlayTitle = document.getElementById('gorilla-overlay-title');
  const overlayMsg = document.getElementById('gorilla-overlay-msg');
  const overlayBtn = document.getElementById('gorilla-overlay-btn');
  const homeBtn = document.getElementById('gorilla-home-btn');

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

  // ── Constants ──────────────────────────────────────────────────────────────
  const GRAVITY = 0.55;
  const JUMP_VEL = -13;
  const SPEED = 4;
  const TILE = 48;

  // ── Game state ─────────────────────────────────────────────────────────────
  let state;

  function makeLevelData(lvl) {
    // Each level: platforms array [{x,y,w}] (world coords, y = bottom of platform from world bottom)
    // Bananas: [{x,y}], Snakes: [{x,y,dir,range,ox}], wall: {x,y,w,h,hp}
    const W = 3000;
    const platforms = [
      { x: 0,    y: 0,   w: 600  },  // ground start
      { x: 640,  y: 0,   w: 300  },
      { x: 980,  y: 0,   w: 300  },
      { x: 1320, y: 0,   w: 300  },
      { x: 1660, y: 0,   w: 300  },
      { x: 2000, y: 0,   w: 300  },
      { x: 2340, y: 0,   w: 300  },
      { x: 2680, y: 0,   w: 320  },
      // raised platforms
      { x: 200,  y: 160, w: 160  },
      { x: 500,  y: 220, w: 140  },
      { x: 750,  y: 180, w: 160  },
      { x: 1050, y: 200, w: 120  },
      { x: 1300, y: 260, w: 150  },
      { x: 1550, y: 180, w: 130  },
      { x: 1800, y: 240, w: 160  },
      { x: 2100, y: 200, w: 130  },
      { x: 2350, y: 260, w: 140  },
      { x: 2550, y: 160, w: 120  },
    ];

    const bananas = [];
    const positions = [
      [220,200],[520,260],[770,220],[380,40],[700,40],[1070,240],[1060,40],
      [1320,300],[1400,40],[1570,220],[1740,40],[1820,280],[2080,40],[2120,240],
      [2370,300],[2450,40],[2570,200],[2750,40],[2800,40],[2840,40],
    ];
    positions.forEach(([x, y]) => bananas.push({ x, y, collected: false }));

    const snakeCount = 3 + lvl * 2;
    const snakes = [];
    const snakeXs = [420, 700, 1100, 1500, 1900, 2200, 2500, 2700, 350, 1350];
    for (let i = 0; i < snakeCount && i < snakeXs.length; i++) {
      snakes.push({ x: snakeXs[i], y: 0, dir: 1, range: 120 + Math.random() * 80, ox: snakeXs[i], hurt: 0 });
    }

    const wall = { x: W - 120, y: 0, w: 80, h: 220, hp: 3 + lvl, maxHp: 3 + lvl, shakeT: 0, hitCooldown: 0 };

    return { platforms, bananas, snakes, wall, worldW: W };
  }

  function initGame(lvl = 1) {
    const ld = makeLevelData(lvl);
    state = {
      level: lvl,
      lives: 3,
      bananas: 0,
      bananaBatch: 0,
      player: { x: 80, y: 0, vx: 0, vy: 0, onGround: false, facing: 1, hurtT: 0, jumpBuf: 0 },
      camX: 0,
      ...ld,
      gameOver: false,
      won: false,
      particles: [],
    };
    updateHUD();
  }

  function updateHUD() {
    livesEl.textContent = '❤️'.repeat(Math.max(0, state.lives));
    bananasEl.textContent = `🍌 ${state.bananaBatch}/10`;
    levelEl.textContent = `שלב ${state.level}`;
  }

  // ── Keys ───────────────────────────────────────────────────────────────────
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

  // Mobile buttons
  document.getElementById('gorilla-left-btn').addEventListener('touchstart',  e => { e.preventDefault(); held.left = true; }, { passive: false });
  document.getElementById('gorilla-left-btn').addEventListener('touchend',    e => { e.preventDefault(); held.left = false; }, { passive: false });
  document.getElementById('gorilla-right-btn').addEventListener('touchstart', e => { e.preventDefault(); held.right = true; }, { passive: false });
  document.getElementById('gorilla-right-btn').addEventListener('touchend',   e => { e.preventDefault(); held.right = false; }, { passive: false });
  document.getElementById('gorilla-jump-btn').addEventListener('touchstart',  e => { e.preventDefault(); held.jump = true; }, { passive: false });
  document.getElementById('gorilla-jump-btn').addEventListener('touchend',    e => { e.preventDefault(); held.jump = false; }, { passive: false });

  // ── Physics helpers ────────────────────────────────────────────────────────
  const FLOOR_Y = 0;
  const P_W = 44, P_H = 50;

  function platformTop(pl) { return pl.y + TILE; }

  function landOn(px, py, pvx, pvy) {
    // returns new y if landing on any platform, else null
    const foot = py; // bottom of player
    const cx = px + P_W / 2;
    for (const pl of state.platforms) {
      const top = platformTop(pl);
      if (cx >= pl.x && cx <= pl.x + pl.w) {
        if (pvy >= 0 && foot <= top && foot + pvy + 2 >= top) {
          return top;
        }
      }
    }
    return null;
  }

  // ── Collision helpers ──────────────────────────────────────────────────────
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  let prevJump = false;

  function update() {
    if (state.gameOver || state.won) return;
    const p = state.player;

    // Jump buffer
    const jumpNow = isJump();
    if (jumpNow && !prevJump) {
      if (p.onGround) {
        p.vy = JUMP_VEL;
        p.onGround = false;
        sfxJump();
      }
    }
    prevJump = jumpNow;

    // Horizontal
    if (isLeft())  { p.vx = -SPEED; p.facing = -1; }
    else if (isRight()) { p.vx = SPEED; p.facing = 1; }
    else p.vx = 0;

    p.x += p.vx;
    p.x = Math.max(0, Math.min(state.worldW - P_W, p.x));

    // Gravity
    p.vy += GRAVITY;
    const newY = p.y + p.vy;

    // Platform landing
    if (p.vy >= 0) {
      const landY = landOn(p.x, p.y, p.vx, p.vy);
      if (landY !== null) {
        p.y = landY;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.y = newY;
        p.onGround = false;
      }
    } else {
      p.y = newY;
      p.onGround = false;
    }

    // Ground
    if (p.y <= FLOOR_Y) { p.y = FLOOR_Y; p.vy = 0; p.onGround = true; }

    // Fall off world → lose life
    if (p.y < -300) {
      loseLife();
      return;
    }

    // ── Snakes ──
    if (p.hurtT <= 0) {
      for (const sn of state.snakes) {
        sn.x += sn.dir * 1.5;
        if (sn.x > sn.ox + sn.range || sn.x < sn.ox - sn.range) sn.dir *= -1;
        if (sn.hurt > 0) sn.hurt--;

        const snTop = sn.y + 24;
        if (rectsOverlap(p.x, p.y, P_W, P_H, sn.x, sn.y, 40, 24)) {
          loseLife();
          return;
        }
      }
    } else {
      p.hurtT--;
    }

    // ── Bananas ──
    for (const bn of state.bananas) {
      if (bn.collected) continue;
      if (rectsOverlap(p.x, p.y, P_W, P_H, bn.x - 14, bn.y, 28, 28)) {
        bn.collected = true;
        state.bananas++;
        state.bananaBatch++;
        spawnParticles(bn.x, bn.y + 14, '🍌');
        sfxBanana();
        if (state.bananaBatch >= 10) {
          state.bananaBatch -= 10;
          state.lives++;
          sfxLife();
          spawnParticles(p.x + P_W / 2, p.y + P_H / 2, '❤️');
        }
        updateHUD();
      }
    }

    // ── Wall ──
    const w = state.wall;
    if (w.hitCooldown > 0) w.hitCooldown--;
    if (w.hp > 0) {
      if (rectsOverlap(p.x + P_W - 8, p.y + 10, 10, P_H - 10, w.x, w.y, w.w, w.h)) {
        if (p.vx > 0 || isRight()) {
          p.x = w.x - P_W + 8;
          if (Math.abs(p.vx) >= SPEED && w.hitCooldown <= 0) {
            hitWall();
            w.hitCooldown = 40; // ~0.67 sec between hits
          }
        }
      }
    } else {
      // Wall destroyed — check if player reached end
      if (p.x + P_W > state.worldW - 200) {
        winLevel();
      }
    }

    if (w.shakeT > 0) w.shakeT--;

    // ── Particles ──
    for (const pt of state.particles) {
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.life -= 0.025;
    }
    state.particles = state.particles.filter(pt => pt.life > 0);

    // ── Camera ──
    const W = canvas.width, H = canvas.height;
    const targetCam = p.x - W * 0.35;
    state.camX += (targetCam - state.camX) * 0.1;
    state.camX = Math.max(0, Math.min(state.worldW - W, state.camX));
  }

  function hitWall() {
    const w = state.wall;
    w.hp--;
    w.shakeT = 20;
    sfxBreak();
    spawnParticles(w.x + w.w / 2, w.y + w.h / 2, '💥');
    if (w.hp <= 0) {
      spawnParticles(w.x + w.w / 2, w.y + w.h / 2, '✨');
      spawnParticles(w.x + w.w / 2, w.y + w.h / 2, '⭐');
    }
  }

  function loseLife() {
    const p = state.player;
    p.hurtT = 90;
    state.lives--;
    sfxHurt();
    updateHUD();
    // Respawn
    p.x = Math.max(80, state.camX + 80);
    p.y = 200;
    p.vx = 0; p.vy = 0; p.onGround = false;
    if (state.lives <= 0) {
      state.gameOver = true;
      setTimeout(() => showOverlay('😢 המשחק נגמר!', `אספת ${state.bananas} בננות`, 'שחק שוב', false), 600);
    }
  }

  function winLevel() {
    sfxWin();
    state.won = true;
    const nextLvl = state.level + 1;
    setTimeout(() => showOverlay('🎉 כל הכבוד!', `עברת את שלב ${state.level}!`, 'לשלב הבא ▶', true, nextLvl), 800);
  }

  function showOverlay(title, msg, btnText, isWin, nextLvl) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlayBtn.textContent = btnText;
    overlayBtn.onclick = () => {
      overlay.style.display = 'none';
      initGame(isWin ? nextLvl : state.level);
    };
    overlay.style.display = 'flex';
  }

  function spawnParticles(x, y, emoji) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
      state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, life: 1, e: emoji });
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  let frame = 0;

  function drawBg(W, H) {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a0a2e');
    sky.addColorStop(1, '#3a1a5e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = '#ffffff88';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137 + 50) % W);
      const sy = ((i * 97 + 30) % (H * 0.6));
      const twinkle = Math.sin(frame * 0.05 + i) * 0.4 + 0.6;
      ctx.globalAlpha = twinkle;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Jungle BG hills
    ctx.fillStyle = '#2d4a1e';
    for (let i = 0; i < 8; i++) {
      const hx = (i * 420 - (state.camX * 0.2) % 420);
      ctx.beginPath();
      ctx.arc(hx, H, 180, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = '#1e3314';
    for (let i = 0; i < 6; i++) {
      const hx = (i * 560 + 200 - (state.camX * 0.15) % 560);
      ctx.beginPath();
      ctx.arc(hx, H, 220, Math.PI, 0);
      ctx.fill();
    }
  }

  function worldToScreen(wx, wy) {
    const H = canvas.height;
    return { sx: wx - state.camX, sy: H - 80 - wy };
  }

  function drawPlatforms(H) {
    for (const pl of state.platforms) {
      const { sx } = worldToScreen(pl.x, 0);
      if (sx + pl.w < -10 || sx > canvas.width + 10) continue;
      const top = H - 80 - platformTop(pl);
      const h = platformTop(pl) + 80;

      // Ground body
      const grad = ctx.createLinearGradient(0, top, 0, top + 30);
      grad.addColorStop(0, '#5d8a2a');
      grad.addColorStop(0.3, '#3d6a18');
      grad.addColorStop(1, '#2a4a10');
      ctx.fillStyle = grad;
      ctx.fillRect(sx, top, pl.w, h);

      // Grass top
      ctx.fillStyle = '#7ab83a';
      ctx.fillRect(sx, top, pl.w, 12);

      // Dirt pattern
      ctx.fillStyle = '#2a4a1080';
      for (let dx = 8; dx < pl.w; dx += 20) {
        ctx.fillRect(sx + dx, top + 18, 8, 6);
      }
    }
  }

  function drawSnakes(H) {
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const sn of state.snakes) {
      const { sx } = worldToScreen(sn.x + 20, sn.y);
      if (sx < -50 || sx > canvas.width + 50) continue;
      const sy = H - 80 - sn.y;
      ctx.save();
      if (sn.dir < 0) { ctx.scale(-1, 1); ctx.translate(-sx * 2, 0); }
      // Wiggle
      const wiggle = Math.sin(frame * 0.18 + sn.x * 0.05) * 3;
      ctx.fillText('🐍', sx, sy + wiggle);
      ctx.restore();
    }
  }

  function drawBananas(H) {
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const bn of state.bananas) {
      if (bn.collected) continue;
      const { sx } = worldToScreen(bn.x, bn.y);
      if (sx < -30 || sx > canvas.width + 30) continue;
      const sy = H - 80 - bn.y;
      const bob = Math.sin(frame * 0.06 + bn.x * 0.03) * 4;
      ctx.fillText('🍌', sx, sy + bob);
    }
  }

  function drawWall(H) {
    const w = state.wall;
    if (w.hp <= 0) return;
    const { sx } = worldToScreen(w.x, w.y);
    if (sx < -100 || sx > canvas.width + 100) return;
    const sy = H - 80 - w.y;
    const shake = w.shakeT > 0 ? (Math.random() - 0.5) * 6 : 0;

    // Health bar colors
    const ratio = w.hp / w.maxHp;
    const wallColor = ratio > 0.6 ? '#888' : ratio > 0.3 ? '#a06040' : '#c04030';

    ctx.fillStyle = wallColor;
    ctx.fillRect(sx + shake, sy - w.h, w.w, w.h);

    // Brick lines
    ctx.strokeStyle = '#00000040';
    ctx.lineWidth = 2;
    for (let row = 0; row < w.h; row += 24) {
      ctx.beginPath(); ctx.moveTo(sx + shake, sy - w.h + row); ctx.lineTo(sx + shake + w.w, sy - w.h + row); ctx.stroke();
    }
    for (let col = 0; col < w.h; col += 24) {
      const offset = (Math.floor(col / 24) % 2) * 20;
      ctx.beginPath(); ctx.moveTo(sx + shake + offset, sy - w.h + col); ctx.lineTo(sx + shake + offset, sy - w.h + col + 24); ctx.stroke();
    }

    // Cracks per hit
    if (w.hp < w.maxHp) {
      ctx.strokeStyle = '#0009';
      ctx.lineWidth = 2;
      for (let c = 0; c < w.maxHp - w.hp; c++) {
        ctx.beginPath();
        ctx.moveTo(sx + shake + 10 + c * 22, sy - w.h + 20 + c * 30);
        ctx.lineTo(sx + shake + 30 + c * 15, sy - w.h + 60 + c * 25);
        ctx.lineTo(sx + shake + 15 + c * 18, sy - w.h + 90 + c * 20);
        ctx.stroke();
      }
    }

    // HP hearts above wall
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i < w.hp; i++) {
      ctx.fillText('🧱', sx + shake + 10 + i * 22, sy - w.h - 8);
    }
  }

  function drawPlayer(H) {
    const p = state.player;
    const { sx } = worldToScreen(p.x + P_W / 2, p.y);
    const sy = H - 80 - p.y;

    // Flicker when hurt
    if (p.hurtT > 0 && Math.floor(p.hurtT / 6) % 2 === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Squash & stretch
    const sqX = p.onGround && Math.abs(p.vx) > 1 ? 1.1 : 1;
    const sqY = p.onGround ? 0.92 : (p.vy < -3 ? 1.15 : 1);
    ctx.translate(sx, sy);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.scale(sqX, sqY);

    // Body
    const walkFrame = Math.floor(frame / 6) % 2;
    ctx.font = '44px serif';
    ctx.fillText(walkFrame && p.onGround && Math.abs(p.vx) > 0 ? '🦍' : '🦍', 0, 0);

    ctx.restore();
  }

  function drawParticles(H) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pt of state.particles) {
      ctx.globalAlpha = pt.life;
      ctx.font = `${20 + (1 - pt.life) * 10 | 0}px serif`;
      const { sx } = worldToScreen(pt.x, 0);
      const sy = H - 80 - pt.y + (1 - pt.life) * (-30);
      ctx.fillText(pt.e, sx, H - 80 - pt.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawArrow(H) {
    // Arrow pointing to nearest uncollected banana or wall
    const p = state.player;
    let target = null;
    if (state.wall.hp > 0) {
      target = { x: state.wall.x + state.wall.w / 2, y: state.wall.h / 2 };
    } else {
      for (const bn of state.bananas) {
        if (!bn.collected && (!target || Math.abs(bn.x - p.x) < Math.abs(target.x - p.x))) {
          target = bn;
        }
      }
    }
    if (!target) return;

    const { sx: tx } = worldToScreen(target.x, 0);
    const px = worldToScreen(p.x + P_W / 2, 0).sx;
    const arrowX = Math.max(60, Math.min(canvas.width - 60, px));
    const arrowY = 60;
    const dir = tx < 0 ? -1 : tx > canvas.width ? 1 : 0;
    if (dir === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(frame * 0.1) * 0.3;
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dir < 0 ? '◀' : '▶', arrowX + dir * 30, arrowY);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    drawBg(W, H);
    ctx.save();
    drawPlatforms(H);
    drawSnakes(H);
    drawBananas(H);
    drawWall(H);
    drawPlayer(H);
    drawParticles(H);
    ctx.restore();
    drawArrow(H);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  function resize() {
    canvas.width  = screen.clientWidth  || window.innerWidth;
    canvas.height = screen.clientHeight || window.innerHeight;
  }
  window.addEventListener('resize', resize);

  // ── Main loop ──────────────────────────────────────────────────────────────
  function loop() {
    if (screen.classList.contains('active')) {
      frame++;
      update();
      draw();
    }
    requestAnimationFrame(loop);
  }
  loop();

  // ── Home button ────────────────────────────────────────────────────────────
  homeBtn.addEventListener('click', () => window.GameUI.showScreen('menu'));

  // ── Init on screen show ────────────────────────────────────────────────────
  const observer = new MutationObserver(() => {
    if (screen.classList.contains('active')) {
      resize();
      initGame(1);
      overlay.style.display = 'none';
    }
  });
  observer.observe(screen, { attributes: true, attributeFilter: ['class'] });
})();
