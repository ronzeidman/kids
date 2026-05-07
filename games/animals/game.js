(function () {
  const screen = document.getElementById('animals-screen');
  if (!screen) return;

  const canvas = document.createElement('canvas');
  document.getElementById('animals-stage').appendChild(canvas);

  const W = 800, H = 370;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const FLOOR = H - 58;

  const keys = {};
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (screen.classList.contains('active') &&
        ['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW'].includes(e.code))
      e.preventDefault();
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  // Player: x=center, y=feet (bottom of hitbox)
  const P = { x: 120, y: FLOOR, w: 28, h: 46, vx: 0, vy: 0, onGround: false, facing: 1 };

  // Animals: x=center, y=feet on ground, h=collision height, sz=emoji font size
  const animals = [
    { emoji: '🐘', label: 'פיל',   x: 200, y: FLOOR, w: 72, h: 50, sz: 56, vx: 0.65, dir:  1 },
    { emoji: '🦒', label: 'ג׳ירפה', x: 390, y: FLOOR, w: 44, h: 78, sz: 86, vx: 0.40, dir: -1 },
    { emoji: '🐄', label: 'פרה',   x: 580, y: FLOOR, w: 58, h: 47, sz: 52, vx: 0.58, dir:  1 },
    { emoji: '🐱', label: 'חתול',  x: 680, y: FLOOR, w: 30, h: 27, sz: 32, vx: 1.10, dir: -1 },
    { emoji: '🐰', label: 'ארנב',  x: 310, y: FLOOR, w: 26, h: 25, sz: 30, vx: 1.30, dir:  1 },
  ];

  // Decorations
  const trees   = [55, 240, 470, 710];
  const flowers = [95, 165, 290, 415, 510, 635, 760];

  let rideMsg = '';
  let rideMsgTimer = 0;

  // Audio
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

  let prevOnGround = false;
  let prevRidingAnimal = null;

  function update() {
    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right = keys['ArrowRight'] || keys['KeyD'];
    const jump  = keys['ArrowUp']    || keys['KeyW'] || keys['Space'];

    if (left)       { P.vx = -3.6; P.facing = -1; }
    else if (right) { P.vx =  3.6; P.facing =  1; }
    else            { P.vx *= 0.76; }

    if (jump && P.onGround) {
      P.vy = -13;
      P.onGround = false;
      tone(320, 'sine', .14, .14, 560);
    }

    P.vy += 0.55;
    P.x  += P.vx;
    P.y  += P.vy;

    P.x = Math.max(P.w / 2, Math.min(W - P.w / 2, P.x));

    P.onGround = false;
    let ridingAnimal = null;

    // Land on ground
    if (P.y >= FLOOR) {
      P.y = FLOOR;
      P.vy = 0;
      P.onGround = true;
    }

    // Land on animals
    for (const a of animals) {
      const aTop   = a.y - a.h;
      const pLeft  = P.x - P.w / 2;
      const pRight = P.x + P.w / 2;
      const overlapX = pRight > a.x - a.w / 2 && pLeft < a.x + a.w / 2;
      if (overlapX && P.vy >= 0 && P.y >= aTop && P.y <= aTop + 20) {
        P.y = aTop;
        P.vy = 0;
        P.onGround = true;
        ridingAnimal = a;
        P.x = Math.max(P.w / 2, Math.min(W - P.w / 2, P.x + a.vx * a.dir));
      }
    }

    // Sound & message on landing
    if (!prevOnGround && P.onGround) {
      tone(130, 'sine', .10, .12, 80);
      if (ridingAnimal && ridingAnimal !== prevRidingAnimal) {
        rideMsg = `עלית על ה${ridingAnimal.label}! 🎉`;
        rideMsgTimer = 120;
        tone(500, 'triangle', .18, .15, 700);
      }
    }
    prevOnGround   = P.onGround;
    prevRidingAnimal = ridingAnimal;

    if (rideMsgTimer > 0) rideMsgTimer--;

    // Move animals
    for (const a of animals) {
      a.x += a.vx * a.dir;
      if (a.x < a.w / 2 + 22)     a.dir =  1;
      if (a.x > W - a.w / 2 - 22) a.dir = -1;
    }
  }

  function drawCloud(x, y, r) {
    ctx.fillStyle = 'rgba(255,255,255,.86)';
    ctx.beginPath();
    ctx.arc(x,       y,      r,       0, Math.PI * 2);
    ctx.arc(x + r,   y + 5,  r * .65, 0, Math.PI * 2);
    ctx.arc(x - r,   y + 5,  r * .65, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTree(x) {
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(x - 5, FLOOR - 44, 10, 44);
    ctx.fillStyle = '#3a8c2f';
    ctx.beginPath(); ctx.arc(x, FLOOR - 54, 21, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4db83e';
    ctx.beginPath(); ctx.arc(x, FLOOR - 67, 15, 0, Math.PI * 2); ctx.fill();
  }

  const FLOWER_EMOJIS = ['🌸', '🌼', '🌺'];

  function draw() {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5AACDF');
    sky.addColorStop(1, '#BEE8FF');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun
    ctx.fillStyle = '#FFE135';
    ctx.beginPath(); ctx.arc(738, 42, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF06A';
    ctx.beginPath(); ctx.arc(738, 42, 18, 0, Math.PI * 2); ctx.fill();

    drawCloud(100, 55, 26);
    drawCloud(330, 36, 32);
    drawCloud(588, 52, 24);

    // Ground
    ctx.fillStyle = '#4a7a22';
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = '#69B52B';
    ctx.fillRect(0, FLOOR, W, 11);

    // Flowers
    ctx.font = '15px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const fx of flowers) {
      ctx.fillText(FLOWER_EMOJIS[Math.floor(fx / 55) % 3], fx, FLOOR);
    }

    // Trees
    for (const tx of trees) drawTree(tx);

    // Animals
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    for (const a of animals) {
      ctx.save();
      ctx.font = `${a.sz}px serif`;
      if (a.dir < 0) {
        ctx.scale(-1, 1);
        ctx.fillText(a.emoji, -a.x, a.y + 4);
      } else {
        ctx.fillText(a.emoji, a.x, a.y + 4);
      }
      ctx.restore();
    }

    // Player
    ctx.save();
    ctx.font = `${P.h}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (P.facing < 0) {
      ctx.scale(-1, 1);
      ctx.fillText('🧒', -P.x, P.y + 4);
    } else {
      ctx.fillText('🧒', P.x, P.y + 4);
    }
    ctx.restore();

    // Ride message
    if (rideMsgTimer > 0) {
      const alpha = Math.min(1, rideMsgTimer / 20);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#2255aa';
      ctx.lineWidth = 3;
      ctx.strokeText(rideMsg, W / 2, 12);
      ctx.fillText(rideMsg, W / 2, 12);
      ctx.globalAlpha = 1;
    }
  }

  function loop() {
    if (screen.classList.contains('active')) {
      update();
      draw();
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
