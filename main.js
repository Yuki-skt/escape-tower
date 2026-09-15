document.addEventListener('DOMContentLoaded', function () {
  const game = Engine.createGame(9);
  const boardEl = document.getElementById('board');
  const boardWrapEl = document.getElementById('board-scale-wrap');
  const statusEl = document.getElementById('status');
  const dynamicStatusEl = document.getElementById('dynamic-status');
  const rollBtn = document.getElementById('roll-btn');
  const endTurnBtn = document.getElementById('end-turn-btn');
  const greenTestBtn = document.getElementById('green-test-btn');

  function refresh() {
    UI.renderBoard(boardEl, game, {
      onCellClick: function (r, c) {
        Engine.movePlayer(game, r, c);
        refresh();
      },
    });
    UI.renderStatus(statusEl, game);
    UI.renderDynamicStatus(dynamicStatusEl, game);
    rollBtn.disabled = game.remainingSteps > 0 || game.won;
    endTurnBtn.disabled = game.remainingSteps === 0 || game.won;
    greenTestBtn.disabled = game.won || game.dynamicMode === 'green';
    UI.fitBoardToViewport(boardEl, boardWrapEl);
  }

  window.addEventListener('resize', function () {
    UI.fitBoardToViewport(boardEl, boardWrapEl);
  });

  rollBtn.addEventListener('click', function () {
    Engine.startTurn(game);
    refresh();
  });

  endTurnBtn.addEventListener('click', function () {
    Engine.endTurn(game);
    refresh();
  });

  greenTestBtn.addEventListener('click', function () {
    Engine.triggerGreenEvent(game);
    refresh();
  });

  refresh();
});
