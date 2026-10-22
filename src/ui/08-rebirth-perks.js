/* ---------- the scatter (prestige) and the perk screen ---------- */
// v1q (owner, 2026-10-16): the scatter preview and "between runs" from the Relics and Remembering mock-ups, on the V3 rules.
// Gifts and comforts stay spent from run to run; only a respec (free, here, chosen on this screen) gives them back.
function canScatter(w) { const m = meta(); if (MC.D.rb.on) return !!(w && w.m && w.m.rbReady); return w && w.m && (m.run === 1 ? w.m.restored >= 30 : (w.m.hsNew || 0) > 0); }
/* ---------- the rebirth branch (2026-10-18, Considering): scripted rebirths, gifts, the self made whole ---------- */
const RB_LAST = () => MC.D.rb.last;
// how much of yourself you remember: one share a rebirth taken (after this run's rebirth: one more)
const rbPct = (run, after) => Math.round(Math.min(1, ((run - 1) + (after ? 1 : 0)) / RB_LAST()) * 100);
// the gifts a rebirth brings (packet n-1 comes with rebirth n), as names
function giftName(id, lv) { const p = MC.D.perks[id]; if (!p) return id; return MC.perkMax(id) > 1 || (p.costs && p.costs.length > 1) ? comfortLevelName(id, lv) : p.name; }
// what each gift does, at the level it comes with (Claude's drafts, for the owner's text pass)
const GIFT_TEXT = {
  skipPrologue: () => 'Runs begin in the village.',
  waymarks: () => 'When a place comes back and nothing is lined up, your light moves on to the cheapest place beside your land.',
  oldLessons: n => 'Research learned in an earlier run costs ' + (n >= 2 ? 'a quarter' : 'half') + '.',
  sureHands: n => 'Gathering by hand brings ' + (n >= 2 ? 'four' : 'twice') + ' times as much.',
  lightRemembers: n => 'Places you called back before need ' + Math.round(100 / (MC.D.pave * Math.pow(1 / (1 - MC.D.perks.lightRemembers.x), n))) + '% of their light.',
  stewardsKept: () => 'Your stewards are there from the first place: when a store is full, they buy the next stockpile if you can afford it.',
  openDoors: n => 'The village starts with ' + MC.D.perks.openDoors.pop[n - 1] + ' settlers.',
  practisedHaulers: () => 'Projects built in an earlier run haul ' + fmtW(MC.D.perks.practisedHaulers.x, 1) + '× as fast.',
  relicsRemembered: n => n >= 2 ? 'Relics claimed in an earlier run cost half, and can all be claimed at once.' : 'Relics claimed in an earlier run cost half.',
  oldFlames: n => 'Last run’s upgrade lines come back already bought: ' + ['copper tools and timber houses', 'fire-tending and long songs', 'copper lamps and braziers', 'burner rebuilds and copper burners'].slice(0, n).join('; ') + '.',
  villageSkip: () => 'You wake at the edge of your land: the village stands as it was when you last looked out.',
  headStart: () => 'The map opens with the wood, stone, fiber, food and copper stores full.',
  keptLights: () => 'Light projects built in an earlier run stay built (not the beacon or the towers).'
};
function giftLines(pk) { return Object.keys(pk || {}).map(id => ({ id, lv: pk[id], name: giftName(id, pk[id]), desc: GIFT_TEXT[id] ? GIFT_TEXT[id](pk[id]) : MC.D.perks[id] ? MC.perkDesc(id) : '' })); }
function rbBar(run, after, big) {   // five segments: filled for every rebirth taken, the next one glowing
  let h = '<div class="rbbar' + (big ? ' big' : '') + '" role="img" aria-label="' + rbPct(run, after) + '% of yourself remembered">';
  for (let i = 1; i <= RB_LAST(); i++) { const done = i < run || (after && i === run), nxt = !done && i === run; h += '<i class="' + (done ? 'on' : nxt ? 'nx' : '') + '"></i>'; }
  return h + '</div>';
}
function rbPill(w) {
  const b = $('w-scatter'); b.classList.toggle('ready', !!w.m.rbReady); b.classList.toggle('quiet', !w.m.rbReady);
  // r1c (owner, 2026-10-18): vaguer. Just the next milestone; no hover spelling out what it does
  const txt = w.m.rbReady ? MT.rbPillReady : fill(MT.rbPill, { n: w.m.restored, at: w.m.rbAt });
  const sig = txt + '|' + w.m.run; if (b.dataset.s !== sig) { b.dataset.s = sig; b.innerHTML = '<span>' + txt + '</span>'; }   // r1d (owner): no segments on the pill
  b.removeAttribute('title');
}
function scatterPill(w) {
  if (MC.D.rb.on) { rbPill(w); return; }
  const b = $('w-scatter'), n = w && w.m ? (w.m.hsNew || 0) : 0, m = meta(), last = m.hist.length ? m.hist[m.hist.length - 1] : null;
  const t = MT.prestBtn + ' · +' + fmtW(n); if (b.textContent !== t) b.textContent = t;
  const play = Math.max(1, (S.playTime || 0) - ((w && w.m && w.m.startPlay) || 0)), perDay = n / (play / 86400);
  b.title = (w && w.m ? (w.m.newPlaces || 0) + ' places called back for the first time this run. ' : '') + 'Heartstones a day: ' + fmtW(perDay, 1) + (last && last.play > 0 ? ' (last run: ' + fmtW(last.hsNew / (last.play / 86400), 1) + ')' : '') + '.';
}
function askScatter() {
  const w = W(), m = meta(); if (!canScatter(w)) return;
  if (MC.D.rb.on) { askRebirth(w, m); return; }
  if (opt('confirmRebirth') === false) { openPerks(); return; }   // v1s: a setting skips the summary
  const now = m.hsLife, before = now - (w.m.hsNew || 0), last = m.hist.length ? m.hist[m.hist.length - 1] : null;
  const play = Math.max(1, (S.playTime || 0) - (w.m.startPlay || 0)), perDay = (w.m.hsNew || 0) / (play / 86400);
  $('moment-h').textContent = MT.prestH; const body = $('moment-body'); body.innerHTML = '';
  const p1 = document.createElement('p'); p1.textContent = MT.prest1; body.appendChild(p1);
  const led = document.createElement('div'); led.className = 'ledger';
  const row = (a, b, cls) => { const x = document.createElement('span'), y = document.createElement('span'); x.innerHTML = a; y.innerHTML = b; if (cls) { x.className = cls; y.className = cls; } led.appendChild(x); led.appendChild(y); };
  row('New heartstones from this run', '<b class="hl">+' + fmtW(w.m.hsNew || 0) + '</b>');
  row((w.m.newPlaces || 0) + ' places called back for the first time', '', 'sub');
  row('Heartstones in all', fmtW(before) + ' → <b>' + fmtW(now) + '</b>');
  row('Memory, all light', '×' + fmtW(memMultFor(before), 2) + ' → <b class="hl">×' + fmtW(memMultFor(now), 2) + '</b>');
  row('Heartstones a day', fmtW(perDay, 1) + (last && last.play > 0 ? ' <span class="sub">(last run: ' + fmtW(last.hsNew / (last.play / 86400), 1) + ')</span>' : ''));
  row('Free to spend on the other side', fmtW(now - perkSpent(m.perks)));
  body.appendChild(led);
  const p3 = document.createElement('p'); p3.className = 'sub'; p3.textContent = MT.prest3; body.appendChild(p3);
  $('moment-ok').textContent = MT.prestGo; $('moment').dataset.kind = 'scatter'; $('moment').classList.remove('hidden');
  momentNo(MT.prestNo);
}
// a second button on the moment that only closes it
function momentNo(text) {
  let no = $('moment-no'); if (!no) { no = document.createElement('button'); no.id = 'moment-no'; no.className = 'act'; no.type = 'button'; no.style.marginLeft = '0.6rem'; no.addEventListener('click', () => { $('moment').classList.add('hidden'); $('moment').dataset.kind = ''; no.classList.add('hidden'); }); $('moment-ok').after(no); }
  no.textContent = text; no.classList.remove('hidden');
}
// a save made before the branch's rules (main, or an older branch build): give its run the milestone it should have
function rbFixup(w) {
  if (!MC.D.rb.on || !w || !w.m || w.m.rbAt !== undefined) return; const m = meta();
  for (const id in m.perks) if (MC.D.perks[id] && MC.D.perks[id].kind === 'comfort') delete m.perks[id];   // comforts are gifts here, never bought
  w.m.perks = MC.prPerks({ perks: m.perks, run: m.run });
  if (m.run > RB_LAST() || m.whole) { MC.becomeWhole(w, m.hsLife, m.perks, Date.now() / 1000); m.whole = true; return; }
  w.m.run = m.run; w.m.rbAt = MC.rbAt(m.run); w.m.rbReady = w.m.restored >= w.m.rbAt ? (w.t || 1) : 0; w.m.whole = false;
}
// the rebirth branch: the forced moment, on screen. One button, to the perk screen; the land waits until the rebirth
function askRebirth(w, m) {
  if (opt('confirmRebirth') === false) { openPerks(); return; }   // the setting: straight to choosing
  const last = m.run >= RB_LAST(), now = m.hsLife, before = now - (w.m.hsNew || 0);
  $('moment-h').textContent = last ? MT.rbLastH : MT.rbH; const body = $('moment-body'); body.innerHTML = '';
  const p1 = document.createElement('p'); p1.textContent = last ? MT.rb1Last : MT.rb1; body.appendChild(p1);
  const bar = document.createElement('div'); bar.className = 'rbwrap'; bar.innerHTML = rbBar(m.run, true, true) + '<p class="rbcap">' + rbPct(m.run, true) + '% of yourself remembered</p>'; body.appendChild(bar);
  const led = document.createElement('div'); led.className = 'ledger';
  const row = (a, b, cls) => { const x = document.createElement('span'), y = document.createElement('span'); x.innerHTML = a; y.innerHTML = b; if (cls) { x.className = cls; y.className = cls; } led.appendChild(x); led.appendChild(y); };
  row('New heartstones from this run', '<b class="hl">+' + fmtW(w.m.hsNew || 0) + '</b>');
  row('Memory, all light', '×' + fmtW(memMultFor(before), 2) + ' → <b class="hl">×' + fmtW(memMultFor(now), 2) + '</b>');
  row('Free to spend on the other side', fmtW(now - perkSpent(m.perks)));
  body.appendChild(led);
  const gl = giftLines(MC.D.rb.packets[m.run - 1]);
  if (gl.length) { const h = document.createElement('p'); h.className = 'rbgh'; h.textContent = 'This rebirth also brings, for every run after it:'; body.appendChild(h);
    const ul = document.createElement('ul'); ul.className = 'rbgifts'; gl.forEach(g => { const li = document.createElement('li'); li.innerHTML = '<b>' + g.name + '</b> <span>' + g.desc + '</span>'; ul.appendChild(li); }); body.appendChild(ul); }
  else if (last) { const p2 = document.createElement('p'); p2.className = 'sub'; p2.textContent = 'Nothing resets. The land you called back stays, and from now on memory grows as new land comes back.'; body.appendChild(p2); }
  $('moment-ok').textContent = last ? MT.rbLastGo : MT.rbGo; $('moment').dataset.kind = 'scatter'; $('moment').classList.remove('hidden');
  momentNo(MT.rbLater);   // r1c (owner): forced, but it can be put aside; "Ready to be reborn" brings it back
}
// the last rebirth and what follows: whole, then the moment combat would open
function showWhole() {
  $('moment-h').textContent = MT.wholeH; const body = $('moment-body'); body.innerHTML = '';
  const bar = document.createElement('div'); bar.className = 'rbwrap'; bar.innerHTML = rbBar(RB_LAST() + 1, false, true) + '<p class="rbcap">100% of yourself remembered</p>'; body.appendChild(bar);
  [MT.whole1, MT.whole2].forEach(x => { const p = document.createElement('p'); p.textContent = x; body.appendChild(p); });
  $('moment-ok').textContent = 'Look out over the land'; $('moment').dataset.kind = 'whole'; momentPlain(); $('moment').classList.remove('hidden');
}
function showCombatMoment() {
  $('moment-h').textContent = MT.combatH; const body = $('moment-body'); body.innerHTML = '';
  [MT.combat1].forEach(x => { const p = document.createElement('p'); p.textContent = x; body.appendChild(p); });
  if (GAME.test) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = MT.combatTest; body.appendChild(p); }
  $('moment-ok').textContent = MT.combatOk; $('moment').dataset.kind = ''; momentPlain(); $('moment').classList.remove('hidden');
}
// opening the screen changes nothing: close it (or Esc) and the run goes on; the scatter happens only from its button
function openPerks() {
  const m = meta();
  MV.prest = { lv: Object.assign({}, m.perks), base: Object.assign({}, m.perks), respec: false, open: true };
  S.inPerks = true; save(true); renderPerks(); $('perk-screen').scrollTop = 0;
}
function closePerks() { if (MV.prest && MV.prest.merchant) merchantApply(); S.inPerks = false; MV.prest = null; hidePtip(); $('perk-screen').classList.add('hidden'); save(true); if (S.w) renderWorld(); }
function perkSpent(lv) { let t = 0; for (const id in lv) { if (!MC.D.perks[id]) continue; for (let i = 0; i < lv[id]; i++) t += MC.perkCost(id, i); } return t; }
function perkShown(id) { const p = MC.D.perks[id]; if (!p || !(MC.perkMax(id) > 0)) return false; if (MC.D.rb.on && p.kind === 'comfort') return false;   // the rebirth branch: comforts come as gifts, never sold
  if (p.role === 'unlock') { const u = MC.D.unlock[p.sys]; return !!(u && u.perk); } return true; }
function perkLocked(id, lv) { const p = MC.D.perks[id]; return p.needs && !MC.sysHeld(p.needs, lv); }
// how each gift looks and reads on the screen: an icon, a line of story, and what it does now and at the next rank
const PK_FAMS = [
  { id: 'keepers', name: 'Firekeepers', color: '#e0a34a', deep: '#3a2710', icon: '#f6c66e', kind: 'enabling' },
  { id: 'burners', name: 'Burners', color: '#e07a4f', deep: '#3b1a10', icon: '#ff9e72', kind: 'enabling' },
  { id: 'lamps', name: 'Lamps', color: '#7fb8a6', deep: '#12302a', icon: '#a8e2d0', kind: 'enabling' },
  { id: 'beacon', name: 'The beacon', color: '#f0c85e', deep: '#3a2e10', icon: '#ffe08a', kind: 'enabling' },
  { id: 'map', name: 'Relics and towers', color: '#7ea6e8', deep: '#14223f', icon: '#a9c8ff', kind: 'enabling' },
  { id: 'raw', name: 'Crafts and copper', color: '#c98fd6', deep: '#2c1636', icon: '#e8b9f2', kind: 'direct' }];
const pc = (x, n) => Math.round(x * n * 100) + '%', cx = (x, n) => '×' + fmtW(Math.pow(1 + x, n), 2);
const famFx = (x, n, what) => n ? what + ' ' + (MC.D.perkCompound ? cx(x, n) : '+' + pc(x, n)) : what + ' as they are';
const PK_UI = {
  keeperLore: { icon: 'keeper', story: 'The firekeepers remember every trick of the poker and the rake.', fx: n => famFx(MC.D.perks.keeperLore.x, n, 'What fire-tending and songs add to firekeepers') },
  firewright: { icon: 'tend', story: 'Tending comes back to your hands sooner each time.', fx: n => 'Each fire-tending level costs ×' + fmtW(1 + (MC.D.fireTend.g - 1) * Math.pow(MC.D.perks.firewright.cut, n), 3) + ' the last' },
  fireWarden: { icon: 'focus', story: 'A warden keeps an eye on more fires at once.', fx: n => 'Fire-tending counts up to ' + (MC.D.fireTend.cap + MC.D.fireTend.warden * n) + ' lit fires' },
  hotHearths: { icon: 'burner', story: 'You remember how hot a well-built hearth can run.', fx: n => famFx(MC.D.perks.hotHearths.x, n, 'What rebuilds add to burners, and copper burners,') },
  kilnwright: { icon: 'hammer', story: 'The next rebuild is easier than the last.', fx: n => 'Each rebuild costs ×' + fmtW(1 + (MC.D.burnEff.Pg - 1) * Math.pow(MC.D.perks.kilnwright.cut, n), 1) + ' the one before' },
  cuburnerUnlock: { icon: 'burner', story: 'Green fire. You remember how to make it.', fx: n => n ? 'Copper burners open from the first place' : 'Copper burners wait for their research' },
  bankedFires: { icon: 'bank', story: 'A fire banked well burns all night on half the wood.', fx: n => n ? 'Burners burn ' + Math.round((1 - Math.pow(MC.D.perks.bankedFires.cut, n)) * 100) + '% less fuel for the same light' : 'Burners burn what they burn' },
  lampwright: { icon: 'lamp', story: 'You remember how the copper was folded.', fx: n => 'Each copper lamp costs ×' + fmtW(1 + (MC.D.lamp.g - 1) * Math.pow(MC.D.perks.lampwright.cut, n), 3) + ' the last' },
  brightGlass: { icon: 'gem', story: 'Clearer glass, brighter flame.', fx: n => famFx(MC.D.perks.brightGlass.x, n, 'Copper lamps and braziers') },
  beaconFire: { icon: 'flame', story: 'You remember what the beacon-keepers fed their flames.', fx: n => 'Each beacon upgrade: all light +' + Math.round((MC.D.beaconStep + MC.D.perks.beaconFire.x * n) * 100) + '%' },
  beaconSurvey: { icon: 'beacon', story: 'You remember where the next stone goes.', fx: n => 'Beacon upgrades open every ' + fmtW(MC.D.beaconEvery * Math.pow(MC.D.perks.beaconSurvey.cut, n), 1) + ' places' },
  beaconWrights: { icon: 'hammer', story: 'The scaffold goes up the way it did before.', fx: n => n ? 'Beacon upgrades need ' + Math.round(MC.D.perks.beaconWrights.x * n * 100) + '% less material' : 'Beacon upgrades at full price' },
  ampSites: { icon: 'amp', story: 'You remember where the light wanted to gather.', fx: n => (MC.D.ampMax + n) + ' amplifier towers a run' },
  wideLenses: { icon: 'reach', story: 'A wider lens throws the light further across the land.', fx: n => 'Cones of ' + (MC.D.cones[n] || []).join(', ') + ' places' },
  relicLore: { icon: 'gem', story: 'Each relic remembers a little more of its land.', fx: n => famFx(MC.D.perks.relicLore.x, n, 'Every relic’s light') },
  woodcraft: { icon: 'tree', story: 'The axe finds the grain on its own.', fx: n => n ? 'All wood made +' + pc(MC.D.perks.woodcraft.x, n) + ', the village too' : 'Wood as gathered' },
  stonecraft: { icon: 'stone', story: 'You know where the stone wants to split.', fx: n => n ? 'All stone made +' + pc(MC.D.perks.stonecraft.x, n) + ', the village too' : 'Stone as gathered' },
  fibercraft: { icon: 'reed', story: 'Your hands twist a cord without looking.', fx: n => n ? 'All fiber made +' + pc(MC.D.perks.fibercraft.x, n) + ', the village too' : 'Fiber as gathered' },
  scholarLore: { icon: 'book', story: 'Old notes, still legible.', fx: n => n ? 'All research +' + pc(MC.D.perks.scholarLore.x, n) + ', the village too' : 'Research as learned' },
  coppercraft: { icon: 'yard', story: 'The smelters remember the right heat.', fx: n => n ? 'Copper made +' + pc(MC.D.perks.coppercraft.x, n) + '; smelters burn +' + pc(MC.D.perks.coppercraft.use, n) + ' more' : 'Copper as smelted' },
  // comforts
  waymarks: { icon: 'path', story: 'The old paths are still marked.' }, skipPrologue: { icon: 'scroll', story: 'You know the way out of the grey now.' },
  oldLessons: { icon: 'book', story: 'Half-remembered lessons come back quickly.' }, sureHands: { icon: 'hand', story: 'Your hands remember the work.' },
  stewardsKept: { icon: 'yard', story: 'The stewards remember their ledgers.' }, openDoors: { icon: 'settler', story: 'Settlers come the moment you wake.' },
  lightRemembers: { icon: 'path', story: 'The ground you lit before still holds a little of it.' }, headStart: { icon: 'basket', story: 'The stores were never quite empty.' },
  practisedHaulers: { icon: 'basket', story: 'They know the road to every site.' }, relicsRemembered: { icon: 'gem', story: 'The relics know their way back to you.' },
  oldFlames: { icon: 'flame', story: 'Some fires never quite went out.' },
  keptLights: { icon: 'lamp', story: 'What you built for the light still stands.' }, villageComplete: { icon: 'hammer', story: 'The village rises the moment you plan it.' }
};
const PK_ICON = {
  beacon: 'M9 21h6M10 21l1-9h2l1 9M8 12h8M12 3c1.5 2 2.5 3 2.5 4.5A2.5 2.5 0 0 1 12 10a2.5 2.5 0 0 1-2.5-2.5C9.5 6 10.5 5 12 3z',
  flame: 'M12 3c2.5 3.5 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-.5-2.5 0-5 1-7.5z',
  amp: 'M12 3v4M12 17v4M3 12h4M17 12h4M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z', reach: 'M10 10h4v4h-4zM6.5 6.5h11v11h-11zM3 3h18v18H3z',
  burner: 'M5 11h14l-2 5H7zM9 16l-2 5M15 16l2 5M12 4c1.2 1.6 2 2.6 2 3.8A2 2 0 0 1 12 10a2 2 0 0 1-2-2.2C10 6.6 10.8 5.6 12 4z', tend: 'M5 19L16 8M14 6l4 4M16 8l3-3M5 19l-1 1',
  keeper: 'M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7 21v-5a5 5 0 0 1 10 0v5M17 9c1 1.3 1.6 2 1.6 3a1.6 1.6 0 0 1-3.2 0c0-1 .6-1.7 1.6-3z',
  lamp: 'M9 3h6M10 3v3h4V3M8 6h8l1 10H7zM10 16v3h4v-3M12 9v4', bank: 'M4 18h16M6 18v-4h12v4M12 5c1.6 2 2.6 3.2 2.6 4.6A2.6 2.6 0 0 1 12 12a2.6 2.6 0 0 1-2.6-2.4C9.4 8.2 10.4 7 12 5z',
  gem: 'M6 9l6-6 6 6-6 12zM6 9h12M12 3v18', scroll: 'M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zM7 8H5M10 8h6M10 12h6M10 16h4',
  book: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14', tree: 'M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5', stone: 'M4 17l3-8 5-3 6 4 2 7zM9 12l3 1 3-2',
  reed: 'M7 21c0-6 1-11 3-16M12 21c0-5 0-10 1-15M17 21c0-5-1-9-3-13M10 5l-1-2M13 6l1-3',
  hand: 'M9 11V5a1.5 1.5 0 0 1 3 0v5M12 10V4a1.5 1.5 0 0 1 3 0v6M15 9a1.5 1.5 0 0 1 3 0v5c0 4-2.5 7-6 7s-5-2-6.5-5L4 13a1.5 1.5 0 0 1 2.5-1.5L9 14',
  settler: 'M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7 21v-5a5 5 0 0 1 10 0v5', basket: 'M4 10h16l-2 9H6zM8 10l3-6M16 10l-3-6', hammer: 'M14 4l6 6-3 3-6-6zM11 7L4 14v6h6l7-7',
  yard: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8', focus: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  path: 'M5 21c2-5 4-6 7-7s5-3 7-10M8 9h.01M15 18h.01', lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6zM12 15v2', x: 'M6 6l12 12M18 6L6 18', up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6'
};
const pkSvg = (k, color, size, sw) => '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (PK_ICON[k] || PK_ICON.flame) + '" fill="none" stroke="' + color + '" stroke-width="' + (sw || 1.6) + '" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const pkHeart = s => '<svg width="' + s + '" height="' + Math.round(s * 4 / 3) + '" viewBox="0 0 12 16" aria-hidden="true"><path d="M6 0l6 7-6 9-6-9z" fill="#d9566b"></path></svg>';
function pkStars(n, max) {
  if (max > 10) return '<div class="rankc">' + n + ' / ' + max + '</div>';
  let h = '<div class="stars">'; for (let i = 0; i < max; i++) h += '<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0l1.6 4.4L12 6 7.6 7.6 6 12 4.4 7.6 0 6l4.4-1.6z" fill="' + (i < n ? '#f3d48a' : 'none') + '" stroke="#d7b277" stroke-width="0.8"></path></svg>'; return h + '</div>';
}
// a comfort's levels, in words: "Open doors I, II" -> the level names; its description says what each does
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
function comfortLevelName(id, n) { const p = MC.D.perks[id], base = p.name.replace(/ I[–, ].*$| I$/, ''); return MC.perkMax(id) > 1 ? base + ' ' + ROMAN[n - 1] : base; }
function renderPerks() {
  const ps = $('perk-screen'); if (!S.inPerks) { ps.classList.add('hidden'); return; }
  if (!MV.prest) MV.prest = { lv: Object.assign({}, meta().perks), base: Object.assign({}, meta().perks), respec: false };
  ps.classList.remove('hidden'); const m = meta(), w = W(), P = MV.prest, lv = P.lv, spent = perkSpent(lv), free = m.hsLife - spent;
  const newHs = w && w.m ? (w.m.hsNew || 0) : 0, before = m.hsLife - newHs, sel = MV.perk, RBon = MC.D.rb.on, merch = !!P.merchant, lastRb = RBon && m.run >= RB_LAST();
  const kick = merch ? MT.merchKick : RBon ? (lastRb ? 'The last rebirth · nothing will reset' : 'Between runs · rebirth ' + m.run + ' of ' + RB_LAST()) : 'Between runs · run ' + m.run + ' is ending';
  const sub = merch ? MT.merchSub : 'Run ' + m.run + ' called back ' + (w && w.m ? w.m.restored : 0) + ' places, ' + (w && w.m ? (w.m.newPlaces || 0) : 0) + ' of them new: ' + fmtW(newHs) + ' new heartstones. What you remembered before stays remembered.';
  let h = '<div class="pk-sky"></div><div class="pk-glow"></div><div class="pk"><div class="pk-top"><div><div class="pk-kicker">' + kick + '</div><h1>' + (merch ? MT.merchH : 'What will you remember?') + '</h1>' +
    '<div class="pk-sub">' + sub + '</div></div>' +
    '<button type="button" class="pk-x" data-close="1" aria-label="Close (Esc)">' + pkSvg('x', '#cfc5ae', 22, 2) + '</button></div>';
  if (RBon && !merch) h += '<div class="rbwrap pk-rb">' + rbBar(m.run, true, true) + '<p class="rbcap">After this rebirth you remember ' + rbPct(m.run, true) + '% of yourself' + (lastRb ? ': all of it. The land stays.' : '. The next comes at ' + (MC.D.rb.at[m.run] || '') + ' places in one run.') + '</p></div>';
  const lo = P.open !== false;
  h += '<section class="cur' + (lo ? ' open' : '') + '"><button type="button" class="cur-strip" data-toggle="1" aria-expanded="' + lo + '">' +
    '<span class="cur-name"><span class="hex" style="width:30px;height:27px;background:#e0a34a">' + pkSvg('flame', '#2a1d10', 17, 2) + '</span><span><span class="cz cur-t">Light</span><span class="cur-s">Heartstones</span></span></span>' +
    '<span class="cur-mem"><span class="cur-l">Memory, all light</span><span class="memx"><span class="was">×' + fmtW(memMultFor(before), 2) + '</span><span style="color:#f2b84b">→</span><span class="now">×' + fmtW(memMultFor(m.hsLife), 2) + '</span></span></span>' +
    '<span class="cur-purse">' + pkHeart(20) + '<span><b>' + fmtW(free) + '</b><span>of ' + fmtW(m.hsLife) + ' free</span></span></span>' +
    '<span class="cur-chev" aria-hidden="true">' + pkSvg(lo ? 'up' : 'down', '#d7b277', 20, 2) + '</span></button>';
  if (lo) {
    h += '<div class="cur-body"><div class="cur-bar"><span>' + (merch ? 'What you buy works at once. He sells the same gifts the rebirths did, at the same prices.' : P.respec ? 'Respec: every gift and comfort comes back to you when you scatter. Choose again, or undo it.' : 'Gifts you remembered before stay yours. New heartstones buy new ranks; a respec gives everything back to choose again.') + '</span>' +
      '<span style="display:flex;gap:8px;flex-wrap:wrap">' + (pkPending().length ? '<button type="button" class="pk-respec" data-undoall="1">Take back this time’s picks</button>' : '') + (merch ? '' : '<button type="button" class="pk-respec" data-respec="1">' + (P.respec ? 'Undo the respec' : 'Respec (free)') + '</button>') + '</span></div>' +
      (pkPending().length ? '<div class="cur-bar" style="padding-top:0">New this time: ' + pkPending().map(id => (MC.D.perks[id].kind === 'comfort' ? comfortLevelName(id, lv[id]) : MC.D.perks[id].name + ' ' + lv[id])).join(', ') + '</div>' : '') + '<div class="pk-fams">';
    for (const f of PK_FAMS) {
      const ids = Object.keys(MC.D.perks).filter(id => MC.D.perks[id].fam === f.id && perkShown(id)); if (!ids.length) continue;
      h += '<section class="pk-fam"><h2><span class="hex" style="width:15px;height:13px;background:' + f.color + '"></span>' + f.name + '<small>' + (f.kind === 'enabling' ? 'this phase' : 'from the start') + '</small></h2><div class="pk-meds">';
      for (const id of ids) {
        const p = MC.D.perks[id], u = PK_UI[id] || {}, n = lv[id] || 0, max = MC.perkMax(id), done = n >= max, price = done ? 0 : MC.perkCost(id, n), ok = !perkLocked(id, lv), afford = ok && !done && free >= price, picked = sel === id;
        const glow = done ? 'drop-shadow(0 0 14px #f3d48a) drop-shadow(0 0 4px #fff1c9)' : picked ? 'drop-shadow(0 0 12px ' + f.color + ')' : afford ? 'drop-shadow(0 0 6px ' + f.color + '88)' : 'none';
        h += '<button type="button" class="med" data-pick="' + id + '" aria-label="' + p.name + (done ? ', mastered' : ', costs ' + price + ' heartstones') + '">' +
          '<div style="filter:' + glow + '"><div class="hex" style="width:84px;height:75px;background:' + (done ? '#ffe7a3' : picked ? '#f3d48a' : p.role === 'unlock' ? '#c9a04a' : '#9c7440') + '">' +
          '<div class="hex" style="width:77px;height:68px;background:' + (done ? '#c9952f' : '#d7b277') + '"><div class="hex" style="width:71px;height:62px;background:' + (done ? f.color : f.deep) + ';opacity:' + (!ok ? 0.35 : afford || picked || done || n ? 1 : 0.62) + '">' +
          pkSvg(u.icon, done ? '#fff1c9' : afford || picked || n ? f.icon : '#8f8798', 34) + '</div></div></div></div>' +
          (p.role === 'unlock' ? '<div class="rankc">' + (n ? 'OPEN' : 'ONE-TIME') + '</div>' : pkStars(n, max)) + '<div class="med-name">' + p.name + '</div>' +
          (done ? '<div class="ribbon">' + (p.role === 'unlock' ? 'CHOSEN' : 'MASTERED') + '</div>' : '<div class="tag" style="border:1px solid ' + (afford ? '#d9566b' : '#3a3550') + ';color:' + (afford ? '#ffd0d8' : '#a69ead') + '">' + pkHeart(8) + fmtW(price) + '</div>') + '</button>';
      }
      h += '</div></section>';
    }
    h += '</div><div class="pk-bottom">';
    if (RBon) h += merch ? '' : giftsHTML(m.run);
    const cids = RBon ? [] : Object.keys(MC.D.perks).filter(id => MC.D.perks[id].kind === 'comfort' && !MC.D.perks[id].gift), owned = cids.filter(id => lv[id]).length;
    if (!RBon) {
    h += '<div class="pk-comforts"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><div class="cz" style="font-size:14px;letter-spacing:0.14em;color:#9fe3c5">COMFORTS</div><div style="font-size:13.5px;color:#a9bdb4">Catching up faster, never further. ' + owned + ' of ' + cids.length + ' kept.</div></div><div class="pk-chips">';
    for (const id of cids) { const p = MC.D.perks[id], u = PK_UI[id] || {}, n = lv[id] || 0, max = MC.perkMax(id), done = n >= max, price = done ? 0 : MC.perkCost(id, n), afford = !done && free >= price, picked = sel === id;
      const name = done ? comfortLevelName(id, n) : comfortLevelName(id, n + 1);
      h += '<button type="button" class="chip" data-pick="' + id + '" aria-label="' + name + '" style="color:' + (n ? '#cfeee0' : '#e3e9e6') + ';border:1px solid ' + (picked ? '#f3d48a' : n ? '#3f7a64' : '#2c4a40') + ';background:' + (n ? '#173a30' : '#13241f') + '">' +
        pkSvg(u.icon, n ? '#9fe3c5' : afford ? '#cfeee0' : '#7d8a86', 17, 1.8) + '<span style="flex:1;font-size:12.5px;line-height:1.15">' + name + (n && !done ? ' <span style="color:#7fb8a6">(' + ROMAN[n - 1] + ' kept)</span>' : '') + '</span>' +
        (done ? '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" fill="none" stroke="#9fe3c5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
          : '<span style="display:flex;align-items:center;gap:3px;font-size:12.5px;color:' + (afford ? '#ffd0d8' : '#a69ead') + '">' + pkHeart(7) + fmtW(price) + '</span>') + '</button>'; }
    h += '</div></div>'; }
    h += '</div></div>';
  }
  h += '</section>';
  h += '<section class="cur locked"><div class="cur-strip"><span class="cur-name"><span class="hex" style="width:30px;height:27px;background:#26233a">' + pkSvg('lock', '#8a8399', 15) + '</span><span><span class="cz cur-t" style="color:#8f8798">Something older</span><span class="cur-s">Chained in the dark</span></span></span>' +
    '<span class="cur-mem" style="color:#8f8798;font-style:italic;font-size:15px">Its stones are not heartstones.</span><span></span><span></span></div></section>';
  const hist = m.hist.map(x => 'Run ' + x.run + ': ' + x.tiles + ' places, +' + fmtW(x.hsNew)).concat(w && w.m ? ['Run ' + m.run + ': ' + w.m.restored + ' places, +' + fmtW(newHs)] : []);
  const goTxt = merch ? MT.merchGo : RBon ? (lastRb ? 'Remember all of yourself' : 'Be reborn, and begin run ' + (m.run + 1)) : 'Scatter, and begin run ' + (m.run + 1);
  h += '<div class="pk-foot"><div class="pk-last">' + (merch ? 'His next visit: about two days after you send him on.' : hist.join(' · ') + ' · Close or press Esc to go back to run ' + m.run) + '</div><button type="button" class="pk-return" id="pk-go">' + pkSvg('flame', '#ffb35c', 19, 1.8) + goTxt + '</button></div></div>';
  ps.innerHTML = h;
}
// the rebirth branch: the gifts held, the ones this rebirth brings, and the ones still to come (dimmed), so a player can plan for them
function giftsHTML(run) {
  const held = MC.giftsFor(run), packs = MC.D.rb.packets;
  let h = '<div class="pk-comforts"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><div class="cz" style="font-size:14px;letter-spacing:0.14em;color:#9fe3c5">GIFTS</div><div style="font-size:13.5px;color:#a9bdb4">Each rebirth brings gifts of its own, free, for every run after it. They catch you up; heartstones buy power.</div></div>';
  for (let i = 0; i < packs.length; i++) {
    const n = i + 1, state = n < run ? 'held' : n === run ? 'now' : 'later', gl = giftLines(packs[i]);
    h += '<div class="rbpack ' + state + '"><span class="rbp-h">' + (state === 'now' ? 'This rebirth brings' : state === 'held' ? 'Rebirth ' + n + ' brought' : 'Rebirth ' + n) + '</span><span class="pk-chips' + (state === 'later' ? ' locks' : '') + '">';
    // r1c (owner, 2026-10-18): rebirths still to come show locked icons only, no names or descriptions
    if (state === 'later') gl.forEach(() => { h += '<span class="chip gift later lockonly" aria-label="Not yet remembered">' + pkSvg('lock', '#7d8a86', 15, 1.8) + '</span>'; });
    else gl.forEach(g => { h += '<span class="chip gift ' + state + '" tabindex="0" data-gift="' + g.id + ':' + g.lv + ':' + n + '"><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" fill="none" stroke="#9fe3c5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg><span>' + g.name + '</span></span>'; });
    h += '</span></div>';
  }
  const lastNow = run >= RB_LAST();
  h += '<div class="rbpack ' + (lastNow ? 'now' : 'later') + '"><span class="rbp-h">Rebirth ' + RB_LAST() + '</span><span class="pk-chips' + (lastNow ? '' : ' locks') + '">' + (lastNow ? '<span class="chip gift now"><span>Nothing resets: you become whole, and the land stays</span></span>' : '<span class="chip gift later lockonly" aria-label="Not yet remembered">' + pkSvg('lock', '#7d8a86', 15, 1.8) + '</span>') + '</span></div>';
  return h + '</div>';
}
// the traveling merchant: the same screen, his stock the heartstone perks, what you buy working at once
function openMerchant() {
  const m = meta(), w = W(); if (!w || !w.m || !MC.merchantHere(w)) return;
  MV.prest = { lv: Object.assign({}, m.perks), base: Object.assign({}, m.perks), respec: false, open: true, merchant: true };
  S.inPerks = true; save(true); renderPerks(); $('perk-screen').scrollTop = 0;
}
function merchantApply() {   // what was chosen at his table works at once
  const m = meta(), w = W(); if (!MV.prest || !MV.prest.merchant || !w || !w.m) return;
  m.perks = Object.assign({}, MV.prest.lv); w.m.perks = MC.prPerks({ perks: m.perks, run: RB_LAST() + 1 });
}
function pkPending() { const P = MV.prest; if (!P) return []; return Object.keys(P.lv).filter(id => (P.lv[id] || 0) > (P.respec ? 0 : (P.base[id] || 0))); }
function pkBuy(id) {
  const P = MV.prest, lv = P.lv, m = meta(), n = lv[id] || 0, p = MC.D.perks[id]; if (!p) return;
  if (n >= MC.perkMax(id) || perkLocked(id, lv)) return;
  const c = MC.perkCost(id, n); if (c <= m.hsLife - perkSpent(lv)) { lv[id] = n + 1; if (P.merchant) { merchantApply(); renderWorld(); } }
}
function pkUndo(id) {   // only a rank chosen on this screen can be taken back without a respec
  const P = MV.prest, lv = P.lv, n = lv[id] || 0, floor = P.respec ? 0 : (P.base[id] || 0); if (n > floor) { lv[id] = n - 1; if (!lv[id]) delete lv[id]; if (P.merchant) { merchantApply(); renderWorld(); } }
}
function perkTipHTML(id) {
  const P = MV.prest, lv = P.lv, m = meta(), p = MC.D.perks[id], u = PK_UI[id] || {}, n = lv[id] || 0, max = MC.perkMax(id), done = n >= max, free = m.hsLife - perkSpent(lv), price = done ? 0 : MC.perkCost(id, n);
  const floor = P.respec ? 0 : (P.base[id] || 0), canUndo = n > floor;
  const act = done ? (canUndo ? 'Kept. Right-click to take back the rank you chose here.' : 'Kept.') : free >= price ? 'Click to remember: ' + fmtW(price) + ' heartstones.' + (canUndo ? ' Right-click to take one back.' : '') : 'Needs ' + fmtW(price - free) + ' more heartstones.';
  if (p.kind === 'comfort') {
    return '<strong>' + (n ? comfortLevelName(id, n) : comfortLevelName(id, 1)) + ' <span>comfort' + (max > 1 ? ', ' + n + ' of ' + max : '') + '</span></strong><div class="pt-k">Catching up faster; no frontier power</div>' + (u.story ? '<div class="pt-s">' + u.story + '</div>' : '') +
      '<div class="pt-r"><span>Does</span><span>' + MC.perkDesc(id) + '</span>' + (max > 1 ? '<span>Prices</span><span>' + MC.D.perks[id].costs.join(' / ') + ' heartstones</span>' : '') + '</div><div class="pt-a">' + act + '</div>';
  }
  const fam = PK_FAMS.find(f => f.id === p.fam), kind = p.role === 'unlock' ? 'Opens a system' : fam && fam.kind === 'enabling' ? (p.role === 'cheaper' ? 'This phase: cheaper rungs of a ladder you climb in the run' : 'This phase: stronger rungs of something you build in the run') : 'Power from the first moment of the run';
  return '<strong>' + p.name + ' <span>' + (p.role === 'unlock' ? (n ? 'chosen' : 'one-time') : 'rank ' + n + ' of ' + max) + '</span></strong><div class="pt-k">' + kind + '</div>' + (u.story ? '<div class="pt-s">' + u.story + '</div>' : '') +
    '<div class="pt-r"><span>Now</span><span>' + (u.fx ? u.fx(n) : MC.perkDesc(id)) + '</span>' + (done || !u.fx ? '' : '<span>Next</span><span class="pt-n">' + u.fx(n + 1) + '</span>') + '</div><div class="pt-a">' + act + '</div>';
}
function giftTipHTML(code) {
  const [id, lv, n] = code.split(':'), g = giftLines({ [id]: +lv })[0];
  return '<strong>' + g.name + ' <span>gift</span></strong><div class="pt-k">From rebirth ' + n + ', free, for every run after it</div><div class="pt-r"><span>Does</span><span>' + g.desc + '</span></div>';
}
function hidePtip() { const t = $('ptip'); if (t) t.hidden = true; }
function perkTip(el) {
  let t = $('ptip'); if (!t) { t = document.createElement('div'); t.id = 'ptip'; t.className = 'ptip'; t.hidden = true; document.body.appendChild(t); }
  if (!el || !MV.prest) { t.hidden = true; return; }
  t.innerHTML = el.dataset.gift ? giftTipHTML(el.dataset.gift) : perkTipHTML(el.dataset.pick); t.hidden = false;
  const r = el.getBoundingClientRect(), wd = t.offsetWidth, hg = t.offsetHeight; let x = r.left + r.width / 2 - wd / 2, y = r.bottom + 6;
  x = Math.max(8, Math.min(window.innerWidth - wd - 8, x)); if (y + hg > window.innerHeight - 8) y = Math.max(8, r.top - hg - 6); t.style.left = x + 'px'; t.style.top = y + 'px';
}
// the scatter itself: what this run leaves behind for the next, then a fresh run
function commitScatter() {
  const m = meta(), w = W();
  if (MV.prest && MV.prest.merchant) { merchantApply(); MC.merchantLeave(w, Date.now() / 1000); MV.prest = null; S.inPerks = false; hidePtip(); $('perk-screen').classList.add('hidden');
    sys('The traveler goes on his way. He will be back in about two days.'); renderWorld(); save(true); return; }
  if (MC.D.rb.on && w && w.m && !w.m.rbReady) return;   // the rebirth branch: a rebirth only at its milestone
  if (MC.D.rb.on) { try { localStorage.setItem(SAVE_KEY + '.back', serialize(S)); } catch (e) {} }   // the rebirth branch: Settings can go back to this moment
  if (MC.D.rb.on && m.run >= RB_LAST()) { becomeWholeNow(); return; }
  if (w && w.m) { try { checkRun(); const rr = runRec(); rr.end = { tiles: w.m.restored, t: w.t, hs: w.m.hsNew || 0, pop: w.pop, light: MC.lightRate(w), regions: MC.regionsDone(w) }; } catch (e) {}
    m.hist.push({ run: m.run, tiles: w.m.restored, regions: MC.regionsDone(w), hsNew: w.m.hsNew || 0, play: (S.playTime || 0) - (w.m.startPlay || 0), at: Date.now() });
    m.cards = Array.from(new Set((m.cards || []).concat(Object.keys(w.m.cards))));
    m.vcards = Array.from(new Set((m.vcards || []).concat(Object.keys(w.cards || {}))));   // r1f: the village's research, for Old lessons
    m.built = Array.from(new Set(m.built.concat(Object.keys(w.done || {}), Object.keys(w.m.done || {}))));
    m.relics = Array.from(new Set(m.relics.concat(Object.keys(w.m.relicT || {}))));
    m.levels = { lv: JSON.parse(JSON.stringify(w.m.lv || {})), tier: JSON.parse(JSON.stringify(w.m.tier || {})) };
    MC.REGIONS.forEach((rg, i) => { const c = rg.tiles.filter(k => w.m.tiles[k]).length; if (c > (m.regBest[i] || 0)) m.regBest[i] = c; if (c === rg.tiles.length && !m.regFin[i]) m.regFin[i] = m.run; }); }
  m.perks = Object.assign({}, MV.prest.lv); MV.prest = null; hidePtip(); beginRun();
}
// the last rebirth: nothing resets. The run carries on, whole
function becomeWholeNow() {
  const m = meta(), w = W();
  try { checkRun(); const rr = runRec(); rr.end = { tiles: w.m.restored, t: w.t, hs: w.m.hsNew || 0, pop: w.pop, light: MC.lightRate(w), regions: MC.regionsDone(w) }; } catch (e) {}
  m.hist.push({ run: m.run, tiles: w.m.restored, regions: MC.regionsDone(w), hsNew: w.m.hsNew || 0, play: (S.playTime || 0) - (w.m.startPlay || 0), at: Date.now(), whole: true });
  m.perks = Object.assign({}, MV.prest.lv); MV.prest = null; hidePtip(); S.inPerks = false; $('perk-screen').classList.add('hidden');
  MC.becomeWhole(w, m.hsLife, m.perks, Date.now() / 1000); m.whole = true; m.run = RB_LAST() + 1; w.m.hsNew = 0;
  if (!w.m.target) { const nk = MC.nextTarget(w) || MC.cheapestTarget(w); if (nk) MC.setTarget(w, nk); }   // the land beyond answers again
  wsay('You remember all of yourself. The land stays.'); renderWorld(); save(true); showWhole();
}
function beginRun() {
  const m = meta(); m.run++; S.inPerks = false;
  try { const was = S.w; S.w = null; runRec(); S.w = was; } catch (e) {}   // v1n: run records begin with the run
  const keep = { meta: m, speed: S.speed, playTime: S.playTime, debug: S.debug, miles: S.miles, showDone: S.showDone,
    opt: S.opt, lastBackup: S.lastBackup, lastBuild: S.lastBuild, counted: S.counted, persistAsked: S.persistAsked, born: S.born };
  S = Object.assign(fresh(), keep);
  const gifts = Object.assign({}, MC.giftsFor(m.run)), skipP = m.perks.skipPrologue || gifts.skipPrologue;
  if (skipP) { S.flags.stood = true; S.flags.driftShown = true; S.flags.cohereShown = true; }
  S.log = []; say(skipP ? 'Run ' + m.run + '. You remember how to stand. The grey waits.' : 'Run ' + m.run + '. Nothing. Then, something. But you remember.');
  // the rebirth branch: The village stands. The run wakes at the edge of the land, the village as it stood when the map last opened
  if (gifts.villageSkip && m.villageSnap) { try { S.w = JSON.parse(JSON.stringify(m.villageSnap)); S.w.stats = { buys: [], made: {} }; S.w.playStart = S.playTime || 0; S.flags.stood = true;
    say('You wake at the edge of your land. The village stands as you left it.');
    const w = S.w; MC.villageStand(w); /* r1c: at least the floor of the village built */ MC.init(w, prestigeObj()); w.m.run = m.run; w.m.hsNew = 0; w.m.startPlay = S.playTime || 0; w.m.flags = {}; w.seen.copper = false; S.view = 'map'; } catch (e) { S.w = null; } }
  save(true); location.reload();
}
$('perk-screen').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t || !MV.prest) return;
  if (t.dataset.close) { closePerks(); return; }
  if (t.id === 'pk-go') { commitScatter(); return; }
  if (t.dataset.toggle) { MV.prest.open = MV.prest.open === false; renderPerks(); return; }
  if (t.dataset.undoall) { const P = MV.prest; P.lv = P.respec ? {} : Object.assign({}, P.base); if (P.merchant) { merchantApply(); renderWorld(); } renderPerks(); return; }
  if (t.dataset.respec) { const P = MV.prest; if (P.respec) { P.respec = false; P.lv = Object.assign({}, P.base); } else { P.respec = true; P.lv = {}; } renderPerks(); return; }
  if (t.dataset.pick) { const id = t.dataset.pick; MV.perk = id; pkBuy(id); renderPerks(); perkTip($('perk-screen').querySelector('[data-pick="' + id + '"]')); }
});
$('perk-screen').addEventListener('contextmenu', e => { const t = e.target.closest('[data-pick]'); if (!t || !MV.prest) return; e.preventDefault(); const id = t.dataset.pick; pkUndo(id); renderPerks(); perkTip($('perk-screen').querySelector('[data-pick="' + id + '"]')); });
$('perk-screen').addEventListener('mouseover', e => perkTip(e.target.closest('[data-pick],[data-gift]')));
$('perk-screen').addEventListener('mouseleave', () => perkTip(null));
$('perk-screen').addEventListener('focusin', e => perkTip(e.target.closest('[data-pick],[data-gift]')));
$('perk-screen').addEventListener('focusout', () => perkTip(null));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.inPerks && S.w) closePerks(); });

