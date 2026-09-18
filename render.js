// Rendering only. Reads Engine data, never mutates it.
window.UI = window.UI || {};

UI.CELL_SIZE = 52;
UI.GAP_SIZE = 4;
UI.MIN_CELL_SIZE = 24;
UI.MAX_CELL_SIZE = 52;
UI.BOARD_PADDING = 20; // 10px on each side, must match #board padding in CSS

// Recomputes CELL_SIZE so the board's true (unscaled) layout width fits
// `availableWidth`, instead of rendering at a fixed size and visually
// shrinking it with a CSS transform (which broke the page layout on phones).
UI.computeSizes = function (size, availableWidth) {
  const raw = (availableWidth - UI.BOARD_PADDING - (size - 1) * UI.GAP_SIZE) / size;
  UI.CELL_SIZE = Math.max(UI.MIN_CELL_SIZE, Math.min(UI.MAX_CELL_SIZE, Math.floor(raw)));
};

UI.buildTemplate = function (size) {
  const parts = [];
  for (let i = 0; i < size; i++) {
    parts.push(UI.CELL_SIZE + 'px');
    if (i < size - 1) parts.push(UI.GAP_SIZE + 'px');
  }
  return parts.join(' ');
};

UI.renderBoard = function (container, game, callbacks, options) {
  options = options || {};
  const board = game.board;
  const size = board.size;
  container.innerHTML = '';
  container.style.gridTemplateColumns = UI.buildTemplate(size);
  container.style.gridTemplateRows = UI.buildTemplate(size);

  const moves = options.targeting ? [] : Engine.availableMoves(game);
  const moveSet = new Set(moves.map(function (m) { return m[0] + ',' + m[1]; }));

  const pickupSet = new Set(game.cardPickups.map(function (p) { return p.r + ',' + p.c; }));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (r === game.start[0] && c === game.start[1]) cell.classList.add('start');
      if (r === game.goal[0] && c === game.goal[1]) cell.classList.add('goal');
      if (moveSet.has(r + ',' + c)) {
        cell.classList.add('reachable');
        if (Engine.isLeapOnlyMove(game, r, c)) cell.classList.add('reachable-leap');
        cell.addEventListener('click', (function (rr, cc) {
          return function () { callbacks.onCellClick(rr, cc); };
        })(r, c));
      }
      cell.style.gridColumn = (2 * c + 1) + ' / ' + (2 * c + 2);
      cell.style.gridRow = (2 * r + 1) + ' / ' + (2 * r + 2);

      if (pickupSet.has(r + ',' + c)) {
        const pickup = document.createElement('div');
        pickup.className = 'card-pickup';
        pickup.textContent = '🃏';
        cell.appendChild(pickup);
      }

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
      if (options.targeting && (color === 'black' || color === 'red')) {
        wall.classList.add('wall-targetable');
        wall.addEventListener('click', (function (target) {
          return function () { callbacks.onWallClick(target); };
        })({ type: 'h', r: r, c: c }));
      }
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
      if (options.targeting && (color === 'black' || color === 'red')) {
        wall.classList.add('wall-targetable');
        wall.addEventListener('click', (function (target) {
          return function () { callbacks.onWallClick(target); };
        })({ type: 'v', r: r, c: c }));
      }
      container.appendChild(wall);
    }
  }

  // Blue slots that are currently inactive get a faint preview marker, so
  // the fixed set of possible blue-wall spots is always visible - only
  // shown while the blue system is actually in control (not during green).
  if (game.dynamicMode === 'blue') {
    for (let i = 0; i < game.blueSlots.length; i++) {
      const slot = game.blueSlots[i];
      const current = slot.type === 'h' ? board.horizontal[slot.r][slot.c] : board.vertical[slot.r][slot.c];
      if (current === Engine.WALL_COLORS.BLUE) continue; // already drawn above as an active wall

      const ghost = document.createElement('div');
      if (slot.type === 'h') {
        ghost.className = 'wall wall-h wall-ghost-blue';
        ghost.style.gridColumn = (2 * slot.c + 1) + ' / ' + (2 * slot.c + 2);
        ghost.style.gridRow = (2 * slot.r + 2) + ' / ' + (2 * slot.r + 3);
      } else {
        ghost.className = 'wall wall-v wall-ghost-blue';
        ghost.style.gridColumn = (2 * slot.c + 2) + ' / ' + (2 * slot.c + 3);
        ghost.style.gridRow = (2 * slot.r + 1) + ' / ' + (2 * slot.r + 2);
      }
      container.appendChild(ghost);
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


UI.renderCharacterSelect = function (container, onPick) {
  container.innerHTML = '';
  for (let i = 0; i < Engine.CHARACTERS.length; i++) {
    const charDef = Engine.CHARACTERS[i];
    const card = document.createElement('button');
    card.className = 'character-card';
    card.innerHTML =
      '<div class="character-emoji">' + charDef.emoji + '</div>' +
      '<div class="character-name">' + charDef.name + '</div>' +
      '<div class="character-bio">' + charDef.bio + '</div>' +
      '<div class="character-skill">「' + charDef.skillName + '」' + (charDef.maxUses) + '回まで</div>' +
      '<div class="character-skill-desc">' + charDef.skillDesc + '</div>';
    card.addEventListener('click', (function (id) {
      return function () { onPick(id); };
    })(charDef.id));
    container.appendChild(card);
  }
};

UI.renderHand = function (container, game, onUseCard) {
  container.innerHTML = '';
  if (game.hand.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'hand-empty';
    empty.textContent = '手札: なし(盤面の🃏マスに乗ると入手できます)';
    container.appendChild(empty);
    return;
  }
  for (let i = 0; i < game.hand.length; i++) {
    const card = Engine.getCard(game.hand[i]);
    const btn = document.createElement('button');
    btn.className = 'card-btn';
    btn.disabled = game.won;
    btn.innerHTML = '<div class="card-name">' + card.name + '</div><div class="card-desc">' + card.desc + '</div>';
    btn.addEventListener('click', (function (idx) {
      return function () { onUseCard(idx); };
    })(i));
    container.appendChild(btn);
  }
};

UI.renderSkillButton = function (btn, game) {
  const charDef = Engine.getCharacter(game.character.id);
  btn.textContent = charDef.skillName + '(残り' + game.character.usesLeft + '回)';
  btn.title = charDef.skillDesc;
  btn.disabled = game.won || game.character.usesLeft <= 0;
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
