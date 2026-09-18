// Skill card definitions. `needsTarget` tells the UI whether the player must
// pick a wall on the board before `activate` runs; `activate` returns true
// if the card was actually consumed (false lets the UI keep it in hand).
window.Engine = window.Engine || {};

Engine.CARDS = [
  {
    id: 'dash',
    name: 'ダッシュ',
    desc: '今の残り歩数に+2する',
    needsTarget: false,
    activate: function (game) {
      if (game.remainingSteps <= 0) return false;
      game.remainingSteps += 2;
      return true;
    },
  },
  {
    id: 'wall_leap',
    name: '壁抜け',
    desc: '次の1歩だけ、壁を無視して隣のマスへ進める',
    needsTarget: false,
    activate: function (game) {
      Engine.grantLeapCharge(game);
      return true;
    },
  },
  {
    id: 'wall_smash',
    name: '壁破壊',
    desc: '指定した壁を1つ壊して消す',
    needsTarget: 'wall',
    activate: function (game, target) {
      return Engine.destroyWall(game, target);
    },
  },
  {
    id: 'wall_shift',
    name: '壁移動',
    desc: '指定した壁を1つ、別の空いている場所へ動かす',
    needsTarget: 'wall',
    activate: function (game, target) {
      return Engine.shiftWall(game, target);
    },
  },
  {
    id: 'trap',
    name: '罠設置',
    desc: '緑の壁を発生させ、しばらく通行を阻む(青壁は一時的に消える)',
    needsTarget: false,
    activate: function (game) {
      Engine.triggerGreenEvent(game);
      return true;
    },
  },
  {
    id: 'extra_turn',
    name: 'もう一手',
    desc: 'サイコロをもう一度振れるようにする(このターンの残り歩数を使い切っている場合のみ有効)',
    needsTarget: false,
    activate: function (game) {
      if (game.remainingSteps > 0 || game.won) return false;
      game.remainingSteps = Engine.rollDice();
      return true;
    },
  },
];

Engine.getCard = function (id) {
  for (let i = 0; i < Engine.CARDS.length; i++) {
    if (Engine.CARDS[i].id === id) return Engine.CARDS[i];
  }
  return null;
};

Engine.drawRandomCard = function () {
  const idx = Math.floor(Math.random() * Engine.CARDS.length);
  return Engine.CARDS[idx].id;
};
