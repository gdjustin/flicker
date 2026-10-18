/* ---------- away, in the map phase ---------- */
// what you can buy now that you couldn't before (for the away report's "Now within reach")
function mapAffordable() {
  const w = W(), out = {};
  for (const c of VC.CARDS) if (w.cards[c.id] == null && VC.gateOk(w, c.at) && VC.canPay(w, c.cost)) out['c:' + c.id] = c.name;
  for (const c of MC.CARDS) if (MC.cardAvail(w, c) && VC.canPay(w, MC.cardCost(w, c))) out['m:' + c.id] = c.name;
  for (const l of MC.ML) if (MC.levelOpen(w, l.id) && !MC.levelMaxed(w, l.id) && VC.canPay(w, MC.levelCost(w, l.id))) out['l:' + l.id] = l.name;
  const rt = relicTiles(w).filter(x => w.res.copper >= x.c); if (rt.length) out.relic = rt.length === 1 ? 'a relic' : rt.length + ' relics';
  return out;
}
function mapAwaySnap() { const w = W(); return { afford: mapAffordable(), light: w.m.made.light, res: Object.assign({}, w.res), pop: w.pop, tiles: Object.keys(w.m.tiles), regions: MC.regionsDone(w), glow: w.m.glowN || 0, done: Object.keys(w.m.done), hs: w.m.hsNew || 0 }; }
function mapAwayReport(a, seconds, capped) {
  const w = W(), rows = [], rep = { title: tx('a.title'), rows, res: [], fresh: [] };
  rep.time = seconds > capped + 60 ? tx('a.time.capped', { away: awayDur(seconds), kept: awayDur(capped) }) : tx('a.time.full', { away: awayDur(seconds) });
  rep.logLine = seconds > capped + 60 ? tx('a.log.capped', { away: awayDur(seconds), kept: awayDur(capped) }) : tx('a.log.full', { away: awayDur(seconds) });
  const nt = Object.keys(w.m.tiles).filter(k => !a.tiles.includes(k)).map(k => shortName(tileOf(k)));
  if (nt.length) rows.push([tx('a.row.restored'), nt.length > 4 ? nt.slice(0, 4).join(', ') + ' and ' + (nt.length - 4) + ' more' : nt.join(', ')]);
  if (MC.regionsDone(w) > a.regions) rows.push([tx('a.row.regions'), (MC.regionsDone(w) - a.regions) + ' finished']);
  if ((w.m.hsNew || 0) > a.hs) rows.push(['Heartstones', '+' + fmtW(w.m.hsNew - a.hs) + ' new']);
  if (w.pop !== a.pop) rows.push([tx('a.row.settlers'), tx('a.settlers', { n: w.pop - a.pop, pop: w.pop })]);
  const nb = Object.keys(w.m.done).filter(k => !a.done.includes(k)); if (nb.length) rows.push([tx('vw.a.built'), nb.map(k => pname(w, k)).join(', ')]);
  if ((w.m.glowN || 0) > a.glow) rows.push(['Glowstones', '+' + ((w.m.glowN || 0) - a.glow)]);
  const t = w.m.target ? tileOf(w.m.target) : null;
  if (w.m.made.light > (a.light || 0) + 1) rows.push([tx('a.row.light'), fill(MT.lightAway, { n: fmtC(w.m.made.light - (a.light || 0)) })]);
  rows.push([tx('a.row.now'), t ? 'Calling back ' + shortName(t) + ': ' + Math.floor((w.m.got[t.key] || 0) / MC.tileCost(t, w) * 100) + '%, about ' + fmtTime((MC.tileCost(t, w) - (w.m.got[t.key] || 0)) / Math.max(1e-9, MC.sentRate(w))) + ' left.' : tx('a.now.none')]);
  for (const r of WORLD.resOrder) { if (!w.seen[r]) continue; const d = (w.res[r] || 0) - (a.res[r] || 0); if (Math.abs(d) < 1) continue; rep.res.push({ name: resName(r), d, full: w.res[r] >= cap(r) - 0.5 }); }
  const now = mapAffordable(); rep.fresh = Object.keys(now).filter(k => !(a.afford || {})[k]).map(k => now[k]);
  // how to keep it working longer: the next time-away research, when the time away ran past the limit
  if (seconds > capped + 60) { const nx = MC.CARDS.filter(c => c.away && !w.m.cards[c.id] && c.away * 3600 > capped).sort((x, y) => x.away - y.away)[0];
    rep.more = nx && MC.cardAvail(w, nx) ? fill(MT.keepLearn, { name: nx.name, h: nx.away + (MC.perk(w, 'nightWatch') ? MC.D.perks.nightWatch.hours : 0) }) : MT.keepLater; }
  return rep;
}

/*@if-test*/
/* ---------- playtest: skip to the map, or let the lab bot play the map ---------- */
function worldFromBot(s) {   // a bot's state as the game's world (the screens' own fields added)
  s.stats = { buys: [], made: {} };
  const w = Object.assign(freshWorld(), s, { looks: WORLD.looks.length, haulFrom: {}, leftStack: [] });
  ['wood', 'stones', 'fiber', 'food', 'ideas'].forEach(k => { w.seen[k] = true; }); if (s.cards.snails) w.seen.snails = true;
  ['ideasMsg', 'stoked', 'quietMind', 'askName', 'snailSeen', 'full', 'great', 'lights', 'end'].forEach(k => { w.flags[k] = true; });
  return w;
}
function adoptBotState(s, note) {
  const w = worldFromBot(s);
  S.flags.stood = true; S.w = w; S.log = []; sys(note);
  try { $('moment').classList.add('hidden'); hideTip(); } catch (e) {}
  MV.cells = null; resetWorldDom(); enterWorld();
}
function skipToMap() {
  const pr = prestigeObj(), pv = MC.villagePrestige(pr); const r = VBOT.run(VC, { pv: pv, startRes: pr ? MC.D.villageStart : null, instantProj: !!(pv && pv.instant) }); adoptBotState(r.s, 'Playtest: the lab’s bot played the village to its end (' + Math.round(r.s.t / 60) + ' minutes). The map is yours.');
  S.playTime = (S.playTime || 0) + r.s.t; startMap(); runHelp('the lab bot played the village'); save(true);
}
function botMap(n, preset) {
  try { runRec(); } catch (e) {}   // v1n: the run's record keeps the heartstones and gifts it began with
  const r = MB.run({ preset: preset || 'checkin', pick: 'need', leak: 'fuel', days: preset ? 60 : 21, stopTiles: n, prestige: prestigeObj() })   /* v1n: the lab's sensible player */, s = r.s, m = meta();
  let gain = 0, fresh = 0; r.tileT.forEach(([, k]) => { if (!m.ever[k]) { m.ever[k] = true; const h = MC.hsFor(tileOf(k).dstep); m.hsLife += h; gain += h; fresh++; } });
  adoptBotState(s, 'Playtest: the lab’s check-in bot played this run’s village and map to ' + s.m.restored + ' places (' + fmtTime(s.t - (r.villageMin * 60)) + ' on the map). It’s yours from here.');
  S.w.m.run = m.run; S.w.m.hsNew = gain; S.w.m.newPlaces = fresh; S.w.m.flags = { thirty: s.m.restored >= 30 }; S.w.m.startPlay = S.playTime || 0; S.playTime = (S.playTime || 0) + s.t;
  // the run's record: the bot's own tile times, flagged as the bot's
  try { const rr = runRec(), v0 = r.villageMin * 60; rr.marks = {}; rr.firsts = {}; delete rr.joined; r.tileT.forEach(([h], i) => { const k = i + 1; if (RUN_MARKS.includes(k)) rr.marks[k] = v0 + h * 3600; });
    rr.firsts.village = v0; rr.firsts.map = v0;
    if (s.m.regionList && s.m.regionList.length) rr.firsts.region1 = s.m.regionList[0][0]; if (s.m.relicT) { const v = Object.values(s.m.relicT); if (v.length) rr.firsts.relic1 = Math.min(...v); }
    for (const [k, , f] of RUN_FIRSTS) if (!(k in rr.firsts)) { let ok = false; try { ok = !!f(s); } catch (e) {} if (ok) rr.firsts[k] = -1; }   // reached while the bot played; no time kept
    rr.help.push([S.w.t, 'the lab bot played the village and map to ' + s.m.restored + ' places']); } catch (e) {}
  if (s.m.restored > (m.best || 0)) m.best = s.m.restored; S.view = 'map'; checkMiles(); save(true); renderWorld();
}
// v1n playtest: skip to a scatter. The lab bot plays this run to about 40 places, then the scatter opens (owner, 2026-10-15)
const prestArm = { on: false };
function skipToScatter(btn) {
  if (!prestArm.on) { prestArm.on = true; const was = btn.textContent; btn.textContent = 'Click again: the bot replays this run'; setTimeout(() => { prestArm.on = false; btn.textContent = was; }, 4000); return; }
  prestArm.on = false; btn.disabled = true; btn.textContent = 'playing\u2026';
  setTimeout(() => { try { const w = W(); if (!(w && w.m && w.m.restored >= 40)) botMap(40, 'keen'); askScatter(); } finally { btn.disabled = false; btn.textContent = 'Play to 40 places and scatter'; } }, 30);
}

// the rebirth branch (2026-10-18): the bot plays this run to its rebirth, or every run left to the last rebirth (whole)
function botPerks(m) {   // spend free heartstones the way the lab bot does: the cheapest next rank of a power perk first
  const lv = m.perks = m.perks || {}; let g = 0;
  while (g++ < 500) { const free = m.hsLife - perkSpent(lv); let best = null, bc = Infinity;
    for (const id in MC.D.perks) { const p = MC.D.perks[id]; if (!perkShown(id) || p.kind === 'comfort' || perkLocked(id, lv)) continue; const n = lv[id] || 0; if (n >= MC.perkMax(id)) continue; const c = MC.perkCost(id, n); if (c <= free && c < bc) { bc = c; best = id; } }
    if (!best) break; lv[best] = (lv[best] || 0) + 1; }
}
function botToRebirth() {
  const w = W(), m = meta(); if (!w || !MC.D.rb.on || m.whole) return;
  if (w.m && w.m.rbReady) { askScatter(); return; }
  botMap(MC.rbAt(m.run)); askScatter();
}
function botToWhole(btn) {
  const m = meta(); if (!MC.D.rb.on || m.whole) return;
  btn.disabled = true; const was = btn.textContent;
  const step = () => {
    try {
      const run = m.run, at = MC.rbAt(run); btn.textContent = 'playing run ' + run + ' of ' + MC.D.rb.last + '\u2026';
      const r = MB.run({ preset: 'checkin', pick: 'need', leak: 'fuel', days: 30, stopTiles: at, prestige: prestigeObj() }), s = r.s;
      let gain = 0, fresh = 0; r.tileT.forEach(([, k]) => { if (!m.ever[k]) { m.ever[k] = true; const h = MC.hsFor(tileOf(k).dstep); m.hsLife += h; gain += h; fresh++; } });
      if (s.m.restored > (m.best || 0)) m.best = s.m.restored;
      if (run >= MC.D.rb.last || !s.m.rbReady) {   // the last run (or a run that stalls): it's yours, at its rebirth
        adoptBotState(s, 'Playtest: the lab bot played every run to its rebirth. This is run ' + run + ', at ' + s.m.restored + ' places.');
        S.w.m.run = run; S.w.m.hsNew = gain; S.w.m.newPlaces = fresh; S.w.m.flags = {}; S.w.m.startPlay = S.playTime || 0; S.playTime = (S.playTime || 0) + s.t;
        botPerks(m); S.view = 'map'; save(true); renderWorld(); btn.disabled = false; btn.textContent = was; askScatter(); return;
      }
      m.hist.push({ run, tiles: s.m.restored, regions: MC.regionsDone(s), hsNew: gain, play: s.t, at: Date.now(), bot: true });
      m.cards = Array.from(new Set((m.cards || []).concat(Object.keys(s.m.cards))));
      m.built = Array.from(new Set(m.built.concat(Object.keys(s.done || {}), Object.keys(s.m.done || {}))));
      m.relics = Array.from(new Set(m.relics.concat(Object.keys(s.m.relicT || {}))));
      m.levels = { lv: JSON.parse(JSON.stringify(s.m.lv || {})), tier: JSON.parse(JSON.stringify(s.m.tier || {})) };
      MC.REGIONS.forEach((rg, i) => { const c = rg.tiles.filter(k => s.m.tiles[k]).length; if (c > (m.regBest[i] || 0)) m.regBest[i] = c; if (c === rg.tiles.length && !m.regFin[i]) m.regFin[i] = run; });
      if (r.villageSnap) m.villageSnap = worldFromBot(JSON.parse(JSON.stringify(r.villageSnap)));
      S.playTime = (S.playTime || 0) + s.t; botPerks(m); m.run++; save(true);
      setTimeout(step, 30);
    } catch (e) { btn.disabled = false; btn.textContent = was; notice('Playtest: the bot stopped: ' + e.message); }
  };
  setTimeout(step, 30);
}
function callMerchant() { const w = W(); if (!w || !w.m || !w.m.whole) { notice('The traveler comes once you are whole.'); return; } MC.merchantArrive(w, Date.now() / 1000); w.m.merch.next = 0; MC.merchantArrive(w, Date.now() / 1000); mapTick(0); renderWorld(); save(true); }
/*@end-test*/
// v1g: what needs the player, for the tab dots (owner, 2026-10-13)
function mapNeedsYou(w) {
  const why = [];
  if (w.m.rbReady) why.push('you are ready to be reborn'); else if (!w.m.target) why.push('your light has no place to go');
  if (MC.merchantHere(w)) why.push('a traveler waits');
  if (MC.repairOpen(w)) why.push('the old tower waits to be repaired');
  return why;
}
function settlementNeedsYou(w) {
  const why = [], free = w.pop - VC.jobsTotal(w);
  if (free > 0) why.push(free + ' settler' + (free === 1 ? '' : 's') + ' with no job');
  if ((w.jobs.hauler || 0) > 0 && !w.m.proj) why.push('haulers with nothing to carry');
  if (w.m.proj && !w.m.awaitClick && !(w.jobs.hauler > 0)) why.push('no one is hauling to ' + pname(w, w.m.proj.id));
  const full = ['wood', 'stones', 'fiber', 'copper', 'food', 'ideas'].filter(r => (w.res[r] || 0) >= MC.cap(w, r) - 0.001 && mapFlows(r).reduce((a, f) => a + Math.max(0, f[1]), 0) > 0.0005 && !(r === 'ideas' && false));
  if (full.length) why.push(full.map(r => resName(r).toLowerCase()).join(', ') + ' full while settlers still make ' + (full.length === 1 ? 'it' : 'them'));
  return why;
}
function tabDot(id, why) {
  const b = $(id); let d = b.querySelector('.tdot');
  if (why.length) { if (!d) { d = document.createElement('span'); d.className = 'tdot'; d.setAttribute('aria-hidden', 'true'); b.appendChild(d); } b.classList.add('glow2'); b.title = 'Needs you: ' + why.join('; ') + '.'; }
  else { if (d) d.remove(); b.classList.remove('glow2'); b.title = ''; }
}
function renderMapPhase(w) {
  $('w-tabs').classList.remove('hidden');
  const view = S.view === 'village' ? 'village' : S.view === 'relics' ? 'relics' : 'map';
  $('tab-village').classList.toggle('on', view === 'village'); $('tab-map').classList.toggle('on', view === 'map'); $('tab-relics').classList.toggle('on', view === 'relics');
  tabDot('tab-map', view === 'map' ? [] : mapNeedsYou(w)); tabDot('tab-village', view === 'village' ? [] : settlementNeedsYou(w)); tabDot('tab-relics', view === 'relics' ? [] : relicsNeedYou(w));
  $('v-village').classList.toggle('hidden', view !== 'village'); $('v-map').classList.toggle('hidden', view !== 'map'); $('m-panel').classList.toggle('hidden', view !== 'map'); $('v-relics').classList.toggle('hidden', view !== 'relics');
  $('m-regions').classList.toggle('hidden', view !== 'map' || !Object.keys(w.m.tiles).length);
  document.body.classList.toggle('view-map', view === 'map'); document.body.classList.toggle('view-relics', view === 'relics');   // v1r: no journal beside the relics
  if (view === 'village') { renderMapSettlement(w); renderMapSnails(w); }
  else if (view === 'relics') renderRelicsTab(w);
  else { const now = Date.now(); if (now - MV.lastMap > 250) { MV.lastMap = now; renderMap(w); } }
  // the rebirth branch: a rebirth reached while away (or before a reload) asks once the player is back and nothing else is open
  if (MC.D.rb.on && w.m.rbReady && !MV.rbAsked && !S.inPerks && $('away').classList.contains('hidden') && $('moment').classList.contains('hidden')) { MV.rbAsked = true; setTimeout(askScatter, 300); }
  { const showP = MC.D.rb.on ? !!(w.m.rbAt || w.m.rbReady) : canScatter(w); $('w-scatter').classList.toggle('hidden', !showP); if (showP) scatterPill(w); }
  $('w-merch').classList.toggle('hidden', !MC.merchantHere(w)); if (MC.merchantHere(w)) $('w-merch').textContent = MT.merchPill;
  $('w-naming').classList.toggle('hidden', !(w.flags.askName && !w.name));
  renderMapDrawer(w);
}
function renderMapSnails(w) {
  let any = false; for (const l of VC.LADDERS) { if (l.group !== 'snails' || !VC.ladderOpen(w, l)) continue; any = true;
    const id = 'w-b-' + l.id, n = w.lv[l.id] || 0, maxed = VC.ladderMaxed(w, l), b = ensureBtn($('w-snails'), id, () => mLevel(l.id)); const c = VC.ladderCost(w, l);
    b.classList.toggle('done', maxed); setBtn(b, l.name + (n ? ' (' + n + ')' : ''), ladderDesc(l), !maxed && VC.canPay(w, c), maxed ? { kind: 'upgrade', note: tx('w.maxed', { n: l.max }) } : { kind: 'upgrade', cost: c }); }
  $('h-snails').classList.toggle('hidden', !any);
}

