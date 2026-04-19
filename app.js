const screens = {
  menu: document.getElementById('menu-screen'),
  maze: document.getElementById('maze-screen'),
  dino: document.getElementById('dino-screen'),
};

const showScreen = (name) => {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
};

document.querySelectorAll('[data-game]').forEach((btn) => {
  btn.addEventListener('click', () => showScreen(btn.dataset.game));
});
document.querySelectorAll('[data-back]').forEach((btn) => btn.addEventListener('click', () => showScreen('menu')));

const mazeBoard = document.getElementById('maze-board');
const mazeStatus = document.getElementById('maze-status');
const mazeLevels = {
  1: { size: 7, player: 16 },
  2: { size: 9, player: 12 },
  3: { size: 11, player: 9 },
};
let mazeLevel = 1;
let mazeRows = mazeLevels[mazeLevel].size;
let mazeCols = mazeLevels[mazeLevel].size;
let mazeWalls = { h: new Set(), v: new Set() };
let mazeStart = { r: 0, c: 0 };
let mazeEnd = { r: mazeRows - 1, c: mazeCols - 1 };
let mazeVisibleWalls = new Set();
let mazePlayer = { ...mazeStart };
let mazePlayerSize = mazeLevels[mazeLevel].player;

const wallKey = (type, r, c) => `${type}:${r},${c}`;

const buildMaze = (size) => {
  const edgeKey = (a, b) => `${a[0]},${a[1]}|${b[0]},${b[1]}`;
  const cellNeighbors = (col, row) => [
    [col - 1, row],
    [col + 1, row],
    [col, row - 1],
    [col, row + 1],
  ].filter(([ncol, nrow]) => ncol >= 0 && nrow >= 0 && ncol < size && nrow < size);

  const allEdges = new Set();
  for (let col = 0; col < size; col += 1) {
    for (let row = 0; row < size; row += 1) {
      for (const [ncol, nrow] of cellNeighbors(col, row)) {
        const key = edgeKey([col, row], [ncol, nrow]);
        const reverse = edgeKey([ncol, nrow], [col, row]);
        if (!allEdges.has(reverse)) allEdges.add(key);
      }
    }
  }

  const openEdges = new Set();
  const start = [0, 0];
  const stack = [start];
  const visited = new Set([edgeKey(start, start)]);

  while (stack.length) {
    const [col, row] = stack[stack.length - 1];
    const unvisited = cellNeighbors(col, row).filter(([ncol, nrow]) => !visited.has(edgeKey([ncol, nrow], [ncol, nrow])) && !stack.some(([sc, sr]) => sc === ncol && sr === nrow));

    const options = cellNeighbors(col, row).filter(([ncol, nrow]) => !stack.some(([sc, sr]) => sc === ncol && sr === nrow));
    const unvisitedOptions = options.filter(([ncol, nrow]) => !visited.has(`${ncol},${nrow}`));

    if (!unvisitedOptions.length) {
      stack.pop();
      continue;
    }

    const nextCell = unvisitedOptions[Math.floor(Math.random() * unvisitedOptions.length)];
    openEdges.add(edgeKey([col, row], nextCell));
    visited.add(`${nextCell[0]},${nextCell[1]}`);
    stack.push(nextCell);
  }

  const h = new Set();
  const v = new Set();
  for (let col = 0; col < size; col += 1) {
    for (let row = 0; row < size; row += 1) {
      for (const [ncol, nrow] of cellNeighbors(col, row)) {
        const key = edgeKey([col, row], [ncol, nrow]);
        const reverse = edgeKey([ncol, nrow], [col, row]);
        if (openEdges.has(key) || openEdges.has(reverse)) continue;
        if (ncol === col + 1 && nrow === row) v.add(`${row},${col}`);
        if (ncol === col && nrow === row + 1) h.add(`${row},${col}`);
      }
    }
  }

  return { h, v };
};

const hasPath = (size, h, v) => {
  const queue = [[0, 0]];
  const seen = new Set(['0,0']);
  const target = `${size - 1},${size - 1}`;
  while (queue.length) {
    const [r, c] = queue.shift();
    if (`${r},${c}` === target) return true;
    const moves = [
      [-1, 0, r > 0 && h.has(`${r - 1},${c}`)],
      [1, 0, r < size - 1 && h.has(`${r},${c}`)],
      [0, -1, c > 0 && v.has(`${r},${c - 1}`)],
      [0, 1, c < size - 1 && v.has(`${r},${c}`)],
    ];
    moves.forEach(([dr, dc, blocked]) => {
      if (blocked) return;
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push([nr, nc]);
      }
    });
  }
  return false;
};

const resetMaze = (level = mazeLevel) => {
  mazeLevel = level;
  const cfg = mazeLevels[level];
  mazeRows = cfg.size;
  mazeCols = cfg.size;
  mazePlayerSize = cfg.player;
  mazeStart = { r: 0, c: 0 };
  mazeEnd = { r: mazeRows - 1, c: mazeCols - 1 };
  mazeVisibleWalls = new Set();
  do {
    mazeWalls = buildMaze(cfg.size);
  } while (!hasPath(cfg.size, mazeWalls.h, mazeWalls.v));
  mazePlayer = { ...mazeStart };
  mazeBoard.style.gridTemplateColumns = `repeat(${mazeCols}, 1fr)`;
  mazeBoard.style.setProperty('--maze-player-size', `${mazePlayerSize}px`);
  renderMaze();
  mazeStatus.textContent = 'התחילו לנוע בזהירות';
};

const addWall = (type, r, c) => {
  mazeVisibleWalls.add(wallKey(type, r, c));
};

const blockLeft = (r, c) => c > 0 && mazeWalls.v.has(`${r},${c - 1}`);
const blockRight = (r, c) => c < mazeCols - 1 && mazeWalls.v.has(`${r},${c}`);
const blockUp = (r, c) => r > 0 && mazeWalls.h.has(`${r - 1},${c}`);
const blockDown = (r, c) => r < mazeRows - 1 && mazeWalls.h.has(`${r},${c}`);

const renderMaze = () => {
  mazeBoard.innerHTML = '';
  for (let r = 0; r < mazeRows; r += 1) {
    for (let c = 0; c < mazeCols; c += 1) {
      const cell = document.createElement('div');
      cell.className = 'maze-cell';
      if (mazePlayer.r === r && mazePlayer.c === c) cell.classList.add('player');
      if (r === mazeStart.r && c === mazeStart.c) cell.classList.add('start');
      if (r === mazeEnd.r && c === mazeEnd.c) cell.classList.add('end');
      cell.style.setProperty('--p', `${mazePlayerSize}px`);
      cell.textContent = mazePlayer.r === r && mazePlayer.c === c ? '⬛' : '';
      mazeBoard.appendChild(cell);
    }
  }

  mazeVisibleWalls.forEach((key) => {
    const [type, pos] = key.split(':');
    const [r, c] = pos.split(',').map(Number);
    const line = document.createElement('div');
    line.className = `maze-wall maze-wall-${type}`;
    if (type === 'v') {
      line.style.left = `${((c + 1) / mazeCols) * 100}%`;
      line.style.top = `${(r / mazeRows) * 100}%`;
      line.style.height = `${100 / mazeRows}%`;
    } else {
      line.style.left = `${(c / mazeCols) * 100}%`;
      line.style.top = `${((r + 1) / mazeRows) * 100}%`;
      line.style.width = `${100 / mazeCols}%`;
    }
    mazeBoard.appendChild(line);
  });
};

const moveMaze = (dr, dc) => {
  const nr = mazePlayer.r + dr;
  const nc = mazePlayer.c + dc;
  if (nr < 0 || nc < 0 || nr >= mazeRows || nc >= mazeCols) return;
  if (dc === -1 && blockLeft(mazePlayer.r, mazePlayer.c)) {
    addWall('v', mazePlayer.r, mazePlayer.c - 1);
    mazeStatus.textContent = 'גיליתם קיר אדום.';
    renderMaze();
    return;
  }
  if (dc === 1 && blockRight(mazePlayer.r, mazePlayer.c)) {
    addWall('v', mazePlayer.r, mazePlayer.c);
    mazeStatus.textContent = 'גיליתם קיר אדום.';
    renderMaze();
    return;
  }
  if (dr === -1 && blockUp(mazePlayer.r, mazePlayer.c)) {
    addWall('h', mazePlayer.r - 1, mazePlayer.c);
    mazeStatus.textContent = 'גיליתם קיר אדום.';
    renderMaze();
    return;
  }
  if (dr === 1 && blockDown(mazePlayer.r, mazePlayer.c)) {
    addWall('h', mazePlayer.r, mazePlayer.c);
    mazeStatus.textContent = 'גיליתם קיר אדום.';
    renderMaze();
    return;
  }
  mazePlayer = { r: nr, c: nc };
  if (nr === mazeEnd.r && nc === mazeEnd.c) {
    mazeStatus.textContent = 'ניצחתם! כל הכבוד.';
  } else {
    mazeStatus.textContent = 'ממשיכים בזהירות...';
  }
  renderMaze();
};

document.addEventListener('keydown', (e) => {
  if (!screens.maze.classList.contains('active')) return;
  const map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  const move = map[e.key];
  if (move) moveMaze(move[0], move[1]);
});

document.querySelectorAll('[data-level]').forEach((btn) => {
  btn.addEventListener('click', () => resetMaze(Number(btn.dataset.level)));
});

resetMaze(1);

const dino = document.getElementById('dino');
const obstacle = document.getElementById('obstacle');
const dinoStatus = document.getElementById('dino-status');
const platformStage = document.getElementById('dino-screen');
let dinoAlive = true;
let jumpTimer;
let dinoX = 60;
let dinoY = 54;
let velY = 0;
let onGround = true;
let keyTaken = false;

const world = {
  floorY: 54,
  gravity: -1.1,
  jumpForce: 18,
  speed: 5,
};

const platforms = [
  { x: 160, y: 95, w: 140, h: 16 },
  { x: 330, y: 135, w: 150, h: 16 },
  { x: 520, y: 90, w: 140, h: 16 },
];

const keyPos = { x: 610, y: 60 };

const drawDino = () => {
  dino.style.right = 'auto';
  dino.style.left = `${dinoX}px`;
  dino.style.bottom = `${dinoY}px`;
};

const renderPlatforms = () => {
  let layer = platformStage.querySelector('.platform-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'platform-layer';
    platformStage.appendChild(layer);
  }
  layer.innerHTML = '';
  platforms.forEach((p) => {
    const el = document.createElement('div');
    el.className = 'platform';
    el.style.left = `${p.x}px`;
    el.style.bottom = `${p.y}px`;
    el.style.width = `${p.w}px`;
    el.style.height = `${p.h}px`;
    layer.appendChild(el);
  });
  let key = platformStage.querySelector('.key-item');
  if (!key) {
    key = document.createElement('div');
    key.className = 'key-item';
    platformStage.appendChild(key);
  }
  key.style.left = `${keyPos.x}px`;
  key.style.bottom = `${keyPos.y}px`;
  key.textContent = keyTaken ? '' : '🔑';
};

const resetDino = () => {
  dinoAlive = true;
  keyTaken = false;
  dinoX = 60;
  dinoY = world.floorY;
  velY = 0;
  onGround = true;
  dinoStatus.textContent = 'קחו את המפתח למעלה';
  obstacle.classList.remove('run');
  obstacle.style.display = 'none';
  renderPlatforms();
  drawDino();
};

const jump = () => {
  if (!dinoAlive) return;
  if (!onGround) return;
  velY = world.jumpForce;
  onGround = false;
};

document.getElementById('jump-btn').addEventListener('click', jump);
document.getElementById('restart-dino').addEventListener('click', resetDino);

const updateDino = () => {
  if (!dinoAlive) return;
  dinoX += world.speed;
  velY += world.gravity;
  dinoY += velY;

  const standOn = (x, y, w, h) => dinoX + 38 > x && dinoX < x + w && dinoY <= y + h && dinoY >= y + h - 18 && velY <= 0;
  const landed = platforms.find((p) => standOn(p.x, p.y, p.w, p.h));
  if (landed) {
    dinoY = landed.y + landed.h;
    velY = 0;
    onGround = true;
  } else if (dinoY <= world.floorY) {
    dinoY = world.floorY;
    velY = 0;
    onGround = true;
  }

  if (!keyTaken && dinoX + 30 > keyPos.x && dinoX < keyPos.x + 30 && dinoY + 20 > keyPos.y) {
    keyTaken = true;
    dinoStatus.textContent = 'מצאנו את המפתח!';
    renderPlatforms();
  }

  if (dinoX > 660) {
    if (keyTaken) {
      dinoAlive = false;
      dinoStatus.textContent = 'ניצחתם! הגעתם למפתח.';
      obstacle.style.display = 'none';
    } else {
      dinoAlive = false;
      dinoStatus.textContent = 'צריך לקחת את המפתח קודם.';
    }
  }

  if (dinoX > 720) {
    dinoX = 60;
    dinoY = world.floorY;
    velY = 0;
  }

  drawDino();
  requestAnimationFrame(updateDino);
};

resetDino();
requestAnimationFrame(updateDino);
