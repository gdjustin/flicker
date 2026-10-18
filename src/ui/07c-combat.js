/* =====================================================================
   COMBAT (phase 2), the first test build (branch combat-test, 2026-10-18)
   Rules: src/rules/combat-map.js (the battle module and the 23 families) and src/rules/combat-core.js (the spine), the files the
   Flicker Lab's bot plays. This part shows them and takes clicks. The look follows the previous branch's map combat prototype
   (owner, 2026-10-17): battles live on a place's card (won ones by name, the next with its readouts and Attack, the rest ???),
   pips on the map, the bars under the resources; raids and leading the charge as decided this session. Combat is managed from
   its own tab, never the village (owner). Defense, not war, in every word the player reads (owner).
   ===================================================================== */
const CMX = CMAP(MC), CB = CPHASE(MC, CMX);
const CPU = 100;   // combat power is shown ×100 (the rules' first companies are 0.27; the player sees 27)
function fmtCP(v) { const x = v * CPU; return x < 10 ? fmtW(Math.floor(x * 10) / 10, 1) : fmtC(x); }
const CT = {   // combat's text, in one place for the text editor (placeholders the owner will rewrite)
  tab: 'Defense',
  openH: 'Something fights back', open1: 'The land you just called back was not empty. Something waited in the dark beyond it, and it does not want the light to come.',
  open2: 'In the rubble your people find two lumps of iron. Enough to open a mine, and two of your people go down it. Enough to begin.', open3: 'The Defense tab shows what holds each place you have called back, and how strong it is.', openOk: 'To the defense',
  barCP: 'Combat power', barRes: 'Reserves', resolveIs: 'Resolve: ready in {t}', resolveRate: '+{n} combat power an hour',
  iron: 'Iron', ironRate: '+{n}/h', noMiners: 'no miners',
  attack: 'Attack', attackSub: 'Commit {n} combat power against their {d}.', leadH: 'Lead the charge', leadSub: 'You join this battle yourself: strength ×{x}. Again in {t}.',
  leadWait: 'You can lead a charge again in {t}.', won: 'won', next: 'Next', unknown: '???',
  raid: 'Raid it', raidSub: 'Spend {n} of your Reserves: study of the {fam} (+{s}) and a chance at its relic.', raidNo: 'Needs {n} Reserves.',
  std: 'Raise a standard', stdSub: 'Marks it as made safe: all light +{pct}%. Costs {cost}.',
  rally: 'Rally', rallySub: 'A feast for your defenders: Resolve ×{x} for {h} hours. Costs {food} food. Then {cd} hours before the next.',
  rallyOn: 'Rallying: {t} left', rallyWait: 'Rally again in {t}',
  winMsg: 'Won against {name} ({i} of {n}).', loseMsg: 'Driven back by {name}. Lost {lost} combat power.', clearMsg: '{place} is safe: {bs} bloodstone{s} to remember.', clearOld: '{place} is safe again.',
  relicMsg: 'A relic of battle from {place}: {land}.', raidMsg: 'Raided {place}: +{s} study of the {fam}.', stdMsg: 'A standard rises over {place}.'
};
const LINE = {   // the combat lines on the Defense tab: name, what it does (fn of w, C, life)
  mine: ['Deepen the iron mine', (w, C, L) => 'Room for one more miner and each miner digs ×' + CB.P.mine.depthX + ' more. Now ' + CB.mineSlots(C) + ' places, ' + fmtW(CB.ironPerMinerH(C), 2) + ' iron an hour a miner.', 'building'],
  barracks: ['Barracks', (w, C, L) => 'Recruit another company: combat power +' + Math.round(CB.P.barracks.a * 100) + '% of the base a level (×' + fmtW(CB.recruitF(C), 2) + ' now).', 'building'],
  armory: ['Armory', (w, C, L) => { const A = CB.P.armory, ap = CB.armPrice(C, L); return ap.up ? 'Forge a new tier: each level of the next tier arms ×' + A.J + ' better. The Forge wing takes wood and stone.' : 'Arm your companies better: tier ' + C.tier.armory + ', level ' + C.lv.armory + ' of ' + CB.armL(L) + ' (×' + fmtW(CB.armF(C), 2) + ' combat power now).'; }, 'building'],
  drill: ['Drill yards', (w, C, L) => 'Room for ' + CB.P.drill.slotsLv + ' more drillmasters. Drillmasters cut the time your bar takes to refill (now ' + fmtTime(CB.fillH(C, L) * 3600) + ', never under ' + CB.P.drill.floorH + ' h).', 'building'],
  reserves: ['Storehouses of resolve', (w, C, L) => 'Reserves hold +' + CB.P.reserves.perLv + ' bar of combat power more, so less is lost while you are away.', 'upgrade'],
  rally: ['Feast hall', (w, C, L) => C.lv.rally ? 'Rallies lift Resolve ×' + fmtW(CB.rallyX(C) + CB.P.rally.xLv, 2) + ' (×' + fmtW(CB.rallyX(C), 2) + ' now).' : 'Opens the Rally: a feast that speeds Resolve for a while.', 'building'],
  avatar: ['Your own blade', (w, C, L) => 'You can lead a charge every ' + fmtTime(Math.max(CB.P.avatar.minH, CB.P.avatar.cooldownH * Math.pow(CB.P.avatar.cutLv, C.lv.avatar + 1)) * 3600) + ' (now every ' + fmtTime(CB.avatarCd(C) * 3600) + ').', 'upgrade'],
  healers: ['Healers', (w, C, L) => 'Fewer losses in every battle: losses ×' + fmtW(CB.healF(C), 2) + ' now.', 'building'],
  scouts: ['Scouts', (w, C, L) => 'Battles swing less: the dice ×' + fmtW(CB.scoutF(C), 2) + ' as wide now.', 'building'],
  council: ['Council table', (w, C, L) => 'Formations: choose to overwhelm (strength ×' + fmtW(1.25 * CB.councilF(C), 2) + ', bloodier), stand steady, or go carefully (gentler).', 'building']
};
const FAMN = {}; CMX.families().forEach(f => { FAMN[f.id] = f.name; });
function cLife() { const m = meta(); if (!m.combat) m.combat = CB.newLife(); const L = m.combat; L.perks = L.perks || {}; return L; }
function cRun(w) { w = w || W(); return w && w.m && w.c && w.c.open ? w.c : null; }
function cOpened() { return !!(S.meta && S.meta.combat && S.meta.combat.opened); }
const CMV = { frac: 1, form: 'steady', lead: false, rng: null };
function cRng() { if (!CMV.rng) { let a = (Date.now() ^ 0x5bd1e995) >>> 0; CMV.rng = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } return CMV.rng; }

/* ---------- Light's gifts from combat: the iron buffs on the fires, standards and the flat bonus (lab rules) ---------- */
const LIGHT0 = { src: JSON.parse(JSON.stringify(MC.D.src)), boost: MC.D.boost.light || 0 };
function cLightApply(w) {
  const C = cRun(w); if (!C) { MC.D.src = JSON.parse(JSON.stringify(LIGHT0.src)); MC.D.boost.light = LIGHT0.boost; return; }
  const g = CB.lightGifts(C, cLife()); MC.D.src.burners = LIGHT0.src.burners * g.burners; MC.D.src.keepers = LIGHT0.src.keepers * g.keepers; MC.D.boost.light = (1 + LIGHT0.boost) * g.all - 1;
}

/* ---------- the tick: the unlock (placeholder: place 112 claimed, 2 iron), then Resolve, iron and the bars ---------- */
function combatTick(dt, away) {
  const w = W(); if (!w || !w.m) return; const L = cLife();
  if (!L.opened && w.m.restored >= CB.P.unlock.places) { L.opened = true; L.openDay = (S.playTime || 0) / 86400; w.c = CB.newRun(L, meta().run); cFirstMiners(w); wsay(CT.openH + '. ' + CT.open2); if (!away) showCombatOpen(); }
  if (L.opened && !w.c) w.c = CB.newRun(L, meta().run);
  const C = cRun(w); if (!C) return;
  CB.syncJobs(w, C); CB.tick(w, dt, away, C, L); cLightApply(w);
}
// the first time combat opens, two settlers go down the mine (idle ones first, then from the busiest job), so iron starts at once
function cFirstMiners(w) {
  const C = w.c, want = CB.mineSlots(C) - (w.jobs.miner || 0); let n = 0;
  for (let i = 0; i < want; i++) { if (VC.jobsTotal(w) >= w.pop) { const big = Object.keys(w.jobs).filter(j => j !== 'miner' && j !== 'drillmaster').sort((a, b) => (w.jobs[b] || 0) - (w.jobs[a] || 0))[0]; if (!big || !(w.jobs[big] > 0)) break; w.jobs[big]--; }
    w.jobs.miner = (w.jobs.miner || 0) + 1; n++; }
  if (n) CB.syncJobs(w, C); return n;
}
function showCombatOpen() {
  $('moment-h').textContent = CT.openH; const body = $('moment-body'); body.innerHTML = '';
  [CT.open1, CT.open2, CT.open3].forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  $('moment-ok').textContent = CT.openOk; $('moment').dataset.kind = 'combat'; $('moment').classList.remove('hidden');
}

/* ---------- the bars under the resources ---------- */
function renderCombatRes(w) {
  let box = $('c-res'); const C = cRun(w);
  if (!C) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'c-res'; box.className = 'cres'; $('w-res').after(box); }
  const L = cLife(), cap = CB.cap(C, L), rc = CB.resCap(C, L), fill = CB.fillH(C, L), rate = CB.resolveH(C, L);
  const ir = CB.ironH(C), sig = [fmtCP(C.cp), fmtCP(cap), fmtCP(C.res), fmtCP(rc), Math.round(fill * 10), fmtW(C.iron, 1), fmtW(ir, 1), C.hr < C.rallyEnd].join('|');
  if (box.dataset.s === sig) return; box.dataset.s = sig;
  const pc = (a, b) => (b > 0 ? Math.min(100, a / b * 100) : 0).toFixed(1);
  box.innerHTML = '<div class="rrow"><span class="rn">' + CT.iron + '</span><span class="rv">' + fmtW(Math.floor(C.iron)) + '</span><span class="rr">' + (ir > 0 ? fill2(CT.ironRate, { n: fmtW(ir, ir < 10 ? 1 : 0) }) : CT.noMiners) + '</span></div>' +
    '<div class="cbar"><p><span>' + CT.barCP + '</span><b>' + fmtCP(C.cp) + ' / ' + fmtCP(cap) + '</b></p><div class="st-bar"><i style="width:' + pc(C.cp, cap) + '%"></i></div></div>' +
    '<div class="cbar res"><p><span>' + CT.barRes + '</span><b>' + fmtCP(C.res) + ' / ' + fmtCP(rc) + '</b></p><div class="st-bar"><i style="width:' + pc(C.res, rc) + '%"></i></div></div>' +
    '<p class="cfill">' + fill2(CT.resolveIs, { t: fmtTime(fill * 3600) }) + (C.hr < C.rallyEnd ? ' · rallying' : '') + '<br><span>' + fill2(CT.resolveRate, { n: fmtCP(rate) }) + '</span></p>';
}
function fill2(t, v) { return t.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : ''); }

/* ---------- a place's card: its battles at the top (owner: as the previous branch) ---------- */
function combatSig(w, k) { const C = cRun(w); if (!C || !k) return ''; return [C.bdone[k] || 0, !!C.cleared[k], fmtCP(C.cp), fmtCP(C.res), CMV.frac, CMV.form, CMV.lead, CB.avatarReady(C), (cLife().stds || {})[k] ? 1 : 0, C.lv.council].join(':'); }
function combatCard(w, k, box) {
  const C = cRun(w), c = CB.byKey(k); if (!C || !c || !w.m.tiles[k]) return; const L = cLife();
  const sec = document.createElement('div'); sec.className = 'cbattle'; box.appendChild(sec);
  const add = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; sec.appendChild(e); return e; };
  const done = C.bdone[k] || 0, n = c.nb + (C.extra[k] || 0), names = CMX.families().find(f => f.id === c.fam).names, cleared = !!C.cleared[k];
  add('p', 'msec', cleared ? 'Made safe' : 'Held by ' + c.famName.toLowerCase());
  const list = add('ol', 'cbl');
  for (let i = 0; i < n; i++) { const li = document.createElement('li');
    const nm = i === c.nb - 1 ? c.name : (i < c.nb - 1 ? names[Math.max(0, Math.min(3, c.band - 1))] : 'Stragglers');
    if (i < done || cleared) { li.className = 'won'; li.textContent = nm + ' · ' + CT.won; } else if (i === done) { li.className = 'nx'; li.textContent = CT.next + ': ' + nm + (i === c.nb - 1 && c.nb > 1 ? ' (its strongest)' : ''); } else { li.className = 'unk'; li.textContent = CT.unknown; }
    list.appendChild(li); }
  if (!cleared) {
    const pv = CB.preview(w, C, L, k, { frac: CMV.frac, form: CMV.form, avatar: CMV.lead }), pc = Math.round(pv.pwin * 100);
    const r = add('div', 'cread');
    r.innerHTML = '<span><b>' + fmtCP(pv.S) + '</b> your strength</span><span><b>' + fmtCP(pv.D) + '</b> theirs</span><span class="' + (pv.sure ? 'ok' : pv.none ? 'bad' : '') + '"><b>' + (pv.sure ? 'sure' : pv.none ? 'no' : pc + '%') + '</b> to win</span>' +
      '<span><b>' + fmtCP(pv.lossWin) + '</b> lost if you win · <b>' + fmtCP(pv.lossLose) + '</b> if not</span>';
    const tr = add('p', 'ctrait', CMX.TRAITS[c.trait] + ' ' + CMX.DANGER_NAME[c.danger] + ' danger, ' + CMX.DICE_NAME[c.dice] + ' swings (' + LANDN[c.land].toLowerCase() + ').');
    const seg = add('div', 'cseg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'How much to commit');
    [[1, 'All'], [0.75, '¾'], [0.5, '½'], [0.25, '¼']].forEach(([f, lab]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.setAttribute('aria-pressed', CMV.frac === f ? 'true' : 'false'); b.addEventListener('click', () => { CMV.frac = f; renderWorld(); }); seg.appendChild(b); });
    if (C.lv.council) { const fs = add('div', 'cseg'); fs.setAttribute('aria-label', 'Formation');
      [['overwhelm', 'Overwhelm'], ['steady', 'Steady'], ['cautious', 'Carefully']].forEach(([f, lab]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.setAttribute('aria-pressed', CMV.form === f ? 'true' : 'false'); b.addEventListener('click', () => { CMV.form = f; renderWorld(); }); fs.appendChild(b); }); }
    if (CB.avatarReady(C)) { const lb = add('label', 'clead'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = CMV.lead; cb.addEventListener('change', () => { CMV.lead = cb.checked; renderWorld(); }); lb.append(cb, ' ' + fill2(CT.leadSub, { x: fmtW(1 + CB.P.avatar.edge, 1), t: fmtTime(CB.avatarCd(C) * 3600) }).replace(/^You join/, CT.leadH + ': you join')); }
    else add('p', 'mmut', fill2(CT.leadWait, { t: fmtTime(Math.max(0, C.avatarNext - C.hr) * 3600) }));
    const acts = add('div', 'mpacts'), b = document.createElement('button'); b.type = 'button'; b.className = 'act primary'; acts.appendChild(b);
    setBtn(b, CT.attack, fill2(CT.attackSub, { n: fmtCP(C.cp * CMV.frac), d: fmtCP(pv.D) }), C.cp > 1e-9 && !pv.none, {}); b.addEventListener('click', () => cAttack(k));
  } else {
    const acts = add('div', 'mpacts');
    if (C.newly[k] && !(L.stds || {})[k]) { const sc = CB.stdCost(L), b = document.createElement('button'); b.type = 'button'; b.className = 'act'; acts.appendChild(b);
      setBtn(b, CT.std, fill2(CT.stdSub, { pct: fmtW(CB.P.standard.x * 100, 1), cost: costList(sc) }), CB.canStd(w, C, L), {}); b.addEventListener('click', () => cStd(k)); }
    const rc = CB.raidCost(C, L), b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'act'; acts.appendChild(b2);
    setBtn(b2, CT.raid, C.res >= rc ? fill2(CT.raidSub, { n: fmtCP(rc), fam: c.famName.toLowerCase(), s: CB.P.raid.study }) + (L.relics[k] ? ' Its relic is already yours.' : '') : fill2(CT.raidNo, { n: fmtCP(rc) }), C.res >= rc, {}); b2.addEventListener('click', () => cRaid(k));
  }
  if (L.relics[k]) add('p', 'mmut', 'Its relic of battle is yours (' + LANDN[L.relics[k]].toLowerCase() + ').');
  else if (L.ever[k] == null) add('p', 'mmut', 'Its first battles may turn up a relic of battle (raids too).');
  if (L.ever[k] == null) add('p', 'mmut', 'Made safe for the first time: ' + fmtW(c.bs) + ' bloodstone' + (c.bs === 1 ? '' : 's') + '.'); else if (!cleared) add('p', 'mmut', 'Made safe before: it fights weaker now (veterans remember).');
}

/* ---------- actions ---------- */
function cAttack(k) {
  const w = W(), C = cRun(w), L = cLife(); if (!C) return; const c = CB.byKey(k);
  const out = CB.attack(w, C, L, k, { frac: CMV.frac, form: CMV.form, avatar: CMV.lead }, cRng()); if (!out) return;
  if (out.win) { sys(fill2(CT.winMsg, { name: c.name, i: out.i + 1, n: out.n })); MV.floats = MV.floats || []; MV.floats.push([k, out.cleared ? 'made safe' : 'won']); }
  else sys(fill2(CT.loseMsg, { name: c.name, lost: fmtCP(out.lost) }));
  if (out.cleared) wsay(out.bs ? fill2(CT.clearMsg, { place: shortName(tileOf(k)), bs: fmtW(out.bs), s: out.bs === 1 ? '' : 's' }) : fill2(CT.clearOld, { place: shortName(tileOf(k)) }));
  if (out.relic) wsay(fill2(CT.relicMsg, { place: shortName(tileOf(k)), land: LANDN[c.land].toLowerCase() }));
  CMV.lead = false; MV.lastMap = 0; renderWorld(); save(true);
}
function cRaid(k) { const w = W(), C = cRun(w), L = cLife(), c = CB.byKey(k); const r = CB.raidAt(w, C, L, k, cRng()); if (!r) return; sys(fill2(CT.raidMsg, { place: shortName(tileOf(k)), s: r.study, fam: c.famName.toLowerCase() })); if (r.relic) wsay(fill2(CT.relicMsg, { place: shortName(tileOf(k)), land: LANDN[c.land].toLowerCase() })); renderWorld(); }
function cStd(k) { const w = W(), C = cRun(w), L = cLife(); if (CB.raiseStd(w, C, L, k)) { sys(fill2(CT.stdMsg, { place: shortName(tileOf(k)) })); cLightApply(w); renderWorld(); } }
function cRally() { const w = W(), C = cRun(w); if (CB.rallyNow(w, C, cLife())) { sys('Your defenders feast. Resolve ×' + fmtW(CB.rallyX(C), 2) + ' for ' + CB.P.rally.hours + ' hours.'); renderWorld(); } }
function cBuy(id) { const w = W(), C = cRun(w); if (CB.buyLine(w, C, cLife(), id)) { renderWorld(); } }
function cOneOff(id) { const w = W(), C = cRun(w); if (CB.buyOneOff(w, C, cLife(), id)) { const x = CB.P.oneOffs.find(o => o.id === id); sys(x.name + ' are forged: ' + oneOffWhat(x) + '.'); cLightApply(w); renderWorld(); } }
function oneOffWhat(x) { return x.src === 'all' ? 'all light ×' + x.x : x.src === 'burners' ? 'what rebuilds add to burners ×' + x.x : 'what fire-tending adds to firekeepers ×' + x.x; }
function cJob(id, d, e) {
  const w = W(), C = cRun(w); if (!C) return; const n = w.jobs[id] || 0, slots = id === 'miner' ? CB.mineSlots(C) : CB.drillSlots(C);
  let k = 1; if (e) { if (e.ctrlKey || e.metaKey) k = Infinity; else if (e.shiftKey) k = 5; }
  if (d > 0) { k = Math.min(k, w.pop - VC.jobsTotal(w), slots - n); if (k <= 0) return; w.jobs[id] = n + k; } else { k = Math.min(k, n); if (k <= 0) return; w.jobs[id] = n - k; }
  CB.syncJobs(w, C); renderWorld();
}

/* ---------- the settlers: miners and drillmasters (settler jobs, up to their places) ---------- */
function renderCombatJobs(w, jb) {
  const C = cRun(w); ['miner', 'drillmaster'].forEach(id => { const row = $('job-' + id); if (!C && row) row.remove(); }); if (!C) return;
  [['miner', 'Miner', 'iron', 'Digs iron at the mine. The mine has room for ' + CB.mineSlots(C) + '; deepen it for more.', CB.mineSlots(C)],
    ['drillmaster', 'Drillmaster', 'faster Resolve', 'Drills your defenders, so the bar refills faster. More are needed as your combat power grows. Room for ' + CB.drillSlots(C) + '.', CB.drillSlots(C)]].forEach(([id, name, tag, desc, slots]) => {
    let row = $('job-' + id);
    if (!row) { row = document.createElement('div'); row.id = 'job-' + id; row.className = 'jrow reveal'; row.tabIndex = 0;
      row.innerHTML = '<span class="jn"></span><span class="jt"></span><button class="jb" aria-label="Remove one">−</button><span class="jc"></span><button class="jb" aria-label="Add one">+</button>';
      row.children[2].addEventListener('click', e => cJob(id, -1, e)); row.children[4].addEventListener('click', e => cJob(id, 1, e));
      ['mouseenter', 'focus'].forEach(ev => row.addEventListener(ev, () => showTextTip(row, name, [desc]))); ['mouseleave', 'blur'].forEach(ev => row.addEventListener(ev, hideTip)); jb.appendChild(row); }
    row.children[0].textContent = name; row.children[1].textContent = tag + ' · room for ' + slots; row.children[3].textContent = w.jobs[id] || 0;
    row.children[2].disabled = !(w.jobs[id] > 0); row.children[4].disabled = VC.jobsTotal(w) >= w.pop || (w.jobs[id] || 0) >= slots;
  });
}

/* ---------- the Defense tab ---------- */
function renderDefenseTab(w) {
  const box = $('v-defense'), C = cRun(w), L = cLife();
  if (!C) { box.innerHTML = '<p class="mmut">Nothing fights back yet.</p>'; return; }
  if (!$('cd-muster')) box.innerHTML = '<div class="cdcols"><div><p class="sech">Your defenders</p><div id="cd-muster"></div><p class="sech">The battle front</p><div id="cd-front" class="cfront"></div></div>' +
    '<div><div id="cd-make" class="bgroups"></div><p class="sech">For the light</p><div class="acts" id="cd-light"></div><p class="sech">Bestiary</p><div id="cd-beast"></div></div></div>';
  // the muster: the bars, Rally, the avatar
  { const m = $('cd-muster'), cap = CB.cap(C, L), parts = CB.capParts(C, L), acts = [];
    const sig = [fmtCP(C.cp), fmtCP(cap), fmtCP(C.res), C.lv.rally, Math.floor(C.hr * 6), C.rallies].join('|');
    if (m.dataset.s !== sig) { m.dataset.s = sig;
      m.innerHTML = '<p class="cline">Combat power <b>' + fmtCP(C.cp) + '</b> of <b>' + fmtCP(cap) + '</b> · Reserves <b>' + fmtCP(C.res) + '</b> of ' + fmtCP(CB.resCap(C, L)) + '</p>' +
        '<p class="cline">' + fill2(CT.resolveIs, { t: fmtTime(CB.fillH(C, L) * 3600) }) + ' (' + (w.jobs.drillmaster || 0) + ' drillmasters; ' + fmtW(CB.drillNeed(C, L), 1) + ' would halve the wait above ' + CB.P.drill.floorH + ' h)</p>' +
        '<p class="cline">Your strength comes from: ' + (parts.filter(p => p[1] > 0.004).map(p => p[0].replace(' (recruit)', '').replace(' (arm)', '') + ' ×' + fmtW(Math.pow(10, p[1]), 2)).join(', ') || 'your first companies alone') + '.</p>' +
        '<p class="cline">' + (CB.avatarReady(C) ? 'You can lead a charge now.' : fill2(CT.leadWait, { t: fmtTime(Math.max(0, C.avatarNext - C.hr) * 3600) })) + '</p><div class="acts" id="cd-rally"></div>'; }
    if (C.lv.rally) { const rb = ensureBtn($('cd-rally'), 'cd-rallyb', cRally, 'primary');
      if (C.hr < C.rallyEnd) setBtn(rb, CT.rally, fill2(CT.rallyOn, { t: fmtTime((C.rallyEnd - C.hr) * 3600) }), false, {});
      else if (C.hr < C.rallyNext) setBtn(rb, CT.rally, fill2(CT.rallyWait, { t: fmtTime((C.rallyNext - C.hr) * 3600) }), false, {});
      else setBtn(rb, CT.rally, fill2(CT.rallySub, { x: fmtW(CB.rallyX(C), 2), h: CB.P.rally.hours, food: fmtC(CB.rallyFood(w)), cd: CB.P.rally.cooldownH }), CB.have(C, 'food', w) >= CB.rallyFood(w), {}); } }
  // the battle front: places called back that are not yet safe, the weakest first (owner, Considering: a list ranked by strength)
  { const fr = CB.frontier(C, w).slice(0, 10), f = $('cd-front'), sig = fr.map(c => c.key + ':' + (C.bdone[c.key] || 0)).join(',') + '|' + fmtCP(C.cp);
    if (f.dataset.s !== sig) { f.dataset.s = sig; f.innerHTML = '';
      if (!fr.length) f.innerHTML = '<p class="mmut">Every place you have called back is safe. Call back more.</p>';
      fr.forEach(c => { const pv = CB.preview(w, C, L, c.key, { frac: 1 }), b = document.createElement('button'); b.type = 'button'; b.className = 'crow';
        b.innerHTML = '<span class="cn">' + shortName(tileOf(c.key)) + '</span><span class="cf">' + c.famName + ' · ' + ((C.bdone[c.key] || 0) + 1) + ' of ' + (c.nb + (C.extra[c.key] || 0)) + '</span><span class="cs">' + fmtCP(pv.D) + '</span><span class="cp ' + (pv.sure ? 'ok' : pv.none ? 'bad' : '') + '">' + (pv.sure ? 'sure' : pv.none ? 'too strong' : Math.round(pv.pwin * 100) + '%') + '</span>';
        b.addEventListener('click', () => { MV.sel = c.key; S.view = 'map'; MV.lastMap = 0; renderWorld(); }); f.appendChild(b); }); } }
  // buildings and lines
  const opts = CB.options(w, C, L), byId = {}; opts.forEach(o => { byId[o.id] = o; });
  const groups = { building: 'Buildings', upgrade: 'Upgrades' }, make = $('cd-make');
  Object.keys(LINE).forEach(id => { const o = byId[id], bid = 'cd-b-' + id;
    if (!o) { if ($(bid)) $(bid).remove(); return; }
    const gid = 'cd-g-' + LINE[id][2]; let g = $(gid); if (!g) { g = document.createElement('div'); g.className = 'bgroup'; g.id = gid; g.innerHTML = '<p class="bgh">' + groups[LINE[id][2]] + '</p><div class="acts"></div>'; make.appendChild(g); }
    const b = ensureBtn(g.querySelector('.acts'), bid, () => cBuy(id)), lv = id === 'armory' ? C.tier.armory + '/' + C.lv.armory : C.lv[id];
    setBtn(b, LINE[id][0] + (lv ? ' (' + lv + ')' : ''), LINE[id][1](w, C, L), CB.canBuy(w, C, L, id), { kind: LINE[id][2], cost: o.cost }); });
  // for the light: iron buffs, standards
  { const lb = $('cd-light'), open = CB.oneOffsOpen(C, L), want = new Set(open.map(x => 'cd-o-' + x.id)), std = CB.stdOpen(C, L);
    Array.from(lb.children).forEach(b => { if (b.id && b.id.indexOf('cd-o-') === 0 && !want.has(b.id)) b.remove(); });
    open.forEach(x => { const b = ensureBtn(lb, 'cd-o-' + x.id, () => cOneOff(x.id)); setBtn(b, x.name, 'Iron for the fires: ' + oneOffWhat(x) + '. This run only.', C.iron >= x.iron, { kind: 'upgrade', cost: { iron: x.iron } }); });
    const sb = $('cd-stdall'); if (std.length) { const b = ensureBtn(lb, 'cd-stdall', () => { const ww = W(); CB.stdOpen(cRun(ww), cLife()).forEach(k => cStd(k)); });
      setBtn(b, 'Raise standards (' + std.length + ' waiting)', 'Each marks a place made safe: all light +' + fmtW(CB.P.standard.x * 100, 1) + '%, kept through rebirths. ' + cLife().stdN + ' raised so far.', CB.canStd(w, C, L), { kind: 'building', cost: CB.stdCost(L) }); } else if (sb) sb.remove();
    if (!lb.children.length) lb.innerHTML = '<p class="mmut">Iron buffs open as you make more places safe.</p>'; else { const pn = lb.querySelector('p.mmut'); if (pn) pn.remove(); } }
  // the Bestiary
  { const bx = $('cd-beast'), fams = Object.keys(CB.famCount).filter(f => (L.beast[f] || 0) > 0).sort((a, b) => (L.beast[b] || 0) - (L.beast[a] || 0)), sig = 'b|' + fams.map(f => f + L.beast[f]).join(',');
    if (bx.dataset.s !== sig) { bx.dataset.s = sig;
      bx.innerHTML = fams.length ? '<table class="cbeast"><thead><tr><th>Family</th><th>How common</th><th>Studied</th><th>Stage</th><th>Edge</th></tr></thead><tbody>' + fams.map(f => { const st = CB.beastStages(L, f); let th = CB.P.bestiary.first[CB.tierOf(f)]; for (let i = 0; i < st; i++) th *= CB.P.bestiary.g;
        return '<tr><td>' + FAMN[f] + '</td><td>' + CB.tierOf(f) + '</td><td>' + fmtW(L.beast[f]) + ' / ' + fmtW(Math.ceil(th)) + '</td><td>' + st + '</td><td>×' + fmtW(CB.beastEdge(L, f), 2) + '</td></tr>'; }).join('') + '</tbody></table><p class="mmut">Each battle won and each raid teaches you more of a family. Each stage is ×' + fmtW(1 + CB.P.bestiary.edge, 1) + ' in its battles, for good. Healers, scouts and the council table open as stages add up (' + CB.beastTotal(L) + ' so far).</p>'
        : '<p class="mmut">Win a battle to begin learning its family.</p>'; } }
}

/* ---------- map marks: a bronze pip while a place is being fought, gold once safe; strength on places not yet fought ---------- */
function combatCellCls(w, k, cls) { const C = cRun(w); if (!C || !w.m.tiles[k]) return; if (C.cleared[k]) cls.push('csafe'); else if (C.bdone[k] > 0) cls.push('cfight'); else cls.push('cheld'); }
function combatCellLabel(w, k) { const C = cRun(w); if (!C || !w.m.tiles[k] || C.cleared[k]) return ''; const c = CB.byKey(k); if (!c) return ''; const cap = CB.cap(C, cLife()); if (c.power > cap * 30) return ''; return '⚔' + fmtShortCP(CB.nextBattle(c, C, cLife(), C.hr / 24).D * CPU); }
function fmtShortCP(v) { return v >= 1e9 ? fmtW(v / 1e9, 1) + 'B' : v >= 1e6 ? fmtW(v / 1e6, 1) + 'M' : v >= 1e3 ? fmtW(v / 1e3, 1) + 'k' : fmtW(v, v < 10 ? 1 : 0); }

/* ---------- rebirth: bloodstones bank, and their perks (the locked section of the screen opens) ---------- */
function cNewBs(w) { const C = cRun(w); return C ? C.made.bs : 0; }
function cFlatFor(bs) { return 1 + CB.P.bs.pct * Math.pow(bs, CB.P.bs.exp); }
const CPK_UI = { hardened: 'Combat power +' + Math.round(CB.perk('hardened').x * 100) + '% of the base a rank, from the first moment of every run', quick: 'Resolve +' + Math.round(CB.perk('quick').x * 100) + '% a rank',
  forgeLore: 'Each Armory tier holds one more level a rank', quarterm: 'Barracks prices climb ' + Math.round(CB.perk('quarterm').x * 100) + '% gentler a rank', drillLore: 'Fewer drillmasters needed for the same drill: ' + Math.round(CB.perk('drillLore').x * 100) + '% fewer a rank',
  keen: 'Relics of battle turn up ' + Math.round(CB.perk('keen').x * 100) + '% more often a rank', lore: 'Each relic of battle ' + Math.round(CB.perk('lore').x * 100) + '% stronger a rank', standing: 'Runs start with ' + CB.perk('standing').x + ' companies already recruited a rank', veterans: 'Places made safe before fight weaker again: the old ground ×' + CB.perk('veterans').x + ' more a rank' };
function combatPerkSection(m) {
  const L = cLife(); if (!L.opened) return null;
  const P = MV.prest; P.blv = P.blv || Object.assign({}, L.perks); const w = W(), add = cNewBs(w), pool = L.bs + add, spent = CB.perkSpent(P.blv), free = pool - spent;
  let h = '<section class="cur open"><div class="cur-strip"><span class="cur-name"><span class="hex" style="width:30px;height:27px;background:#b8484f"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" fill="none" stroke="#2a1010" stroke-width="2"/></svg></span><span><span class="cz cur-t">Defense</span><span class="cur-s">Bloodstones</span></span></span>' +
    '<span class="cur-mem"><span class="cur-l">Combat power, from bloodstones</span><span class="memx"><span class="was">×' + fmtW(cFlatFor(L.bs), 2) + '</span><span style="color:#f2b84b">→</span><span class="now">×' + fmtW(cFlatFor(pool), 2) + '</span></span></span>' +
    '<span class="cur-purse"><svg width="20" height="26" viewBox="0 0 12 16" aria-hidden="true"><path d="M6 0l6 7-6 9-6-9z" fill="#b8484f"></path></svg><span><b>' + fmtW(free) + '</b><span>of ' + fmtW(pool) + ' free</span></span></span><span></span></div>';
  h += '<div class="cur-body"><div class="cur-bar"><span>' + fmtW(add) + ' new bloodstones from this run: each place made safe for the first time pays as many as its heartstones did.</span><span><button type="button" class="pk-respec" data-brespec="1">Respec (free)</button></span></div><div class="pk-chips">';
  CB.P.perks.forEach(p => { const n = P.blv[p.id] || 0, max = p.max || 99, done = n >= max, price = done ? 0 : CB.perkCost(p, n), afford = !done && free >= price;
    h += '<button type="button" class="chip" data-bpick="' + p.id + '" title="' + (CPK_UI[p.id] || '') + '" style="color:#f1dede;border:1px solid ' + (n ? '#a5585e' : '#4a2c30') + ';background:' + (n ? '#3a1d22' : '#241417') + '"><span style="flex:1;font-size:12.5px;line-height:1.15">' + p.name + (n ? ' <span style="color:#e6a3a8">(' + n + ')</span>' : '') + '<br><span style="color:#b9a4a6;font-size:11.5px">' + (CPK_UI[p.id] || '') + '</span></span>' +
      (done ? '✓' : '<span style="font-size:12.5px;color:' + (afford ? '#ffd0d8' : '#8d7a7c') + '">' + fmtW(price) + '</span>') + '</button>'; });
  return h + '</div></div></section>';
}
function combatPerkClick(t) {
  const P = MV.prest; if (!P) return false; const L = cLife(), w = W();
  if (t.dataset.brespec) { P.blv = {}; renderPerks(); return true; }
  if (t.dataset.bpick) { const p = CB.perk(t.dataset.bpick), n = P.blv[p.id] || 0, free = L.bs + cNewBs(w) - CB.perkSpent(P.blv); if (n < (p.max || 99) && CB.perkCost(p, n) <= free) P.blv[p.id] = n + 1; renderPerks(); return true; }
  return false;
}
function combatCommit() { const w = W(), C = cRun(w), L = cLife(); if (!L.opened) return; if (C) CB.bank(C, L); if (MV.prest && MV.prest.blv) L.perks = Object.assign({}, MV.prest.blv); }

/* ---------- light's hover: what combat sends ---------- */
function combatLightLines(w) { const C = cRun(w); if (!C) return []; const g = CB.lightGifts(C, cLife()), out = [];
  if (g.std > 1.0001) out.push('Standards raised, ' + cLife().stdN + ': ×' + fmtW(g.std, 2)); if (g.buffs > 1.0001) out.push('Iron buffs on all light: ×' + fmtW(g.buffs, 2));
  if (g.burners > 1.0001) out.push('Iron buffs on what rebuilds add to burners: ×' + fmtW(g.burners, 2)); if (g.keepers > 1.0001) out.push('Iron buffs on what fire-tending adds to firekeepers: ×' + fmtW(g.keepers, 2));
  if (g.flat > 1.0001) out.push('Bloodstones: ×' + fmtW(g.flat, 2)); return out.length ? [{ t: 'From your defense:', cls: 'tipsep' }].concat(out) : []; }
