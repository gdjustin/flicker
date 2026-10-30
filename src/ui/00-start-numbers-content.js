(function () {
'use strict';

/* ---------- Numbers: break_infinity.js if it loaded, else a Number-based stand-in ---------- */
class NumShim {
  constructor(v) { this.v = v instanceof NumShim ? v.v : (Number(v) || 0); }
  add(x) { return new NumShim(this.v + new NumShim(x).v); }
  sub(x) { return new NumShim(this.v - new NumShim(x).v); }
  mul(x) { return new NumShim(this.v * new NumShim(x).v); }
  gte(x) { return this.v >= new NumShim(x).v; }
  lt(x) { return this.v < new NumShim(x).v; }
  toNumber() { return this.v; }
  toString() { return String(this.v); }
  static pow(a, b) { return new NumShim(Math.pow(new NumShim(a).v, new NumShim(b).v)); }
}
const Big = (typeof window.Decimal === 'function') ? window.Decimal : NumShim;
const D = x => new Big(x);

/* ---------- Content: everything the prologue contains, as data ---------- */
const CONTENT = {
  gather: { base: 1 },
  // v1u (owner, 2026-10-30): the prologue about 28-30% faster: Draw in 0.25 (was 0.2), Press starts at 10 (was 12), the hand gathers 3 (was 2)
  drift: { costBase: 8, costRate: 1.17, prod: 0.25 },
  cohere: { costBase: 10, costRate: 1.13 },
  parts: [
    { id: 'hand', name: 'A hand', cost: 3, desc: 'Each gather brings 3 motes instead of 1.',
      msg: 'A hand. It opens. It closes. It is yours.' },
    { id: 'eyes', name: 'Eyes', cost: 6, desc: 'See exact amounts and rates.',
      msg: 'Eyes. The dark was never empty. It was full of numbers.' },
    { id: 'heart', name: 'A heart', cost: 10, desc: 'Drawing in is 1.5 times stronger.',
      msg: 'Something inside you begins to beat, and the motes keep time.' },
    { id: 'body', name: 'A body', cost: 16, desc: 'Legs, a spine, weight. Enough to stand.',
      msg: 'Legs. A spine. Weight. You are lying on something cold.' }
  ],
  upgrades: [
    { id: 'still', name: 'Stillness', cost: 40, needs: s => s.drift >= 2,
      desc: 'Drawing in is twice as strong.',
      msg: 'You learn to hold perfectly still. The motes come twice as eagerly.' },
    { id: 'grasp', name: 'Grasp', cost: 70, needs: s => s.parts.hand,
      desc: 'Each gather brings 3 times as many motes.',
      msg: 'Your fingers learn to close around several motes at once.' },
    { id: 'focus', name: 'Focus', cost: 220, needs: s => s.parts.eyes,
      desc: 'Drawing in is twice as strong.',
      msg: 'You look at the motes, and they notice.' },
    { id: 'rhythm', name: 'Heartbeat', cost: 450, needs: s => s.parts.heart,
      desc: 'Each gather also brings as many motes as drift brings in a second.',
      msg: 'Your heartbeat carries into your reach. Each gather pulls extra motes along with it.' },
    { id: 'gravity', name: 'Gravity', cost: 700, needs: s => s.parts.heart,
      desc: 'Drawing in grows 4% stronger for every form you have ever pressed.',
      msg: 'Everything you have made pulls on the rest.' }
  ],
  self: [
    { when: s => s.parts.body, text: 'You are someone.' },
    { when: s => s.parts.heart, text: 'You are something with a heartbeat.' },
    { when: s => s.parts.eyes, text: 'You are a hand and a pair of eyes, adrift.' },
    { when: s => s.parts.hand, text: 'You are a flicker with a hand.' },
    { when: s => s.stats.gathers > 0, text: 'You are a flicker.' },
    { when: () => true, text: 'You are nothing.' }
  ],
  vagueMotes: [[0, 'none'], [1, 'a glimmer'], [2, 'one mote'], [5, 'a few motes'], [15, 'some motes'],
    [50, 'many motes'], [150, 'a swarm of motes'], [500, 'a great swarm of motes'], [Infinity, 'countless motes']],
  vagueForm: [[1, 'no form'], [2, 'a scrap of form'], [5, 'a little form'], [10, 'some form'],
    [20, 'a good deal of form'], [Infinity, 'much form']],
  offlineCapSeconds: 1 * 3600     // v15: time away counts for 1 hour at first; Watch research raises it to 24 (see awayCap)
};

