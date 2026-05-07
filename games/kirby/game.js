(function () {
  const screen = document.getElementById('kirby-screen');
  if (!screen) return;

  const canvas = document.createElement('canvas');
  document.getElementById('kirby-stage').appendChild(canvas);

  const W = 800, H = 380;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const FLOOR = H - 60;
  const WORLD_W = 2700;

  let currentLevel = 1;
  let camX = 0, camXTarget = 0;
  let gameState = 'playing'; // 'playing' | 'won' | 'dead'
  let health = 3, invincible = 0;
  let stars = [], starsCollected = 0;
  let enemies = [], shots = [], particles = [];
  let levelData;
  let winTimer = 0;

  document.querySelectorAll('[data-kirby-level]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLevel = parseInt(btn.dataset.kirbyLevel);
      document.querySelectorAll('[data-kirby-level]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      resetLevel();
    });
  });

  // ── Audio ──
  const AC = window.AudioContext || window.webkitAudioContext;
  let ac;
  function tone(f, type, dur, vol, sweep) {
    try {
      if (!ac) ac = new AC();
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = type; o.frequency.value = f;
      if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, ac.currentTime + dur * .6);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
      o.start(); o.stop(ac.currentTime + dur);
    } catch {}
  }

  // ── Input ──
  const keys = {}, prev = {};
  const GAME_KEYS = ['ArrowLeft','ArrowRight','ArrowUp','Space','KeyZ','KeyX','KeyA','KeyD','KeyW'];
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (screen.classList.contains('active') && GAME_KEYS.includes(e.code)) e.preventDefault();
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });
  function pressed(c) { return keys[c] && !prev[c]; }

  // ── Kirby ──
  const K = {
    x: 100, y: FLOOR, r: 22,
    vx: 0, vy: 0,
    onGround: false, facing: 1,
    jumps: 0, floating: false,
    state: 'normal', power: null,
    walkT: 0, transformTimer: 0,
    msgTimer: 0, msg: '',
  };

  const GRAV = 0.52, JV = -11.2, FLOAT = -1.1;

  // ── Level Data ──
  function makeLevelData(lvl) {
    if (lvl === 1) {
      return {
        bg: 'sky',
        platforms: [
          // Section 1 — intro
          { x: 260,  y: FLOOR-90,  w: 130, h: 14 },
          { x: 480,  y: FLOOR-140, w: 110, h: 14 },
          // Section 2 — climbing
          { x: 700,  y: FLOOR-100, w: 140, h: 14 },
          { x: 900,  y: FLOOR-150, w: 100, h: 14 },
          { x: 1080, y: FLOOR-110, w: 120, h: 14 },
          // Section 3 — mid
          { x: 1280, y: FLOOR-90,  w: 130, h: 14 },
          { x: 1480, y: FLOOR-140, w: 110, h: 14 },
          { x: 1660, y: FLOOR-100, w: 120, h: 14 },
          // Section 4 — final push
          { x: 1870, y: FLOOR-130, w: 130, h: 14 },
          { x: 2080, y: FLOOR-90,  w: 120, h: 14 },
          { x: 2280, y: FLOOR-120, w: 110, h: 14 },
          { x: 2460, y: FLOOR-80,  w: 100, h: 14 },
        ],
        enemySpawns: [
          { x: 360,  type: 'fire', patrol: 120 },
          { x: 560,  type: 'fire', patrol: 100 },
          { x: 760,  type: 'fire', patrol: 120 },
          { x: 980,  type: 'fire', patrol: 100 },
          { x: 1160, type: 'fire', patrol: 120 },
          { x: 1380, type: 'fire', patrol: 110 },
          { x: 1580, type: 'fire', patrol: 120 },
          { x: 1760, type: 'fire', patrol: 100 },
          { x: 1960, type: 'fire', patrol: 120 },
          { x: 2180, type: 'fire', patrol: 110 },
          { x: 2370, type: 'fire', patrol: 100 },
        ],
        starPositions: [310, 540, 730, 970, 1130, 1330, 1540, 1720, 1940, 2140, 2330, 2500],
        doorX: 2580,
      };
    } else {
      return {
        bg: 'forest',
        platforms: [
          { x: 250,  y: FLOOR-100, w: 120, h: 14 },
          { x: 460,  y: FLOOR-150, w: 100, h: 14 },
          { x: 680,  y: FLOOR-110, w: 130, h: 14 },
          { x: 890,  y: FLOOR-155, w: 100, h: 14 },
          { x: 1070, y: FLOOR-100, w: 120, h: 14 },
          { x: 1270, y: FLOOR-140, w: 130, h: 14 },
          { x: 1480, y: FLOOR-100, w: 110, h: 14 },
          { x: 1680, y: FLOOR-145, w: 120, h: 14 },
          { x: 1880, y: FLOOR-110, w: 130, h: 14 },
          { x: 2090, y: FLOOR-140, w: 110, h: 14 },
          { x: 2280, y: FLOOR-100, w: 110, h: 14 },
          { x: 2460, y: FLOOR-80,  w: 100, h: 14 },
        ],
        enemySpawns: [
          { x: 340,  type: 'plant', patrol: 110 },
          { x: 540,  type: 'wind',  patrol: 100 },
          { x: 760,  type: 'plant', patrol: 120 },
          { x: 970,  type: 'wind',  patrol: 100 },
          { x: 1150, type: 'plant', patrol: 110 },
          { x: 1360, type: 'wind',  patrol: 120 },
          { x: 1560, type: 'plant', patrol: 110 },
          { x: 1770, type: 'wind',  patrol: 100 },
          { x: 1970, type: 'plant', patrol: 120 },
          { x: 2180, type: 'wind',  patrol: 110 },
          { x: 2370, type: 'plant', patrol: 100 },
        ],
        starPositions: [300, 520, 720, 960, 1130, 1320, 1530, 1730, 1940, 2150, 2330, 2510],
        doorX: 2580,
      };
    }
  }

  function mkEnemy(spawn) {
    const e = {
      x: spawn.x, y: FLOOR,
      vx: 0.75 * (Math.random() < .5 ? 1 : -1),
      r: 17, state: 'walk',
      t: Math.random() * Math.PI * 2,
      type: spawn.type,
      spawnX: spawn.x,
      patrol: spawn.patrol,
    };
    if (spawn.type === 'wind') {
      e.y = FLOOR - 45;
      e.floatBase = FLOOR - 45 - Math.random() * 20;
      e.facing = 1;
      e.vx = 0.65 * (Math.random() < .5 ? 1 : -1);
    }
    if (spawn.type === 'plant') {
      e.seedTimer = 120 + Math.floor(Math.random() * 80);
    }
    return e;
  }

  function resetLevel() {
    levelData = makeLevelData(currentLevel);
    camX = 0; camXTarget = 0;
    gameState = 'playing';
    health = 3; invincible = 0;
    starsCollected = 0; winTimer = 0;
    enemies = levelData.enemySpawns.map(mkEnemy);
    shots = []; particles = [];
    stars = levelData.starPositions.map(sx => ({
      x: sx, y: FLOOR - 48,
      collected: false, spin: Math.random() * Math.PI * 2,
    }));
    K.x = 100; K.y = FLOOR; K.vx = 0; K.vy = 0;
    K.state = 'normal'; K.power = null;
    K.onGround = false; K.jumps = 0; K.floating = false;
    K.msgTimer = 0; K.transformTimer = 0; K.facing = 1;
  }

  resetLevel();

  // ── Particles ──
  function burst(x, y, col, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4.5;
      particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 2.5, life: 1, col });
    }
  }

  // ── Update ──
  function update() {
    if (gameState === 'won') { winTimer++; return; }
    if (gameState === 'dead') return;

    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    const jumpK = keys['ArrowUp']    || keys['KeyW'] || keys['Space'];
    const inhK  = keys['KeyZ'];

    if (K.transformTimer > 0) K.transformTimer--;
    if (invincible > 0) invincible--;

    // Move
    if (K.state !== 'puffed') {
      if (left)       { K.vx = -3.4; K.facing = -1; }
      else if (right) { K.vx =  3.4; K.facing =  1; }
      else            { K.vx *= 0.80; }
    } else { K.vx *= 0.82; }
    if (K.onGround && Math.abs(K.vx) > .5) K.walkT += .2;

    // Jump
    if (pressed('ArrowUp') || pressed('KeyW') || pressed('Space')) {
      if (K.onGround || K.jumps < 5) {
        K.vy = K.jumps === 0 ? JV : JV * .72;
        K.onGround = false; K.jumps++;
        K.floating = K.jumps >= 2;
        tone(K.floating ? 450 : 335, 'sine', .14, .14, K.floating ? 600 : 670);
      }
    }
    if (K.floating && jumpK && K.vy > FLOAT) K.vy = Math.max(K.vy - .7, FLOAT);
    if (!jumpK) K.floating = false;

    K.vy += GRAV;
    K.x += K.vx; K.y += K.vy;
    K.x = Math.max(K.r, Math.min(WORLD_W - K.r, K.x));

    // Ground & platforms
    K.onGround = false;
    if (K.y >= FLOOR) {
      K.y = FLOOR; K.vy = 0; K.onGround = true; K.jumps = 0; K.floating = false;
    }
    for (const p of levelData.platforms) {
      const inX = K.x + K.r > p.x && K.x - K.r < p.x + p.w;
      const wasAbove = (K.y - K.vy) <= p.y + 2;
      if (inX && wasAbove && K.vy >= 0 && K.y >= p.y) {
        K.y = p.y; K.vy = 0; K.onGround = true; K.jumps = 0; K.floating = false;
      }
    }

    // Inhale
    if (inhK && K.state === 'normal')    K.state = 'inhaling';
    if (!inhK && K.state === 'inhaling') K.state = 'normal';

    if (K.state === 'inhaling') {
      for (const e of enemies) {
        if (e.state !== 'walk') continue;
        const dx = e.x - K.x, dy = Math.abs(e.y - K.y);
        if ((K.facing > 0 ? dx > 0 : dx < 0) && Math.abs(dx) < 155 && dy < 80)
          e.state = 'sucked';
      }
    }

    for (const e of enemies) {
      if (e.state !== 'sucked') continue;
      e.x += (K.x - e.x) * .13;
      e.y += (K.y - e.y) * .13;
      if (Math.abs(e.x - K.x) < 14 && Math.abs(e.y - K.y) < 14) {
        e.state = 'dead';
        if (K.state === 'inhaling') { K.state = 'puffed'; tone(200, 'sine', .28, .17, 85); }
      }
    }

    // Puffed
    if (K.state === 'puffed') {
      if (pressed('KeyZ')) {
        const lastDead = [...enemies].reverse().find(e => e.state === 'dead');
        const eType = lastDead?.type || 'fire';
        K.state = 'transform'; K.transformTimer = 35;
        K.power = eType === 'plant' ? 'leaf' : eType === 'wind' ? 'wind' : 'fire';
        const col = { leaf: '#44CC44', wind: '#AADDFF', fire: '#FF6600' }[K.power];
        burst(K.x, K.y, col, 22);
        [480, 680, 900].forEach((f, i) => setTimeout(() => tone(f, 'triangle', .2, .2), i * 65));
        setTimeout(() => { if (K.state === 'transform') K.state = 'normal'; }, 500);
        K.msg = { leaf: '🍃 כוח עלים!', wind: '🌪️ כוח רוח!', fire: '🔥 כוח אש!' }[K.power];
        K.msgTimer = 100;
      }
      if (pressed('KeyX')) {
        shots.push({ x: K.x + K.facing*28, y: K.y-12, vx: K.facing*9.5, vy: -1, type: 'star', life: 55, r: 11 });
        K.state = 'normal'; tone(410, 'sine', .17, .16, 720);
      }
    }

    // Shoot
    if (K.state === 'normal' && K.power === 'fire' && pressed('KeyX')) {
      shots.push({ x: K.x + K.facing*28, y: K.y-10, vx: K.facing*7.8, vy: 0, type: 'fire', life: 46, r: 13 });
      tone(280, 'sawtooth', .11, .14, 580);
    }
    if (K.state === 'normal' && K.power === 'leaf' && pressed('KeyX')) {
      shots.push({ x: K.x + K.facing*28, y: K.y-10, vx: K.facing*7, vy: -0.5, type: 'leaf', life: 55, r: 12, spin: 0 });
      shots.push({ x: K.x + K.facing*28, y: K.y-10, vx: K.facing*7, vy:  0.5, type: 'leaf', life: 55, r: 10, spin: Math.PI });
      tone(340, 'sine', .12, .13, 620);
    }
    if (K.state === 'normal' && K.power === 'wind' && pressed('KeyX')) {
      shots.push({ x: K.x + K.facing*28, y: K.y-18, vx: K.facing*8.5, vy: 0, type: 'tornado', life: 60, r: 16, spin: 0 });
      tone(180, 'sine', .18, .14, 420);
    }

    // Plant seeds
    for (const e of enemies) {
      if (e.state !== 'walk' || e.type !== 'plant') continue;
      if (Math.abs(e.x - K.x) > 350) continue;
      e.seedTimer--;
      if (e.seedTimer <= 0) {
        e.seedTimer = 130 + Math.floor(Math.random() * 80);
        const dir = e.x < K.x ? 1 : -1;
        shots.push({ x: e.x + dir*18, y: e.y-15, vx: dir*3, vy: -1.5, type: 'seed', life: 70, r: 5, enemy: true });
      }
    }

    // Update shots
    for (const s of shots) {
      s.x += s.vx; s.y += s.vy;
      if (s.type === 'fire')    s.vy += .09;
      if (s.type === 'leaf')    { s.spin += 0.18; s.vy += .04; }
      if (s.type === 'tornado') s.spin += 0.22;
      if (s.type === 'seed')    s.vy += .1;
      s.life--;
      if (s.r > 2 && s.type !== 'seed') s.r = Math.max(2, s.r - .08);

      if (!s.enemy) {
        for (const e of enemies) {
          if (e.state !== 'walk') continue;
          if (Math.hypot(s.x - e.x, s.y - (e.y - e.r)) < s.r + e.r - 2) {
            e.state = 'dead'; s.life = 0;
            const col = { leaf: '#44CC44', tornado: '#AADDFF', fire: '#FF4400', star: '#FFE060' }[s.type] || '#FFE060';
            burst(e.x, e.y - e.r, col, 16);
            tone(520, 'sawtooth', .2, .16, 90);
          }
        }
      } else if (invincible <= 0 && Math.hypot(s.x - K.x, s.y - (K.y - K.r)) < s.r + K.r - 4) {
        s.life = 0; hitKirby();
      }
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      if (s.life <= 0 || s.y > H + 30 || s.x < -60 || s.x > WORLD_W + 60) shots.splice(i, 1);
    }

    // Enemy contact
    if (invincible <= 0) {
      for (const e of enemies) {
        if (e.state !== 'walk') continue;
        if (Math.hypot(K.x - e.x, (K.y - K.r) - (e.y - e.r)) < K.r + e.r - 6) {
          hitKirby(); break;
        }
      }
    }

    // Move enemies — patrol around spawn
    for (const e of enemies) {
      if (e.state !== 'walk') continue;
      e.x += e.vx;
      if (e.x < e.spawnX - e.patrol) { e.vx =  Math.abs(e.vx); if ('facing' in e) e.facing =  1; }
      if (e.x > e.spawnX + e.patrol) { e.vx = -Math.abs(e.vx); if ('facing' in e) e.facing = -1; }
      e.t += .1;
      if (e.type === 'wind') e.y = e.floatBase + Math.sin(e.t * 0.8) * 22;
    }

    // Collect stars
    for (const s of stars) {
      if (s.collected) continue;
      s.spin += 0.06;
      if (Math.hypot(K.x - s.x, (K.y - K.r*0.5) - s.y) < K.r + 14) {
        s.collected = true; starsCollected++;
        burst(s.x, s.y, '#FFE000', 10);
        tone(660, 'sine', .12, .15, 1200);
      }
    }

    // Door
    if (Math.abs(K.x - (levelData.doorX + 28)) < 55 && K.y >= FLOOR - 10) {
      gameState = 'won'; winTimer = 0;
      [440, 550, 660, 770, 880].forEach((f, i) => setTimeout(() => tone(f, 'triangle', .35, .2), i * 100));
      burst(K.x, K.y - K.r, '#FFE000', 40);
    }

    // Particles
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += .18; p.life -= .025; }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);

    if (K.msgTimer > 0) K.msgTimer--;

    // Camera
    camXTarget = Math.max(0, Math.min(WORLD_W - W, K.x - W * 0.38));
    camX += (camXTarget - camX) * 0.1;

    Object.assign(prev, keys);
  }

  function hitKirby() {
    health--;
    invincible = 90;
    K.vx = -K.facing * 4; K.vy = -6;
    burst(K.x, K.y - K.r, '#FF6688', 12);
    [220, 160, 100].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', .15, .12), i * 80));
    if (health <= 0) {
      gameState = 'dead';
      setTimeout(() => { resetLevel(); }, 2200);
    }
  }

  // ── Draw Helpers ──
  function cx(worldX) { return worldX - camX; }

  function cloud(wx, y, r) {
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.beginPath();
    ctx.arc(cx(wx),    y,   r,      0, Math.PI*2);
    ctx.arc(cx(wx)+r,  y+5, r*.63,  0, Math.PI*2);
    ctx.arc(cx(wx)-r,  y+5, r*.63,  0, Math.PI*2);
    ctx.fill();
  }

  function drawPlatform(p) {
    const sx = cx(p.x);
    const col1 = currentLevel === 2 ? '#5B8A2E' : '#8EC63F';
    const col2 = currentLevel === 2 ? '#2E5A0E' : '#4e7c1a';
    const g = ctx.createLinearGradient(sx, p.y, sx, p.y + p.h);
    g.addColorStop(0, col1); g.addColorStop(1, col2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(sx, p.y, p.w, p.h, 7); ctx.fill();
    ctx.fillStyle = currentLevel === 2 ? '#7AB840' : '#A8DC50';
    ctx.fillRect(sx + 5, p.y + 2, p.w - 10, 4);
    if (currentLevel === 2) {
      ctx.strokeStyle = '#3A7A10'; ctx.lineWidth = 2;
      for (let vx2 = sx + 12; vx2 < sx + p.w - 8; vx2 += 22) {
        ctx.beginPath();
        ctx.moveTo(vx2, p.y + p.h);
        ctx.bezierCurveTo(vx2-6, p.y+p.h+10, vx2+4, p.y+p.h+16, vx2, p.y+p.h+20);
        ctx.stroke();
      }
    }
  }

  function drawStar(s) {
    if (s.collected) return;
    const sx = cx(s.x), sy = s.y;
    // Glow
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 16);
    g.addColorStop(0, 'rgba(255,240,60,.6)'); g.addColorStop(1, 'rgba(255,240,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI*2); ctx.fill();
    // Star shape
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(s.spin);
    ctx.fillStyle = '#FFE000'; ctx.strokeStyle = '#FF9900'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const b = a + 2 * Math.PI / 5;
      if (i === 0) ctx.moveTo(Math.cos(a)*11, Math.sin(a)*11);
      else         ctx.lineTo(Math.cos(a)*11, Math.sin(a)*11);
      ctx.lineTo(Math.cos(b)*5, Math.sin(b)*5);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawDoor(wx) {
    const sx = cx(wx), sy = FLOOR;
    const glow = Math.sin(performance.now() * .003) * .3 + .7;
    // Glow behind door
    const rg = ctx.createRadialGradient(sx+28, sy-50, 5, sx+28, sy-50, 70);
    rg.addColorStop(0, `rgba(255,220,80,${glow * .4})`);
    rg.addColorStop(1, 'rgba(255,220,80,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(sx+28, sy-50, 70, 0, Math.PI*2); ctx.fill();
    // Door frame
    ctx.fillStyle = '#7A4010';
    ctx.fillRect(sx, sy - 80, 56, 80);
    ctx.fillStyle = '#5A2C05';
    ctx.fillRect(sx+4, sy-76, 48, 76);
    // Door opening
    ctx.fillStyle = '#2A1800';
    ctx.beginPath(); ctx.roundRect(sx+8, sy-72, 40, 68, [20, 20, 0, 0]); ctx.fill();
    // Door glow inside
    const ig = ctx.createRadialGradient(sx+28, sy-38, 3, sx+28, sy-38, 24);
    ig.addColorStop(0, `rgba(255,230,80,${glow * .7})`);
    ig.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(sx+28, sy-38, 24, 0, Math.PI*2); ctx.fill();
    // Star on door
    ctx.save(); ctx.translate(sx+28, sy-78);
    ctx.rotate(performance.now() * .002);
    ctx.fillStyle = '#FFE000'; ctx.strokeStyle = '#FF9900'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const b = a + 2 * Math.PI / 5;
      if (i === 0) ctx.moveTo(Math.cos(a)*13, Math.sin(a)*13);
      else         ctx.lineTo(Math.cos(a)*13, Math.sin(a)*13);
      ctx.lineTo(Math.cos(b)*5.5, Math.sin(b)*5.5);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawKirby() {
    const x = cx(K.x), bodyY = K.y - K.r;
    const r = K.state === 'puffed' ? 27 : K.r;
    const puffed = K.state === 'puffed';
    const isFireForm = K.power === 'fire' && K.state !== 'puffed' && K.state !== 'transform';
    const isLeafForm = K.power === 'leaf' && K.state !== 'puffed' && K.state !== 'transform';
    const isWindForm = K.power === 'wind' && K.state !== 'puffed' && K.state !== 'transform';
    const flash = K.state === 'transform' && K.transformTimer % 4 < 2;
    const flicker = invincible > 0 && Math.floor(invincible * .2) % 2 === 0;

    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.beginPath(); ctx.ellipse(x, FLOOR + 5, r*.9, 5, 0, 0, Math.PI*2); ctx.fill();

    if (flash || flicker) return;

    const bCol = isFireForm ? '#FF5520' : isLeafForm ? '#80DD60' : isWindForm ? '#AADDFF' : '#FF9DC0';
    ctx.fillStyle = bCol;
    ctx.beginPath(); ctx.ellipse(x, bodyY, r, r*(puffed?1.08:1), 0, 0, Math.PI*2); ctx.fill();

    const shine = ctx.createRadialGradient(x-r*.3, bodyY-r*.3, r*.1, x, bodyY, r);
    shine.addColorStop(0, 'rgba(255,255,255,.35)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath(); ctx.ellipse(x, bodyY, r, r, 0, 0, Math.PI*2); ctx.fill();

    const ftCol = isFireForm ? '#AA1800' : isLeafForm ? '#3A8A20' : isWindForm ? '#6699CC' : '#D05580';
    const fSwing = K.onGround ? Math.sin(K.walkT)*5 : 0;
    ctx.fillStyle = ftCol;
    ctx.beginPath(); ctx.ellipse(x + K.facing*9 + fSwing, K.y+2, 10, 6, .25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - K.facing*4 - fSwing, K.y+2,  9, 5,-.25, 0, Math.PI*2); ctx.fill();

    const armY = bodyY - r*.1;
    const armA = K.state === 'inhaling' ? K.facing*.5 : Math.sin(K.walkT)*.3;
    ctx.fillStyle = bCol;
    ctx.beginPath(); ctx.ellipse(x + K.facing*r*.82, armY, 9, 6, armA, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - K.facing*r*.74, armY, 8, 6, armA, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = 'rgba(255,100,145,.52)';
    ctx.beginPath(); ctx.ellipse(x - r*.5, bodyY + r*.05, r*.2, r*.12, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r*.5, bodyY + r*.05, r*.2, r*.12, 0, 0, Math.PI*2); ctx.fill();

    const eox = K.facing > 0 ? 7 : -7, ey = bodyY - r*.3;
    const eyeCol = isFireForm ? '#330000' : isLeafForm ? '#1A3A00' : isWindForm ? '#003366' : '#111111';
    ctx.fillStyle = eyeCol;
    ctx.beginPath(); ctx.ellipse(x+eox, ey, 5, 6.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x-eox, ey, 5, 6.5, 0, 0, Math.PI*2); ctx.fill();
    if (isFireForm || isLeafForm || isWindForm) {
      const iCol = isFireForm ? '#CC1100' : isLeafForm ? '#22AA00' : '#0066AA';
      ctx.fillStyle = iCol;
      ctx.beginPath(); ctx.ellipse(x+eox, ey, 3, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x-eox, ey, 3, 4, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x+eox+2, ey-2, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x-eox+2, ey-2, 2, 0, Math.PI*2); ctx.fill();

    if (K.state === 'inhaling') {
      ctx.fillStyle = '#5A0010';
      ctx.beginPath(); ctx.ellipse(x + K.facing*11, bodyY+r*.38, 9, 9, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF7070';
      ctx.beginPath(); ctx.arc(x + K.facing*11, bodyY+r*.38, 6, 0, Math.PI*2); ctx.fill();
    } else if (puffed) {
      ctx.fillStyle = '#5A0010';
      ctx.beginPath(); ctx.arc(x, bodyY+r*.45, 4, 0, Math.PI); ctx.fill();
    } else {
      ctx.strokeStyle = '#5A0010'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + K.facing*6, bodyY+r*.35, 6, .15, Math.PI-.15); ctx.stroke();
    }

    if (isFireForm)  drawFlameHat(x, bodyY-r-5);
    if (isLeafForm)  drawLeafHat(x, bodyY-r-2);
    if (isWindForm)  drawWindHat(x, bodyY-r-2);
  }

  function flameShape(cx2, cy, sz, c1, c2, t) {
    const w2 = 1 + .2*Math.sin(t*2.1);
    const g = ctx.createRadialGradient(cx2, cy+sz*.6, 1, cx2, cy+sz*.6, sz*w2);
    g.addColorStop(0, '#fff8'); g.addColorStop(.35, c1); g.addColorStop(1, c2+'00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx2 - sz*.55*w2, cy+sz);
    ctx.bezierCurveTo(cx2-sz*.4, cy+sz*.5, cx2-sz*.1, cy+sz*.2, cx2, cy);
    ctx.bezierCurveTo(cx2+sz*.1, cy+sz*.2, cx2+sz*.4, cy+sz*.5, cx2+sz*.55*w2, cy+sz);
    ctx.closePath(); ctx.fill();
  }

  function drawFlameHat(x, y) {
    const t = performance.now()*.006;
    flameShape(x, y, 13, '#FFB030', '#FF5010', t);
  }

  function drawLeafHat(x, y) {
    const t = performance.now()*.003;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t)*.15);
    ctx.fillStyle = '#2ECC40'; ctx.strokeStyle = '#1A7A20'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.bezierCurveTo(-14,-8,-16,-22,0,-26);
    ctx.bezierCurveTo(16,-22,14,-8,0,0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#1A7A20'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-22); ctx.stroke();
    ctx.rotate(-0.5+Math.sin(t*1.3)*.1);
    ctx.fillStyle = '#44DD50';
    ctx.beginPath();
    ctx.moveTo(0,-8); ctx.bezierCurveTo(-10,-14,-12,-24,2,-26);
    ctx.bezierCurveTo(10,-20,8,-12,0,-8); ctx.fill();
    ctx.restore();
  }

  function drawWindHat(x, y) {
    const t = performance.now()*.004;
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 3; i++) {
      const a = t + i*(Math.PI*2/3);
      ctx.strokeStyle = `rgba(150,210,255,${.7-i*.1})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, -12, 10+i*3, a, a+Math.PI*1.1); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,235,255,0.9)';
    ctx.beginPath(); ctx.arc(0,-20,7,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-8,-17,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,-17,5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawFireEnemy(e) {
    if (e.state === 'dead') return;
    const x = cx(e.x), y = e.y - e.r, t = e.t;
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.ellipse(cx(e.x), FLOOR+4, 15, 5, 0, 0, Math.PI*2); ctx.fill();
    const bg = ctx.createRadialGradient(x-4,y-4,2, x,y,e.r);
    bg.addColorStop(0,'#FFCC44'); bg.addColorStop(1,'#FF3500');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x,y,e.r,0,Math.PI*2); ctx.fill();
    const fh = 20+Math.sin(t*1.9)*4;
    flameShape(x, y-e.r-fh+4, fh, '#FF8800','#FF2200', t);
    flameShape(x, y-e.r-fh*.65+4, fh*.6, '#FFDD00','#FF8800', t+1);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x-5,y-4,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+5,y-4,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF1100';
    ctx.beginPath(); ctx.arc(x-5,y-4,2.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+5,y-4,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x-4,y-5,1.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+6,y-5,1.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#550000'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(x-9,y-10); ctx.lineTo(x-2,y-8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+9,y-10); ctx.lineTo(x+2,y-8); ctx.stroke();
  }

  function drawPlantEnemy(e) {
    if (e.state === 'dead') return;
    const x = cx(e.x), y = e.y - e.r, t = e.t;
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.ellipse(cx(e.x), FLOOR+4, 15, 5, 0, 0, Math.PI*2); ctx.fill();
    const bg = ctx.createRadialGradient(x-4,y-4,2, x,y,e.r);
    bg.addColorStop(0,'#88EE44'); bg.addColorStop(1,'#2A8A10');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x,y,e.r,0,Math.PI*2); ctx.fill();
    const lw = Math.sin(t*1.3)*.15;
    ctx.save(); ctx.translate(x, y-e.r+2);
    ctx.save(); ctx.rotate(-0.4+lw);
    ctx.fillStyle='#44CC20'; ctx.strokeStyle='#1A6A00'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(-10,-8,-12,-20,0,-22); ctx.bezierCurveTo(10,-16,8,-6,0,0); ctx.fill(); ctx.stroke();
    ctx.restore(); ctx.save(); ctx.rotate(0.4-lw);
    ctx.fillStyle='#55DD30'; ctx.strokeStyle='#1A6A00'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(10,-8,12,-20,0,-22); ctx.bezierCurveTo(-10,-16,-8,-6,0,0); ctx.fill(); ctx.stroke();
    ctx.restore(); ctx.restore();
    ctx.fillStyle='#112200';
    ctx.beginPath(); ctx.arc(x-5,y-3,3.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+5,y-3,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#22AA00';
    ctx.beginPath(); ctx.arc(x-5,y-3,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+5,y-3,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#112200'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-9,y-9); ctx.lineTo(x-2,y-7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+9,y-9); ctx.lineTo(x+2,y-7); ctx.stroke();
  }

  function drawWindEnemy(e) {
    if (e.state === 'dead') return;
    const x = cx(e.x), y = e.y - e.r, t = e.t;
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    ctx.beginPath(); ctx.ellipse(cx(e.x), FLOOR+4, 14, 4, 0, 0, Math.PI*2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = t*2 + i*(Math.PI*2/3);
      ctx.strokeStyle = `rgba(180,230,255,${.45-i*.1})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y, e.r+6+i*5, a, a+Math.PI*1.2); ctx.stroke();
    }
    const bg = ctx.createRadialGradient(x-4,y-4,2,x,y,e.r);
    bg.addColorStop(0,'#DDEEFF'); bg.addColorStop(1,'#5599CC');
    ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(x,y,e.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#002244';
    ctx.beginPath(); ctx.arc(x-5,y-3,3.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+5,y-3,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0066AA';
    ctx.beginPath(); ctx.arc(x-5,y-3,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+5,y-3,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#002244'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-9,y-9); ctx.lineTo(x-2,y-7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+9,y-9); ctx.lineTo(x+2,y-7); ctx.stroke();
  }

  function drawShot(s) {
    if (s.type === 'seed') {
      ctx.fillStyle = '#8B4513';
      ctx.beginPath(); ctx.arc(cx(s.x), s.y, s.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#44AA00';
      ctx.beginPath(); ctx.arc(cx(s.x), s.y-3, 3, 0, Math.PI*2); ctx.fill();
      return;
    }
    ctx.save(); ctx.translate(cx(s.x), s.y);
    if (s.type === 'star') {
      ctx.rotate(performance.now()*.012);
      ctx.fillStyle='#FFE000'; ctx.strokeStyle='#FF9900'; ctx.lineWidth=1.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = i*4*Math.PI/5 - Math.PI/2, b = a + 2*Math.PI/5;
        if (i===0) ctx.moveTo(Math.cos(a)*s.r, Math.sin(a)*s.r);
        else ctx.lineTo(Math.cos(a)*s.r, Math.sin(a)*s.r);
        ctx.lineTo(Math.cos(b)*s.r*.4, Math.sin(b)*s.r*.4);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (s.type === 'leaf') {
      ctx.rotate(s.spin);
      ctx.fillStyle='#44CC20'; ctx.strokeStyle='#1A6A00'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(0,s.r); ctx.bezierCurveTo(-s.r*.8,s.r*.3,-s.r*.8,-s.r*.3,0,-s.r);
      ctx.bezierCurveTo(s.r*.8,-s.r*.3,s.r*.8,s.r*.3,0,s.r);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#1A6A00'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,s.r); ctx.lineTo(0,-s.r); ctx.stroke();
    } else if (s.type === 'tornado') {
      ctx.rotate(s.spin);
      for (let i = 0; i < 3; i++) {
        const a = s.spin*1.5 + i*(Math.PI*2/3);
        ctx.strokeStyle = `rgba(160,220,255,${.8-i*.2})`; ctx.lineWidth = 3-i;
        ctx.beginPath(); ctx.arc(0,0,s.r-i*3,a,a+Math.PI*1.3); ctx.stroke();
      }
      ctx.fillStyle='rgba(200,235,255,0.4)';
      ctx.beginPath(); ctx.arc(0,0,s.r*.5,0,Math.PI*2); ctx.fill();
    } else {
      const t = performance.now()*.008;
      flameShape(0,-s.r*.5,s.r*1.4,'#FF8800','#FF2200',t);
      flameShape(0,-s.r*.3,s.r*.9,'#FFDD00','#FF8800',t+1);
    }
    ctx.restore();
  }

  // ── Background ──
  function drawSkyBg() {
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#70BBEA'); sky.addColorStop(1,'#CCE8FF');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    // Parallax clouds
    const t = performance.now()*.00008;
    [95,315,590,720,150,450,680].forEach((bx,i) => {
      const pxOff = ((bx + camX*(0.2+i*.03)) % (WORLD_W*.35)) - camX*.05;
      cloud(bx + camX*0.2, 40+i*8, 22+i*4);
    });
    ctx.fillStyle='#4C8A28'; ctx.fillRect(0,FLOOR,W,H-FLOOR);
    ctx.fillStyle='#6EBF32'; ctx.fillRect(0,FLOOR,W,11);
    ctx.fillStyle='#88D845';
    for (let gx = (18-camX%40+40)%40; gx < W; gx+=40)
      ctx.beginPath(), ctx.ellipse(gx,FLOOR,5,3,0,0,Math.PI*2), ctx.fill();
  }

  function drawForestBg() {
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#1A3A0A'); sky.addColorStop(.6,'#2D6E14'); sky.addColorStop(1,'#4AA022');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    // Parallax trees
    ctx.fillStyle='#0D2206';
    for (let i = 0; i < 18; i++) {
      const tx = ((i*155 - camX*0.3) % (WORLD_W*.5) + WORLD_W*.5) % (WORLD_W*.5) * (W/(WORLD_W*.5));
      const th = 90 + (i%5)*20;
      ctx.beginPath(); ctx.moveTo(tx-26,FLOOR); ctx.lineTo(tx,FLOOR-th); ctx.lineTo(tx+26,FLOOR); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx-20,FLOOR-th*.4); ctx.lineTo(tx,FLOOR-th*.55); ctx.lineTo(tx+20,FLOOR-th*.4); ctx.fill();
    }
    const ft = performance.now()*.001;
    for (let i = 0; i < 9; i++) {
      const fx = ((i*90 + Math.sin(ft*.7+i)*18 - camX*0.15) % W + W) % W;
      const fy = FLOOR-70-(i%3)*50+Math.cos(ft*.5+i*1.3)*14;
      const a = .4+.4*Math.sin(ft*2.1+i*1.7);
      ctx.fillStyle=`rgba(200,255,100,${a})`; ctx.beginPath(); ctx.arc(fx,fy,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=`rgba(200,255,100,${a*.3})`; ctx.beginPath(); ctx.arc(fx,fy,8,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#1A5A08'; ctx.fillRect(0,FLOOR,W,H-FLOOR);
    ctx.fillStyle='#2A8A12'; ctx.fillRect(0,FLOOR,W,12);
    ctx.fillStyle='#FFDD44';
    for (let gx=(25-(camX%55+55)%55); gx<W; gx+=55)
      ctx.beginPath(),ctx.arc(gx,FLOOR+3,4,0,Math.PI*2),ctx.fill();
    ctx.fillStyle='#FF6688';
    for (let gx=(52-(camX%70+70)%70); gx<W; gx+=70)
      ctx.beginPath(),ctx.arc(gx,FLOOR+3,3.5,0,Math.PI*2),ctx.fill();
  }

  // ── HUD ──
  function drawHUD() {
    // Hearts
    for (let i = 0; i < 3; i++) {
      const hx = 18 + i*32, hy = 18;
      ctx.font = i < health ? '22px serif' : '22px serif';
      ctx.globalAlpha = i < health ? 1 : 0.25;
      ctx.fillText('❤️', hx, hy + 11);
    }
    ctx.globalAlpha = 1;
    // Stars
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#FFE000';
    ctx.strokeStyle = '#AA6600'; ctx.lineWidth = 3;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    const starText = `⭐ ${starsCollected} / ${stars.length}`;
    ctx.strokeText(starText, W-10, 8);
    ctx.fillText(starText, W-10, 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // Progress bar
    const prog = Math.min(1, K.x / levelData.doorX);
    const bw = 180, bx = W/2 - bw/2, by = 10;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 10, 5); ctx.fill();
    ctx.fillStyle = '#FFE000';
    ctx.beginPath(); ctx.roundRect(bx, by, bw*prog, 10, 5); ctx.fill();
    // Kirby mini dot
    const dotX = bx + bw*prog;
    ctx.fillStyle = '#FF9DC0'; ctx.beginPath(); ctx.arc(dotX, by+5, 6, 0, Math.PI*2); ctx.fill();
    // Door icon at end
    ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText('🚪', bx+bw+10, by+11);
    ctx.textAlign = 'left';
  }

  // ── Overlay screens ──
  function drawWinScreen() {
    const t = Math.min(1, winTimer/40);
    ctx.fillStyle = `rgba(0,0,0,${t*.5})`;
    ctx.fillRect(0,0,W,H);
    if (winTimer < 20) return;
    const alpha = Math.min(1,(winTimer-20)/30);
    ctx.globalAlpha = alpha;
    // Celebration particles
    ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#AA5500'; ctx.lineWidth = 6;
    ctx.strokeText('🎉 כל הכבוד! 🎉', W/2, H/2 - 30);
    ctx.fillStyle = '#FFE000';
    ctx.fillText('🎉 כל הכבוד! 🎉', W/2, H/2 - 30);
    ctx.font = 'bold 24px Arial';
    ctx.strokeStyle = '#330000'; ctx.lineWidth = 4;
    ctx.strokeText(`⭐ ${starsCollected} מתוך ${stars.length} כוכבים`, W/2, H/2 + 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(`⭐ ${starsCollected} מתוך ${stars.length} כוכבים`, W/2, H/2 + 30);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function drawDeadScreen() {
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(0,0,W,H);
    ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#550000'; ctx.lineWidth = 5;
    ctx.strokeText('אוי! נסו שוב 💫', W/2, H/2);
    ctx.fillStyle = '#FFB0B0';
    ctx.fillText('אוי! נסו שוב 💫', W/2, H/2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ── Main Draw ──
  function draw() {
    if (currentLevel === 2) drawForestBg(); else drawSkyBg();

    // Inhale beam
    if (K.state === 'inhaling') {
      const bx = cx(K.x) + K.facing*K.r, len = 150;
      const x0 = K.facing > 0 ? bx : bx-len;
      const g = ctx.createLinearGradient(bx,0,bx+K.facing*len,0);
      g.addColorStop(0,'rgba(220,160,255,.55)'); g.addColorStop(1,'rgba(220,160,255,0)');
      ctx.fillStyle=g; ctx.fillRect(x0,K.y-K.r*1.4,len,K.r*1.5);
      const t = performance.now()*.008;
      for (let i = 0; i < 5; i++) {
        const dx = K.facing*(20+i*26+Math.sin(t+i)*10), dy = Math.sin(t*1.5+i*1.2)*14;
        ctx.fillStyle=`rgba(255,200,255,${.6-i*.1})`;
        ctx.beginPath(); ctx.arc(cx(K.x)+dx, K.y-K.r*.5+dy, 3-i*.4, 0, Math.PI*2); ctx.fill();
      }
    }

    // Stars
    for (const s of stars) drawStar(s);

    // Door
    drawDoor(levelData.doorX);

    // Platforms
    for (const p of levelData.platforms) drawPlatform(p);

    // Enemies
    for (const e of enemies) {
      if (e.type === 'plant') drawPlantEnemy(e);
      else if (e.type === 'wind') drawWindEnemy(e);
      else drawFireEnemy(e);
    }

    // Shots
    for (const s of shots) drawShot(s);

    // Kirby
    drawKirby();

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(cx(p.x), p.y, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Message
    if (K.msgTimer > 0) {
      const alpha = Math.min(1, K.msgTimer/18);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.strokeStyle = '#220044'; ctx.lineWidth = 4;
      ctx.strokeText(K.msg, W/2, 10);
      ctx.fillStyle = '#fff'; ctx.fillText(K.msg, W/2, 10);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    drawHUD();

    if (gameState === 'won')  drawWinScreen();
    if (gameState === 'dead') drawDeadScreen();

    // Controls hint
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.font = '11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('חצים/WASD לזוז  •  Z לשאוב  •  Z שוב לבלוע (קבלו כוח!)  •  X לירות  •  ↑ לקפוץ (5x!)', 8, H-4);
  }

  function loop() {
    if (screen.classList.contains('active')) { update(); draw(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
