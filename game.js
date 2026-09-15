// Turn/dice/player logic for a single-floor game. No DOM access here.
window.Engine = window.Engine || {};

Engine.RED_RESHUFFLE_INTERVAL = 3; // red walls reshuffle every N turns
Engine.RED_WALL_COUNT = 6;
Engine.BLUE_MAX_COUNT = 6; // scales down to 0 as the player nears the goal
Engine.GREEN_WALL_COUNT = 4;
Engine.GREEN_EVENT_DURATION = 3; // turns the green walls stay up before reverting to blue

Engine.createGame = function (size) {
  size = size || 9;
  const board = Engine.createBoard(size);
  const start = [size - 1, 0];
  const goal = [0, size - 1];
  Engine.generateBlackWalls(board, start, goal, 0.35);

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
  };

  Engine.reshuffleRedWalls(game);
  Engine.refreshBlueWalls(game);
  return game;
};

Engine.rollDice = function () {
  return 1 + Math.floor(Math.random() * 6);
};

Engine.playerPos = function (game) {
  return [game.player.r, game.player.c];
};

Engine.reshuffleRedWalls = function (game) {
  Engine.clearColor(game.board, Engine.WALL_COLORS.RED);
  Engine.placeRandomWalls(game.board, Engine.WALL_COLORS.RED, Engine.RED_WALL_COUNT, Engine.playerPos(game), game.goal);
};

Engine.refreshBlueWalls = function (game) {
  Engine.clearColor(game.board, Engine.WALL_COLORS.BLUE);
  const size = game.board.size;
  const dist = Math.abs(game.player.r - game.goal[0]) + Math.abs(game.player.c - game.goal[1]);
  const maxDist = (size - 1) * 2;
  const count = Math.round(Engine.BLUE_MAX_COUNT * (dist / maxDist));
  Engine.placeRandomWalls(game.board, Engine.WALL_COLORS.BLUE, count, Engine.playerPos(game), game.goal);
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

Engine.startTurn = function (game) {
  game.turnCount++;
  if (game.turnCount % Engine.RED_RESHUFFLE_INTERVAL === 0) {
    Engine.reshuffleRedWalls(game);
  }
  Engine.updateDynamicWalls(game);
  game.remainingSteps = Engine.rollDice();
  return game.remainingSteps;
};

Engine.availableMoves = function (game) {
  if (game.won || game.remainingSteps <= 0) return [];
  return Engine.neighbors(game.board, game.player.r, game.player.c);
};

Engine.movePlayer = function (game, r, c) {
  const moves = Engine.availableMoves(game);
  let valid = false;
  for (let i = 0; i < moves.length; i++) {
    if (moves[i][0] === r && moves[i][1] === c) { valid = true; break; }
  }
  if (!valid) return false;

  game.player.r = r;
  game.player.c = c;
  game.remainingSteps--;
  if (r === game.goal[0] && c === game.goal[1]) {
    game.won = true;
    game.remainingSteps = 0;
  }
  return true;
};

Engine.endTurn = function (game) {
  game.remainingSteps = 0;
};
