document.addEventListener('DOMContentLoaded', function () {
  const characterSelectEl = document.getElementById('character-select');
  const characterListEl = document.getElementById('character-list');
  const gameScreenEl = document.getElementById('game-screen');

  const boardEl = document.getElementById('board');
  const boardWrapEl = document.getElementById('board-scale-wrap');
  const statusEl = document.getElementById('status');
  const dynamicStatusEl = document.getElementById('dynamic-status');
  const handRowEl = document.getElementById('hand-row');
  const rollBtn = document.getElementById('roll-btn');
  const endTurnBtn = document.getElementById('end-turn-btn');
  const skillBtn = document.getElementById('skill-btn');
  const targetingBarEl = document.getElementById('targeting-bar');
  const targetingMessageEl = document.getElementById('targeting-message');
  const cancelTargetBtn = document.getElementById('cancel-target-btn');

  let game = null;
  // When set, the board is in "pick a wall" mode instead of normal movement.
  // source: 'skill' | 'card'. handIndex is only set for cards.
  let pendingAction = null;

  function refresh() {
    UI.computeSizes(game.board.size, boardWrapEl.clientWidth);
    UI.renderBoard(boardEl, game, {
      onCellClick: function (r, c) {
        Engine.movePlayer(game, r, c);
        refresh();
      },
      onWallClick: function (target) {
        resolvePendingAction(target);
      },
    }, { targeting: !!pendingAction });

    UI.renderStatus(statusEl, game);
    UI.renderDynamicStatus(dynamicStatusEl, game);
    UI.renderHand(handRowEl, game, function (handIndex) {
      startOrRunCard(handIndex);
    });
    UI.renderSkillButton(skillBtn, game);

    const targeting = !!pendingAction;
    targetingBarEl.hidden = !targeting;
    if (targeting) {
      targetingMessageEl.textContent = '対象となる黒か赤の壁を選んでください';
    }

    rollBtn.disabled = targeting || game.remainingSteps > 0 || game.won;
    endTurnBtn.disabled = targeting || game.remainingSteps === 0 || game.won;
    handRowEl.querySelectorAll('.card-btn').forEach(function (btn) { btn.disabled = btn.disabled || targeting; });
  }

  function startOrRunCard(handIndex) {
    if (pendingAction || game.won) return;
    const cardId = game.hand[handIndex];
    const card = Engine.getCard(cardId);
    if (!card) return;
    if (card.needsTarget) {
      pendingAction = { source: 'card', handIndex: handIndex };
      refresh();
    } else {
      Engine.useCard(game, handIndex);
      refresh();
    }
  }

  function startSkill() {
    if (pendingAction || game.won || game.character.usesLeft <= 0) return;
    const charDef = Engine.getCharacter(game.character.id);
    if (charDef.id === 'leap') {
      Engine.useSkill(game);
      refresh();
    } else {
      pendingAction = { source: 'skill' };
      refresh();
    }
  }

  function resolvePendingAction(target) {
    if (!pendingAction) return;
    if (pendingAction.source === 'card') {
      Engine.useCard(game, pendingAction.handIndex, target);
    } else {
      Engine.useSkill(game, target);
    }
    pendingAction = null;
    refresh();
  }

  function startGame(characterId) {
    game = Engine.createGame(9, characterId);
    characterSelectEl.hidden = true;
    gameScreenEl.hidden = false;
    refresh();
  }

  UI.renderCharacterSelect(characterListEl, startGame);

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    if (!game) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refresh, 100);
  });

  rollBtn.addEventListener('click', function () {
    Engine.startTurn(game);
    refresh();
  });

  endTurnBtn.addEventListener('click', function () {
    Engine.endTurn(game);
    refresh();
  });

  skillBtn.addEventListener('click', startSkill);

  cancelTargetBtn.addEventListener('click', function () {
    pendingAction = null;
    refresh();
  });
});
