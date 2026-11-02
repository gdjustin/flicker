/* ---------- the map ---------- */
// time to call a place back, short, for the big label on the tile
// v1h: the time on a tile, rounded as v24e: minutes under 90 minutes, hours under 2 days, then days, whole numbers
function etaShort(sec) { if (!isFinite(sec) || sec > 999 * 86400) return '\u2014'; if (sec < 5400) return Math.max(1, Math.round(sec / 60)) + 'm'; if (sec < 172800) return Math.round(sec / 3600) + 'h'; return Math.round(sec / 86400) + 'd'; }
// the map shows the known world: a window a few steps past the farthest place called back (the world's size stays hidden)
function mapRadius(w) { return Math.max(6, Math.min((MC.MAP.size - 1) / 2, (w.m.maxStep || 0) + 3)); }
/* the map's zoom (owner, 2026-10-18): the map keeps its zoom as the land grows; scroll or drag it, + and − in the corner.
   MV.cell is a place's size in pixels; the first time, 13 places fit across (the starting land). */
function mapView() { return $('m-view'); }
function mapZoom(w, f) {
  const v = mapView(), st = $('m-stage'); if (!v || !st || !v.clientWidth) return; const vw = v.clientWidth, n = 2 * (MV.V || 6) + 1, fit = Math.max(vw, v.clientHeight) / n;   // the map fills its box (no longer square): at the widest zoom it still covers it
  if (!MV.cell) MV.cell = Math.max(fit, Math.min(vw, v.clientHeight) / 13);
  if (f) { const W0 = st.offsetWidth, cx = (v.scrollLeft + vw / 2) / W0, cy = (v.scrollTop + v.clientHeight / 2) / W0;
    MV.cell = Math.max(fit, Math.min(120, MV.cell * f)); st.style.setProperty('--cell', MV.cell + 'px'); const W1 = st.offsetWidth;
    v.scrollLeft = cx * W1 - vw / 2; v.scrollTop = cy * W1 - v.clientHeight / 2; }
  else if (MV.cell < fit) MV.cell = fit;
  if (st.style.getPropertyValue('--cell') !== MV.cell + 'px') st.style.setProperty('--cell', MV.cell + 'px');
  $('m-zin').disabled = MV.cell >= 120; $('m-zout').disabled = MV.cell <= fit + 0.5;
  if (!MV.centred && st.offsetWidth) { MV.centred = true; v.scrollLeft = (st.offsetWidth - vw) / 2; v.scrollTop = (st.offsetWidth - v.clientHeight) / 2; }
}
(function mapPan() {
  const v = mapView(); if (!v) return; let d = null;
  v.addEventListener('pointerdown', e => { if (e.button !== 0 || e.pointerType !== 'mouse') return; /* touch scrolls natively */ d = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop, moved: false, id: e.pointerId }; });
  v.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) { d.moved = true; v.classList.add('drag'); try { v.setPointerCapture(d.id); } catch (er) {} }
    if (d.moved) { v.scrollLeft = d.l - dx; v.scrollTop = d.t - dy; } });
  const end = () => { if (!d) return; if (d.moved) { MV.dragEnd = Date.now(); v.classList.remove('drag'); } d = null; };
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
  v.addEventListener('click', e => { if (MV.dragEnd && Date.now() - MV.dragEnd < 250) { e.stopPropagation(); e.preventDefault(); } }, true);
  $('m-lens').addEventListener('click', e => { const g = e.target.closest('[data-regs]'); if (g) { MV.regs = !MV.regs; MV.lastMap = 0; renderWorld(); return; } const b = e.target.closest('[data-l]'); if (!b) return; MV.regs = false; MV.lens = b.dataset.l || null; MV.lastMap = 0; renderWorld(); });
  $('m-zin').addEventListener('click', () => mapZoom(W(), 1.25)); $('m-zout').addEventListener('click', () => mapZoom(W(), 0.8));
})();
function buildMapGrid(V) {
  const g = $('m-grid'); if (MV.cells && MV.V === V) return; const V0 = MV.V; g.innerHTML = ''; MV.cells = {}; MV.V = V;
  { const v = mapView(); if (v && V0 && V > V0 && MV.cell) { const d = (V - V0) * MV.cell; requestAnimationFrame(() => { v.scrollLeft += d; v.scrollTop += d; }); } }   // the land grows on every side: keep the view where it was
  g.style.gridTemplateColumns = 'repeat(' + (2 * V + 1) + ', 1fr)'; $('m-stage').style.setProperty('--n', 2 * V + 1);
  { const h = $('m-home'), n = 2 * V + 1; if (h) { h.style.left = h.style.top = ((V - 0.5) / n * 100) + '%'; h.style.width = h.style.height = (2 / n * 100) + '%'; } }
  for (let y = -V; y <= V; y++) for (let x = -V; x <= V; x++) {
    const k = x + ',' + y, b = document.createElement('button'); b.type = 'button'; b.className = 'cell'; b.dataset.k = k;
    b.innerHTML = '<span class="gl"></span><span class="lb"></span><span class="qn"></span><span class="f" style="display:none"></span><span class="mk"></span><span class="ov"></span><span class="sb"></span>'; b.setAttribute('aria-label', 'Place ' + x + ', ' + (-y)); b.addEventListener('click', () => { MV.sel = k; MV.ampArm = false; MV.ampDir = null; MV.lastMap = 0; renderWorld(); });
    g.appendChild(b); MV.cells[k] = { el: b, cls: '', gl: '', lb: '', qn: '', mk: '' };
  }
}
// v1h: the path the light takes, home to the place being called back, through restored land (shortest)
function beamPath(w) {
  const tg = w.m.target; if (!tg || w.m.tiles[tg]) return null;
  const nb = k => { const [x, y] = k.split(',').map(Number); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(d => (x + d[0]) + ',' + (y + d[1])); };
  const prev = {}, seen = new Set(['0,0']), q = ['0,0'];
  while (q.length) {
    const u = q.shift();
    if (nb(u).includes(tg)) { const p = [tg, u]; let x = u; while (prev[x] != null) { x = prev[x]; p.push(x); } return p.reverse(); }
    for (const v of nb(u)) if (!seen.has(v) && MC.restored(w, v)) { seen.add(v); prev[v] = u; q.push(v); }
  }
  return null;
}
function renderBeam(w, V) {
  const svg = $('m-beam'); if (!svg) return;
  const sig = w.m.target + '|' + w.m.restored + '|' + V; if (svg.dataset.s === sig) return; svg.dataset.s = sig;
  const N = 2 * V + 1; svg.setAttribute('viewBox', '0 0 ' + N + ' ' + N);
  const p = beamPath(w); if (!p) { svg.innerHTML = ''; return; }
  const pts = p.map(k => { const [x, y] = k.split(',').map(Number); return (x + V + 0.5) + ',' + (y + V + 0.5); }).join(' ');
  svg.innerHTML = '<polyline class="stream" points="' + pts + '"/><polyline class="flow" points="' + pts + '"/>';
}

// v1p: map markers (owner, 2026-10-16): O2's medallions for icons, O2's gold corners for the target; times are O1's (CSS)
const MK_ICON = {
  gem: '<path d="M6 9l3-4h6l3 4-6 10z"/><path d="M6 9h12"/>',
  hammer: '<path d="M14 4l6 6-3 3-6-6z"/><path d="M12.5 8.5L4 17l3 3 8.5-8.5"/>',
  tower: '<path d="M7 21V9h10v12"/><path d="M6 9V4h2.5v2h2V4h3v2h2V4H18v5"/><path d="M10.5 21v-4h3v4"/><path d="M10 12.5l4 2.5"/>',
  spark: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><path d="M12 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>'
};
const MK_POS = { tl: 'left:3%;top:3%', tr: 'right:3%;top:3%', br: 'right:3%;bottom:3%', c: 'left:22%;top:22%' };
function medal(icon, pos, size, rim, color, num) {
  const inner = num ? '<text x="12" y="16" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="11" fill="#d9a64e">' + num + '</text>'
    : '<g transform="translate(5.5 5.5) scale(0.54)" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + MK_ICON[icon] + '</g>';
  return '<i class="mm" style="' + MK_POS[pos] + ';width:' + size + '%;height:' + size + '%"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.4" fill="#1f1813" stroke="' + rim + '" stroke-width="1.5"/>' + inner + '</svg></i>';
}
const MK_TARGET = '<i class="tb a"></i><i class="tb b"></i><i class="tb c"></i><i class="tb d"></i>';
const MK_SPARK = '<i class="mm sp" style="left:4%;top:4%;width:30%;height:30%"><svg viewBox="0 0 24 24" fill="none" stroke="#d9a64e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + MK_ICON.spark + '</svg></i>';
function cellMarks(k, cls, qn, rel, anchors, towers) {
  let s = '';
  if (cls.includes('target')) s += MK_TARGET;
  if (qn) s += medal(null, 'tr', 30, '#d9a64e', null, qn);
  // v1r (owner): relic medallions are off the map; the place card shows the relic instead
  if (anchors[k] === 'plan' || (towers[k] && !towers[k].lit)) s += medal('hammer', 'tl', 31, '#d9a64e', '#f3dfae');
  if (cls.includes('ruin') || (towers[k] && towers[k].lit)) s += medal('tower', 'c', 56, towers[k] && towers[k].lit ? '#f3dfae' : '#d9a64e', '#f3dfae');
  // owner, 2026-11-02 (map option A): no stars; attunement shows as the place's light growing warmer (classes m1 to m3)
  return s;
}
// the rebirth branch: mastery's mark, one star a tier along the bottom of the place (bronze, silver, gold)
const MSTAR_COL = ['', '#c98a4b', '#d7dde4', '#f3d48a'];
function mastStars(n) { let s = '<i class="mstars t' + n + '">'; for (let i = 0; i < Math.min(n, 1); i++) s +=   /* r1i (owner): one star, bronze, silver or gold */ '<svg viewBox="0 0 24 24"><path d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6l-6.4 3.5L7 14l-5.3-5 7.2-.9z" fill="' + MSTAR_COL[n] + '" stroke="#1f1813" stroke-width="1.6" stroke-linejoin="round"/></svg>'; return s + '</i>'; }
function renderMap(w) {
  buildMapGrid(mapRadius(w)); renderBeam(w, mapRadius(w)); mapZoom(w);
  const water = {}; MC.MAP.water.forEach(x => { water[x.key] = x; });
  const cones = {}, towers = {}; w.m.amps.forEach(a => { towers[a.x + ',' + a.y] = a; if (a.lit || (MV.ampArm && false)) MC.coneTiles(a, w).forEach(k => { cones[k] = true; }); });
  if (MV.ampDir != null && MV.sel) { const t = tileOf(MV.sel), d = DIRS[MV.ampDir]; if (t) MC.coneTiles({ x: t.x, y: t.y, dir: [d[0], d[1]] }, w).forEach(k => { cones[k] = 'p'; }); }
  const anchors = {}; (w.m.anchors || []).forEach(a => { anchors[a.key] = a.lit ? 'lit' : 'plan'; });
  const known = w.m.known || {}, rel = w.m.relicT || {}, L0 = MC.lightRate(w) * MC.masteryMult(w), lu = w.m.lineup || [], seen = MC.seenTiles(w), rev = w.m.revealed || {}, ruinK = MC.ruinKey();
  const now = Date.now(), reachNow = new Set(); MV.flashU = MV.flashU || {}; MV.wakeU = MV.wakeU || {};
  // owner, 2026-11-02 (map option A): the land shows progress. A red border holds the land made safe; switches darken all but what is left in one layer
  const Cr = cRun(w), Lf = Cr ? cLife() : null, defOn = !!(Cr && cCapOpen(Cr)), attOn = MC.masteryOn(w), sOK = defOn && CB.stdOK(w);
  if ((MV.lens === 'def' && !defOn) || (MV.lens === 'att' && !attOn)) MV.lens = null;
  const safeK = k => k === '0,0' || (!!w.m.tiles[k] && (!CB.byKey(k) || !!Cr.cleared[k]));
  const doneK = k => { const c = CB.byKey(k); if (!c) return true; if (!Cr.cleared[k]) return false; if (!CB.P.off.relics && !(Lf.relics || {})[k]) return false; return !(sOK && Cr.newly[k] && !(Lf.stds || {})[k]); };
  { const lb = $('m-lens'), opts = [[null, 'Everything']].concat(attOn ? [['att', 'Attunement']] : []).concat(defOn ? [['def', 'Defense']] : []), sg = opts.map(o => o[0]).join(',') + '|' + MV.lens + '|' + !!MV.regs;
    lb.classList.remove('hidden');
    if (lb.dataset.s !== sg) { lb.dataset.s = sg; lb.innerHTML = (opts.length > 1 ? opts.map(([id, tt]) => '<button type="button" class="mchip' + (!MV.regs && MV.lens === id ? ' on' : '') + '" data-l="' + (id || '') + '" aria-pressed="' + (!MV.regs && MV.lens === id) + '">' + tt + '</button>').join('') : '') +
      '<button type="button" class="mchip mregb' + (MV.regs ? ' on' : '') + '" data-regs="1" aria-pressed="' + !!MV.regs + '">Regions</button>'; }
    $('v-map').querySelector('.mwrap').classList.toggle('showreg', !!MV.regs); }
  const landSt = {};   // v1p: what you know of each place, for the land canvas
  const sideOf = k => { const [x, y] = k.split(',').map(Number); let best = null, bs = Infinity; [[0, -1, 'top'], [0, 1, 'bottom'], [-1, 0, 'left'], [1, 0, 'right']].forEach(([dx, dy, nm]) => { const n = (x + dx) + ',' + (y + dy); if (!MC.restored(w, n)) return; const st = Math.abs(x + dx) + Math.abs(y + dy); if (st < bs) { bs = st; best = nm; } }); return best || 'bottom'; };
  for (const k in MV.cells) {
    const c = MV.cells[k], t = tileOf(k), cls = ['cell']; let gl = '', lb = '';
    if (k === '0,0') { cls.push('home'); }
    else if (water[k]) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => { const [x, y] = k.split(',').map(Number); return MC.restored(w, (x + d[0]) + ',' + (y + d[1])); }); if (near) { cls.push('land-water'); gl = '~'; } else cls.push('dark'); }
    else if (t && w.m.tiles[k]) {
      cls.push('done', 'land-' + LANDC[t.land]);
      const r0 = t.region; [['bt', 0, -1], ['bb', 0, 1], ['bl', -1, 0], ['br', 1, 0]].forEach(([b, dx, dy]) => { const n = tileOf((t.x + dx) + ',' + (t.y + dy)); if (!n || n.region !== r0) cls.push(b); });
      if (rel[k]) cls.push('relic'); if (anchors[k]) cls.push(anchors[k] === 'lit' ? 'anchored' : 'anchorplan');
      { const mt = MC.masteryOn(w) ? MC.mTier(w, k) : 0; if (mt) cls.push('m' + Math.min(3, mt)); }   // the rebirth branch: mastery shows on the land
      if (defOn && safeK(k)) [['sbt', 0, -1], ['sbb', 0, 1], ['sbl', -1, 0], ['sbr', 1, 0]].forEach(([b, dx, dy]) => { if (!safeK((t.x + dx) + ',' + (t.y + dy))) cls.push(b); });
    } else if (t) {
      cls.push('dark'); if (MC.reachable(w, t)) { cls.push('reach', 'scout', 'land-' + LANDC[t.land]); lb = etaShort((MC.tileCost(t, w) - (w.m.got[k] || 0)) / Math.max(1e-9, L0 * MC.ampMult(w, k))); }
      else if (seen[k] || rev[k]) { cls.push('scout', 'far', 'land-' + LANDC[t.land]); lb = etaShort((MC.tileCost(t, w) - (w.m.got[k] || 0)) / Math.max(1e-9, L0 * MC.ampMult(w, k))); }
      if (known[k]) cls.push('paved');
    }
    if (k === ruinK && !w.m.done.repair && t && (w.m.tiles[k] || MC.reachable(w, t) || seen[k] || rev[k])) { cls.push('ruin'); if (w.m.tiles[k] && !MC.repairStarted(w)) cls.push('ruinwait'); }
    if (towers[k]) cls.push(towers[k].lit ? 'relay' : 'building');
    if (cones[k]) cls.push(cones[k] === 'p' ? 'conep' : 'cone');
    if (k === '0,0' && defOn) [['sbt', 0, -1], ['sbb', 0, 1], ['sbl', -1, 0], ['sbr', 1, 0]].forEach(([b, dx, dy]) => { if (!safeK(dx + ',' + dy)) cls.push(b); });
    if (MV.lens && k !== '0,0') { const litK = !!(t && w.m.tiles[k]), keep = MV.lens === 'def' ? litK && !doneK(k) : litK && MC.mTier(w, k) < MC.D.mastery.tiers; if (!keep) cls.push('ldim'); }
    if (w.m.target === k) cls.push('target'); if (MV.sel === k) cls.push('sel');
    const qi = lu.indexOf(k), qn = qi >= 0 && !w.m.tiles[k] ? String(qi + 1) : ''; if (qn) cls.push('lined');
    // v1k, the v24e map look: new neighbours wake with one pulse; a place called back flashes, then blooms into its land's colour
    if (cls.includes('reach')) { reachNow.add(k); if (MV.prevReach && !MV.prevReach.has(k) && MV.prevV === MV.V) MV.wakeU[k] = now + 1400; }
    if (MV.wakeU[k] > now) cls.push('wake'); if (MV.flashU[k] > now) cls.push('flash');
    // the tile fills like a bar, from the side the light comes in
    { const fe = c.el.children[3], fr = t && !w.m.tiles[k] && (w.m.got[k] || 0) > 0 ? Math.min(1, w.m.got[k] / MC.tileCost(t, w)) : 0;
      const fk = fr > 0 ? sideOf(k) + (fr * 100).toFixed(1) : ''; if (fe.dataset.k !== fk) { fe.dataset.k = fk;
        if (!fk) fe.style.cssText = 'display:none'; else { const sd = sideOf(k), pc = (fr * 100).toFixed(1) + '%'; fe.style.cssText = sd === 'top' || sd === 'bottom' ? 'left:0;right:0;' + sd + ':0;height:' + pc : 'top:0;bottom:0;' + sd + ':0;width:' + pc; } } }
    // v1p: the land canvas shades each place by what you know of it; markers sit on top (O1 times, O2 medallions)
    landSt[k] = k === '0,0' || (t && w.m.tiles[k]) ? 'lit' : cls.includes('reach') ? 'reach' : cls.includes('far') ? 'far' : 'dark';
    { const mk = cellMarks(k, cls, qn, rel, anchors, towers); if (mk !== c.mk) { c.el.children[4].innerHTML = mk; c.mk = mk; } }
    const s = cls.join(' '); if (s !== c.cls) { c.el.className = s; c.cls = s; }
    if (gl !== c.gl) { c.el.firstChild.textContent = gl; c.gl = gl; }
    if (lb !== c.lb) { c.el.children[1].textContent = lb; c.lb = lb; }
    if (qn !== c.qn) { c.el.children[2].textContent = qn; c.qn = qn; }
  }
  MV.prevReach = reachNow; MV.prevV = MV.V;
  LAND.paint($('m-land'), MC.MAP, MV.V, landSt);
  if (Object.keys(MV.wakeU).some(k => MV.wakeU[k] > now) || Object.keys(MV.flashU).some(k => MV.flashU[k] > now)) MV.lastMap = 0;   // keep frames coming while something animates
  // floating rewards
  if (MV.floats && MV.floats.length) { const stage = $('m-stage'); MV.floats.splice(0).forEach(([k, text]) => { const c = MV.cells[k]; if (!c) return; const r = c.el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'mfloat'; f.textContent = text; f.style.left = (r.left - sr.left + r.width / 2) + 'px'; f.style.top = (r.top - sr.top - 4) + 'px'; stage.appendChild(f);
    requestAnimationFrame(() => { f.style.transform = 'translate(-50%, -36px)'; f.style.opacity = '0'; }); setTimeout(() => f.remove(), 2000); }); }
  // the world so far
  const m = meta(), hsNow = m.hsLife;
  { const pl = (n, one, many) => fmtW(n) + ' ' + (n === 1 ? one : many), rd = MC.regionsDone(w), hn = w.m.hsNew || 0;   // v1r (owner): run 1 shows only what run 1 has
    $('m-world').textContent = w.m.whole
      ? 'Whole · ' + pl(w.m.restored, 'place', 'places') + ' called back · ' + pl(rd, 'region', 'regions') + ' finished · memory ×' + fmtW(MC.memMult(w), 2) + ' (' + fmtW(w.m.memHS || 0) + ' heartstones' + (w.m.hsPending ? ', ' + fmtW(w.m.hsPending) + ' more waiting for the traveler' : '') + ')' + (MC.masteryOn(w) ? ' · attunement: new land ×' + fmtW(MC.masteryMult(w), 2) : '')
      : MC.D.rb.on && w.m.rbAt && m.run === 1 ? ''   // r1d (owner): run 1 shows no run line; it comes back from run 2
      : MC.D.rb.on && w.m.rbAt ? 'Run ' + m.run + ' of ' + MC.D.rb.last + ' · ' + pl(w.m.restored, 'place', 'places') + ' called back · rebirth at ' + w.m.rbAt + ' · ' + pl(rd, 'region', 'regions') + ' finished · memory ×' + fmtW(MC.memMult(w), 2) + (m.run > 1 ? ' · ' + pl(hn, 'new heartstone', 'new heartstones') + ' this run' : ' · ' + pl(hn, 'heartstone', 'heartstones'))
      : m.run > 1
      ? 'Run ' + m.run + ' · ' + pl(w.m.restored, 'place', 'places') + ' called back (best ' + Math.max(m.best || 0, w.m.restored) + ') · ' + pl(rd, 'region', 'regions') + ' finished · memory ×' + fmtW(MC.memMult(w), 2) + ' · ' + pl(hn, 'new heartstone', 'new heartstones') + ' this run (' + fmtW(hsNow) + ' remembered)'
      : pl(w.m.restored, 'place', 'places') + ' called back · ' + pl(rd, 'region', 'regions') + ' finished · ' + pl(hn, 'heartstone', 'heartstones'); }
  $('m-world').classList.toggle('hidden', !$('m-world').textContent);
  renderPanel(w); renderRegions(w);
}
// v1h: every region you've set foot in, as v24e: a pip per place in map order (filled once back, dashed when picked or lined up), "N of M", a tick when finished
// owner, 2026-11-02: the regions as a full-width table under the map, a checklist of checklists: a column per layer opened, a tick when a region finishes one
function renderRegions(w) {
  const box = $('m-regtab'), seenR = {}; Object.keys(w.m.tiles).forEach(k => { const t = tileOf(k); if (t) seenR[t.region] = true; });
  const Cr = cRun(w), Lf = Cr ? cLife() : null, defOn = !!(Cr && cCapOpen(Cr)), attOn = MC.masteryOn(w), sOK = defOn && CB.stdOK(w), top = MC.D.mastery.tiers, selR = MV.sel && tileOf(MV.sel) ? tileOf(MV.sel).region : -1;
  const rows = Object.keys(seenR).map(Number).sort((a, b) => a - b).map(i => { const r = MC.REGIONS[i], N = r.tiles.length, lit = r.tiles.filter(k => w.m.tiles[k]);
    const o = { r, N, n: lit.length, lr: lit.filter(k => (w.m.relicT || {})[k]).length };
    if (attOn) o.att = lit.filter(k => MC.mTier(w, k) >= top).length;
    if (defOn) { o.safe = lit.filter(k => !CB.byKey(k) || Cr.cleared[k]).length; o.fin = lit.filter(k => { const c = CB.byKey(k); if (!c) return true; if (!Cr.cleared[k]) return false; if (!CB.P.off.relics && !(Lf.relics || {})[k]) return false; return !(sOK && Cr.newly[k] && !(Lf.stds || {})[k]); }).length; o.br = lit.filter(k => (Lf.relics || {})[k]).length; }
    return o; });
  const sig = JSON.stringify([attOn, defOn, selR, rows.map(o => [o.r.i, o.n, o.att, o.safe, o.fin, o.lr, o.br])]);
  if (box.dataset.s === sig) return; box.dataset.s = sig;
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const cell = (n, N, cls) => '<span class="rtc ' + cls + '"><span class="rtn"><span>' + n + ' of ' + N + '</span>' + (n >= N ? '<b class="rtk">✓</b>' : '') + '</span><span class="rtb"><i style="width:' + (N ? Math.min(100, n / N * 100) : 0).toFixed(1) + '%"></i></span></span>';
  const cols = 'rt' + (attOn ? 'a' : '') + (defOn ? 'd' : '');
  box.innerHTML = '<p class="msec">Regions</p><div class="mrt ' + cols + '" role="table" aria-label="Regions">' +
    '<div class="rth" role="row"><span>Region</span><span>Called back</span>' + (attOn ? '<span>Fully attuned</span>' : '') + (defOn ? '<span>Made safe</span><span>Finished</span>' : '') + '<span>Relics</span></div>' +
    rows.map(o => '<button type="button" class="rtr' + (o.r.i === selR ? ' sel' : '') + '" role="row" data-r="' + o.r.i + '"><span class="rtname"><span>' + esc(capFirst(o.r.name)) + '</span><span class="mmut">' + esc(LANDN[o.r.land] || '') + '</span></span>' +
      cell(o.n, o.N, 'lit') + (attOn ? cell(o.att, o.N, 'att') : '') + (defOn ? cell(o.safe, o.N, 'safe') + cell(o.fin, o.N, 'fin') : '') +
      '<span class="rtrel">' + relicMedalSvg(o.r.land, 14, o.lr > 0) + ' ' + o.lr + (defOn ? ' &nbsp;' + relicShieldSvg(o.r.land, 13, o.br > 0) + ' ' + o.br : '') + '</span></button>').join('') + '</div>';
}
// a click on a region's row: the map centres on that region
function mapCentreRegion(i) { const r = MC.REGIONS[i], v = mapView(); if (!r || !v || !MV.cells) return; let sx = 0, sy = 0, n = 0; r.tiles.forEach(k => { const c = MV.cells[k]; if (!c) return; sx += c.el.offsetLeft + c.el.offsetWidth / 2; sy += c.el.offsetTop + c.el.offsetHeight / 2; n++; });
  if (!n) return; v.scrollTo({ left: sx / n - v.clientWidth / 2, top: sy / n - v.clientHeight / 2, behavior: 'smooth' }); }
$('m-regtab').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; MV.regs = false; MV.lastMap = 0; renderWorld(); requestAnimationFrame(() => mapCentreRegion(+b.dataset.r)); });
// r1d (owner): one look for a region's row, on the map and on the Relics tab: its name, a pip per place in map order
// (filled once back, dashed when picked or lined up), "N of M", a tick when finished. `note`: a muted line under it
function regionRowHtml(w, r, note) {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const n = regionCount(w, r), N = r.tiles.length, fin = n === N, lu = w.m.lineup || [], xy = k => k.split(',').map(Number);
  let pips = ''; r.tiles.slice().sort((a, b) => { const p = xy(a), q = xy(b); return p[1] - q[1] || p[0] - q[0]; }).forEach(k => {
    pips += '<i class="pip' + (w.m.tiles[k] ? ' on' : (w.m.target === k || lu.includes(k)) ? ' nx' : '') + '"></i>'; });
  let ct = fin ? '\u2713' : n + ' of ' + N, tt = '';
  if (MC.masteryOn(w)) { const mp = Math.round(MC.regionMastery(w, r.i) * 100); if (mp > 0 || w.m.mreg === r.i) { ct += ' \u00b7 \u2605' + mp + '%'; tt = mp + '% attuned' + (w.m.mreg === r.i ? ' (attuning now)' : ''); } }
  return '<div class="mreg' + (fin ? ' fin' : '') + (note ? ' noted' : '') + '"><span>' + esc(capFirst(r.name)) + '</span><span class="tally" aria-label="' + n + ' of ' + N + ' back">' + pips +
    '<span class="tct"' + (tt ? ' title="' + esc(tt) + '"' : '') + '>' + ct + '</span></span>' + (note ? '<span class="mreg-x">' + esc(note) + '</span>' : '') + '</div>';
}
// owner, 2026-11-02 (place cards, option B): the place's land and region, its relics as symbols (filled once found), then one row per layer opened:
// Light as its attunement and a bar (no words under it), Defense as two dots (made safe, standard raised) with what is next, and the way to the battle front
function placeHead(w, k, t, r, box) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const Cr = cRun(w), L = Cr ? cLife() : null, defOn = !!(Cr && cCapOpen(Cr)), c = CB.byKey(k), hasL = !!(w.m.relicT && w.m.relicT[k]), hasB = !!(L && L.relics[k]);
  const hd = document.createElement('div'); hd.className = 'mphead';
  hd.innerHTML = '<span class="mpeye">' + esc(LANDN[t.land] + (r ? ' · ' + r.name : '')) + '</span><p class="mptitle">' + esc(shortName(t)) + '</p>' +
    '<div class="mprels"><span class="mprl-l">' + relicMedalSvg(t.land, 26, hasL) + '</span>' + (defOn && c ? '<span class="mprl-b">' + relicShieldSvg(t.land, 24, hasB) + '</span>' : '') + '</div>';
  box.appendChild(hd);
  // owner, 2026-11-02: one line on what each relic is
  { const a = hd.querySelector('.mprl-l'); hoverTip(a, () => showTextTip(a, relicName(k) + (hasL ? ' · claimed' : ' · not claimed yet'), ['A light relic: set in a copper shrine, it boosts your light and raw resources.'])); }
  { const b = hd.querySelector('.mprl-b'); if (b) hoverTip(b, () => showTextTip(b, BATTLE_RELIC_OF[t.land] + (hasB ? ' · found' : ' · not found yet'), ['A battle relic: found when its land is made safe or raided, it strengthens your troops.'])); }
  if (MC.masteryOn(w)) { const tr = MC.mTier(w, k), cap = MC.D.mastery.tiers, cl = MC.mClears(w, k), nd = MC.mNeed(w, k), row = document.createElement('div'); row.className = 'mprow light';
    row.innerHTML = '<span class="mprl">Light</span><span class="mprv"><span>Attunement <b>' + mastPct(tr) + '%</b></span><span class="mpbar"><i style="width:' + (tr >= cap ? 100 : Math.min(100, cl / Math.max(1, nd) * 100)).toFixed(1) + '%"></i></span></span>';
    box.appendChild(row); }
  if (defOn && c) { const safe = !!Cr.cleared[k], sOK = CB.stdOK(w), std = !!(L.stds || {})[k], need = sOK && Cr.newly[k], row = document.createElement('div'); row.className = 'mprow def';
    const dot = on => '<i class="mpdot' + (on ? ' on' : '') + '"></i>', next = !safe ? 'Held by ' + c.famName.toLowerCase() : need && !std ? (stdQueued(w, k) ? 'Made safe · its standard waits for the haulers' : 'Made safe · next: raise its standard') : (CB.P.off.relics || hasB) ? 'Finished' : 'Made safe' + (need ? ', standard raised' : '');
    row.innerHTML = '<span class="mprl">Defense</span><span class="mprv"><span class="mpdots">' + dot(safe) + (sOK ? dot(std) : '') + '<span>' + esc(next) + '</span></span><button type="button" class="mplink">Open on the battle front →</button></span>';
    row.querySelector('.mplink').addEventListener('click', () => { CMV.dsel = k; S.view = 'defense'; hideTip(); renderWorld(); });
    box.appendChild(row); }
}
function renderPanel(w) {
  const box = $('m-panel'); const k = MV.sel;
  const sig = JSON.stringify([k, S.debug, MC.scoutDepth(w), w.m.target, (w.m.lineup || []).join(';'), MC.lineupMax(w), w.m.pool >= 1, !!(k && w.m.tiles[k]), w.m.relicT && w.m.relicT[k], (w.m.anchors || []).length, w.m.amps.length, MV.ampDir, MV.ampArm, Math.floor((S.playTime || 0) / 2), w.res.copper > 0 ? Math.floor(Math.log2(w.res.copper + 1)) : 0, k && MC.masteryOn(w) && w.m.tiles[k] ? [MC.mTier(w, k), Math.floor(MC.mClears(w, k) / Math.max(1, MC.mNeed(w, k) / 100)), w.m.mreg, MC.masteryPoints(w)] : 0, !!w.m.rbReady, combatSig(w, k), k && cRun(w) ? [(cLife().stds || {})[k], (cLife().relics || {})[k], CB.stdOK(w)] : 0]);
  if (box.dataset.s === sig) return; box.dataset.s = sig; box.innerHTML = '';
  const add = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; box.appendChild(e); return e; };
  if (!k) { add('p', 'msec', 'Picked place'); add('p', 'mmut', 'Pick a place on the map. Places beside your land show their land; send your light to one to call it back.'); return; }
  if (k === '0,0') { add('p', 'mptitle', w.name || 'Home'); add('p', 'mmut', 'Home. Everything starts here.'); return; }
  const t = tileOf(k); if (!t) { add('p', 'mptitle', 'Water'); add('p', 'mmut', 'The light slides off it. Its region finishes without it.'); return; }
  const lit = !!w.m.tiles[k], reach = MC.reachable(w, t), r = regionOf(t), rc = regionCount(w, r), far = !lit && !reach && !!(MC.seenTiles(w)[k] || (w.m.revealed || {})[k]);
  if (!lit && !(reach || far)) add('p', 'msec', 'In the dark');   // r1d (owner): places beside your land or seen from afar need no heading
  if (lit) placeHead(w, k, t, r, box); else add('p', 'mptitle', reach || far ? tileName(t) : 'Darkness');
  const lines = document.createElement('div'); lines.className = 'mplines'; box.appendChild(lines);
  const line = s => { const p = document.createElement('p'); p.textContent = s; lines.appendChild(p); };
  if (!lit && (reach || far)) {
    const need = MC.tileCost(t, w), got = w.m.got[k] || 0, amp = MC.ampMult(w, k), mm = MC.masteryMult(w), L = MC.lightRate(w) * amp * mm;   /* r1c fix: mastery counts in the estimate */
    line('Needs ' + fmtW(need) + ' light' + (got > 0 ? ' (' + Math.floor(got / need * 100) + '% there)' : '') + '. At your light: about ' + fmtTime((need - got) / Math.max(1e-9, L)) + '.');
    if (amp > 1) line('An amplifier strengthens light sent here ×' + fmtW(amp, 0) + '.');
    if (mm > 1.005) line('Attunement strengthens light reaching new land ×' + fmtW(mm, 2) + '.');
    if (w.m.known && w.m.known[k]) line('Remembered ground: you have called it back before, so it needs only ' + fmtW(MC.tileCost(t, w) / MC.mClearCost(t) * 100, MC.tileCost(t, w) / MC.mClearCost(t) < 0.1 ? 1 : 0) + '% of its light.');   // r1f: no dev words
    // v1q (owner's playtest): the clearer "You will gain" block, one line each, the big ones in bold
    const m = meta(), mem = !!m.ever[k], gv = document.createElement('div'); gv.className = 'mgives';
    const gi = (txt, cls) => { const p = document.createElement('p'); p.className = 'mg-i' + (cls ? ' ' + cls : ''); p.textContent = txt; gv.appendChild(p); };
    const hd = document.createElement('p'); hd.className = 'mg-h'; hd.textContent = 'You will gain'; gv.appendChild(hd);
    if (mem) gi('No new heartstones: remembered ground', 'mg-q'); else gi(fmtW(MC.hsFor(t.dstep)) + ' heartstone' + (MC.hsFor(t.dstep) === 1 ? '' : 's'), 'mg-key');
    gi(t.land === 'river' ? MC.D.riverSettlers + ' settlers' : 'A settler');
    if (MC.D.surge.effect[t.land] && MC.D.surge.x > 0 && !(mem && !MC.D.surge.reclear)) gi(capFirst(surgeWhat(MC.D.surge.effect[t.land])) + ' ' + Math.round(MC.D.surge.x * 100) + '% faster for ' + MC.D.surge.mins + ' minutes');
    gi('A relic to claim: ' + relicGain(w, k));
    if (t.tag === 'copper') gi('Copper, and how to smelt it', 'mg-key'); if (t.tag === 'mining') gi('The old workings: smelters +' + Math.round(MC.D.miningBoost * 100) + '% copper', 'mg-key'); if (t.tag === 'amp') gi('A broken tower that could be mended', 'mg-key');
    if (rc + 1 === r.tiles.length) gi(MC.D.resonance.on ? 'Finishes ' + r.name + ': its relics ring, each counting ' + (1 + MC.D.resonance.R) + ' times' : 'Finishes ' + r.name + ': all light +' + Math.round((MC.D.regionX - 1) * 100) + '%', 'mg-key');
    lines.appendChild(gv);
  }
  if (k === MC.ruinKey() && (lit || reach || far) && !w.m.done.repair) { const st = document.createElement('p'); st.className = 'mstory'; st.textContent = lit ? MT.ruinStory : MT.ruinGlimpse; lines.appendChild(st); }
  if (lit) {
    const g = [];
    const an = (w.m.anchors || []).find(a => a.key === k); if (an) g.push(an.lit ? 'a Light Anchor holds its relic (×' + fmtW(1 + MC.anchorFocus(w), 2) + ')' : 'an anchor is being built');
    const tw = w.m.amps.find(a => a.x === t.x && a.y === t.y); if (tw) g.push(tw.lit ? 'an amplifier tower stands here' : 'an amplifier tower is being built');
    if (g.length) line(capFirst(g.join(' · ')) + '.');
  }
  if (lit) { const Cr = cRun(w), defOn = !!(Cr && cCapOpen(Cr)), lit2 = r.tiles.filter(x => w.m.tiles[x]); let rl = capFirst(r.name) + ': ' + lit2.length + ' of ' + r.tiles.length + ' called back';
    if (defOn) { const L = cLife(), sOK = CB.stdOK(w); rl += ' · ' + lit2.filter(x => !CB.byKey(x) || Cr.cleared[x]).length + ' safe · ' + lit2.filter(x => { const c = CB.byKey(x); if (!c) return true; if (!Cr.cleared[x]) return false; if (!CB.P.off.relics && !(L.relics || {})[x]) return false; return !(sOK && Cr.newly[x] && !(L.stds || {})[x]); }).length + ' finished'; }
    const rp = document.createElement('p'); rp.className = 'mpreg'; rp.textContent = rl; box.appendChild(rp); }
  const acts = document.createElement('div'); acts.className = 'mpacts'; box.appendChild(acts);
  const btn = (title, sub, on, fn, cls) => { const b = document.createElement('button'); b.className = 'act' + (cls ? ' ' + cls : ''); b.type = 'button'; b.addEventListener('click', fn); setBtn(b, title, sub, on, {}); acts.appendChild(b); return b; };
  if (lit && MC.masteryOn(w)) {
    const tr = MC.mTier(w, k), cap = MC.D.mastery.tiers, rgl = MC.regionToMaster(w, t.region);
    if (tr < cap) btn(w.m.target === k ? 'Attuning this place' : 'Attune', w.m.target === k ? 'All your light flows here.' : 'All your light flows here until it is ' + MASTER_WORD[cap] + ' (' + mastPct(cap) + '%), then back to new land.', w.m.target !== k || w.m.mreg != null, () => mMaster(k), w.m.target === k ? '' : 'primary');
    if (rgl.length > 1 || (rgl.length === 1 && rgl[0] !== k)) btn(w.m.mreg === t.region ? 'Attuning ' + r.name : 'Attune all of ' + r.name, w.m.mreg === t.region ? 'Your light moves from place to place in it, the least attuned first.' : Math.round(MC.regionMastery(w, t.region) * 100) + '% attuned. Your light moves from place to place in it, the least mastered first, until all of it is ' + MASTER_WORD[cap] + '.', w.m.mreg !== t.region, () => mMasterRegion(t.region));
  }
  if (!lit && reach) btn(w.m.target === k ? 'Calling this land back' : 'Send light here', w.m.target === k ? 'All your light flows here.' : 'All your light flows here' + (w.m.pool >= 1 ? ', and the ' + fmtC(w.m.pool) + ' saved up pours in at once.' : '.'), w.m.target !== k, () => mTarget(k), 'primary');
  const lmax = MC.lineupMax(w), lu = w.m.lineup || [], qi = lu.indexOf(k);
  if (lmax > 0 && !lit && w.m.target !== k) {
    if (qi >= 0) btn(MT.lineOut, 'Number ' + (qi + 1) + ' in line.', true, () => mUnline(k));
    else if (MC.lineupOk(w, k) && w.m.target) { if (lu.length < lmax) btn(MT.lineNext, 'It will be number ' + (lu.length + 1) + ' in line. When the place before it comes back, your light moves on to it by itself.', true, () => mLineup(k));
      else btn(MT.lineNext, fill(MT.lineFull, { n: lmax, s: lmax === 1 ? '' : 's' }), false, () => {}); }
  }
  if (lit && k === MC.ruinKey() && !w.m.done.repair) {
    const p = MC.projDef(w, 'repair');
    if (MC.repairOpen(w)) btn('Repair the tower', 'Built by haulers: ' + p.stages.map(st => costList(st.cost)).join(', then ') + '. Then light it: light sent into its cone ×' + MC.D.ampX + '.', true, mRepair, 'primary');
    else btn(w.m.awaitClick === 'repair' ? 'Repaired: light it from the projects strip' : 'Being repaired', w.m.awaitClick === 'repair' ? '' : 'Haulers are carrying the stone and the lens.', false, () => {});
  }
  if (lit && !(w.m.relicT && w.m.relicT[k])) { const c = MC.relicCost(w, k); btn('Claim its relic', fmtW(c.copper) + ' copper · ' + relicGain(w, k), VC.canPay(w, c), () => mRelic(k)); }
  if (lit && w.m.cards.anchors && !(w.m.anchors || []).some(a => a.key === k)) { const p = MC.projDef(w, 'anchor:' + k); btn('Raise a Light Anchor', 'Built by haulers: ' + p.stages.map(st => Object.keys(st.cost).map(r => fmtW(st.cost[r]) + ' ' + resName(r).toLowerCase()).join(', ')).join(', then ') + '. Focuses its relic\u2019s light ×' + fmtW(1 + MC.anchorFocus(w), 2) + (MC.D.relic.kind === 'land' && MC.D.landRelic.anchorRaw ? ', and ' + (RES_WORD[MC.D.landRelic.effect[t.land]] || '') + ' +' + Math.round(MC.D.landRelic.anchorRaw * 100) + '%' : '') + '.', true, () => mAnchor(k)); }
  const built = w.m.amps.filter(a => !a.story).length;
  if (lit && w.m.cards.amps && built < MC.ampMaxOf(w) && !w.m.amps.some(a => a.x === t.x && a.y === t.y)) {
    const p = MC.projDef(w, 'amp' + built);
    DIRS.forEach((d, i) => btn(MV.ampDir === i && MV.ampArm ? 'Click again: face ' + d[2] : 'Amplifier facing ' + d[2], MV.ampDir === i ? 'The cone shows on the map. It can’t be turned later.' : (i === 0 ? 'Tower ' + (built + 1) + ' of ' + MC.ampMaxOf(w) + ': ' + p.stages.map(st => Object.keys(st.cost).map(r => fmtW(st.cost[r]) + ' ' + resName(r).toLowerCase()).join(', ')).join(', then ') : 'Light sent into its cone ×' + MC.D.ampX + '.'), true, () => mAmp(i)));
  }
  // playtest: call a place back at once, or see what it is
  if (S.debug && !lit) { btn('Playtest: restore this tile', 'Calls it back now, wherever it is.', true, () => mDbgRestore(k)); if (!far && !reach) btn('Playtest: reveal this tile', 'Shows what it is without calling it back.', true, () => { (w.m.revealed = w.m.revealed || {})[k] = true; renderWorld(); }); }
}

function mDbgRestore(k) { const w = W(), t = tileOf(k); if (!t || w.m.tiles[k]) return; const was = w.m.target, pool = w.m.pool; w.m.pool = 0; w.m.target = k; w.m.got[k] = MC.tileCost(t, w); mapTick(0);
  if (was && was !== k && !w.m.tiles[was]) { w.m.target = was; } w.m.pool = (w.m.pool || 0) + (pool || 0); renderWorld(); }

