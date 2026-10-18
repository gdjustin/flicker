/* ---------- playtest (combat test): skip to combat ----------
   Loads the lab bot's own save at the handover (flicker-lab data/checkpoints/p1-112-checkin-18.json): the sensible check-in
   player in run 5, at the end of the check-in where it first holds 112 places (day 16 of its game). Bot-made, never the owner's. */
const COMBAT_CP = /*@include src/data/combat-checkpoint.json*/null;
function skipToCombat() {
  const cp = JSON.parse(JSON.stringify(COMBAT_CP)), m = meta(), hs = k => { const t = tileOf(k); return t ? MC.hsFor(t.dstep) : 0; };
  m.run = cp.run.i; m.ever = {}; Object.keys(cp.life.everKeys).forEach(k => { m.ever[k] = true; });
  let hsNew = 0, fresh = 0; cp.run.tileT.forEach(([, k]) => { if (!m.ever[k]) { m.ever[k] = true; hsNew += hs(k); fresh++; } });
  m.hsLife = Object.keys(m.ever).reduce((a, k) => a + hs(k), 0); m.perks = Object.assign({}, cp.run.al.lv);
  m.cards = Object.keys(cp.life.cardsKnown || {}); m.built = Object.keys(cp.life.builtEver || {}); m.relics = Object.keys(cp.life.relicsEver || {}); m.best = Math.max(cp.life.prevBest || 0, cp.run.s.m.restored); m.levels = cp.life.prevLv || null;
  m.hist = [1, 2, 3, 4].map(i => ({ run: i, tiles: 0, regions: 0, hsNew: 0, play: 0, at: Date.now() }));
  m.combat = CB.newLife();
  adoptBotState(cp.run.s, 'Playtest: the lab’s check-in bot played four runs and most of a fifth (its day 16), to 112 places. Combat opens now.');
  S.w.m.run = m.run; S.w.m.hsNew = hsNew; S.w.m.newPlaces = fresh; S.w.m.flags = { thirty: true }; S.w.m.startPlay = S.playTime || 0;
  S.view = 'map'; mapTick(0); save(true); renderWorld();
}
$('f-combat').addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.arm) { b.dataset.arm = '1'; b.dataset.was = b.textContent; b.textContent = 'Click again: this replaces your game with the bot’s'; setTimeout(() => { delete b.dataset.arm; b.textContent = b.dataset.was; }, 4000); return; }
  delete b.dataset.arm; b.textContent = b.dataset.was; skipToCombat(); });
