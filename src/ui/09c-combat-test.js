/* ---------- playtest (combat test): skip to combat ----------
   Loads the lab bot's own save at the moment the self is whole (flicker-lab data/checkpoints/p1-whole-checkin-18.json, made by
   tools/run-combat-whole.js on the game's main rules): the sensible check-in player at its fifth rebirth, 130 places, its day 16.
   Bot-made, never the owner's. Combat opens on the next moment, as it would after "Something has seen your light". */
const COMBAT_CP = /*@include src/data/combat-checkpoint.json*/null;
function skipToCombat() {
  const cp = JSON.parse(JSON.stringify(COMBAT_CP)), m = meta();
  m.ever = {}; cp.known.forEach(k => { m.ever[k] = true; }); m.hsLife = cp.hs; m.perks = Object.assign({}, cp.perks);
  m.cards = cp.cards.slice(); m.vcards = cp.vcards.slice(); m.built = cp.built.slice(); m.relics = cp.relics.slice(); m.levels = cp.levels || null; m.best = Math.max(m.best || 0, cp.places);
  m.hist = [1, 2, 3, 4, 5].map(i => ({ run: i, tiles: MC.rbAt(i), regions: 0, hsNew: 0, play: 0, at: Date.now(), bot: true }));
  m.run = RB_LAST() + 1; m.whole = true; m.combat = CB.newLife();
  adoptBotState(cp.s, 'Playtest: the lab’s check-in bot played all five runs (its day 16) and is whole at ' + cp.places + ' places. Combat opens now.');
  S.w.m.hsNew = 0; S.w.m.flags = { thirty: true }; S.w.m.startPlay = S.playTime || 0;
  S.view = 'map'; save(true); renderWorld();
}
$('f-combat').addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.arm) { b.dataset.arm = '1'; b.dataset.was = b.textContent; b.textContent = 'Click again: this replaces your game with the bot’s'; setTimeout(() => { delete b.dataset.arm; b.textContent = b.dataset.was; }, 4000); return; }
  delete b.dataset.arm; b.textContent = b.dataset.was; skipToCombat(); });
