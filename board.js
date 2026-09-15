// Game logic (board/maze). No DOM access here.
window.Engine = window.Engine || {};

Engine.WALL_COLORS = {
  BLACK: 'black',
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green',
};

Engine.shuffleArray = function (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};

Engine.createBoard = function (size) {
  size = size || 9;
  const board = {
    size: size,
    // horizontal[r][c]: wall between cell (r,c) and (r+1,c). r: 0..size-2
    horizontal: [],
    // vertical[r][c]: wall between cell (r,c) and (r,c+1). c: 0..size-2
    vertical: [],
  };
  for (let r = 0; r < size - 1; r++) {
    board.horizontal.push(new Array(size).fill(null));
  }
  for (let r = 0; r < size; r++) {
    board.vertical.push(new Array(size - 1).fill(null));
  }
  return board;
};

Engine.hasWallBetween = function (board, r1, c1, r2, c2) {
  if (r1 === r2 && Math.abs(c1 - c2) === 1) {
    const c = Math.min(c1, c2);
    return !!board.vertical[r1][c];
  }
  if (c1 === c2 && Math.abs(r1 - r2) === 1) {
    const r = Math.min(r1, r2);
    return !!board.horizontal[r][c1];
  }
  return true; // not adjacent cells
};

Engine.neighbors = function (board, r, c) {
  const result = [];
  const size = board.size;
  const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let i = 0; i < deltas.length; i++) {
    const nr = r + deltas[i][0];
    const nc = c + deltas[i][1];
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    if (Engine.hasWallBetween(board, r, c, nr, nc)) continue;
    result.push([nr, nc]);
  }
  return result;
};

Engine.isReachable = function (board, from, to) {
  const visited = new Set();
  const queue = [from];
  visited.add(from[0] + ',' + from[1]);
  while (queue.length) {
    const cur = queue.shift();
    if (cur[0] === to[0] && cur[1] === to[1]) return true;
    const neighbors = Engine.neighbors(board, cur[0], cur[1]);
    for (let i = 0; i < neighbors.length; i++) {
      const key = neighbors[i][0] + ',' + neighbors[i][1];
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(neighbors[i]);
      }
    }
  }
  return false;
};

// Randomly places black (permanent) walls up to a target density, skipping
// any wall that would cut off the start from the goal entirely.
Engine.generateBlackWalls = function (board, start, goal, density) {
  density = density == null ? 0.35 : density;
  const size = board.size;
  const candidates = [];
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size; c++) candidates.push({ type: 'h', r: r, c: c });
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) candidates.push({ type: 'v', r: r, c: c });
  }
  Engine.shuffleArray(candidates);

  const targetCount = Math.floor(candidates.length * density);
  let placed = 0;
  for (let i = 0; i < candidates.length && placed < targetCount; i++) {
    const cand = candidates[i];
    if (cand.type === 'h') {
      board.horizontal[cand.r][cand.c] = Engine.WALL_COLORS.BLACK;
    } else {
      board.vertical[cand.r][cand.c] = Engine.WALL_COLORS.BLACK;
    }
    if (Engine.isReachable(board, start, goal)) {
      placed++;
    } else if (cand.type === 'h') {
      board.horizontal[cand.r][cand.c] = null;
    } else {
      board.vertical[cand.r][cand.c] = null;
    }
  }
};

// Removes every wall segment of a given color (used to reshuffle/retire
// red/blue/green walls without touching other colors).
Engine.clearColor = function (board, color) {
  for (let r = 0; r < board.horizontal.length; r++) {
    for (let c = 0; c < board.horizontal[r].length; c++) {
      if (board.horizontal[r][c] === color) board.horizontal[r][c] = null;
    }
  }
  for (let r = 0; r < board.vertical.length; r++) {
    for (let c = 0; c < board.vertical[r].length; c++) {
      if (board.vertical[r][c] === color) board.vertical[r][c] = null;
    }
  }
};

// Places up to `count` walls of `color` into currently-empty edges only,
// skipping any placement that would cut `from` off from `to`. Used for the
// dynamic (red/blue/green) wall types, which never overwrite an existing wall.
Engine.placeRandomWalls = function (board, color, count, from, to) {
  const size = board.size;
  const candidates = [];
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size; c++) {
      if (!board.horizontal[r][c]) candidates.push({ type: 'h', r: r, c: c });
    }
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (!board.vertical[r][c]) candidates.push({ type: 'v', r: r, c: c });
    }
  }
  Engine.shuffleArray(candidates);

  let placed = 0;
  for (let i = 0; i < candidates.length && placed < count; i++) {
    const cand = candidates[i];
    if (cand.type === 'h') {
      board.horizontal[cand.r][cand.c] = color;
    } else {
      board.vertical[cand.r][cand.c] = color;
    }
    if (Engine.isReachable(board, from, to)) {
      placed++;
    } else if (cand.type === 'h') {
      board.horizontal[cand.r][cand.c] = null;
    } else {
      board.vertical[cand.r][cand.c] = null;
    }
  }
  return placed;
};
