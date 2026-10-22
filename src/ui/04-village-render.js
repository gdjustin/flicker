/* ---------- Display helpers ---------- */
const fmtW = (n, d) => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d });
function fmtRate(v, signed) { const sg = signed && v > 0 ? '+' : ''; if (v !== 0 && Math.abs(v) < 0.005) return (v < 0 ? '−' : sg) + '<0.01/s'; return sg + fmtW(v, 2) + '/s'; }
function fmtRateFine(v) { return Math.abs(v) >= 0.005 || v === 0 ? fmtRate(v) : fmtW(v * 3600, 1) + '/h'; }
function ensureBtn(box, id, onClick, cls) {
  let b = $(id);
  if (!b) { b = document.createElement('button'); b.id = id; b.className = 'act reveal' + (cls ? ' ' + cls : ''); b.addEventListener('click', onClick); box.appendChild(b); }
  else if (b.parentNode !== box) box.appendChild(b);
  return b;
}
// A button: an optional kind label (Idea, Upgrade, Tool, Building), the title, a description, its cost, then a note
function setBtn(b, title, desc, enabled, o) {
  o = o || {};
  const items = o.cost ? Object.keys(o.cost).map(k => [fmtW(o.cost[k]) + ' ' + resName(k).toLowerCase(), o.cost[k] > cap(k)]) : null;
  const sig = JSON.stringify([o.kind || '', title, desc, items, o.costLine || '', o.note || '']);
  if (b.dataset.t !== sig) {
    b.dataset.t = sig; b.innerHTML = '';
    const tt = document.createElement('span'); tt.className = 'bt';
    if (o.kind) { const kd = document.createElement('span'); kd.className = 'kd kd-' + o.kind;
      kd.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path d="' + KIND_ICON[o.kind] + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
      kd.append(WORLD.kinds[o.kind]); tt.appendChild(kd); }
    tt.append(title); b.appendChild(tt);
    const add = (cls, text) => { const el = document.createElement('small'); el.className = cls; if (text != null) el.textContent = text; b.appendChild(el); return el; };
    if (desc) add('bd', desc);
    if (items) { const c = add('bc'); c.append(tx('w.cost') + ' ');
      items.forEach(([text, over], i) => { if (i) c.append(', '); const sp = document.createElement('span'); sp.className = 'ci' + (over ? ' over' : ''); sp.textContent = text; if (over) sp.title = tx('w.over'); c.appendChild(sp); }); }
    else if (o.costLine) add('bc', o.costLine);
    if (o.note) add('bn', o.note);
  }
  if (o.keys) b.dataset.tkeys = o.keys.join(' ');
  b.disabled = !enabled;
}
function showTextTip(anchor, title, lines) {
  const tip = $('w-tip'); tip.textContent = '';
  const h = document.createElement('strong'); h.textContent = title; tip.appendChild(h);
  lines.forEach(t => { const d = document.createElement('div'); if (typeof t === 'object') { d.className = t.cls; d.textContent = t.t; } else d.textContent = t; tip.appendChild(d); });
  const rect = anchor.getBoundingClientRect();
  tip.style.left = Math.max(8, Math.min(window.innerWidth - 300, rect.left)) + 'px'; tip.style.top = (rect.bottom + 8) + 'px';
  tip.classList.remove('hidden');
}
// r1f: a research price cut by Old lessons says so (no unexplained rule changes)
function oldLessonsNote(w) { const f = w.oldL ? w.oldL.f : w.m ? MC.D.perks.oldLessons.f[Math.max(1, MC.perk(w, 'oldLessons')) - 1] : 0.5; return 'Learned in an earlier run: ' + (f <= 0.25 ? 'a quarter' : 'half') + ' price (Old lessons).'; }
const hideTip = () => $('w-tip').classList.add('hidden');
function hoverTip(el, fn) {
  if (el.dataset.tip) return; el.dataset.tip = '1';
  ['mouseenter', 'focus'].forEach(e => el.addEventListener(e, fn)); ['mouseleave', 'blur'].forEach(e => el.addEventListener(e, hideTip));
}
// v1q (owner's playtest): the gifts and memory kept from earlier runs show on the hovers they change
function keptBuffLines(w, r) {
  const m = S.meta, out = []; if (!m || !m.perks) return out; const P = MC.D.perks, lv = m.perks;
  const craft = { wood: 'woodcraft', stones: 'stonecraft', fiber: 'fibercraft', ideas: 'scholarLore', copper: 'coppercraft' }[r];
  if (craft && lv[craft]) out.push(P[craft].name + ' ' + lv[craft] + ': +' + Math.round(P[craft].x * lv[craft] * 100) + '%' + (craft === 'coppercraft' ? ' (smelters burn +' + Math.round(P.coppercraft.use * lv.coppercraft * 100) + '%)' : w.m ? '' : ', in the village too'));
  if (r === 'food' && lv.openDoors && !w.m) out.push('Open doors: the first settlers came knowing how to forage');
  if (!w.m && lv.sureHands && ['wood', 'stones', 'fiber', 'food'].includes(r)) out.push('Sure hands: gathering by hand ×' + P.sureHands.hand[lv.sureHands - 1]);
  if (w.m && MC.perk(w, 'stewardsKept') && !w.m.cards.autostore && MC.stewardsOn(w) && stewardRes(w, r)) out.push('Stewards: when this store is full, they buy the next stockpile if you can afford it');
  return out;
}
// r1d (owner's playtest): Stewards learned this run are this run's, not kept from an earlier one
function stewardRes(w, r) { return ['wood', 'stones', 'fiber', 'copper'].includes(r) && (r !== 'copper' || w.m.cards.cubins); }
function keptLightLines(w) {
  const m = S.meta, out = []; if (!m || !m.perks) return out; const lv = m.perks, x = v => fmtW(v, 2);
  if (!w.m && w.pv && w.pv.all > 1.001) out.push('Memory (every heartstone remembered): ×' + x(w.pv.all));
  if (w.m) { const kl = MC.famBuff(w, 'keeperLore'), bg = MC.famBuff(w, 'brightGlass'), hh = MC.famBuff(w, 'hotHearths');
    if (kl > 1.001) out.push('Keepers’ lore: ×' + x(kl) + ' on what fire-tending and songs add');
    if (bg > 1.001) out.push('Bright glass: ×' + x(bg) + ' on copper lamps and braziers');
    if (hh > 1.001) out.push('Hot hearths: ×' + x(hh) + ' on what rebuilds add, and copper burners');
    if (lv.oldFlames && w.m.oldFlamesBack) out.push('Old flames ' + ROMAN[lv.oldFlames - 1] + ': last run’s lines came back already bought'); }
  return out;
}
function showResTip(r, anchor) {
  const w = W(), fl = flows(r), tip = $('w-tip');
  const lines = fl.length ? fl.map(f => (f[1] >= 0 ? '+' : '') + fmtRateFine(f[1]) + '  ' + f[0]) : [tx('w.use.none')];
  tip.textContent = ''; const h = document.createElement('strong'); h.textContent = resName(r); tip.appendChild(h);
  lines.forEach(t => { const d = document.createElement('div'); d.textContent = t; tip.appendChild(d); });
  if (isFinite(cap(r))) { const v = w.res[r] || 0, c = cap(r), net = netRate(r), e = document.createElement('div'); e.className = 'tipsep';
    e.textContent = v >= c - 0.001 ? tx('w.tip.isfull') : net > 0.0005 ? tx('w.tip.full', { t: fmtTime((c - v) / net) }) : net < -0.0005 ? tx('w.tip.empty', { t: fmtTime(v / -net) }) : tx('w.tip.steady'); tip.appendChild(e); }
  if (w.m && r === 'food' && MC.D.eatMap > 1) { const e = document.createElement('div'); e.className = 'tipx'; e.textContent = fill(MT.eatMore, { x: fmtW(MC.D.eatMap, 1) }); tip.appendChild(e); }   // r1e
  let extra = tx('w.use.' + r); if (extra !== 'w.use.' + r) { const e = document.createElement('div'); e.className = 'tipx'; e.textContent = extra; tip.appendChild(e); }
  if (w.m && w.m.cards.autostore && stewardRes(w, r)) { const e = document.createElement('div'); e.className = 'tipx'; e.textContent = 'Stewards: when this store is full, they buy the next stockpile if you can afford it.'; tip.appendChild(e); }
  const kept = keptBuffLines(w, r); if (kept.length) { const e = document.createElement('div'); e.className = 'tipsep'; e.textContent = 'Kept from earlier runs:'; tip.appendChild(e); kept.forEach(t => { const d = document.createElement('div'); d.textContent = t; tip.appendChild(d); }); }
  const rect = anchor.getBoundingClientRect();
  tip.style.left = Math.min(window.innerWidth - 300, rect.right + 12) + 'px'; tip.style.top = Math.max(8, rect.top) + 'px'; tip.classList.remove('hidden');
}
// what buying something would change: try it on a copy of the village and compare
function impactLines(apply) {
  const real = S.w, snap = () => { const o = { light: S.w.m ? MC.lightRate(S.w) : VC.lightRate(S.w), room: S.w.m ? MC.room(S.w) : VC.room(S.w) }; for (const r of WORLD.resOrder) { o['r' + r] = netRate(r); o['c' + r] = cap(r); } return o; };
  const before = snap(); S.w = JSON.parse(JSON.stringify(real)); let after;
  try { apply(S.w); after = snap(); } finally { S.w = real; }
  const out = [], sig = v => (v > 0 ? '+' : '') + fmtW(v, Math.abs(v) < 10 ? 2 : 0);
  if (Math.abs(after.light - before.light) > 1e-6) out.push(tx('w.impact.light', { n: sig(after.light - before.light), now: fmtW(after.light, 1) }));
  for (const r of WORLD.resOrder) { const dr = after['r' + r] - before['r' + r], dc = after['c' + r] - before['c' + r];
    if (Math.abs(dr) > 1e-6) out.push(tx('w.impact.rate', { n: fmtRate(dr, true), res: resName(r) }));
    if (Math.abs(dc) > 1e-6 && isFinite(dc)) out.push(tx('w.impact.cap', { n: sig(dc), res: resName(r) })); }
  if (after.room !== before.room) out.push(tx('w.impact.room', { n: sig(after.room - before.room) }));
  return out.length ? out : [tx('w.impact.none')];
}
function impactTip(b, apply) {
  hoverTip(b, () => { if (!W() || b.classList.contains('done')) return; showTextTip(b, tx('w.impact.title'), impactLines(apply)); });
}
const LIGHT_LABEL = { glow: 'w.flow.glow', great: 'w.flow.great', keepers: 'w.flow.keepers', braziers: 'w.flow.braziers', lamps: 'w.flow.lamps', firepits: 'vw.flow.firelight', limekilns: 'vw.flow.kilnlight', rushlights: 'vw.flow.rushlight' };
function lightTip(anchor) {
  const w = W(); if (!w) return; const D = VC.D;
  const n = { braziers: w.lv.brazier || 0, lamps: w.lv.lamp || 0, firepits: VC.burnersOn(w, 'firepit'), limekilns: VC.burnersOn(w, 'limekiln'), rushlights: VC.burnersOn(w, 'rushlight') };
  const fl = VC.lightParts(w).map(p => '+' + fmtW(p[1], 2) + '/s  ' + tx(LIGHT_LABEL[p[0]], { n: n[p[0]] }));
  const mult = [], x = v => fmtW(v, 2), H = w.lv.hearth || 0, so = w.lv.songs || 0, sh = w.lv.shrine || 0;
  if (H) mult.push(tx('w.mult.hearth', { n: H, x: x(1 + D.hearthStep * H) }));
  if (w.cards.firelore) mult.push(tx('w.mult.lore', { x: x(D.fireLore) }));
  if (so) mult.push(tx('w.mult.songs', { n: so, x: x(1 + 0.06 * so) }));
  if (sh) mult.push(tx('sn.tip', { n: sh, pct: Math.round(VC.D.shrineStep * 100 * sh) }));
  if (w.feast > 0) mult.push(tx('w.flow.feast', { pct: Math.round(VC.feastSpec(w).boost * 100) }));
  keptLightLines(w).forEach(t => mult.push(t));
  if (mult.length > 1) mult.push(tx('w.mult.total', { x: x(VC.lightMult(w)) }));
  if (mult.length) mult.unshift({ t: tx('vw.mult.title'), cls: 'tipsep' });
  const extra = w.pct < 100 ? [{ t: tx('w.light.next', { n: fmtW(Math.max(0, VC.lightFor(Math.floor(w.pct) + 1) - w.light)) }), cls: 'tipx' }] : [];
  showTextTip(anchor, tx('w.light.title'), (fl.length ? fl : [tx('w.light.none')]).concat(w.cards.stoking ? [{ t: tx('w.light.stoke'), cls: 'tipx' }] : [], extra, mult));
}
function settlerTip() {
  const w = W(); if (!w || !w.pop) return; const D = VC.D, nx = D.settlerPct[w.pop];
  const lines = [tx('vw.set.room', { room: VC.room(w) }), w.pop >= D.maxSettlers ? tx('vw.set.all') : tx('vw.set.light', { next: w.pop + 1, pct: nx }), tx('vw.set.arrive')];
  showTextTip($('w-sub'), tx('w.set.title'), lines);
}
function settlerHint(w) {
  if (!w.pop || w.pop >= VC.D.maxSettlers) return '';
  if (w.pct < VC.D.settlerPct[w.pop]) return tx('vw.settler.at', { pct: VC.D.settlerPct[w.pop] });
  if (w.pop >= VC.room(w)) return tx('vl.settler.room');
  return tx('vw.settler.soon');
}
function jobTip(j, row) {
  const w = W(), n = w.jobs[j.id] || 0, lines = [j.desc], o = VC.D.job[j.id];
  if (n && o) lines.push(tx('w.jtip.live', { n, jobs: jobName(j, n), list: Object.keys(o).map(k => '+' + fmtW(n * o[k] * VC.jobMult(w, j.id), 2) + ' ' + resName(k).toLowerCase() + '/s').join(', ') }));
  else if (n && j.id === 'firekeeper') lines.push(tx('vw.jtip.keepers', { n, light: fmtW(n * VC.keeperLight(w) * VC.lightMult(w), 2) }));
  else if (n && j.id === 'hauler') lines.push(tx('vw.jtip.haul', { n, w: fmtW(VC.haulRate(w), 2) }));
  else if (!n) lines.push(tx('w.jtip.none'));
  if (j.id === 'hauler') lines.push({ cls: 'tipx', t: tx('vw.jtip.back') });
  lines.push({ cls: 'tipx', t: tx('w.jtip.roster') });
  showTextTip(row, j.name, lines);
}

/* ---------- Rendering ---------- */
function ladderDesc(l) {
  const w = W(), D = VC.D, m = VC.lightMult(w) * (w.m ? MC.phaseMult(w) : 1), b = w.lv.brazier || 0, nl = w.lv.lamp || 0;
  const v = { room: '', pct: '', n: '', use: '', pb: '', b: b, nl: nl, own: '' };
  if (l.storage) { const st = l.storage === 'raw' ? 'wood' : l.storage, g = l.storage === 'raw' ? D.stockGrowth : l.storage === 'food' ? D.foodGrowth : D.ideasGrowth; v.room = fmtW(cap(st) * g); }
  if (l.id === 'hearth') v.pct = Math.round(D.hearthStep * 100);
  if (l.id === 'songs') v.pct = 6; if (l.id === 'shrine') v.pct = Math.round(VC.D.shrineStep * 100);
  if (l.group === 'tools') v.pct = Math.round(D.toolStep * 100);
  if (l.id === 'keepcraft') v.pct = Math.round(D.tendLight * 100); if (l.id === 'frames') v.pct = 20;
  if (l.id === 'brazier') { v.n = fmtW(D.brazier * m, 2); v.pb = fmtW(D.lampPerBrazier * m, 3); }
  if (l.id === 'lamp') { v.n = fmtW((D.lamp + D.lampPerBrazier * b) * m, 3); v.own = fmtW(D.lamp * m, 3); v.pb = fmtW(D.lampPerBrazier * m, 3); }
  if (l.id === 'firepit') { v.n = fmtW(D.firepit * m, 2); v.use = fmtW(D.firepitWood, 2); }
  if (l.id === 'limekiln') { v.n = fmtW(D.limekiln * m, 2); v.use = fmtW(D.kilnStone, 2); }
  if (l.id === 'rushlight') { v.n = fmtW(D.rushlight * m, 2); v.use = fmtW(D.rushFiber, 2); }
  if (l.id === 'keepcraft') v.wpct = Math.round(D.tendWood * 100);
  return fill(l.descEarly && !w.cards.grasswork ? l.descEarly : l.desc, v);
}
function group(boxId, gid, label) {
  let g = $('bg-' + gid);
  if (!g) { g = document.createElement('div'); g.className = 'bgroup'; g.id = 'bg-' + gid; g.innerHTML = '<p class="bgh"></p><div class="acts"></div><div class="burnrows"></div>';
    const order = Object.keys(WORLD.groups), after = Array.from($(boxId).children).find(x => order.indexOf(x.id.slice(3)) > order.indexOf(gid)); $(boxId).insertBefore(g, after || null); }
  g.querySelector('.bgh').textContent = label; return g;
}
// v1h: timed boosts, in words
function surgeWhat(eff) { return eff === 'haul' ? 'hauling' : eff === 'stones' ? 'stone-gathering' : eff === 'food' ? 'foraging' : eff === 'fiber' ? 'twining' : eff === 'wood' ? 'woodcutting' : eff; }
function surgeTag(w, r) { if (!w.m) return ''; const left = MC.surgeLeft(w, r); return left > 0 ? '\u2191' : ''; }   // v1i: a small arrow; the hover says how much and how long
function surgeTitle(w, r) { const left = MC.surgeLeft(w, r); return 'A place just called back: ' + surgeWhat(r) + ' goes ' + Math.round(MC.surgeOf(w, r) * 100) + '% faster for ' + Math.max(1, Math.ceil(left / 60)) + ' more minute' + (Math.ceil(left / 60) > 1 ? 's' : '') + '.'; }
function renderWorld() {
  const w = W(); if (!w) return;
  const D = VC.D, showDone = !!S.showDone, showDoneIdeas = !!S.showDoneIdeas;
  $('w-title').textContent = w.name ? w.name : tx(w.pop ? (w.pop === 1 ? 'w.title.one' : 'w.title.camp') : (w.cards.fire ? 'w.title.fire' : 'w.title.start'));
  $('w-sub').textContent = w.pop ? tx('w.sub', { pop: w.pop, settlers: tx(w.pop === 1 ? 'w.settler' : 'w.settlers'), room: w.m ? MC.room(w) : VC.room(w) }) : '';
  $('h-make-t').textContent = tx('w.h.make'); $('h-jobs-t').textContent = tx('w.h.jobs'); $('h-ideas-t').textContent = tx('vw.h.cards'); $('h-snails-t').textContent = tx('vw.h.snails');
  $('w-name-label').textContent = tx('w.name.label'); $('w-name-btn').textContent = tx('w.name.btn');
  // resources
  const rb = $('w-res');
  for (const r of WORLD.resOrder) {
    if (!w.seen[r]) continue;
    let row = $('res-' + r);
    if (!row) { row = document.createElement('div'); row.id = 'res-' + r; row.className = 'rrow reveal'; row.tabIndex = 0;
      row.innerHTML = '<span class="rn"></span><span class="rv"></span><span class="rr"></span>'; rb.appendChild(row);
      row.dataset.tkeys = 'world.res.' + r + ' w.use.' + r + ' w.use.none w.tip.full w.tip.empty w.tip.isfull w.tip.steady';
      ['mouseenter', 'focus'].forEach(e => row.addEventListener(e, () => showResTip(r, row))); ['mouseleave', 'blur'].forEach(e => row.addEventListener(e, hideTip));
      if (r === 'ideas') row.classList.add('special'); if (r === 'snails') row.classList.add('special', 'snail'); }
    if (!row.children[0].firstChild || row.children[0].firstChild.nodeValue !== resName(r)) row.children[0].textContent = resName(r);
    const c = cap(r), v = w.res[r] || 0, full = v >= c - 0.001, vs = c === Infinity ? fmtC(Math.floor(v)) : fmtC(full ? c : Math.floor(v)), cs = c === Infinity ? '' : '/' + fmtC(c);
    if (row.children[1].dataset.s !== vs + cs) { row.children[1].dataset.s = vs + cs; row.children[1].textContent = vs; if (cs) { const sp = document.createElement('span'); sp.className = 'cp'; sp.textContent = ' ' + cs; row.children[1].appendChild(sp); } }
    const nr = netRate(r), make = flows(r).reduce((a, f) => a + Math.max(0, f[1]), 0), short = r !== 'ideas' && r !== 'snails' && v < 0.01 && demandRate(r) > make + 0.001;
    // v1h: an empty store that something is still drawing on (haulers, burners, smelters, mouths) says so, in red
    const siph = !!w.m && r !== 'ideas' && r !== 'snails' && v < 0.01 && (flows(r).some(f => f[1] < -1e-6) || (!!w.m.proj && !w.m.awaitClick && (w.jobs.hauler || 0) > 0 && ((MC.projNeeds(w) || {})[r] || 0) > 0));
    { const rt = siph ? '<0.01/s' : short ? fmtRate(make - demandRate(r), true) : Math.abs(nr) > 0.00001 ? fmtRate(nr, true) : ''; if (row.children[2].textContent !== rt) row.children[2].textContent = rt; }
    row.classList.toggle('full', full && isFinite(c)); row.classList.toggle('neg', nr < -0.0005); row.classList.toggle('starved', short || siph);
    { const waste = !!w.m && full && isFinite(c) && r !== 'snails' && make > 0.0005; let dt = row.children[0].querySelector('.rdot');   // v1g: settlers still making what has no room
      if (waste && !dt) { dt = document.createElement('i'); dt.className = 'rdot'; dt.title = 'Full, and settlers are still making it'; row.children[0].appendChild(dt); } else if (!waste && dt) dt.remove(); }
    { const tg = surgeTag(w, r); let sg = row.children[0].querySelector('.rsurge');   // v1h: a place just called back quickens this work for a few minutes
      if (tg && !sg) { sg = document.createElement('span'); sg.className = 'rsurge'; sg.title = 'A place just called back: this work goes faster for a few minutes'; row.children[0].appendChild(sg); }
      if (sg) { if (!tg) sg.remove(); else { if (sg.textContent !== tg) sg.textContent = tg; const ti = surgeTitle(w, r); if (sg.title !== ti) sg.title = ti; } } }
  }
  { const want = WORLD.resOrder.map(r => $('res-' + r)).filter(Boolean); if (want.some((e, i) => rb.children[i] !== e)) want.forEach(e => rb.appendChild(e)); }
  // actions
  const ab = $('w-acts');
  if (w.looks < WORLD.looks.length) setBtn(ensureBtn(ab, 'w-look', wLook, 'primary'), tx('w.look'), tx('w.look.sub'), true, { keys: ['w.look', 'w.look.sub'] });
  else if ($('w-look')) $('w-look').remove();
  if (w.cards.fire && w.cards.stoking && !w.m) { const sw = w.cards.bellows ? D.bellowsWood : D.stokeWood;
    setBtn(ensureBtn(ab, 'w-stoke', wStoke, 'primary'), tx('w.stoke'), tx('w.stoke.sub', { wood: sw, light: fmtW(sw * D.perWood * VC.lightMult(w), 2) }), w.res.wood >= sw, { keys: ['w.stoke', 'w.stoke.sub'] }); }
  for (const g of WORLD.gathers) {
    const ok = g.res === 'wood' ? w.seen.wood : g.res === 'stones' ? w.cards.lookcloser : g.res === 'fiber' ? w.cards.grasswork : w.cards.foraging;
    if (!ok) continue; const amt = w.m ? MC.gatherAmount(w, g.res) : VC.gatherAmount(w, g.res);
    // v1q fix (owner's playtest): a full store never blocks learning. While hands still turn up ideas, gathering stays open
    const full = w.res[g.res] >= cap(g.res) - 0.001, hi = w.m ? 0 : VC.handIdeas(w), learns = hi > 0 && (w.res.ideas || 0) < cap('ideas') - 0.001;
    setBtn(ensureBtn(ab, 'w-g-' + g.res, () => (W().m ? mGather(g.res) : wGather(g.res))), g.res === 'wood' && w.cards.woodcutting ? g.labelAxe : g.label, full && learns ? 'The ' + resName(g.res).toLowerCase() + ' store is full, but your hands still turn up ideas: +' + fmtW(hi, 2) + ' a click.' : tx('w.gather.sub', { n: fmtW(amt, amt % 1 ? 1 : 0), res: resName(g.res).toLowerCase() }) + (hi >= 0.005 ? ' ' + tx('w.gather.ideas', { n: fmtW(hi, 2) }) : ''), !full || learns,
      { keys: itemKeys('world.gather', g, ['label', 'labelAxe']).concat(['w.gather.sub']) });
  }
  // r1c (owner, 2026-10-18): the gathering buttons keep their own order (wood beside stone), whatever order they opened in
  { let prev = null; for (const g of WORLD.gathers) { const b = $('w-g-' + g.res); if (!b) continue; if (prev && b.previousElementSibling !== prev) prev.after(b); prev = b; } }
  renderFeast(w);
  if (w.m) { renderMapPhase(w); return; }
  // Buildings: every open ladder, grouped (light, homes, storage, tools)
  let anyMake = false, doneB = 0;
  for (const l of VC.LADDERS) {
    if (l.group === 'snails' || l.id === 'songs' || !VC.ladderOpen(w, l)) continue;   // v1s: Fire song lives with the ideas and upgrades
    const id = 'w-b-' + l.id, n = w.lv[l.id] || 0, g = group('w-make', l.group, WORLD.groups[l.group]);
    if (VC.ladderMaxed(w, l)) { doneB++;
      if (!showDone) { if ($(id)) $(id).remove(); continue; }
      anyMake = true; const db = ensureBtn(g.querySelector('.acts'), id, () => {}); db.classList.add('done');
      setBtn(db, l.name + ' (' + n + ')', ladderDesc(l), false, { kind: lineKind(l.id), note: tx('w.maxed', { n: l.max }), keys: ['world.lad.' + l.id + '.name', 'world.lad.' + l.id + '.desc', 'w.maxed'] }); continue; }
    anyMake = true;
    const bb = ensureBtn(g.querySelector('.acts'), id, () => wLevel(l.id)); impactTip(bb, x => { x.lv[l.id] = (x.lv[l.id] || 0) + 1; if (l.burns && x.on[l.id] != null) x.on[l.id]++; });
    const c = VC.ladderCost(w, l);
    setBtn(bb, l.name + (n ? ' (' + n + ')' : ''), ladderDesc(l), VC.canPay(w, c), { kind: lineKind(l.id), cost: c, note: l.max ? tx('vw.levels', { n, max: l.max }) : '', keys: ['world.lad.' + l.id + '.name', 'world.lad.' + l.id + '.desc', 'w.cost', 'w.over', 'vw.levels'] });
  }
  // burners: switch some off to save their fuel
  for (const id of ['firepit', 'limekiln', 'rushlight']) {
    const l = VC.LAD[id], n = w.lv[id] || 0, gb = $('bg-light'); if (!gb) continue; const box = gb.querySelector('.burnrows'); let row = $('burn-' + id);
    if (!n) { if (row) row.remove(); continue; }
    if (!row) { row = document.createElement('div'); row.id = 'burn-' + id; row.className = 'jrow brow reveal';
      row.innerHTML = '<span class="jn"></span><span class="jt"></span><button class="jb" aria-label="Bank one">−</button><span class="jc"></span><button class="jb" aria-label="Light one">+</button>';
      row.children[2].addEventListener('click', () => wBurn(id, -1)); row.children[4].addEventListener('click', () => wBurn(id, 1)); box.appendChild(row); }
    const on = VC.burnersOn(w, id); row.children[0].textContent = tx('vw.burn.lit', { name: l.name });
    row.children[1].textContent = tx('vw.burn.row', { use: fmtW(on * (id === 'firepit' ? D.firepitWood : id === 'limekiln' ? D.kilnStone : D.rushFiber), 2), res: resName(l.burns).toLowerCase() }) + partTag(l.burns);
    row.children[3].textContent = on + '/' + n; row.children[2].disabled = !on; row.children[4].disabled = on >= n; row.dataset.tkeys = 'vw.burn.lit vw.burn.row';
  }
  $('w-showdone').textContent = tx(showDone ? 'w.hidedone' : 'w.showdone') + ' (' + doneB + ')'; $('w-showdone').classList.toggle('hidden', !doneB);
  [].forEach.call($('w-make').children, g => g.classList.toggle('hidden', !g.querySelector('button.act')));
  $('h-make').classList.toggle('hidden', !anyMake && !doneB);
  // settlers
  const jb = $('w-jobs');
  if (w.pop) {
    $('h-jobs').classList.remove('hidden'); if (!unassignArmed) $('w-unassign').textContent = tx('w.unassign'); $('w-unassign').classList.toggle('hidden', w.pop < 6);
    $('w-idle').textContent = tx('w.idle', { free: w.pop - VC.jobsTotal(w), pop: w.pop, food: D.eat }) + (VC.hungerMult(w) < 0.999 ? ' ' + tx('w.idle.hungry') : '');
    for (const j of VC.JOBS) {
      if (!VC.jobOpen(w, j.id)) continue;
      let row = $('job-' + j.id);
      if (!row) {
        row = document.createElement('div'); row.id = 'job-' + j.id; row.className = 'jrow reveal'; row.tabIndex = 0;
        row.innerHTML = '<span class="jn"></span><span class="jt"></span><button class="jb" aria-label="Remove one">−</button><span class="jc"></span><button class="jb" aria-label="Add one">+</button>';
        ['mouseenter', 'focus'].forEach(ev => row.addEventListener(ev, () => jobTip(j, row))); ['mouseleave', 'blur'].forEach(ev => row.addEventListener(ev, hideTip));
        row.children[2].addEventListener('click', e => { wJob(j.id, -1, e); if (row.matches(':hover')) jobTip(j, row); });
        row.children[4].addEventListener('click', e => { wJob(j.id, 1, e); if (row.matches(':hover')) jobTip(j, row); });
        const after = Array.from(jb.querySelectorAll('.jrow')).find(r => VC.JOBS.findIndex(x => 'job-' + x.id === r.id) > VC.JOBS.indexOf(j));
        jb.insertBefore(row, after || null);
      }
      if (row.children[0].textContent !== j.name) row.children[0].textContent = j.name; if (row.children[1].textContent !== j.tag) row.children[1].textContent = j.tag;   // v1r: write only what changed
      row.dataset.tkeys = ['world.job.' + j.id + '.name', 'world.job.' + j.id + '.desc', 'world.job.' + j.id + '.tag', 'w.jtip.live', 'w.jtip.none', 'w.jtip.roster'].join(' ');
      row.children[3].textContent = w.jobs[j.id] || 0;
      row.children[2].disabled = !(w.jobs[j.id] > 0); row.children[4].disabled = VC.jobsTotal(w) >= w.pop;
      // haulers with nothing to carry get a glowing dot
      if (j.id === 'hauler') row.classList.toggle('hint', steady('haulIdleV', (w.jobs.hauler || 0) > 0 && (!w.proj || w.proj.paused)));   // v1r: held steady, so it can't flicker
    }
  }
  // Ideas & upgrades: every buy-once card in one box, each labelled with its kind
  if (w.seen.ideas || w.cards.lookcloser) {
    const box = $('w-research'); let any = false, doneC = 0;
    { const l = VC.LAD.songs, id = 'w-b-songs';   // v1s (owner): Fire song is an upgrade bought with ideas, so it sits here, first
      if (VC.ladderOpen(w, l)) { const n = w.lv.songs || 0;
        if (VC.ladderMaxed(w, l)) { doneC++; if (!showDoneIdeas) { if ($(id)) $(id).remove(); }
          else { any = true; const db = ensureBtn(box, id, () => {}); db.classList.add('done'); setBtn(db, l.name + ' (' + n + ')', ladderDesc(l), false, { kind: 'upgrade', note: tx('w.maxed', { n: l.max }) }); } }
        else { any = true; const sb = ensureBtn(box, id, () => wLevel('songs')); sb.classList.remove('done'); impactTip(sb, x => { x.lv.songs = (x.lv.songs || 0) + 1; }); const c = VC.ladderCost(w, l);
          setBtn(sb, l.name + (n ? ' (' + n + ')' : ''), ladderDesc(l), VC.canPay(w, c), { kind: 'upgrade', cost: c, note: tx('vw.levels', { n, max: l.max }), keys: ['world.lad.songs.name', 'world.lad.songs.desc', 'w.cost', 'w.over', 'vw.levels'] }); }
        if ($(id) && box.firstChild !== $(id)) box.insertBefore($(id), box.firstChild); } }
    for (const c of VC.CARDS) {
      const id = 'w-r-' + c.id;
      if (w.cards[c.id] != null) { doneC++;
        if (!showDoneIdeas) { if ($(id)) $(id).remove(); continue; }
        any = true; const b = ensureBtn(box, id, () => {}); b.classList.add('done');
        setBtn(b, c.name, c.desc, false, { kind: c.kind, note: tx('w.learned'), keys: ['world.card.' + c.id + '.name', 'world.card.' + c.id + '.desc', 'vw.kind.' + c.kind, 'w.learned'] }); continue; }
      if (!VC.gateOk(w, c.at)) { if ($(id)) $(id).remove(); continue; }
      any = true; const b = ensureBtn(box, id, () => wCard(c.id)); b.classList.remove('done');
      impactTip(b, x => { x.cards[c.id] = true; });
      const cc = VC.cardCost(w, c); setBtn(b, c.name, c.desc, VC.canPay(w, cc), { kind: c.kind, cost: cc, note: cc !== c.cost ? oldLessonsNote(w) : '', keys: ['world.card.' + c.id + '.name', 'world.card.' + c.id + '.desc', 'vw.kind.' + c.kind, 'w.cost', 'w.over'] });
    }
    $('w-showdone-ideas').textContent = tx(showDoneIdeas ? 'w.hidedone' : 'w.showdone') + ' (' + doneC + ')'; $('w-showdone-ideas').classList.toggle('hidden', !doneC);
    $('h-ideas').classList.toggle('hidden', !any && !doneC);
  }
  // snails, last
  { let any = false; for (const l of VC.LADDERS) { if (l.group !== 'snails' || !VC.ladderOpen(w, l)) continue; any = true;
      const id = 'w-b-' + l.id, n = w.lv[l.id] || 0, maxed = VC.ladderMaxed(w, l), b = ensureBtn($('w-snails'), id, () => wLevel(l.id)); const c = VC.ladderCost(w, l);
      b.classList.toggle('done', maxed);
      setBtn(b, l.name + (n ? ' (' + n + ')' : ''), ladderDesc(l), !maxed && VC.canPay(w, c), maxed ? { kind: 'upgrade', note: tx('w.maxed', { n: l.max }) } : { kind: 'upgrade', cost: c, keys: ['world.lad.' + l.id + '.name', 'world.lad.' + l.id + '.desc'] }); }
    $('h-snails').classList.toggle('hidden', !any); }
  $('w-naming').classList.toggle('hidden', !(w.flags.askName && !w.name));
  renderDrawer(w);
}
function renderFeast(w) {
  const pill = $('w-feast');
  if (!w.cards.feasting) { pill.classList.add('hidden'); return; }
  pill.classList.remove('hidden'); const on = w.feast > 0, b = $('fs-feast'); pill.classList.toggle('on', on);
  b.textContent = on ? tx('f.pill.on', { t: fmtTime(w.feast) }) : tx('f.pill', { n: fmtW(VC.feastCost(w)) });
  b.disabled = on || w.res.food < VC.feastCost(w);
  const fsp = VC.feastSpec(w); if (fsp !== VC.D.feast && !on) b.textContent = 'Harvest ' + b.textContent.charAt(0).toLowerCase() + b.textContent.slice(1);
  b.title = tx('w.feast.sub', { pct: Math.round(fsp.boost * 100), m: Math.round(fsp.secs / 60) }) + ' ' + tx('vw.feast.cost', { n: fsp.perSettler });
  $('fs-bar').style.width = on ? (w.feast / fsp.secs * 100).toFixed(1) + '%' : '0%';
}
// the next share of light at which a card can appear (never says what)
function nextMilestone(w) { const ps = VC.CARDS.filter(c => w.cards[c.id] == null && c.at && c.at.pct != null && c.at.pct > w.pct).map(c => c.at.pct); return ps.length ? Math.min.apply(null, ps) : (w.pct < 100 ? 100 : null); }
function projFrac(w) {
  if (!w.proj) return 0; const p = VC.PROJ[w.proj.id], n = p.stages.length, st = p.stages[w.proj.stage];
  const tot = Object.keys(st.cost).reduce((a, k) => a + st.cost[k], 0), got = Object.keys(st.cost).reduce((a, k) => a + Math.min(st.cost[k], w.proj.got[k] || 0), 0);
  return (w.proj.stage + got / tot) / n;
}
function renderDrawer(w) {
  const dr = $('w-drawer'), vs = $('w-vstrip'), ps = $('w-pstrip');
  if (!w.cards.fire) { dr.classList.add('hidden'); return; }
  dr.classList.remove('hidden');
  const closed = w.drawer === 'closed'; dr.classList.toggle('closed', closed); $('dr-toggle').textContent = tx(closed ? 'dr.show' : 'dr.hide');
  if (closed) { const parts = [tx('dr.sum.home', { pct: fmtW(Math.floor(w.pct)) })];
    if (w.proj) parts.push(tx('dr.sum.vp', { name: VC.PROJ[w.proj.id].name, pct: fmtW(Math.floor(projFrac(w) * 100)) }));
    $('dr-sum').textContent = parts.join(' · '); return; }
  $('dr-sum').textContent = '';
  vs.classList.remove('hidden');
  $('vl-lab').textContent = tx('vl.lab'); $('vl-name').textContent = w.name || tx('vl.name');
  $('vl-rate').textContent = tx('w.lrate', { n: fmtW(VC.lightRate(w), 2) });
  const pt = fmtW(Math.floor(w.pct * 10) / 10, 1) + '%', pe = $('vl-pct'), rest = tx('vl.lit');
  if (pe.dataset.s !== pt + rest) { pe.dataset.s = pt + rest; pe.textContent = ''; const bb = document.createElement('b'); bb.textContent = pt; pe.append(bb, rest); }
  let left = '';
  if (w.pct >= 100) left = w.done.beacon ? tx('vw.done') : tx('vl.wait');
  else { const nx = nextMilestone(w), parts = [];
    if (nx != null) parts.push(fill(WORLD.text.hint, { pct: nx }));
    const lr = VC.lightRate(w); if (lr > 0 && w.pct >= 90) parts.push(tx('vl.full', { t: fmtTime((VC.D.barTotal - w.light) / lr) }));
    const sh = settlerHint(w); if (sh) parts.push(sh); left = parts.join(' · '); }
  $('vl-left').textContent = left; $('vl-bar').style.width = w.pct.toFixed(2) + '%';
  { const va = vs.querySelector('.st-act'); if (w.flags.end && !w.m) setBtn(ensureBtn(va, 'vl-map', startMap, 'primary'), 'Open the map', 'Choose land beyond your home', true, {}); }
  // the project being built
  if (!w.proj) { ps.classList.add('hidden'); $('vp-act').innerHTML = ''; return; }
  ps.classList.remove('hidden');
  const p = VC.PROJ[w.proj.id], st = p.stages[w.proj.stage], n = p.stages.length, f = projFrac(w), need = VC.projNeeds(w), draw = VC.haulDraw(w);
  $('vp-lab').textContent = tx('vp.lab'); $('vp-name').textContent = p.name;
  const nxs = p.stages[w.proj.stage + 1];
  $('vp-step').textContent = tx('vp.step', { k: w.proj.stage + 1, n, name: st.name }) + (nxs ? ' \u00b7 ' + tx('vw.nextstage', { name: nxs.name, list: Object.keys(nxs.cost).map(k => fmtW(nxs.cost[k]) + ' ' + resName(k).toLowerCase()).join(', ') }) : '') + (w.queue.length ? ' \u00b7 ' + tx('vw.next', { name: VC.PROJ[w.queue[0]].name }) : '');
  const tr = $('vp-track'); tr.style.setProperty('--segs', n); tr.classList.toggle('one', n === 1);
  const ft = fmtW(Math.floor(f * 1000) / 10, 1) + '%', fe = $('vp-pct'), rest2 = tx('vp.built');
  if (fe.dataset.s !== ft + rest2) { fe.dataset.s = ft + rest2; fe.textContent = ''; const bb = document.createElement('b'); bb.textContent = ft; fe.append(bb, rest2); }
  const remaining = Object.keys(need).reduce((a, k) => a + need[k], 0), flow = Object.keys(need).reduce((a, k) => a + haulShown(k), 0);
  { const noH = !w.proj.paused && !(w.jobs.hauler > 0); $('vp-left').textContent = w.proj.paused ? tx('vp.paused') : noH ? tx('vp.nohaul') : tx('vw.stage.left', { t: fmtTime(flow > 0 ? remaining / flow : Infinity) });
    $('vp-left').classList.toggle('nohaul', noH); $('w-pstrip').classList.toggle('nohaul', noH); }
  $('vp-bar').style.width = (f * 100).toFixed(2) + '%';
  const items = Object.keys(st.cost).filter(k => need[k] > 1e-6).map(k => tx('vl.draw', { res: resName(k), got: fmtW(Math.floor(st.cost[k] - need[k])), need: fmtW(st.cost[k]) }) + (haulShown(k) > 0.005 ? '  ' + tx('vl.draw.rate', { n: fmtW(haulShown(k), 2) }) : (draw[k] && !(w.res[k] > 0.01) ? '  ' + tx('vw.draw.empty') : '')));
  const dl = $('vp-draw'), sig = items.join('|'); if (dl.dataset.s !== sig) { dl.dataset.s = sig; dl.innerHTML = ''; items.forEach(t => { const sp = document.createElement('span'); sp.textContent = t; dl.appendChild(sp); }); }
  const fb = ensureBtn($('vp-act'), 'vp-feed', wPause, 'slim'); fb.classList.remove('reveal');
  setBtn(fb, tx(w.proj.paused ? 'vw.btn.resume' : 'vw.btn.pause'), '', true, { keys: ['vw.btn.pause', 'vw.btn.resume'] });
}
hoverTip($('vl-rate'), () => (inMap() ? mapLightTip($('vl-rate')) : lightTip($('vl-rate'))));
hoverTip($('w-sub'), settlerTip);
hoverTip($('vp-name'), () => { const w = W(); if (inMap()) return mapProjTip($('vp-name'), true); if (!w || !w.proj) return; const p = VC.PROJ[w.proj.id];
  showTextTip($('vp-name'), p.name, [p.gives].concat(p.stages.map((st, i) => tx('vp.step', { k: i + 1, n: p.stages.length, name: st.name }) + ': ' + (i < w.proj.stage ? tx('vp.tip.done') : tx('vp.tip.needs', { list: Object.keys(st.cost).map(k => fmtW(st.cost[k]) + ' ' + resName(k).toLowerCase()).join(', ') }))))); });
hoverTip($('vp-track'), () => { const w = W(); if (inMap()) return mapProjTip($('vp-track'), false); if (!w || !w.proj) return; const p = VC.PROJ[w.proj.id];
  showTextTip($('vp-track'), p.name, p.stages.map((st, i) => tx('vp.step', { k: i + 1, n: p.stages.length, name: st.name }) + ': ' + (i < w.proj.stage ? tx('vp.tip.done') : tx('vp.tip.needs', { list: Object.keys(st.cost).map(k => fmtW(st.cost[k]) + ' ' + resName(k).toLowerCase()).join(', ') }))).concat([{ cls: 'tipx', t: p.gives }, { cls: 'tipx', t: tx('vw.tip.store') }])); });
$('w-unassign').addEventListener('click', () => { const w = W(); if (!w) return;
  if (!unassignArmed) { unassignArmed = true; $('w-unassign').textContent = tx('vw.unassign.sure'); setTimeout(() => { unassignArmed = false; renderWorld(); }, 4000); return; }
  unassignArmed = false; for (const k in w.jobs) w.jobs[k] = 0; w.haulFrom = {}; renderWorld(); });
$('w-showdone').addEventListener('click', () => { S.showDone = !S.showDone; renderWorld(); save(true); });
$('w-showdone-ideas').addEventListener('click', () => { S.showDoneIdeas = !S.showDoneIdeas; renderWorld(); save(true); });

