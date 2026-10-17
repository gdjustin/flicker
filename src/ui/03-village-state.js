/* =====================================================================
   CHAPTER 2: THE VILLAGE, rebuilt (village rebuild branch, 2026-10-11)
   Every number and rule lives in the village core (VC, loaded above), the
   same file the Village Lab's bot plays. This part shows it and takes clicks.
   ===================================================================== */
const WORLD = {
  res: { wood: 'Wood', stones: 'Stones', fiber: 'Fiber', copper: 'Copper', food: 'Food', ideas: 'Ideas', snails: 'Snails' },
  resOrder: ['wood', 'stones', 'fiber', 'copper', 'food', 'ideas', 'snails'],
  looks: [
    { text: 'Grey light, from nowhere in particular. Cold ground underfoot.' },
    { text: 'A thin stream, cold and clear.' },
    { text: 'A few steps out, the grey simply stops. Not fog. Nothing at all.' },
    { text: 'Something pale in the dirt by the water.' },
    { text: 'Dead branches, scattered in the dirt. Wood, if you gather it.', reveal: 'wood' }
  ],
  gathers: [
    { res: 'wood', label: 'Gather wood', labelAxe: 'Chop wood' },
    { res: 'stones', label: 'Gather stones' },
    { res: 'fiber', label: 'Pull grass' },
    { res: 'food', label: 'Forage berries' }
  ],
  groups: { light: 'Light', homes: 'Homes', storage: 'Storage', tools: 'Tools' },
  kinds: { idea: 'Idea', upgrade: 'Upgrade', tool: 'Tool', building: 'Building' },
  milestones: [10, 25, 50, 75, 100],
  text: {
    stood: 'You stand. The motes you held scatter into the grey.',
    motes: 'Motes rise from the fire and drift toward you. Only you seem to notice them.',
    arrive: 'A figure steps out of the nothing and into your light. They don’t know where they came from either.',
    berries: 'They are hungry. They show you berries along the stream that you never noticed.',
    hint: 'Next milestone: {pct}%',
    another: 'Someone else steps into the light.',
    lights: 'One of them asks what the lights are that you keep watching. They can’t see the motes.',
    great: 'The light presses against the edges of the dark. One great fire might fill it.',
    hungry: 'Food has run out. Everyone works at half pace until there is food again.',
    full: 'The light reaches every edge of the ground you stand on. At the edges, something answers.',
    map: 'Around your tile, the dark goes on. Somewhere out there, the world is waiting to be brought back.',
    stage: '{name}: {stage} done.',
    built: '{name} is built. {gives}',
    haulBack: 'Nothing left to carry. The haulers go back to their work.',
    haulIdle: 'Nothing left to carry. The haulers wait by the stores.',
    queued: '{name} is planned. It starts when {current} is built.',
    fullWait: 'Your home is fully lit. The home beacon still has to be built.'
  }
};
const KIND_ICON = {
  idea: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  upgrade: 'M12 19V5M6 11l6-6 6 6',
  tool: 'M14 6l4 4-9 9H5v-4zM13 7l2-2 4 4-2 2',
  building: 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5'
};
const memoryMult = () => S.meta ? memMultFor(S.meta.hsLife) : 1;   // memory speeds the prologue too
function renderScatterBtn() {}       // the prologue's render calls it
const W = () => S.w;
let unassignArmed = false;
const resName = r => WORLD.res[r] || r;
const capFirst = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
function freshWorld() {
  return Object.assign(VC.fresh(), { seen: {}, looks: 0, flags: {}, name: '', drawer: 'open', haulFrom: {}, leftStack: [], learnedAt: {}, playStart: S.playTime || 0 });
}
const cap = r => (W() && W().m ? MC.cap(W(), r) : VC.cap(W(), r));
const lightPct = w => w.pct || 0;
const fmtTime = sec => { if (!isFinite(sec) || sec < 0) return '—'; sec = Math.ceil(sec); if (sec < 60) return sec + 's'; const m = Math.round(sec / 60); if (m < 60) return m + ' min'; const h = Math.floor(m / 60); return h + ' h ' + (m % 60) + ' min'; };

/* ---------- Flows: every line in and out of a resource, for the rates and the hovers ---------- */
function flows(r) {
  if (W() && W().m) return mapFlows(r);
  const w = W(), out = [], hf = VC.hungerMult(w), D = VC.D;
  for (const j of VC.JOBS) { const n = w.jobs[j.id] || 0, o = D.job[j.id]; if (!n || !o || !o[r]) continue;
    out.push([n + ' ' + jobName(j, n), n * o[r] * VC.jobMult(w, j.id) * hf]); }
  if (r === 'ideas' && w.cards.fire) out.push([tx('w.flow.watch'), D.fireIdeas]);
  if (r === 'snails' && w.cards.snails) out.push([tx('w.flow.snails'), VC.snailRate(w)]);
  const bd = VC.burnDemand(w);
  const kw = (w.jobs.firekeeper || 0) * VC.keeperWood(w), pw = VC.burnersOn(w, 'firepit') * D.firepitWood;
  if (r === 'wood' && kw) out.push([tx('vw.flow.keepers', { n: w.jobs.firekeeper }) + partTag('wood'), -kw * VC.burnShare(w, 'wood')]);
  if (r === 'wood' && pw) out.push([tx('vw.flow.pits', { n: VC.burnersOn(w, 'firepit') }) + partTag('wood'), -pw * VC.burnShare(w, 'wood')]);
  if (r === 'stones' && bd.stones) out.push([tx('vw.flow.kilns', { n: VC.burnersOn(w, 'limekiln') }) + partTag('stones'), -bd.stones * VC.burnShare(w, 'stones')]);
  if (r === 'fiber' && bd.fiber) out.push([tx('vw.flow.rush', { n: VC.burnersOn(w, 'rushlight') }) + partTag('fiber'), -bd.fiber * VC.burnShare(w, 'fiber')]);
  if (r === 'food' && w.pop) out.push([tx('vw.flow.eat', { n: w.pop }), -w.pop * D.eat]);
  const hr = haulShown(r); if (hr > 0.0005 && w.proj) out.push([tx('vw.flow.haul', { name: VC.PROJ[w.proj.id].name }), -hr]);
  return out;
}
// what haulers are carrying of a material, smoothed over a few seconds so the numbers don't flicker
const haulShown = r => { const w = W(); return w && w.proj && !w.proj.paused ? ((w.haulAvg || {})[r] || 0) : 0; };
// everything that wants a material a second at full pace, whether or not it gets it
function demandRate(r) { if (W() && W().m) return 0; const w = W(), bd = VC.burnDemand(w), dr = VC.haulDraw(w); return (bd[r] || 0) + (r === 'food' ? w.pop * VC.D.eat : 0) + (dr[r] || 0); }
function partTag(r) { const sh = VC.burnShare(W(), r); return sh < 0.995 ? ' ' + tx('w.flow.part', { pct: sh < 0.01 ? '<1' : Math.round(sh * 100), res: resName(r).toLowerCase() }) : ''; }
const netRate = r => flows(r).reduce((a, f) => a + f[1], 0);
const jobName = (j, n) => (n === 1 ? j.name : (j.plural || j.name + 's')).toLowerCase();

/* ---------- Tick ---------- */
function worldTick(dt, away) {
  const w = W(); if (!w) return;
  if (w.m) { mapTick(dt, away); return; }
  if (w.pv && w.pv.instant && w.proj && !w.proj.paused) { const st0 = VC.PROJ[w.proj.id].stages[w.proj.stage]; w.proj.got = Object.assign({}, st0.cost); }   // v1q: The village complete
  const ev = VC.tick(w, dt); w.stats.buys.length = 0;
  { const a = 1 - Math.exp(-dt / 6), h = w.haulAvg = w.haulAvg || {}, now = w.haulNow || {};
    for (const k of ['wood', 'stones', 'fiber', 'food']) h[k] = (h[k] || 0) + ((now[k] || 0) - (h[k] || 0)) * a; }
  for (const e of ev) {
    if (e[0] === 'arrive') {
      if (e[1] === 1) { w.seen.food = true; wsay(WORLD.text.arrive); wsay(WORLD.text.berries); showMoment('settler'); }
      else if (e[1] <= 4) wsay(WORLD.text.another);
      if (e[1] >= 4) wonce('quietMind', tx('w.msg.quiet'));
    }
    if (e[0] === 'stage') { const p = VC.PROJ[e[1]]; sys(fill(WORLD.text.stage, { name: p.name, stage: p.stages[e[2]].name })); }
    if (e[0] === 'built') { const p = VC.PROJ[e[1]]; wsay(fill(WORLD.text.built, { name: p.name, gives: p.gives })); }
    if (e[0] === 'haulersFree') haulersBack();
    if (e[0] === 'feastEnd') wsay(tx('w.msg.feastend'));
  }
  if (w.res.ideas >= 1) w.seen.ideas = true;
  if (w.pct >= 25 && !w.flags.snailSeen) { w.flags.snailSeen = true; wsay(tx('sn.msg.seen')); }
  if (w.pop >= 10 && w.pct >= 40) wonce('lights', WORLD.text.lights);
  if (w.pop >= 8) wonce('askName', tx('w.msg.askName'));
  if (w.pct >= 45) wonce('great', WORLD.text.great);
  if (VC.hungerMult(w) < 0.999 && w.pop) wonce('hungry', WORLD.text.hungry);
  if (w.pct >= 100) { if (wonce('full', WORLD.text.full) && !w.done.beacon) sys(WORLD.text.fullWait); }
  if (w.pct >= 100 && w.done.beacon && !w.flags.end) { w.flags.end = true; w.endedAt = S.playTime || 0; wsay(WORLD.text.map); showReveal(); save(true); }
}
// haulers go back to the jobs they came from (Considering: a test of smoother hauling)
function haulersBack() {
  const w = W(), n = w.jobs.hauler || 0; if (!n) return;
  let left = n;
  for (const id in w.haulFrom) { const k = Math.min(left, w.haulFrom[id]); if (k > 0 && VC.jobOpen(w, id)) { w.jobs[id] = (w.jobs[id] || 0) + k; left -= k; } }
  w.jobs.hauler = left; w.haulFrom = {};
  sys(left < n ? WORLD.text.haulBack : WORLD.text.haulIdle);
}

/* ---------- Actions ---------- */
function tally() { lfCache = null; }
let lfCache = null;
function wsay(t) { say(t); }
function wonce(flag, t) { const w = W(); if (!w.flags[flag]) { w.flags[flag] = true; if (t) wsay(t); return true; } return false; }
function wLook() { const w = W(), l = WORLD.looks[w.looks]; if (!l) return; w.looks++; wsay(l.text); if (l.reveal) w.seen[l.reveal] = true; renderWorld(); }
function wGather(res) {
  const w = W(); if (!VC.gather(w, res)) return; w.seen[res] = true;
  if (w.res.ideas >= 1) { w.seen.ideas = true; wonce('ideasMsg', tx('w.msg.ideas')); }
  renderWorld();
}
function wStoke() { const w = W(); if (!VC.stoke(w)) return; wonce('stoked', tx('w.msg.stoked')); renderWorld(); }
function wFeast() { const w = W(); if (!VC.feast(w)) return; wsay(tx('w.msg.feast')); renderWorld(); }
function wCard(id) {
  const w = W(), c = VC.CARD[id], had = w.proj ? w.proj.id : null; if (!VC.buyCard(w, id)) return; w.stats.buys.length = 0;
  w.learnedAt[id] = S.playTime || 0; sys(tx('w.msg.learned', { name: c.name }));
  if (id === 'fire') { w.seen.ideas = true; setTimeout(() => { if (S.w === w) wsay(WORLD.text.motes); }, 20000 / (S.speed || 1)); }
  if (id === 'lookcloser') w.seen.stones = true;
  if (id === 'grasswork') w.seen.fiber = true;
  if (id === 'snails') w.seen.snails = true;
  if (c.startsProject && had && had !== c.startsProject) sys(fill(WORLD.text.queued, { name: VC.PROJ[c.startsProject].name, current: VC.PROJ[had].name }));
  renderWorld(); save(true);
}
function wLevel(id) {
  const w = W(), l = VC.LAD[id]; if (!VC.buyLevel(w, id)) return; w.stats.buys.length = 0;
  if (VC.ladderMaxed(w, l)) sys(tx('w.msg.maxed', { name: l.name, n: l.max }));
  renderWorld();
}
function wBurn(id, d) { const w = W(); const n = w.lv[id] || 0; w.on[id] = Math.max(0, Math.min(n, VC.burnersOn(w, id) + d)); renderWorld(); }
function wJob(id, d, e) {
  const w = W(), n = w.jobs[id] || 0;
  if (d > 0 && VC.jobsTotal(w) >= w.pop) return; if (d < 0 && n <= 0) return;
  let k = 1; if (e) { if (e.ctrlKey || e.metaKey) k = Infinity; else if (e.shiftKey) k = 5; }
  k = d > 0 ? Math.min(k, w.pop - VC.jobsTotal(w)) : Math.min(k, n);
  w.jobs[id] = n + d * k;
  // remember where haulers came from, so they can go back when the carrying is done
  if (id !== 'hauler' && d < 0) { for (let i = 0; i < k; i++) w.leftStack.push(id); if (w.leftStack.length > 40) w.leftStack.splice(0, w.leftStack.length - 40); }
  if (id === 'hauler' && d > 0) for (let i = 0; i < k; i++) { const from = w.leftStack.pop(); if (from) w.haulFrom[from] = (w.haulFrom[from] || 0) + 1; }
  if (id === 'hauler' && d < 0) { let rm = k; for (const j in w.haulFrom) { const t = Math.min(rm, w.haulFrom[j]); w.haulFrom[j] -= t; rm -= t; if (!w.haulFrom[j]) delete w.haulFrom[j]; } }
  if (id !== 'hauler' && d > 0 && w.leftStack.length) w.leftStack.splice(w.leftStack.lastIndexOf(id) >= 0 ? w.leftStack.lastIndexOf(id) : w.leftStack.length - 1, 1);
  renderWorld();
}
function wPause() { const w = W(); if (!w.proj) return; w.proj.paused = !w.proj.paused; renderWorld(); }
function wName() { const v = $('w-name-input').value.trim().slice(0, 40); if (!v) return; W().name = v; sys(tx('w.msg.named', { name: v })); renderWorld(); save(true); }
// v1q: what the village keeps from earlier runs (owner, 2026-10-16): memory and the raw crafts reach the village, it opens
// with 40 stone and wood, and the comforts that act here (Sure hands, Open doors, Practised haulers, The village complete)
function villageStart(w) {
  const pr = prestigeObj(), pv = MC.villagePrestige(pr); if (pv) w.pv = pv;
  const st = MC.D.villageStart || {}; for (const k in st) if (st[k] > 0) { w.res[k] = Math.max(w.res[k] || 0, st[k]); w.seen[k] = true; }
  if (pv && pv.startPop) { w.pop = Math.min(VC.D.maxSettlers, pv.startPop); w.doorPop = w.pop; w.pvExtra = Math.max(0, pv.startPop - w.pop); w.lastArrive = 0;
    (pv.doorCards || []).forEach(c => { w.cards[c] = true; w.learnedAt[c] = 0; }); w.res.food = Math.max(w.res.food, 10 * w.pop); w.seen.food = true; }
  return w;
}
function enterWorld() {
  if (!S.w) { S.w = villageStart(freshWorld()); say(WORLD.text.stood); if (S.w.doorPop) say('The doors stand open: ' + S.w.doorPop + ' settlers are already here, and they know where the berries grow.'); }
  $('prologue').classList.add('hidden'); $('world').classList.remove('hidden'); document.body.classList.add('in-world');
  renderLog(); renderWorld();
}
function resetWorldDom() {
  ['w-res', 'w-acts', 'w-make', 'w-jobs', 'w-research', 'w-snails'].forEach(id => { $(id).innerHTML = ''; });
  ['h-make', 'h-jobs', 'h-ideas', 'h-snails'].forEach(id => $(id).classList.add('hidden')); $('w-drawer').classList.add('hidden'); $('w-feast').classList.add('hidden');
  renderLog();
}
function restartPhase() { S.flags.stood = true; S.w = null; S.log = []; enterWorld(); resetWorldDom(); renderWorld(); save(true); }
function showMoment(id) {
  try { const P = { settler: ['k.settler.p'], end: ['k.end.p1', 'k.end.p2', 'k.end.p3'] }[id];
    $('moment-h').textContent = tx('k.' + id + '.h'); const body = $('moment-body'); body.innerHTML = '';
    P.forEach(k => { const p = document.createElement('p'); p.textContent = tx(k); body.appendChild(p); });
    $('moment-ok').textContent = tx('k.' + id + '.ok'); $('moment').classList.remove('hidden'); $('moment-ok').focus(); } catch (e) {}
}

