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
  $('m-zin').addEventListener('click', () => mapZoom(W(), 1.25)); $('m-zout').addEventListener('click', () => mapZoom(W(), 0.8));
})();
function buildMapGrid(V) {
  const g = $('m-grid'); if (MV.cells && MV.V === V) return; const V0 = MV.V; g.innerHTML = ''; MV.cells = {}; MV.V = V;
  { const v = mapView(); if (v && V0 && V > V0 && MV.cell) { const d = (V - V0) * MV.cell; requestAnimationFrame(() => { v.scrollLeft += d; v.scrollTop += d; }); } }   // the land grows on every side: keep the view where it was
  g.style.gridTemplateColumns = 'repeat(' + (2 * V + 1) + ', 1fr)'; $('m-stage').style.setProperty('--n', 2 * V + 1);
  { const h = $('m-home'), n = 2 * V + 1; if (h) { h.style.left = h.style.top = ((V - 0.5) / n * 100) + '%'; h.style.width = h.style.height = (2 / n * 100) + '%'; } }
  for (let y = -V; y <= V; y++) for (let x = -V; x <= V; x++) {
    const k = x + ',' + y, b = document.createElement('button'); b.type = 'button'; b.className = 'cell'; b.dataset.k = k;
    b.innerHTML = '<span class="gl"></span><span class="lb"></span><span class="qn"></span><span class="f" style="display:none"></span><span class="mk"></span>'; b.setAttribute('aria-label', 'Place ' + x + ', ' + (-y)); b.addEventListener('click', () => { MV.sel = k; MV.ampArm = false; MV.ampDir = null; MV.lastMap = 0; renderWorld(); });
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
  { const mt = cls.includes('m3') ? 3 : cls.includes('m2') ? 2 : cls.includes('m1') ? 1 : 0; if (mt) s += mastStars(mt); }
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
    } else if (t) {
      cls.push('dark'); if (MC.reachable(w, t)) { cls.push('reach', 'scout', 'land-' + LANDC[t.land]); lb = etaShort((MC.tileCost(t, w) - (w.m.got[k] || 0)) / Math.max(1e-9, L0 * MC.ampMult(w, k))); }
      else if (seen[k] || rev[k]) { cls.push('scout', 'far', 'land-' + LANDC[t.land]); lb = etaShort((MC.tileCost(t, w) - (w.m.got[k] || 0)) / Math.max(1e-9, L0 * MC.ampMult(w, k))); }
      if (known[k]) cls.push('paved');
    }
    if (k === ruinK && !w.m.done.repair && t && (w.m.tiles[k] || MC.reachable(w, t) || seen[k] || rev[k])) { cls.push('ruin'); if (w.m.tiles[k] && !MC.repairStarted(w)) cls.push('ruinwait'); }
    if (towers[k]) cls.push(towers[k].lit ? 'relay' : 'building');
    if (cones[k]) cls.push(cones[k] === 'p' ? 'conep' : 'cone');
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
      ? 'Whole · ' + pl(w.m.restored, 'place', 'places') + ' called back · ' + pl(rd, 'region', 'regions') + ' finished · memory ×' + fmtW(MC.memMult(w), 2) + ' (' + fmtW(hsNow) + ' heartstones)' + (MC.masteryOn(w) ? ' · mastery: new land ×' + fmtW(MC.masteryMult(w), 2) : '')
      : MC.D.rb.on && w.m.rbAt && m.run === 1 ? ''   // r1d (owner): run 1 shows no run line; it comes back from run 2
      : MC.D.rb.on && w.m.rbAt ? 'Run ' + m.run + ' of ' + MC.D.rb.last + ' · ' + pl(w.m.restored, 'place', 'places') + ' called back · rebirth at ' + w.m.rbAt + ' · ' + pl(rd, 'region', 'regions') + ' finished · memory ×' + fmtW(MC.memMult(w), 2) + (m.run > 1 ? ' · ' + pl(hn, 'new heartstone', 'new heartstones') + ' this run' : ' · ' + pl(hn, 'heartstone', 'heartstones'))
      : m.run > 1
      ? 'Run ' + m.run + ' · ' + pl(w.m.restored, 'place', 'places') + ' called back (best ' + Math.max(m.best || 0, w.m.restored) + ') · ' + pl(rd, 'region', 'regions') + ' finished · memory ×' + fmtW(MC.memMult(w), 2) + ' · ' + pl(hn, 'new heartstone', 'new heartstones') + ' this run (' + fmtW(hsNow) + ' remembered)'
      : pl(w.m.restored, 'place', 'places') + ' called back · ' + pl(rd, 'region', 'regions') + ' finished · ' + pl(hn, 'heartstone', 'heartstones'); }
  $('m-world').classList.toggle('hidden', !$('m-world').textContent);
  renderPanel(w); renderRegions(w);
}
// v1h: every region you've set foot in, as v24e: a pip per place in map order (filled once back, dashed when picked or lined up), "N of M", a tick when finished
function renderRegions(w) {
  const seenR = {}; Object.keys(w.m.tiles).forEach(k => { const t = tileOf(k); if (t) seenR[t.region] = true; });
  const regs = Object.keys(seenR).map(Number).sort((a, b) => a - b).map(i => MC.REGIONS[i]).map(r => ({ r, n: regionCount(w, r), N: r.tiles.length }));
  const mOn = MC.masteryOn(w), lu = w.m.lineup || [], sig = regs.map(x => x.r.i + ':' + x.n + (mOn ? ':' + Math.round(MC.regionMastery(w, x.r.i) * 100) : '')).join('|') + '#' + w.m.target + lu.join(';') + (w.m.mreg != null ? '@' + w.m.mreg : '');
  const box = $('m-reglist'); if (box.dataset.s === sig) return; box.dataset.s = sig;
  box.innerHTML = regs.map(({ r }) => regionRowHtml(w, r)).join('');
}
// r1d (owner): one look for a region's row, on the map and on the Relics tab: its name, a pip per place in map order
// (filled once back, dashed when picked or lined up), "N of M", a tick when finished. `note`: a muted line under it
function regionRowHtml(w, r, note) {
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const n = regionCount(w, r), N = r.tiles.length, fin = n === N, lu = w.m.lineup || [], xy = k => k.split(',').map(Number);
  let pips = ''; r.tiles.slice().sort((a, b) => { const p = xy(a), q = xy(b); return p[1] - q[1] || p[0] - q[0]; }).forEach(k => {
    pips += '<i class="pip' + (w.m.tiles[k] ? ' on' : (w.m.target === k || lu.includes(k)) ? ' nx' : '') + '"></i>'; });
  let ct = fin ? '\u2713' : n + ' of ' + N, tt = '';
  if (MC.masteryOn(w)) { const mp = Math.round(MC.regionMastery(w, r.i) * 100); if (mp > 0 || w.m.mreg === r.i) { ct += ' \u00b7 \u2605' + mp + '%'; tt = mp + '% mastered' + (w.m.mreg === r.i ? ' (mastering now)' : ''); } }
  return '<div class="mreg' + (fin ? ' fin' : '') + (note ? ' noted' : '') + '"><span>' + esc(capFirst(r.name)) + '</span><span class="tally" aria-label="' + n + ' of ' + N + ' back">' + pips +
    '<span class="tct"' + (tt ? ' title="' + esc(tt) + '"' : '') + '>' + ct + '</span></span>' + (note ? '<span class="mreg-x">' + esc(note) + '</span>' : '') + '</div>';
}
function renderPanel(w) {
  const box = $('m-panel'); const k = MV.sel;
  const sig = JSON.stringify([k, S.debug, MC.scoutDepth(w), w.m.target, (w.m.lineup || []).join(';'), MC.lineupMax(w), w.m.pool >= 1, !!(k && w.m.tiles[k]), w.m.relicT && w.m.relicT[k], (w.m.anchors || []).length, w.m.amps.length, MV.ampDir, MV.ampArm, Math.floor((S.playTime || 0) / 2), w.res.copper > 0 ? Math.floor(Math.log2(w.res.copper + 1)) : 0, k && MC.masteryOn(w) && w.m.tiles[k] ? [MC.mTier(w, k), Math.floor(MC.mClears(w, k) / Math.max(1, MC.mNeed(w, k) / 100)), w.m.mreg, MC.masteryPoints(w)] : 0, !!w.m.rbReady]);
  if (box.dataset.s === sig) return; box.dataset.s = sig; box.innerHTML = '';
  const add = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; box.appendChild(e); return e; };
  if (!k) { add('p', 'msec', 'Picked place'); add('p', 'mmut', 'Pick a place on the map. Places beside your land show their land; send your light to one to call it back.'); return; }
  if (k === '0,0') { add('p', 'mptitle', w.name || 'Home'); add('p', 'mmut', 'Home. Everything starts here.'); return; }
  const t = tileOf(k); if (!t) { add('p', 'mptitle', 'Water'); add('p', 'mmut', 'The light slides off it. Its region finishes without it.'); return; }
  const lit = !!w.m.tiles[k], reach = MC.reachable(w, t), r = regionOf(t), rc = regionCount(w, r), far = !lit && !reach && !!(MC.seenTiles(w)[k] || (w.m.revealed || {})[k]);
  if (lit || !(reach || far)) add('p', 'msec', lit ? 'Called back' : 'In the dark');   // r1d (owner): places beside your land or seen from afar need no heading
  // v1r (owner): a place called back shows its relic at the top of the card
  if (lit) { const has = !!(w.m.relicT && w.m.relicT[k]), rh = add('p', 'mprelic'); rh.innerHTML = relicIconHtml(t.land) + ' '; rh.appendChild(document.createTextNode(relicName(k) + (has ? ' · claimed' : ' · waits: ' + fmtW(MC.relicCost(w, k).copper) + ' copper'))); }
  add('p', 'mptitle', lit || reach || far ? tileName(t) : 'Darkness');
  const lines = document.createElement('div'); lines.className = 'mplines'; box.appendChild(lines);
  const line = s => { const p = document.createElement('p'); p.textContent = s; lines.appendChild(p); };
  if (lit || reach || far) line(LANDN[t.land] + ' · ' + r.name + ': ' + rc + ' of ' + r.tiles.length + ' back');
  if (!lit && (reach || far)) {
    const need = MC.tileCost(t, w), got = w.m.got[k] || 0, amp = MC.ampMult(w, k), mm = MC.masteryMult(w), L = MC.lightRate(w) * amp * mm;   /* r1c fix: mastery counts in the estimate */
    line('Needs ' + fmtW(need) + ' light' + (got > 0 ? ' (' + Math.floor(got / need * 100) + '% there)' : '') + '. At your light: about ' + fmtTime((need - got) / Math.max(1e-9, L)) + '.');
    if (amp > 1) line('An amplifier strengthens light sent here ×' + fmtW(amp, 0) + '.');
    if (mm > 1.005) line('Mastery strengthens light reaching new land ×' + fmtW(mm, 2) + '.');
    if (w.m.known && w.m.known[k]) line('Remembered ground: you have called it back before, so it needs only ' + fmtW(MC.tileCost(t, w) / MC.mClearCost(t) * 100, MC.tileCost(t, w) / MC.mClearCost(t) < 0.1 ? 1 : 0) + '% of its light.');   // r1f: no dev words
    // v1q (owner's playtest): the clearer "You will gain" block, one line each, the big ones in bold
    const m = meta(), mem = !!m.ever[k], gv = document.createElement('div'); gv.className = 'mgives';
    const gi = (txt, cls) => { const p = document.createElement('p'); p.className = 'mg-i' + (cls ? ' ' + cls : ''); p.textContent = txt; gv.appendChild(p); };
    const hd = document.createElement('p'); hd.className = 'mg-h'; hd.textContent = 'You will gain'; gv.appendChild(hd);
    if (mem) gi('No new heartstones: remembered ground', 'mg-q'); else gi(fmtW(MC.hsFor(t.dstep)) + ' heartstone' + (MC.hsFor(t.dstep) === 1 ? '' : 's') + ' to remember', 'mg-key');
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
  if (lit && MC.masteryOn(w)) {   // the rebirth branch: mastery
    const tr = MC.mTier(w, k), c = MC.mClears(w, k), nd = MC.mNeed(w, k), cap = MC.D.mastery.tiers, hs = MC.hsFor(t.dstep);
    const L = MC.lightRate(w) * MC.ampMult(w, k), left = Math.max(0, nd - c) * MC.mClearCost(t) / Math.max(1e-9, L);
    const mb = document.createElement('div'); mb.className = 'mmast t' + tr;
    mb.innerHTML = '<p class="mm-h">Mastery <b>' + mastPct(tr) + '%</b>' + (tr ? ' · ' + MASTER_WORD[tr] : '') + '</p>' +
      (tr < cap ? '<div class="mm-bar"><i style="width:' + (Math.min(1, c / nd) * 100).toFixed(1) + '%"></i></div><p class="mm-l">' + fmtW(Math.floor(c)) + ' of ' + fmtW(nd) + ' clears to ' + mastPct(tr + 1) + '% · about ' + fmtTime(left) + ' at your light</p>' : '<p class="mm-l">As far as it can be mastered for now.</p>') +
      '<p class="mm-l sub">' + (MC.D.mastery.weight === 'hs' ? 'Each tier counts its ' + fmtW(hs) + ' heartstone' + (hs === 1 ? '' : 's') + ' toward mastery' : 'Each star anywhere adds ' + Math.round(MC.D.mastery.per * 100) + '% to light reaching new land') + ': ×' + fmtW(MC.masteryMult(w), 2) + ' now' + (tr < cap ? ', ×' + fmtW(MC.masteryMultAt(MC.masteryPoints(w) + MC.mPointsOf(t)), 2) + ' after the next' : '') + '.</p>';
    lines.appendChild(mb);
  }
  const acts = document.createElement('div'); acts.className = 'mpacts'; box.appendChild(acts);
  const btn = (title, sub, on, fn, cls) => { const b = document.createElement('button'); b.className = 'act' + (cls ? ' ' + cls : ''); b.type = 'button'; b.addEventListener('click', fn); setBtn(b, title, sub, on, {}); acts.appendChild(b); return b; };
  if (lit && MC.masteryOn(w)) {
    const tr = MC.mTier(w, k), cap = MC.D.mastery.tiers, rgl = MC.regionToMaster(w, t.region);
    if (tr < cap) btn(w.m.target === k ? 'Mastering this place' : 'Master this place', w.m.target === k ? 'All your light flows here.' : 'All your light flows here until it is ' + MASTER_WORD[cap] + ' (' + mastPct(cap) + '%), then back to new land.', w.m.target !== k || w.m.mreg != null, () => mMaster(k), w.m.target === k ? '' : 'primary');
    if (rgl.length > 1 || (rgl.length === 1 && rgl[0] !== k)) btn(w.m.mreg === t.region ? 'Mastering ' + r.name : 'Master all of ' + r.name, w.m.mreg === t.region ? 'Your light moves from place to place in it, the least mastered first.' : Math.round(MC.regionMastery(w, t.region) * 100) + '% mastered. Your light moves from place to place in it, the least mastered first, until all of it is ' + MASTER_WORD[cap] + '.', w.m.mreg !== t.region, () => mMasterRegion(t.region));
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

