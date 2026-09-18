// Character definitions. Each has one unique active skill with limited uses
// per game. Skill effects reuse the same engine actions cards use, so a
// character's skill and the equivalent card behave identically.
window.Engine = window.Engine || {};

Engine.CHARACTERS = [
  {
    id: 'leap',
    name: 'レオ(仮)',
    emoji: '🐆',
    bio: '身軽な旅人(仮設定)。',
    skillName: '壁飛び越え',
    skillDesc: '次の1歩だけ、壁を無視して隣のマスへ進める',
    maxUses: 3,
  },
  {
    id: 'mover',
    name: 'ミラ(仮)',
    emoji: '🔧',
    bio: '塔の仕組みに詳しい技師(仮設定)。',
    skillName: '壁移動',
    skillDesc: '選んだ壁を1つ、別の空いている場所へ動かす',
    maxUses: 3,
  },
  {
    id: 'breaker',
    name: 'ガイ(仮)',
    emoji: '💥',
    bio: '力自慢の元冒険者(仮設定)。',
    skillName: '壁破壊',
    skillDesc: '選んだ壁を1つ、壊して消す',
    maxUses: 2,
  },
];

Engine.getCharacter = function (id) {
  for (let i = 0; i < Engine.CHARACTERS.length; i++) {
    if (Engine.CHARACTERS[i].id === id) return Engine.CHARACTERS[i];
  }
  return null;
};
