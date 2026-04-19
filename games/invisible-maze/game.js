(() => {
  const board = document.getElementById('maze-board');
  const status = document.getElementById('maze-status');
  if (!board || !status) return;

  const levels = {
    1: { size: 7, player: 16 },
    2: { size: 9, player: 12 },
    3: { size: 11, player: 9 },
  };

  let level = 1;
  let rows = levels[level].size;
  let cols = levels[level].size;
  let walls = { h: new Set(), v: new Set() };
  let start = { r: 0, c: 0 };
  let end = { r: rows - 1, c: cols - 1 };
  let visibleWalls = new Set();
  let player = { ...start };
  let playerSize = levels[level].player;

  const wallKey = (type, r, c) => `${type}:${r},${c}`;

  const buildMaze = (size) => {
    const edgeKey = (a, b) => `${a[0]},${a[1]}|${b[0]},${b[1]}`;
    const cellNeighbors = (col, row) => [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1],
    ].filter(([ncol, nrow]) => ncol >= 0 && nrow >= 0 && ncol < size && nrow < size);

    const openEdges = new Set();
    const stack = [[0, 0]];
    const visited = new Set(['0,0']);

    while (stack.length) {
      const [col, row] = stack[stack.length - 1];
      const options = cellNeighbors(col, row).filter(([ncol, nrow]) => !visited.has(`${ncol},${nrow}`));
      if (!options.length) {
        stack.pop();
        continue;
      }
      const nextCell = GameUtils.randomChoice(options);
      const nextKey = edgeKey([col, row], nextCell);
      openEdges.add(nextKey);
      visited.add(`${nextCell[0]},${nextCell[1]}`);
      stack.push(nextCell);
    }

    const h = new Set();
    const v = new Set();
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
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

  const resetMaze = (nextLevel = level) => {
    level = nextLevel;
    const cfg = levels[level];
    rows = cfg.size;
    cols = cfg.size;
    playerSize = cfg.player;
    start = { r: 0, c: 0 };
    end = { r: rows - 1, c: cols - 1 };
    visibleWalls = new Set();
    do {
      walls = buildMaze(cfg.size);
    } while (!hasPath(cfg.size, walls.h, walls.v));
    player = { ...start };
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.setProperty('--maze-player-size', `${playerSize}px`);
    render();
    status.textContent = 'התחילו לנוע בזהירות';
  };

  const revealMaze = () => {
    visibleWalls = new Set();
    for (const key of walls.h) visibleWalls.add(wallKey('h', ...key.split(',').map(Number)));
    for (const key of walls.v) visibleWalls.add(wallKey('v', ...key.split(',').map(Number)));
  };

  const blockLeft = (r, c) => c > 0 && walls.v.has(`${r},${c - 1}`);
  const blockRight = (r, c) => c < cols - 1 && walls.v.has(`${r},${c}`);
  const blockUp = (r, c) => r > 0 && walls.h.has(`${r - 1},${c}`);
  const blockDown = (r, c) => r < rows - 1 && walls.h.has(`${r},${c}`);

  const render = () => {
    board.innerHTML = '';
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cell = document.createElement('div');
        cell.className = 'maze-cell';
        if (player.r === r && player.c === c) cell.classList.add('player');
        if (r === start.r && c === start.c) cell.classList.add('start');
        if (r === end.r && c === end.c) cell.classList.add('end');
        cell.style.setProperty('--p', `${playerSize}px`);
        cell.textContent = player.r === r && player.c === c ? '⬛' : '';
        board.appendChild(cell);
      }
    }

    visibleWalls.forEach((key) => {
      const [type, pos] = key.split(':');
      const [r, c] = pos.split(',').map(Number);
      const line = document.createElement('div');
      line.className = `maze-wall maze-wall-${type}`;
      if (type === 'v') {
        line.style.left = `${((c + 1) / cols) * 100}%`;
        line.style.top = `${(r / rows) * 100}%`;
        line.style.height = `${100 / rows}%`;
      } else {
        line.style.left = `${(c / cols) * 100}%`;
        line.style.top = `${((r + 1) / rows) * 100}%`;
        line.style.width = `${100 / cols}%`;
      }
      board.appendChild(line);
    });
  };

  const move = (dr, dc) => {
    const nr = player.r + dr;
    const nc = player.c + dc;
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
    if (dc === -1 && blockLeft(player.r, player.c)) {
      visibleWalls.add(wallKey('v', player.r, player.c - 1));
      status.textContent = 'גיליתם קיר אדום.';
      render();
      return;
    }
    if (dc === 1 && blockRight(player.r, player.c)) {
      visibleWalls.add(wallKey('v', player.r, player.c));
      status.textContent = 'גיליתם קיר אדום.';
      render();
      return;
    }
    if (dr === -1 && blockUp(player.r, player.c)) {
      visibleWalls.add(wallKey('h', player.r - 1, player.c));
      status.textContent = 'גיליתם קיר אדום.';
      render();
      return;
    }
    if (dr === 1 && blockDown(player.r, player.c)) {
      visibleWalls.add(wallKey('h', player.r, player.c));
      status.textContent = 'גיליתם קיר אדום.';
      render();
      return;
    }
    player = { r: nr, c: nc };
    if (nr === end.r && nc === end.c) {
      revealMaze();
      status.textContent = 'ניצחתם! כל המבוך נחשף.';
    } else {
      status.textContent = 'ממשיכים בזהירות...';
    }
    render();
  };

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('maze-screen')?.classList.contains('active')) return;
    const map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const moveDir = map[e.key];
    if (moveDir) move(moveDir[0], moveDir[1]);
  });

  document.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', () => resetMaze(Number(btn.dataset.level)));
  });

  resetMaze(1);
})();
