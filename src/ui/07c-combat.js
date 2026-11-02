/* =====================================================================
   COMBAT (phase 2), on the rebirth game (branch combat-r, 2026-10-31; first built on branch combat-test, 2026-10-18)
   Combat opens once the self is whole: the land wakes, a wolf pack is held off with light, a dormant mine gives 2 iron.
   Decided (owner, 2026-10-31): nothing resets after whole, combat included. Bloodstones come in as places are made safe for the
   first time, their flat bonus grows at once, and the traveler sells the bloodstone perks beside the heartstone ones.
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
  // the scripted opening (owner, 2026-10-31; placeholder words): whole → the land wakes → the wolf pack, held off with light → the dormant mine
  wakeH: 'Something has seen your light', wake1: 'The land wakes, and not all of it kindly. Things that slept in the void are stirring again.',   // owner, 2026-10-31
  wake2: 'Shadow-eyed wolves howl from the treeline; your village is under siege. You must use your light to drive them off.', wakeGo: 'Repel the howling wolves',
  threatLab: 'Your light holds them back', threatName: 'Repelling the wolf pack', threatLeft: 'about {t} left', threatDone: 'The wolves scatter.',
  openH: 'The wolves scatter', open0: 'You find the remains of an old iron mine, long dormant. Its mouth is choked with rubble.',   // owner, 2026-10-31 (revised)
  open2: 'Stray bits of loose iron lie around the entrance. You think it\u2019s just enough to get the mine working again.', open3: 'The Defense tab is now open: start with the mine; you\u2019ll need iron to arm your settlers.',
  mineMsg: 'The old iron mine is open again. Put settlers to work in it (Settlement).', armoryMsg: 'Your first company stands. The Armory can now be researched.', capMsg: 'Your first defenders muster. The battle front is open on the Defense tab, and the map shows what holds each place.', openOk: 'To the defense',
  barCP: 'Combat power', barRes: 'Reserves', resolveIs: 'Refills from empty in {t}', resolveFull: 'Full', resolveIn: 'Full in {t}', resolveRate: '+{n} combat power an hour',
  stdReadyMsg: 'Three places are safe. Your people could raise standards over them: a new research.',
  iron: 'Iron', ironRate: '+{n}/h', noMiners: 'no miners',
  attack: 'Attack', attackSub: 'Commit {n} combat power against their {d}.', leadH: 'Lead the charge', leadSub: 'You join this battle yourself: strength ×{x}. Again in {t}.',
  leadWait: 'You can lead a charge again in {t}.', won: 'won', next: 'Next', unknown: '???',
  raid: 'Raid it', raidSub: 'Spend {n} of your Reserves. You gain +{s} study of the {fam} ({study}){relic}', raidRelic: ' and a {p}% chance at its battle relic: all combat power +{cp}%, and +{edge}% in {land}.', raidSure: ' and its battle relic for certain this time: all combat power +{cp}%, and +{edge}% in {land}.', raidHave: '. Its battle relic is already yours.', raidNo: 'Needs {n} Reserves.',
  std: 'Raise a standard', stdSub: 'Haulers carry it out: all light +{pct}% once it stands. Costs {cost}.', stdQueued: 'Waiting for the haulers', stdQueuedSub: 'In the hauling queue: {n} standards waiting.',
  stdAll: 'Raise standards ({n} to raise)', stdAllSub: 'Queue them all for the haulers. Each one: all light +{pct}%, kept for good. {raised} raised so far.', stdPause: 'Take the standards off the queue', stdPauseSub: '{n} waiting. They keep what was carried; queue them again any time.',
  rally: 'Rally', rallySub: 'A feast for your defenders: Resolve ×{x} for {h} hours. Costs {food} food. Then {cd} hours before the next.',
  rallyOn: 'Rallying: {t} left', rallyWait: 'Rally again in {t}', rallyPill: 'Rally · {food} food', rallyPillOn: 'Rallying · {t}', rallyPillWait: 'Rally in {t}',
  raidH: 'Raids', raid1: 'You can now spend Reserves to raid a land you have made safe, for study of its foes and a chance to claim its battle relic.', raidOk: 'Understood',   // owner's copy said 'bonus resources': raids give none yet (flagged)
  winMsg: 'Won against {name} ({i} of {n}).', loseMsg: 'Driven back by {name}. Lost {lost} combat power.', clearMsg: '{place} is safe: {bs} bloodstone{s} to remember.', clearOld: '{place} is safe again.',
  relicMsg: 'A battle relic from {place}: {land}.', raidMsg: 'Raided {place}: +{s} study of the {fam}.', stdMsg: 'A standard rises over {place}.',
  // the traveler's first visit after combat opens (owner, 2026-10-31; placeholder words)
  travH: 'The traveler returns', trav1: 'He has heard about the wolves. He weighs your heartstones in his hand, shrugs, and sets them down again.',
  trav2: 'It is the bloodstones he is after now, the ones your defenders win making places safe for the first time. For those he will teach your defenders what he knows.', travGo: 'See what he offers',
  travMerchSub: 'He still knows the old gifts, but it is your bloodstones he wants now. What you buy works at once; the stones you earned since his last visit take hold when he goes on his way.',
  bankMsg: '{n} bloodstones take hold as the traveler leaves: combat power ×{x} from bloodstones.', travSec: 'For bloodstones', travSub: 'Each place made safe for the first time pays as many bloodstones as its heartstones did. What you buy works at once.'
};
const LINE = {   // the combat lines on the Defense tab: name, what it does (fn of w, C, life)
  mine: ['Deepen the iron mine', (w, C, L) => !C.lv.mine ? 'Clear the dormant mine and put it to work. Room for ' + CB.P.mine.slots0 + ' miners, ' + fmtW(CB.ironPerMinerH(C), 2) + ' iron an hour each.' : 'Room for one more miner and each miner digs ×' + CB.P.mine.depthX + ' more. Now ' + CB.mineSlots(C) + ' places, ' + fmtW(CB.ironPerMinerH(C), 2) + ' iron an hour a miner.', 'building'],
  ironStore: ['Iron store', (w, C, L) => 'Holds more iron: ' + fmtW(CB.P.ironStore.cap0 * Math.pow(CB.P.ironStore.x, C.lv.ironStore + 1)) + ' (now ' + fmtW(CB.ironCap(C)) + '). Iron dug past what you can hold is lost.', 'building'],
  barracks: ['Barracks', (w, C, L) => 'Recruit ' + (C.lv.barracks ? 'another company' : 'your first company') + ': combat power ×' + fmtW(CB.recruitAt(C.lv.barracks + 1) / CB.recruitAt(C.lv.barracks), 2) + (C.lv.barracks ? ' (×' + fmtW(CB.recruitF(C), 2) + ' now).' : '.'), 'building'],
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
function cLife() { const m = meta(); if (!m.combat) m.combat = CB.newLife(); const L = m.combat; L.perks = L.perks || {}; L.oneOffs = L.oneOffs || {}; L.runs = L.runs || 0; return L; }
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

/* ---------- the tick: the unlock (once the self is whole, 2 iron), then Resolve, iron and the bars ---------- */
function combatUnlocked(w) { return CB.P.unlock.whole ? !!(w.m.whole || meta().whole) : w.m.restored >= CB.P.unlock.places; }
function combatOpen(w, show) {
  const L = cLife(); if (L.opened) return; L.opened = true; L.openDay = (S.playTime || 0) / 86400; w.c = CB.newRun(L, (L.runs || 0) + 1); wsay(CT.openH + '. ' + CT.open2);
  if (show) showCombatOpen(); else L.openPending = true;
}
// the land wakes (after the whole moment): the wolf pack comes, and all light goes to holding it off (the rules' hold)
function combatWake(w) {
  const L = cLife(); if (L.opened || !w || !w.m) return;
  if (!L.threat) { L.threat = 'on'; MC.startHold(w, CB.P.threat); wsay(CT.wake2); }
  $('moment-h').textContent = CT.wakeH; const body = $('moment-body'); body.innerHTML = '';
  [CT.wake1, CT.wake2].forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  $('moment-ok').textContent = CT.wakeGo; $('moment').dataset.kind = 'wake'; momentPlain(); $('moment').classList.remove('hidden');
}
function combatTick(dt, away, ev) {
  const w = W(); if (!w || !w.m) return; const L = cLife();
  (ev || []).forEach(e => { if (e[0] === 'holdDone' && e[1] === CB.P.threat.id) { L.threat = 'done'; sys(CT.threatDone); combatOpen(w, !away); } });
  const calm = !away && $('moment').classList.contains('hidden') && !S.inPerks;
  if (!L.opened && combatUnlocked(w) && calm && L.threat !== 'on') combatWake(w);   // a save already whole (the whole moment leads here itself)
  if (L.threat === 'on' && !w.m.hold && !L.opened) MC.startHold(w, CB.P.threat);   // a save from before the hold
  if (L.openPending && calm) { L.openPending = false; showCombatOpen(); }
  if (w.m.standardsReady && !L.stdNoted && !w.m.cards.standards) { L.stdNoted = true; wsay(CT.stdReadyMsg); }
  combatTravelerCheck(w, calm);
  combatRaidCheck(w, calm);
  if (L.opened && !w.c) w.c = CB.newRun(L, (L.runs || 0) + 1);
  const C = cRun(w); if (!C) return;
  if (C.capOpen == null) C.capOpen = CB.cap(C, L) > 0;   // saves from v1s-c1: the cap was already open
  CB.fixRun(C); ['wood', 'stones', 'fiber', 'food', 'copper'].forEach(k => { if (!(w.res[k] >= 0)) w.res[k] = 0; });   // v1u-c16: mend the Iron store's NaN price (owner's playtest)
  CB.syncJobs(w, C); CB.tick(w, dt, away, C, L); cLightApply(w);
}
// the cap is open once the first Barracks or Armory level stands (owner, 2026-10-18: combat power, the battle front and the map's marks wait for it)
function cCapOpen(C) { return !!(C && C.capOpen); }
// lines and jobs the player has not met yet glow (owner: a dot on the iron mine, the Defense tab, the Settlers' new job)
function cNew(id) { const L = cLife(); L.bought = L.bought || {}; return !L.bought[id]; }
function cMarkBought(id) { const L = cLife(); L.bought = L.bought || {}; L.bought[id] = true; }
function defenseNeedsYou(w) { const C = cRun(w); if (!C) return []; const L = cLife(), why = [];
  if (CB.options(w, C, L).some(o => LINE[o.id] && !(L.seenLine || {})[o.id])) why.push('something new to build');
  if (cCapOpen(C) && !L.frontSeen) why.push('the battle front is open');
  return why; }
function combatSettlersNeedYou(w) { const C = cRun(w); if (!C) return []; const why = [];
  if (C.lv.mine && !(w.jobs.miner > 0)) why.push('no one works the iron mine');
  if (CB.drillSlots(C) > 0 && !(w.jobs.drillmaster > 0) && !cLife().drillSeen) why.push('drillmasters can train your defenders');
  return why; }
function showCombatOpen() {
  $('moment-h').textContent = CT.openH; const body = $('moment-body'); body.innerHTML = '';
  [CT.open0, CT.open2, CT.open3].forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  $('moment-ok').textContent = CT.openOk; $('moment').dataset.kind = 'combat'; $('moment').classList.remove('hidden');
}

/* ---------- the light strip while the wolf pack is held off: a red bar (owner) ---------- */
function combatStrip(w, L) {
  const H = w.m.hold, bar = $('vl-bar').parentNode; bar.classList.toggle('threat', !!H); $('w-vstrip').classList.toggle('threat', !!H); if (!H) return;
  $('vl-lab').textContent = CT.threatLab; $('vl-name').textContent = CT.threatName; $('vl-rate').textContent = tx('w.lrate', { n: fmtW(L, L < 100 ? 2 : 0) });
  const pe = $('vl-pct'); pe.dataset.s = ''; pe.textContent = ''; const bb = document.createElement('b'); bb.textContent = Math.floor(H.p * 100) + '%'; pe.append(bb, ' driven back');
  $('vl-left').textContent = fill2(CT.threatLeft, { t: fmtTime((1 - H.p) / Math.max(1e-9, MC.holdRate(w))) }); $('vl-bar').style.width = (H.p * 100).toFixed(2) + '%';
}

/* ---------- Rally as a pill beside the feast (owner, 2026-11-01) ---------- */
function renderRallyPill(w) {
  let pill = $('w-rally'); const C = cRun(w);
  if (!C || !C.lv.rally) { if (pill) pill.classList.add('hidden'); return; }
  if (!pill) { pill = document.createElement('span'); pill.id = 'w-rally'; pill.className = 'feastpill rallypill'; pill.innerHTML = '<button type="button" id="rl-btn"></button><i class="fbar" aria-hidden="true"><i id="rl-bar"></i></i>'; $('w-feast').after(pill); $('rl-btn').addEventListener('click', cRally); }
  pill.classList.remove('hidden'); const on = C.hr < C.rallyEnd, wait = !on && C.hr < C.rallyNext, b = $('rl-btn'); pill.classList.toggle('on', on);
  const t = on ? fill2(CT.rallyPillOn, { t: fmtTime((C.rallyEnd - C.hr) * 3600) }) : wait ? fill2(CT.rallyPillWait, { t: fmtTime((C.rallyNext - C.hr) * 3600) }) : fill2(CT.rallyPill, { food: fmtC(CB.rallyFood(w)) });
  if (b.textContent !== t) b.textContent = t; b.disabled = on || wait || CB.have(C, 'food', w) < CB.rallyFood(w);
  b.title = fill2(CT.rallySub, { x: fmtW(CB.rallyX(C), 2), h: CB.P.rally.hours, food: fmtC(CB.rallyFood(w)), cd: CB.P.rally.cooldownH });
  $('rl-bar').style.width = on ? ((C.rallyEnd - C.hr) / CB.P.rally.hours * 100).toFixed(1) + '%' : '0%';
}
// the first Storehouse opens raids: a short moment says so (owner, 2026-11-01)
function combatRaidCheck(w, calm) {
  const C = cRun(w), L = cLife(); if (!C || !C.lv.reserves || L.raidsTold || !calm) return;
  L.raidsTold = true; $('moment-h').textContent = CT.raidH; const body = $('moment-body'); body.innerHTML = '';
  const p = document.createElement('p'); p.textContent = CT.raid1; body.appendChild(p);
  $('moment-ok').textContent = CT.raidOk; $('moment').dataset.kind = ''; momentPlain(); $('moment').classList.remove('hidden');
}

/* ---------- the bars under the resources ---------- */
function renderCombatRes(w) {
  let box = $('c-res'); const C = cRun(w);
  if (!C) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'c-res'; box.className = 'cres'; $('w-res').after(box); }
  const L = cLife(), cap = CB.cap(C, L), rc = CB.resCap(C, L), fill = CB.fillH(C, L), rate = CB.resolveH(C, L), open = cCapOpen(C);
  const ir = CB.ironH(C), sig = [open, fmtCP(C.cp), fmtCP(cap), fmtCP(C.res), fmtCP(rc), Math.round(fill * 10), fmtW(C.iron, 1), fmtW(ir, 1), C.lv.mine, C.lv.ironStore, C.hr < C.rallyEnd].join('|');
  if (box.dataset.s === sig) return; box.dataset.s = sig;
  const pc = (a, b) => (b > 0 ? Math.min(100, a / b * 100) : 0).toFixed(1);
  let h = '<div class="rrow' + (C.iron >= CB.ironCap(C) - 1e-6 ? ' full' : '') + '"><span class="rn">' + CT.iron + '</span><span class="rv">' + fmtW(Math.floor(C.iron)) + ' <span class="cp">/' + fmtW(CB.ironCap(C)) + '</span></span><span class="rr">' + (ir > 0 ? fill2(CT.ironRate, { n: fmtW(ir, ir < 10 ? 1 : 0) }) : C.lv.mine ? CT.noMiners : '') + '</span></div>';
  if (open) {   // owner: no bars until the first Barracks or Armory; no Reserves until the first Storehouse
    h += '<div class="cbar"><p><span>' + CT.barCP + '</span><b>' + fmtCP(C.cp) + ' / ' + fmtCP(cap) + '</b></p><div class="st-bar"><i style="width:' + pc(C.cp, cap) + '%"></i></div></div>';
    if (rc > 0) h += '<div class="cbar res"><p><span>' + CT.barRes + '</span><b>' + fmtCP(C.res) + ' / ' + fmtCP(rc) + '</b></p><div class="st-bar"><i style="width:' + pc(C.res, rc) + '%"></i></div></div>';
    h += '<p class="cfill">' + (C.cp >= cap * 0.999 ? CT.resolveFull : fill2(CT.resolveIn, { t: fmtTime((cap - C.cp) / Math.max(1e-12, rate) * 3600) })) + (C.hr < C.rallyEnd ? ' · rallying' : '') + '<br><span>' + fill2(CT.resolveRate, { n: fmtCP(rate) }) + ' · ' + fill2(CT.resolveIs, { t: fmtTime(fill * 3600) }).toLowerCase() + '</span></p>';
  }
  box.innerHTML = h;
}
// owner, 2026-11-01: the win chance is always a percent (no 'sure' or 'no'); 100% only when certain
function cPct(p) { return p >= 1 ? 100 : p <= 0 ? 0 : Math.max(1, Math.min(99, Math.round(p * 100))); }
function fill2(t, v) { return t.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : ''); }

/* ---------- a place's card: its battles at the top (owner: as the previous branch) ---------- */
function combatSig(w, k) { const C = cRun(w); if (!C || !k) return ''; return [C.bdone[k] || 0, !!C.cleared[k], fmtCP(C.cp), fmtCP(C.res), CMV.frac, CMV.form, CMV.lead, CB.avatarReady(C), (cLife().stds || {})[k] ? 1 : 0, C.lv.council, C.lv.reserves > 0, CB.stdOK(w)].join(':'); }
function combatCard(w, k, box) {
  const C = cRun(w), c = CB.byKey(k); if (!cCapOpen(C) || !c || !w.m.tiles[k]) return; const L = cLife();
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
    r.innerHTML = '<span><b>' + fmtCP(pv.S) + '</b> your strength</span><span><b>' + fmtCP(pv.D) + '</b> theirs</span><span class="' + (pv.sure ? 'ok' : pv.none ? 'bad' : '') + '"><b>' + (cPct(pv.pwin) + '%') + '</b> to win</span>' +
      '<span><b>' + fmtCP(pv.lossWin) + '</b> lost if you win · <b>' + fmtCP(pv.lossLose) + '</b> if not</span>';
    const tr = add('p', 'ctrait', CMX.TRAITS[c.trait] + ' ' + capFirst(CMX.DANGER_NAME[c.danger]) + ' danger, ' + CMX.DICE_NAME[c.dice] + ' swings (' + LANDN[c.land].toLowerCase() + ').');
    CMV.frac = 1;   // owner, 2026-11-01: the Send choice is gone (always all). Considering: 5 to 60 seconds of marching, shown with moving dots; partial sends could come back with it
    if (C.lv.council) { const fs = add('div', 'cseg'); fs.setAttribute('aria-label', 'Formation');
      [['overwhelm', 'Overwhelm'], ['steady', 'Steady'], ['cautious', 'Carefully']].forEach(([f, lab]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.setAttribute('aria-pressed', CMV.form === f ? 'true' : 'false'); b.addEventListener('click', () => { CMV.form = f; renderWorld(); }); fs.appendChild(b); }); }
    if (CB.avatarReady(C)) { const lb = add('label', 'clead'); const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = CMV.lead; cb.addEventListener('change', () => { CMV.lead = cb.checked; renderWorld(); }); lb.append(cb, ' ' + fill2(CT.leadSub, { x: fmtW(1 + CB.P.avatar.edge, 1), t: fmtTime(CB.avatarCd(C) * 3600) }).replace(/^You join/, CT.leadH + ': you join')); }
    else if (C.clearedN >= CB.P.avatar.opens && C.avatarNext > C.hr) add('p', 'mmut', fill2(CT.leadWait, { t: fmtTime(Math.max(0, C.avatarNext - C.hr) * 3600) }));   // owner, 2026-11-01: no '0s' before the blade is open
    const acts = add('div', 'mpacts'), b = document.createElement('button'); b.type = 'button'; b.className = 'act primary'; acts.appendChild(b);
    setBtn(b, CT.attack, fill2(CT.attackSub, { n: fmtCP(C.cp * CMV.frac), d: fmtCP(pv.D) }), C.cp > 1e-9 && !pv.none, {}); b.addEventListener('click', () => cAttack(k));
  } else {
    const acts = add('div', 'mpacts');
    if (CB.stdOK(w) && C.newly[k] && !(L.stds || {})[k]) { const sc = CB.stdCost(L), q = stdQueued(w, k), b = document.createElement('button'); b.type = 'button'; b.className = 'act'; acts.appendChild(b);
      if (q) setBtn(b, CT.stdQueued, fill2(CT.stdQueuedSub, { n: stdWaiting(w) }), false, {}); else { setBtn(b, CT.std, fill2(CT.stdSub, { pct: fmtW(CB.P.standard.x * 100, 1), cost: costList(sc) }), true, {}); b.addEventListener('click', () => cStd(k)); } }
    if (C.lv.reserves > 0) { const rc = CB.raidCost(C, L), b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'act'; acts.appendChild(b2);   // owner, 2026-11-01: raids wait for Reserves
    setBtn(b2, CT.raid, raidWhat(C, L, k, c) + (C.res >= rc ? '' : ' ' + fill2(CT.raidNo, { n: fmtCP(rc) })), C.res >= rc, {}); b2.addEventListener('click', () => cRaid(k)); }
  }
  if (L.relics[k]) add('p', 'mmut', 'Its battle relic is yours (' + LANDN[L.relics[k]].toLowerCase() + ').');
  else if (L.ever[k] == null) add('p', 'mmut', 'Its first battles may turn up a battle relic' + (C.lv.reserves > 0 ? ' (raids too).' : '.'));
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
// lands in the plural, for running text
const LANDP = { meadow: 'meadows', forest: 'forests', hills: 'hills', marsh: 'marshes', river: 'river valleys', mountain: 'mountains', water: 'waters' };
// what a raid brings: Bestiary study (and how far it is to the next stage), and the relic's chance and what the relic gives
function raidWhat(C, L, k, c) { const f = c.fam, n = L.beast[f] || 0, st = CB.beastStages(L, f); let th = CB.P.bestiary.first[CB.tierOf(f)]; for (let i = 0; i < st; i++) th *= CB.P.bestiary.g;
  const study = fmtW(Math.min(n + CB.P.raid.study, th)) + ' of ' + fmtW(Math.ceil(th)) + ' toward stage ' + (st + 1), p = CB.relicOdds(L, k, 'raid');
  const rv = { p: cPct(p), cp: fmtW((CB.relicCP(Object.assign({}, L, { relicN: (L.relicN || 0) + 1 })) / CB.relicCP(L) - 1) * 100, 1), edge: fmtW(CB.P.relic.landEdge * 100), land: LANDP[c.land] || LANDN[c.land].toLowerCase() };
  return fill2(CT.raidSub, { n: fmtCP(CB.raidCost(C, L)), fam: c.famName.toLowerCase(), s: CB.P.raid.study, study, relic: L.relics[k] ? CT.raidHave : p >= 1 ? fill2(CT.raidSure, rv) : fill2(CT.raidRelic, rv) }); }
function cRaid(k) { const w = W(), C = cRun(w), L = cLife(), c = CB.byKey(k); const r = CB.raidAt(w, C, L, k, cRng()); if (!r) return; sys(fill2(CT.raidMsg, { place: shortName(tileOf(k)), s: r.study, fam: c.famName.toLowerCase() })); if (r.relic) wsay(fill2(CT.relicMsg, { place: shortName(tileOf(k)), land: LANDN[c.land].toLowerCase() })); renderWorld(); }
// owner, 2026-11-01: standards are hauled projects ('std:<place>'), all queued at once if you like; the price is the next standard's when its hauling starts
MC.addProjKind('std:', (s, key) => { const t = tileOf(key); return { id: 'std:' + key, name: 'A standard over ' + (t ? shortName(t).replace(/^The /, 'the ') : key), kind: 'small', stages: [{ name: 'The standard', cost: CB.stdCost(cLife()) }], gives: 'All light +' + fmtW(CB.P.standard.x * 100, 1) + '% for each standard raised.' }; },
  (s, key) => { const L = cLife(); L.stds = L.stds || {}; if (L.stds[key]) return; L.stds[key] = true; L.stdN = (L.stdN || 0) + 1; cLightApply(s); });
function stdQueued(w, k) { const id = 'std:' + k; return (w.m.proj && w.m.proj.id === id) || w.m.queue.indexOf(id) >= 0; }
function stdWaiting(w) { return w.m.queue.filter(id => id.indexOf('std:') === 0).length + (w.m.proj && w.m.proj.id.indexOf('std:') === 0 ? 1 : 0); }
function cStd(k) { const w = W(), C = cRun(w), L = cLife(); if (!CB.stdOK(w) || !C.newly[k] || (L.stds || {})[k] || stdQueued(w, k)) return; delete w.m.done['std:' + k]; MC.startProject(w, 'std:' + k); renderWorld(); }
function cStdAll() { const w = W(), C = cRun(w), L = cLife(); let n = 0; CB.stdOpen(C, L, w).forEach(k => { if (!stdQueued(w, k)) { cStd(k); n++; } }); if (n) sys(n + ' standard' + (n === 1 ? '' : 's') + ' wait for the haulers.'); renderWorld(); }
// owner, 2026-11-01: 'first' on a standard brings all the waiting standards forward; what was being hauled waits behind them with what it has
function cStdFirst() { const w = W(), isS = id => String(id).indexOf('std:') === 0, stds = w.m.queue.filter(isS); if (!stds.length) return;
  const first = stds.shift(), was = w.m.proj && w.m.proj.id; w.m.queue = stds.concat(w.m.queue.filter(id => !isS(id))); MC.startProject(w, first, true);
  if (was && w.m.queue[0] === was) { w.m.queue.shift(); w.m.queue.splice(stds.length, 0, was); } renderWorld(); }
function cStdPause() { const w = W(), n = MC.unqueueKind(w, 'std:'); if (n) sys(n + ' standard' + (n === 1 ? '' : 's') + ' taken off the queue.'); renderWorld(); }
function cRally() { const w = W(), C = cRun(w); if (CB.rallyNow(w, C, cLife())) { sys('Your defenders feast. Resolve ×' + fmtW(CB.rallyX(C), 2) + ' for ' + CB.P.rally.hours + ' hours.'); renderWorld(); } }
function cBuy(id) { const w = W(), C = cRun(w); if (!C) return; hideTip(); const was = cCapOpen(C); if (CB.buyLine(w, C, cLife(), id)) { cMarkBought(id); if (id === 'mine' && C.lv.mine === 1) sys(CT.mineMsg); if (id === 'barracks' && C.lv.barracks === 1 && !w.m.cards.armory) wsay(CT.armoryMsg);
  if (!was) CB.tick(w, 0, false, C, cLife()); if (!was && cCapOpen(C)) wsay(CT.capMsg); MV.lastMap = 0; renderWorld(); save(true); } }
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
  const C = cRun(w), L = cLife();
  const jobs = C ? [['miner', 'Miner', 'iron', 'Digs iron at the mine. The mine has room for ' + CB.mineSlots(C) + '; deepen it for more.', CB.mineSlots(C)],
    ['drillmaster', 'Drillmaster', 'faster Resolve', 'Drills your defenders, so the bar refills faster. More are needed as your combat power grows. Room for ' + CB.drillSlots(C) + '.', CB.drillSlots(C)]] : [];
  ['miner', 'drillmaster'].forEach(id => { const j = jobs.find(x => x[0] === id), row = $('job-' + id); if (row && (!j || !(j[4] > 0))) row.remove(); });
  jobs.forEach(([id, name, tag, desc, slots]) => {
    if (!(slots > 0)) return;   // a job appears with its place: miners with the mine, drillmasters at the Drill yards' milestone
    let row = $('job-' + id);
    if (!row) { row = document.createElement('div'); row.id = 'job-' + id; row.className = 'jrow reveal'; row.tabIndex = 0;
      row.innerHTML = '<span class="jn"></span><span class="jt"></span><button class="jb" aria-label="Remove one">−</button><span class="jc"></span><button class="jb" aria-label="Add one">+</button>';
      row.children[2].addEventListener('click', e => cJob(id, -1, e)); row.children[4].addEventListener('click', e => cJob(id, 1, e));
      ['mouseenter', 'focus'].forEach(ev => row.addEventListener(ev, () => showTextTip(row, name, [desc]))); ['mouseleave', 'blur'].forEach(ev => row.addEventListener(ev, hideTip)); jb.appendChild(row); }
    row.children[0].textContent = name; row.children[1].textContent = tag + ' · room for ' + slots; row.children[3].textContent = w.jobs[id] || 0;
    row.children[2].disabled = !(w.jobs[id] > 0); row.children[4].disabled = VC.jobsTotal(w) >= w.pop || (w.jobs[id] || 0) >= slots;
    const glow = !(w.jobs[id] > 0) && (id === 'miner' || !L.drillSeen); row.classList.toggle('jglow', glow);   // owner: a glowing dot on the new job until someone takes it
    if (id === 'drillmaster' && w.jobs[id] > 0) L.drillSeen = true;
  });
}

/* ---------- the Defense tab (owner, 2026-10-18: it opens slowly). At first only the iron mine; the mine opens the Barracks and the Armory;
   the first level of either opens your defenders (the bars) and the battle front, which sits under the buildings. ---------- */
function cWhatAdds(w, C, L, id) {   // the hover on a line: what building it adds
  const cap0 = CB.cap(C, L), tryCap = (f) => { const sv = JSON.stringify({ lv: C.lv, tier: C.tier }); f(); const v = CB.cap(C, L); const o = JSON.parse(sv); C.lv = o.lv; C.tier = o.tier; return v; };
  if (id === 'barracks' || id === 'armory') {
    const ap = id === 'armory' ? CB.armPrice(C, L) : null, cap1 = tryCap(() => { if (ap && ap.up) { C.tier.armory++; C.lv.armory = 1; } else C.lv[id]++; });
    if (!cCapOpen(C)) return ['Your defenders muster: combat power opens, up to ' + fmtCP(cap1) + '.', 'The battle front opens: the places you have called back that are still held, and how strong each is.'];
    return ['Combat power up to ' + fmtCP(cap1) + ' (now ' + fmtCP(cap0) + ').'];
  }
  if (id === 'mine') return C.lv.mine ? ['Room for one more miner (' + (CB.mineSlots(C) + 1) + '), and each digs ×' + CB.P.mine.depthX + ' more.'] : ['A mine with room for ' + CB.P.mine.slots0 + ' miners, ' + fmtW(CB.ironPerMinerH(C), 2) + ' iron an hour each. Put settlers on it in the Settlement.', 'Then: the Barracks.'];
  return null;
}
// renderDefenseTab: the one-page Defense tab lives in 07d-defense.js (owner, 2026-11-01)

/* ---------- map marks: a bronze pip while a place is being fought, gold once safe; strength on places not yet fought ---------- */
function combatCellCls(w, k, cls) { }   // owner, 2026-10-31: no combat dots on the map (the strength label stays)
// owner, 2026-11-01: the horizon is the 10 next battles, weakest next battle first (the rules' frontier holds 14; the bot fights from those)
function combatHorizonList(w, C) { const L = cLife(), day = C.hr / 24; return CB.frontier(C, w).map(c => ({ c, D: CB.nextBattle(c, C, L, day).D })).sort((a, b) => a.D - b.D).slice(0, 10).map(o => o.c); }
function combatHorizon(w, C) { const sig = C.clearedN + '|' + Object.keys(w.m.tiles).length + '|' + Math.floor(C.hr) + '|' + Object.keys(C.bdone).reduce((a, k) => a + (C.bdone[k] || 0), 0); if (CMV.hz && CMV.hz.sig === sig) return CMV.hz.set; const set = {}; combatHorizonList(w, C).forEach(c => { set[c.key] = true; }); CMV.hz = { sig, set }; return set; }
// owner, 2026-11-01: only the horizon's places show their strength
function combatCellLabel(w, k) { const C = cRun(w); if (!cCapOpen(C) || !w.m.tiles[k] || C.cleared[k]) return ''; const c = CB.byKey(k); if (!c) return ''; if (!combatHorizon(w, C)[k]) return '';  return '⚔' + fmtShortCP(CB.nextBattle(c, C, cLife(), C.hr / 24).D * CPU); }
function fmtShortCP(v) { return v >= 1e9 ? fmtW(v / 1e9, 1) + 'B' : v >= 1e6 ? fmtW(v / 1e6, 1) + 'M' : v >= 1e3 ? fmtW(v / 1e3, 1) + 'k' : fmtW(v, v < 10 ? 1 : 0); }

/* ---------- the Relics tab: battle relics (a chance on a place's first battles and on raids; kept for good) ---------- */
function combatRelicsHtml(w) {
  const L = cLife(); if (!L.opened) return '';
  const lands = Object.keys(L.relicLand || {}).filter(k => L.relicLand[k] > 0), R = CB.P.relic;
  let h = '<div class="rel"><div><p class="sech">Battle relics</p>';
  if (!L.relicN) h += '<p class="mmut">A place’s first battles may turn up a battle relic (later, raids too). Each adds ' + fmtW(R.cp * 100, 1) + '% to combat power, and makes your defenders ×' + fmtW(1 + R.landEdge, 1) + ' in battles on its land.</p>';
  else { h += '<div class="rgrid">' + lands.map(land => '<div class="rcard"><span class="md" style="--c:var(--l-' + LANDC[land] + ')">' + LANDG[land] + '</span><p class="rn">' + LANDN[land] + ' ×' + L.relicLand[land] + '</p><p class="rx">Battles on ' + LANDN[land].toLowerCase() + ' ×' + fmtW(1 + R.landEdge * L.relicLand[land], 2) + '</p></div>').join('') + '</div>' +
    '<div class="rtot"><span>Combat power from battle relics: <b>×' + fmtW(CB.relicCP(L), 2) + '</b></span><span>' + L.relicN + ' found, kept for good</span></div>'; }
  return h + '</div></div>';
}

/* ---------- bloodstones and their perks: earned live, bought from the traveler (no combat rebirths) ---------- */
function cFlatFor(bs) { return 1 + CB.P.bs.pct * Math.pow(bs, CB.P.bs.exp); }
const CPK_UI = { hardened: 'Combat power +' + Math.round(CB.perk('hardened').x * 100) + '% of the base a rank', quick: 'Resolve +' + Math.round(CB.perk('quick').x * 100) + '% a rank',
  forgeLore: 'Each Armory tier holds one more level a rank', quarterm: 'Barracks prices climb ' + Math.round(CB.perk('quarterm').x * 100) + '% gentler a rank', drillLore: 'Fewer drillmasters needed for the same drill: ' + Math.round(CB.perk('drillLore').x * 100) + '% fewer a rank',
  keen: 'Battle relics turn up ' + Math.round(CB.perk('keen').x * 100) + '% more often a rank', lore: 'Each battle relic ' + Math.round(CB.perk('lore').x * 100) + '% stronger a rank' };
function combatMerchantSection() {
  const L = cLife(); if (!L.opened) return null; const pool = L.bs + (L.bsPending || 0), spent = CB.perkSpent(L.perks), free = pool - spent;
  let h = '<section class="cur open"><div class="cur-strip"><span class="cur-name"><span class="hex" style="width:30px;height:27px;background:#b8484f"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" fill="none" stroke="#2a1010" stroke-width="2"/></svg></span><span><span class="cz cur-t">Defense</span><span class="cur-s">Bloodstones</span></span></span>' +
    '<span class="cur-mem"><span class="cur-l">Combat power, from bloodstones</span><span class="memx"><span class="was">×' + fmtW(cFlatFor(L.bs), 2) + '</span><span style="color:#f2b84b">→</span><span class="now">×' + fmtW(cFlatFor(pool), 2) + '</span></span></span>' +
    '<span class="cur-purse"><svg width="20" height="26" viewBox="0 0 12 16" aria-hidden="true"><path d="M6 0l6 7-6 9-6-9z" fill="#b8484f"></path></svg><span><b>' + fmtW(free) + '</b><span>of ' + fmtW(pool) + ' free</span></span></span><span></span></div>';
  h += '<div class="cur-body"><div class="cur-bar"><span>' + CT.travSub + '</span></div><div class="pk-chips">';
  CB.P.perks.filter(p => CB.perkUseful(p)).forEach(p => { const n = L.perks[p.id] || 0, max = p.max || 99, done = n >= max, price = done ? 0 : CB.perkCost(p, n), afford = !done && free >= price;
    h += '<button type="button" class="chip" data-bpick="' + p.id + '" title="' + (CPK_UI[p.id] || '') + '" style="color:#f1dede;border:1px solid ' + (n ? '#a5585e' : '#4a2c30') + ';background:' + (n ? '#3a1d22' : '#241417') + '"><span style="flex:1;font-size:12.5px;line-height:1.15">' + p.name + (n ? ' <span style="color:#e6a3a9">' + n + '</span>' : '') + '<br><span style="font-size:11px;color:#bfa7a9">' + (CPK_UI[p.id] || '') + '</span></span>' +
      (done ? '✓' : '<span style="font-size:12.5px;color:' + (afford ? '#ffd0d8' : '#8d7a7c') + '">' + fmtW(price) + '</span>') + '</button>'; });
  return h + '</div></div></section>';
}
// a bloodstone perk bought from the traveler works at once (capture: before the perk screen's own handler)
$('perk-screen').addEventListener('click', e => {
  const t = e.target.closest('button[data-bpick]'); if (!t || !MV.prest || !MV.prest.merchant) return; e.stopImmediatePropagation();
  const L = cLife(), p = CB.perk(t.dataset.bpick), n = L.perks[p.id] || 0, free = L.bs + (L.bsPending || 0) - CB.perkSpent(L.perks);
  if (CB.perkUseful(p) && n < (p.max || 99) && CB.perkCost(p, n) <= free) { L.perks[p.id] = n + 1; const w = W(), C = cRun(w); if (C) CB.tick(w, 0, false, C, L); save(true); }
  renderPerks();
}, true);
// when he goes on his way, the bloodstones earned since his last visit take hold (owner, 2026-10-31: a rebirth's banking, no reset)
function combatMerchantLeave() { const L = cLife(); if (!L.opened) return; const n = CB.bankPending(L); const w = W(), C = cRun(w); if (C) CB.tick(w, 0, false, C, L); if (n > 0) wsay(fill2(CT.bankMsg, { n: fmtW(n), x: fmtW(cFlatFor(L.bs), 2) })); }
// the traveler's first visit once combat is open: he wants bloodstones now (owner, 2026-10-31)
function combatTravelerCheck(w, calm) {
  const L = cLife(); if (!L.opened || L.travelerMet || !calm || !MC.merchantHere(w)) return;
  L.travelerMet = true; $('moment-h').textContent = CT.travH; const body = $('moment-body'); body.innerHTML = '';
  [CT.trav1, CT.trav2].forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  $('moment-ok').textContent = CT.travGo; $('moment').dataset.kind = 'traveler'; momentPlain(); $('moment').classList.remove('hidden');
}

/* ---------- light's hover: what combat sends ---------- */
function combatLightLines(w) { const C = cRun(w); if (!C) return []; const g = CB.lightGifts(C, cLife()), out = [];
  if (g.std > 1.0001) out.push('Standards raised, ' + cLife().stdN + ': ×' + fmtW(g.std, 2)); if (g.buffs > 1.0001) out.push('Iron buffs on all light: ×' + fmtW(g.buffs, 2));
  if (g.burners > 1.0001) out.push('Iron buffs on what rebuilds add to burners: ×' + fmtW(g.burners, 2)); if (g.keepers > 1.0001) out.push('Iron buffs on what fire-tending adds to firekeepers: ×' + fmtW(g.keepers, 2));
  if (g.flat > 1.0001) out.push('Bloodstones: ×' + fmtW(g.flat, 2)); return out.length ? [{ t: 'From your defense:', cls: 'tipsep' }].concat(out) : []; }
