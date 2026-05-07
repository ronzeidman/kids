(function () {
  'use strict';

  const canvas  = document.getElementById('sb-canvas');
  const ctx     = canvas.getContext('2d');

  // Logical grid: 300×250 cells. Display at 2× so each cell = 2×2 CSS pixels (visible & clickable).
  const W = 300, H = 250, DISPLAY = 2;
  canvas.width  = W;
  canvas.height = H;
  canvas.style.width  = (W * DISPLAY) + 'px';
  canvas.style.height = (H * DISPLAY) + 'px';

  const EMPTY=0, SAND=1, WATER=2, STONE=3, FIRE=4,
        WOOD=5,  LAVA=6, STEAM=7, OIL=8,  ICE=9,
        SMOKE=10, ASH=11;

  let grid    = new Uint8Array(W * H);
  let updated = new Uint8Array(W * H);
  let colorCache = new Uint32Array(W * H); // ABGR packed

  function rnd(n) { return Math.floor(Math.random() * n); }
  function idx(x, y) { return y * W + x; }
  function get(x, y) { if (x<0||x>=W||y<0||y>=H) return STONE; return grid[idx(x,y)]; }

  // Pack r,g,b,a into a Uint32 (little-endian: ABGR order in memory → RGBA on screen)
  function rgba(r, g, b, a=255) { return (a<<24) | (b<<16) | (g<<8) | r; }

  const COLORS = {
    [SAND]:  () => rgba(220+rnd(20), 180+rnd(20), 90+rnd(20)),
    [WATER]: () => rgba(40+rnd(20),  120+rnd(30), 220+rnd(20), 180+rnd(40)),
    [STONE]: () => rgba(100+rnd(20), 100+rnd(20), 100+rnd(20)),
    [FIRE]:  () => rgba(200+rnd(55), 50+rnd(100), rnd(30)),
    [WOOD]:  () => rgba(130+rnd(20), 80+rnd(20),  40+rnd(20)),
    [LAVA]:  () => rgba(220+rnd(35), 40+rnd(80),  rnd(20)),
    [STEAM]: () => rgba(180+rnd(30), 200+rnd(30), 220+rnd(30), 80+rnd(60)),
    [OIL]:   () => rgba(150+rnd(20), 120+rnd(20), 30+rnd(20)),
    [ICE]:   () => rgba(160+rnd(20), 210+rnd(20), 240+rnd(15)),
    [SMOKE]: () => rgba(60+rnd(30),  60+rnd(30),  60+rnd(30),  80+rnd(60)),
    [ASH]:   () => rgba(80+rnd(20),  80+rnd(20),  80+rnd(20)),
  };

  function set(x, y, type) {
    if (x<0||x>=W||y<0||y>=H) return;
    const i = idx(x, y);
    grid[i] = type;
    colorCache[i] = type ? (COLORS[type] ? COLORS[type]() : 0) : rgba(17,17,17);
  }

  function swap(x1,y1,x2,y2) {
    const i1=idx(x1,y1), i2=idx(x2,y2);
    let t; t=grid[i1]; grid[i1]=grid[i2]; grid[i2]=t;
    t=colorCache[i1]; colorCache[i1]=colorCache[i2]; colorCache[i2]=t;
    updated[i1]=1; updated[i2]=1;
  }

  function canDisplace(mover, target) {
    if (target===EMPTY) return true;
    if (mover===SAND && (target===WATER||target===OIL)) return true;
    if (mover===LAVA && (target===WATER||target===OIL||target===SAND)) return true;
    if (mover===OIL  && target===WATER) return true;
    return false;
  }

  function stepSand(x,y) {
    if (y+1<H) {
      const b=get(x,y+1);
      if (canDisplace(SAND,b)) { swap(x,y,x,y+1); return; }
      const d=Math.random()<.5?1:-1;
      if (canDisplace(SAND,get(x+d,y+1))) { swap(x,y,x+d,y+1); return; }
      if (canDisplace(SAND,get(x-d,y+1))) { swap(x,y,x-d,y+1); }
    }
  }

  function stepWater(x,y) {
    if (y+1<H && canDisplace(WATER,get(x,y+1))) { swap(x,y,x,y+1); return; }
    const d=Math.random()<.5?1:-1;
    for (let s=1; s<=3; s++) {
      if (canDisplace(WATER,get(x+d*s,y)))   { swap(x,y,x+d*s,y); return; }
      if (get(x+d*s,y)!==EMPTY&&get(x+d*s,y)!==WATER) break;
    }
    for (let s=1; s<=3; s++) {
      if (canDisplace(WATER,get(x-d*s,y)))   { swap(x,y,x-d*s,y); return; }
      if (get(x-d*s,y)!==EMPTY&&get(x-d*s,y)!==WATER) break;
    }
  }

  function stepOil(x,y) {
    if (y+1<H && canDisplace(OIL,get(x,y+1))) { swap(x,y,x,y+1); return; }
    const d=Math.random()<.5?1:-1;
    for (let s=1; s<=3; s++) {
      if (canDisplace(OIL,get(x+d*s,y)))  { swap(x,y,x+d*s,y); return; }
      if (get(x+d*s,y)!==EMPTY&&get(x+d*s,y)!==OIL) break;
    }
    for (let s=1; s<=3; s++) {
      if (canDisplace(OIL,get(x-d*s,y)))  { swap(x,y,x-d*s,y); return; }
      if (get(x-d*s,y)!==EMPTY&&get(x-d*s,y)!==OIL) break;
    }
  }

  function stepFire(x,y) {
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
      if (dx===0&&dy===0) continue;
      const n=get(x+dx,y+dy);
      if ((n===WOOD||n===OIL) && Math.random()<0.02) set(x+dx,y+dy,FIRE);
      if (n===ICE   && Math.random()<0.05) set(x+dx,y+dy,WATER);
      if (n===WATER && Math.random()<0.1)  { set(x,y,STEAM); return; }
    }
    if (Math.random()<0.03) { set(x,y,Math.random()<0.5?SMOKE:ASH); return; }
    if (Math.random()<0.3 && get(x,y-1)===EMPTY) { swap(x,y,x,y-1); }
    else {
      const dx=rnd(3)-1;
      if (get(x+dx,y-1)===EMPTY && Math.random()<0.4) swap(x,y,x+dx,y-1);
    }
    updated[idx(x,y)]=1;
  }

  function stepLava(x,y) {
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
      if (dx===0&&dy===0) continue;
      const n=get(x+dx,y+dy);
      if ((n===WOOD||n===OIL) && Math.random()<0.04) set(x+dx,y+dy,FIRE);
      if (n===WATER && Math.random()<0.05) { set(x,y,STONE); set(x+dx,y+dy,STEAM); return; }
      if (n===ICE   && Math.random()<0.1)  set(x+dx,y+dy,WATER);
    }
    if (y+1<H && canDisplace(LAVA,get(x,y+1))) { swap(x,y,x,y+1); return; }
    const d=Math.random()<.5?1:-1;
    if (canDisplace(LAVA,get(x+d,y))) { swap(x,y,x+d,y); return; }
    if (canDisplace(LAVA,get(x-d,y))) { swap(x,y,x-d,y); }
  }

  function stepSteam(x,y) {
    if (Math.random()<0.01) { set(x,y,WATER); return; }
    if (y-1>=0 && get(x,y-1)===EMPTY) { swap(x,y,x,y-1); return; }
    const d=Math.random()<.5?1:-1;
    if (get(x+d,y)===EMPTY) swap(x,y,x+d,y);
    else if (get(x-d,y)===EMPTY) swap(x,y,x-d,y);
    updated[idx(x,y)]=1;
  }

  function stepSmoke(x,y) {
    if (Math.random()<0.005) { set(x,y,EMPTY); return; }
    if (y-1>=0 && get(x,y-1)===EMPTY) { swap(x,y,x,y-1); return; }
    const dx=rnd(3)-1;
    if (get(x+dx,y-1)===EMPTY) swap(x,y,x+dx,y-1);
    updated[idx(x,y)]=1;
  }

  function step() {
    updated.fill(0);
    for (let y=H-1; y>=0; y--) {
      const lr=Math.random()<0.5;
      for (let xi=0; xi<W; xi++) {
        const x=lr?xi:W-1-xi;
        const i=idx(x,y);
        if (updated[i]) continue;
        const t=grid[i];
        if (t===EMPTY) continue;
        if (t===SAND)  stepSand(x,y);
        else if (t===WATER) stepWater(x,y);
        else if (t===FIRE)  stepFire(x,y);
        else if (t===LAVA)  stepLava(x,y);
        else if (t===STEAM) stepSteam(x,y);
        else if (t===OIL)   stepOil(x,y);
        else if (t===SMOKE) stepSmoke(x,y);
      }
    }
  }

  // ── RENDER using ImageData for speed ─────────────────────────
  const imageData = ctx.createImageData(W, H);
  const buf32 = new Uint32Array(imageData.data.buffer);

  function render() {
    for (let i=0; i<W*H; i++) {
      buf32[i] = grid[i] ? colorCache[i] : rgba(17,17,17);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ── INPUT ─────────────────────────────────────────────────────
  let currentElement = SAND;
  let brushSize = 3;
  let drawing = false;

  document.querySelectorAll('.sb-btn[data-element]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sb-btn[data-element]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentElement = {
        sand:SAND, water:WATER, fire:FIRE, stone:STONE,
        wood:WOOD,  lava:LAVA,  steam:STEAM, oil:OIL,
        ice:ICE,    erase:EMPTY,
      }[btn.dataset.element];
    });
  });

  document.getElementById('sb-brush-size').addEventListener('input', e => {
    brushSize = parseInt(e.target.value);
  });

  document.getElementById('sb-clear-btn').addEventListener('click', () => {
    grid.fill(0); colorCache.fill(rgba(17,17,17));
  });

  // Coordinate mapping: always read from bounding rect at event time
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    // rect.width/height is the CSS display size; canvas.width/height is the logical size
    const x = Math.floor((clientX - rect.left) * (W / rect.width));
    const y = Math.floor((clientY - rect.top)  * (H / rect.height));
    return {x, y};
  }

  function paint(e) {
    if (!drawing) return;
    const {x, y} = getCanvasPos(e);
    const r = brushSize;
    for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++) {
      if (dx*dx+dy*dy > r*r) continue;
      if (Math.random()<0.7 || currentElement===STONE || currentElement===WOOD) {
        set(x+dx, y+dy, currentElement);
      }
    }
  }

  canvas.addEventListener('mousedown',  e => { drawing=true; paint(e); });
  canvas.addEventListener('mousemove',  e => { paint(e); });
  canvas.addEventListener('mouseup',    () => drawing=false);
  canvas.addEventListener('mouseleave', () => drawing=false);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; paint(e); }, {passive:false});
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); paint(e); }, {passive:false});
  canvas.addEventListener('touchend',   () => drawing=false);

  // ── LOOP ─────────────────────────────────────────────────────
  const sbScreen = document.getElementById('sandbox-screen');
  function loop() {
    if (sbScreen.classList.contains('active')) {
      step();
      render();
    }
    requestAnimationFrame(loop);
  }

  // seed with a little sand
  for (let i=0; i<200; i++) set(rnd(W), rnd(H/2)+Math.floor(H/2), SAND);

  loop();
})();
