// Turn/dice/player logic for a single-floor game. No DOM access here.
window.Engine = window.Engine || {};

Engine.RED_RESHUFFLE_INTERVAL = 3; // red walls reshuffle every N turns
Engine.RED_WALL_COUNT = 6;
Engine.BLUE_MAX_COUNT = 6; // size of the fixed slot pool blue walls can occupy
Engine.BLUE_ACTIVE_COUNT = 3; // how many of those slots are active at once - constant, not distance-based
Engine.GREEN_WALL_COUNT = 4;
Engine.GREEN_EVENT_DURATION = 3; // turns the green walls stay up before reverting to blue
Engine.BLACK_WALL_DENSITY = 0.28; // 80% of the original 0.35
Engine.CARD_PICKUP_COUNT = 6;

Engine.createGame = function (size, characterId) {
  size = size || 9;
  const board = Engine.createBoard(size);
  const start = [size - 1, 0];
  const goal = [0, size - 1];
  Engine.generateBlackWalls(board, start, goal, Engine.BLACK_WALL_DENSITY);

  const charDef = Engine.getCharacter(characterId) || Engine.CHARACTERS[0];

  const game = {
    board: board,
    start: start,
    goal: goal,
    player: { r: start[0], c: start[1] },
    turnCount: 0,
    remainingSteps: 0,
    won: false,
    dynamicMode: 'blue', // 'blue' or 'green' - mutually exclusive
    greenTurnsLeft: 0,
    blueSlots: [], // fixed candidate positions; a constant-size subset is active at a time
    blockedEdges: new Set(), // edges destroyed/vacated by skills - never reused by red/blue
    leapCharges: 0, // next N moves may ignore a wall (from the leap skill/card)
    character: { id: charDef.id, usesLeft: charDef.maxUses },
    hand: [],
    cardPickups: [],
  };

  Engine.generateBlueSlots(game);
  Engine.reshuffleRedWalls(game);
  Engine.refreshBlueWalls(game);
  Engine.placeCardPickups(game, Engine.CARD_PICKUP_COUNT);
  return game;
};

Engine.placeCardPickups = function (game, count) {
  const board = game.board;
  const size = board.size;
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r === game.start[0] && c === game.start[1]) continue;
      if (r === game.goal[0] && c === game.goal[1]) continue;
      cells.push([r, c]);
    }
  }
  Engine.shuffleArray(cells);
  game.cardPickups = [];
  for (let i = 0; i < count && i < cells.length; i++) {
    game.cardPickups.push({ r: cells[i][0], c: cells[i][1] });
  }
};

Engine.rollDice = function () {
  return 1 + Math.floor(Math.random() * 6);
};

Engine.playerPos = function (game) {
  return [game.player.r, game.player.c];
};

// Picks a fixed set of edges that blue walls are allowed to occupy. The set
// itself never moves; only how many of them are active changes turn to turn
// (see refreshBlueWalls). Validated so the goal stays reachable even if every
// slot were active at once.
Engine.generateBlueSlots = function (game) {
  const board = game.board;
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

  const slots = [];
  for (let i = 0; i < candidates.length && slots.length < Engine.BLUE_MAX_COUNT; i++) {
    const cand = candidates[i];
    if (cand.type === 'h') board.horizontal[cand.r][cand.c] = Engine.WALL_COLORS.BLUE;
    else board.vertical[cand.r][cand.c] = Engine.WALL_COLORS.BLUE;

    if (Engine.isReachable(board, game.start, game.goal)) {
      slots.push(cand);
    } else if (cand.type === 'h') {
      board.horizontal[cand.r][cand.c] = null;
    } else {
      board.vertical[cand.r][cand.c] = null;
    }
  }
  // These are reserved *slots*, not active walls yet - clear them back off.
  Engine.clearColor(board, Engine.WALL_COLORS.BLUE);
  game.blueSlots = slots;
};

Engine.blueSlotExcludeSet = function (game) {
  const set = new Set();
  for (let i = 0; i < game.blueSlots.length; i++) {
    const s = game.blueSlots[i];
    set.add(s.type + ',' + s.r + ',' + s.c);
  }
  return set;
};

// Edges reserved for blue, plus any edge a skill has permanently destroyed -
// neither red nor a shifted wall should ever be placed on top of those.
Engine.reservedExcludeSet = function (game) {
  const set = Engine.blueSlotExcludeSet(game);
  game.blockedEdges.forEach(function (key) { set.add(key); });
  return set;
};

Engine.reshuffleRedWalls = function (game) {
  Engine.clearColor(game.board, Engine.WALL_COLORS.RED);
  Engine.placeRandomWalls(
    game.board, Engine.WALL_COLORS.RED, Engine.RED_WALL_COUNT,
    Engine.playerPos(game), game.goal, Engine.reservedExcludeSet(game)
  );
};

// Activates a fixed-size subset of the blue slots - always the same COUNT
// regardless of distance to the goal. Which specific slots are active is
// re-rolled each call, but always from the same fixed slot pool.
Engine.refreshBlueWalls = function (game) {
  const board = game.board;
  Engine.clearColor(board, Engine.WALL_COLORS.BLUE);

  const pool = game.blueSlots.slice();
  Engine.shuffleArray(pool);
  const count = Math.min(Engine.BLUE_ACTIVE_COUNT, pool.length);

  for (let i = 0; i < count; i++) {
    const slot = pool[i];
    if (slot.type === 'h') board.horizontal[slot.r][slot.c] = Engine.WALL_COLORS.BLUE;
    else board.vertical[slot.r][slot.c] = Engine.WALL_COLORS.BLUE;
  }
};

// Stand-in for Phase 3's skill cards: activating a green-wall effect always
// clears/suppresses blue walls while it's active, then hands control back to
// the blue system once it expires. Blue and green never coexist.
Engine.triggerGreenEvent = function (game, duration) {
  if (game.won) return;
  duration = duration || Engine.GREEN_EVENT_DURATION;
  Engine.clearColor(game.board, Engine.WALL_COLORS.BLUE);
  game.dynamicMode = 'green';
  game.greenTurnsLeft = duration;
  Engine.placeRandomWalls(game.board, Engine.WALL_COLORS.GREEN, Engine.GREEN_WALL_COUNT, Engine.playerPos(game), game.goal);
};

Engine.updateDynamicWalls = function (game) {
  if (game.dynamicMode === 'green') {
    game.greenTurnsLeft--;
    if (game.greenTurnsLeft <= 0) {
      Engine.clearColor(game.board, Engine.WALL_COLORS.GREEN);
      game.dynamicMode = 'blue';
      Engine.refreshBlueWalls(game);
    }
    return;
  }
  Engine.refreshBlueWalls(game);
};

Engine.wallColorAt = function (board, target) {
  return target.type === 'h' ? board.horizontal[target.r][target.c] : board.vertical[target.r][target.c];
};

Engine.setWallAt = function (board, target, color) {
  if (target.type === 'h') board.horizontal[target.r][target.c] = color;
  else board.vertical[target.r][target.c] = color;
};

// Skills/cards that manipulate walls only ever touch black or red - blue
// slots and green traps have their own dedicated lifecycle and are left alone.
Engine.isMovableWallTarget = function (game, target) {
  const color = Engine.wallColorAt(game.board, target);
  return color === Engine.WALL_COLORS.BLACK || color === Engine.WALL_COLORS.RED;
};

Engine.destroyWall = function (game, target) {
  if (!Engine.isMovableWallTarget(game, target)) return false;
  Engine.setWallAt(game.board, target, null);
  game.blockedEdges.add(target.type + ',' + target.r + ',' + target.c);
  return true;
};

// Removes the wall at `target` and immediately re-places one of the same
// color at a random valid empty edge elsewhere on the board.
Engine.shiftWall = function (game, target) {
  if (!Engine.isMovableWallTarget(game, target)) return false;
  const color = Engine.wallColorAt(game.board, target);
  const key = target.type + ',' + target.r + ',' + target.c;

  Engine.setWallAt(game.board, target, null);
  game.blockedEdges.add(key);

  const placed = Engine.placeRandomWalls(game.board, color, 1, Engine.playerPos(game), game.goal, Engine.reservedExcludeSet(game));
  if (placed === 0) {
    // No legal destination - put it back rather than losing it for nothing.
    game.blockedEdges.delete(key);
    Engine.setWallAt(game.board, target, color);
    return false;
  }
  return true;
};

Engine.grantLeapCharge = function (game) {
  game.leapCharges = (game.leapCharges || 0) + 1;
};

Engine.useSkill = function (game, target) {
  if (!game.character || game.character.usesLeft <= 0 || game.won) return false;
  const charDef = Engine.getCharacter(game.character.id);
  let ok = false;
  if (charDef.id === 'leap') {
    Engine.grantLeapCharge(game);
    ok = true;
  } else if (charDef.id === 'mover' && target) {
    ok = Engine.shiftWall(game, target);
  } else if (charDef.id === 'breaker' && target) {
    ok = Engine.destroyWall(game, target);
  }
  if (ok) game.character.usesLeft--;
  return ok;
};

Engine.useCard = function (game, handIndex, target) {
  const cardId = game.hand[handIndex];
  if (!cardId || game.won) return false;
  const card = Engine.getCard(cardId);
  if (!card) return false;
  if (card.needsTarget && !target) return false;
  const ok = card.activate(game, target);
  if (ok) game.hand.splice(handIndex, 1);
  return ok;
};

Engine.startTurn = function (game) {
  game.turnCount++;
  if (game.turnCount % Engine.RED_RESHUFFLE_INTERVAL === 0) {
    Engine.reshuffleRedWalls(game);
  }
  Engine.updateDynamicWalls(game);
  game.remainingSteps = Engine.rollDice();
  return game.remainingSteps;
};

// Moves reachable without crossing any wall.
Engine.normalMoves = function (game) {
  return Engine.neighbors(game.board, game.player.r, game.player.c);
};

// Normal moves, plus (if a leap charge is available) every orthogonal
// neighbor on the board regardless of walls - the extra ones are only used
// up if the player actually picks one (see movePlayer).
Engine.availableMoves = function (game) {
  if (game.won || game.remainingSteps <= 0) return [];
  const normal = Engine.normalMoves(game);
  if (!game.leapCharges) return normal;

  const size = game.board.size;
  const seen = {};
  for (let i = 0; i < normal.length; i++) seen[normal[i][0] + ',' + normal[i][1]] = true;

  const result = normal.slice();
  const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let i = 0; i < deltas.length; i++) {
    const nr = game.player.r + deltas[i][0];
    const nc = game.player.c + deltas[i][1];
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    const key = nr + ',' + nc;
    if (seen[key]) continue;
    result.push([nr, nc]);
    seen[key] = true;
  }
  return result;
};

Engine.isLeapOnlyMove = function (game, r, c) {
  const normal = Engine.normalMoves(game);
  for (let i = 0; i < normal.length; i++) {
    if (normal[i][0] === r && normal[i][1] === c) return false;
  }
  return true;
};

Engine.collectCardPickup = function (game, r, c) {
  for (let i = 0; i < game.cardPickups.length; i++) {
    const p = game.cardPickups[i];
    if (p.r === r && p.c === c) {
      game.hand.push(Engine.drawRandomCard());
      game.cardPickups.splice(i, 1);
      return;
    }
  }
};

Engine.movePlayer = function (game, r, c) {
  const moves = Engine.availableMoves(game);
  let valid = false;
  for (let i = 0; i < moves.length; i++) {
    if (moves[i][0] === r && moves[i][1] === c) { valid = true; break; }
  }
  if (!valid) return false;

  if (Engine.isLeapOnlyMove(game, r, c) && game.leapCharges > 0) {
    game.leapCharges--;
  }

  game.player.r = r;
  game.player.c = c;
  game.remainingSteps--;
  Engine.collectCardPickup(game, r, c);
  if (r === game.goal[0] && c === game.goal[1]) {
    game.won = true;
    game.remainingSteps = 0;
  }
  return true;
};

Engine.endTurn = function (game) {
  game.remainingSteps = 0;
};
