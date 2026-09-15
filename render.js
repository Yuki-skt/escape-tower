// Rendering only. Reads Engine data, never mutates it.
window.UI = window.UI || {};

UI.CELL_SIZE = 52;
UI.GAP_SIZE = 6;

UI.buildTemplate = function (size) {
  const parts = [];
  for (let i = 0; i < size; i++) {
    parts.push(UI.CELL_SIZE + 'px');
    if (i < size - 1) parts.push(UI.GAP_SIZE + 'px');
  }
  return parts.join(' ');
};

UI.renderBoard = function (container, game, callbacks) {
  const board = game.board;
  const size = board.size;
  container.innerHTML = '';
  container.style.gridTemplateColumns = UI.buildTemplate(size);
  container.style.gridTemplateRows = UI.buildTemplate(size);

  const moves = Engine.availableMoves(game);
  const moveSet = new Set(moves.map(function (m) { return m[0] + ',' + m[1]; }));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (r === game.start[0] && c === game.start[1]) cell.classList.add('start');
      if (r === game.goal[0] && c === game.goal[1]) cell.classList.add('goal');
      if (moveSet.has(r + ',' + c)) {
        cell.classList.add('reachable');
        cell.addEventListener('click', (function (rr, cc) {
          return function () { callbacks.onCellClick(rr, cc); };
        })(r, c));
      }
      cell.style.gridColumn = (2 * c + 1) + ' / ' + (2 * c + 2);
      cell.style.gridRow = (2 * r + 1) + ' / ' + (2 * r + 2);

      if (r === game.player.r && c === game.player.c) {
        const token = document.createElement('div');
        token.className = 'player-token';
        cell.appendChild(token);
      }
      container.appendChild(cell);
    }
  }

  // Horizontal walls: between row r and r+1 at column c.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size; c++) {
      const color = board.horizontal[r][c];
      if (!color) continue;
      const wall = document.createElement('div');
      wall.className = 'wall wall-h wall-' + color;
      wall.style.gridColumn = (2 * c + 1) + ' / ' + (2 * c + 2);
      wall.style.gridRow = (2 * r + 2) + ' / ' + (2 * r + 3);
      container.appendChild(wall);
    }
  }
  // Vertical walls: between column c and c+1 at row r.
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = board.vertical[r][c];
      if (!color) continue;
      const wall = document.createElement('div');
      wall.className = 'wall wall-v wall-' + color;
      wall.style.gridColumn = (2 * c + 2) + ' / ' + (2 * c + 3);
      wall.style.gridRow = (2 * r + 1) + ' / ' + (2 * r + 2);
      container.appendChild(wall);
    }
  }
};

UI.renderStatus = function (el, game) {
  if (game.won) {
    el.textContent = 'ゴール到達！ かかったターン数: ' + game.turnCount;
    return;
  }
  if (game.remainingSteps > 0) {
    el.textContent = '残り移動歩数: ' + game.remainingSteps + '(進めるマスをクリック)';
  } else {
    el.textContent = 'サイコロを振ってください(現在ターン ' + game.turnCount + ')';
  }
};

// Shrinks the board (via CSS transform) to fit narrow screens like phones,
// without changing the fixed pixel layout used for wall/cell positioning.
UI.fitBoardToViewport = function (boardEl, wrapEl) {
  boardEl.style.transform = 'none';
  const naturalWidth = boardEl.offsetWidth;
  const naturalHeight = boardEl.offsetHeight;
  const available = wrapEl.clientWidth;
  const scale = Math.min(1, available / naturalWidth);

  if (scale < 1) {
    boardEl.style.transform = 'scale(' + scale + ')';
  }
  wrapEl.style.height = Math.ceil(naturalHeight * scale) + 'px';
};

UI.renderDynamicStatus = function (el, game) {
  const nextRedTurn = Engine.RED_RESHUFFLE_INTERVAL - (game.turnCount % Engine.RED_RESHUFFLE_INTERVAL);
  const redInfo = '赤壁: 次の再配置まであと' + nextRedTurn + 'ターン';

  let modeInfo;
  if (game.dynamicMode === 'green') {
    modeInfo = '緑壁モード発動中(残り' + game.greenTurnsLeft + 'ターンで青壁モードに戻る)';
  } else {
    modeInfo = '青壁モード';
  }

  el.textContent = modeInfo + ' / ' + redInfo;
};
