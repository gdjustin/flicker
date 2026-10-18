/* ---------- the settlement, in the map phase ---------- */
const MGROUPS = { light: 'Light', newsys: 'New ways with light', homes: 'Homes', storage: 'Storage', tools: 'Tools', relics: 'Relics' };
function mgroup(gid) {
  let g = $('mg-' + gid);
  if (!g) { g = document.createElement('div'); g.className = 'bgroup'; g.id = 'mg-' + gid; g.innerHTML = '<p class="bgh"></p><div class="acts"></div><div class="burnrows"></div>';
    const order = Object.keys(MGROUPS), after = Array.from($('w-make').children).find(x => order.indexOf(x.id.slice(3)) > order.indexOf(gid)); $('w-make').insertBefore(g, after || null); }
  g.querySelector('.bgh').textContent = MGROUPS[gid]; return g;
}
function mlGroup(id) {
  if (VC.LAD[id]) { const g = VC.LAD[id].group; return g === 'light' ? 'light' : g === 'homes' ? 'homes' : g === 'storage' ? 'storage' : 'tools'; }
  if (/^(halls|glowcut|anchorcraft|cuburner|eff_cuburner)$/.test(id)) return 'newsys';
  if (id === 'house') return 'homes'; if (id === 'books') return 'storage'; if (/^ct_|^ctend$/.test(id)) return 'tools';
  return 'light';
}
// v1q (owner's playtest): what one more level adds to all light right now, measured by trying it
function mlGain(w, id) {
  try { const vil = !!VC.LAD[id], keepLv = vil ? (w.lv[id] || 0) : (w.m.lv[id] || 0), keepOn = vil ? w.on[id] : null, before = MC.lightRate(w);
    if (vil) { w.lv[id] = keepLv + 1; if (VC.LAD[id].burns) w.on[id] = (w.on[id] == null ? keepLv : w.on[id]) + 1; } else w.m.lv[id] = keepLv + 1;
    const after = MC.lightRate(w); if (vil) { w.lv[id] = keepLv; if (VC.LAD[id].burns) w.on[id] = keepOn; } else w.m.lv[id] = keepLv; return after - before; } catch (e) { return 0; }
}
function gainLine(w, id) { const g = mlGain(w, id); return g > 0.0005 ? ' Adds about ' + fmtC(g) + ' light/s now (' + fmtW(100 * g / Math.max(1e-9, MC.lightRate(w)), g / MC.lightRate(w) < 0.01 ? 2 : 1) + '% of your light).' : ''; }
function mlDesc(id) { const w = W(), base = mlDescBase(id); return base + (w && w.m && (VC.LAD[id] ? VC.LAD[id].group === 'light' : /^(clamp|cbrazier|ctend|longsong|cuburner|eff_)/.test(id)) ? gainLine(w, id) : ''); }
function mlDescBase(id) {
  const w = W(), D = MC.D, pm = VC.lightMult(w) * MC.phaseMult(w), f2 = v => fmtW(v, v < 10 ? 2 : 0);
  if (VC.LAD[id]) return ladderDesc(VC.LAD[id]);
  const l = MC.MLAD[id];
  const lm = pm * D.src.lamps * MC.famBuff(w, 'brightGlass'), cb = MC.mlv(w, 'cbrazier'), ncl = MC.mlv(w, 'clamp');
  if (id === 'clamp') return 'Burns nothing. Each lamp of this tier makes ' + f2((D.lamp.b * Math.pow(D.lamp.J, MC.mtier(w, id) - 1) + D.cbrazier.lampBonus * cb) * lm) + ' light/s: ' + f2(D.lamp.b * Math.pow(D.lamp.J, MC.mtier(w, id) - 1) * lm) + ' of its own and ' + f2(D.cbrazier.lampBonus * lm) + ' for each of your ' + cb + ' copper braziers. ' + D.lamp.L + ' to a tier; each tier ' + D.lamp.J + '× brighter.';
  if (id === 'cbrazier') return 'Burns nothing. Each makes ' + f2(D.cbrazier.b * lm) + ' light/s of its own, and adds ' + f2(D.cbrazier.lampBonus * lm) + ' to each of your ' + ncl + ' copper lamps.';
  if (id === 'ctend') return D.fireTend.on ? 'Firekeepers tend the burners too: each level, +' + fmtW(D.fireTend.x * 100, 1) + '% keeper light for every lit burner, up to ' + D.fireTend.cap + ' burners (' + MC.litBurners(w) + ' lit now: keepers ×' + fmtW(MC.tendMult(w).light, 2) + ').' : 'Each firekeeper’s fire ' + Math.round(D.keeperTend.a * 100) + '% brighter a level, for a little more wood. ' + D.tendTier.L + ' to a tier.';
  if (id === 'chearth') return 'All light +' + Math.round(D.chearth.a * 100) + '% a level. No end.';
  if (id === 'longsong') return 'Firekeepers make +' + Math.round(D.longSong * 100) + '% more light a song (' + D.longSongMax + ' songs in all). Each costs more ideas.';
  if (id === 'cuburner') return 'Burns ' + fmtW(D.cuburner.use * 3600, 0) + ' copper an hour for ' + f2(D.cuburner.b * pm) + ' light/s. Light them when copper piles up.';
  if (l && l.burner) { if (!D.burnEff.rebuild) return 'Burners of this kind give +' + Math.round(D.burnEff.a * 100) + '% light a level, for +' + Math.round(D.burnEff.fuel * 100) + '% fuel.';
    if (D.burnEff.rebuild === 2) { const n = MC.mlv(w, id); return 'Rebuild every burner of this kind: ×' + fmtW(D.burnEff.Lx, 2) + ' the light for ×' + fmtW(D.burnEff.Fx, 2) + ' the fuel. Rebuilt ' + n + ' time' + (n === 1 ? '' : 's') + ' so far.'; }
    const n = MC.mlv(w, id), to = MC.rebuildTo(n), F0 = 1 + D.burnEff.fuel * n, F1 = 1 + D.burnEff.fuel * to, L0 = MC.effMult(w, l.burner).light, L1 = L0 * (D.burnEff.rebuildX || 2) * (1 + D.burnEff.a * to) / (1 + D.burnEff.a * n) / 2;
    return 'Rebuild them: each burns ×' + fmtW(F1 / F0, 2) + ' the fuel for ×' + fmtW(L1 / L0, 2) + ' the light (now ×' + fmtW(L0, 2) + ' light, ×' + fmtW(F0, 2) + ' fuel).'; }
  if (l && l.tool) return VC.JOBS.find(j => j.id === l.job).name + 's bring +' + Math.round(D.tool.a * 100) + '% a level.';
  if (id === 'halls') return 'Scholars at the Academy make +' + Math.round(D.academy.halls.a * 100) + '% light a level.';
  if (id === 'glowcut') return 'Every glowstone +' + Math.round(D.glow.cut.a * 100) + '% stronger a level.';
  if (id === 'anchorcraft') return 'Every anchor focuses its relic +' + Math.round(D.anchor.craft.a * 100) + '% more a level.';
  if (id === 'house') return 'Room for ' + D.houseRoom + ' more settlers.';
  if (id === 'books') return 'Room for ideas ×' + D.booksGrowth + '.';
  return '';
}
function renderMapSettlement(w) {
  const showDone = !!S.showDone; let any = false;
  // every line on sale: the village's own (at village prices) and the phase-1 lines
  const ids = VC.LADDERS.filter(l => l.group !== 'snails' && l.id !== 'songs').map(l => l.id).concat(MC.ML.map(l => l.id));
  let doneB = 0;
  for (const id of ids) {
    const bid = 'w-b-' + id, open = MC.levelOpen(w, id);
    if (!open) { if ($(bid)) $(bid).remove(); continue; }
    const g = mgroup(mlGroup(id)), isV = !!VC.LAD[id], n = isV ? (w.lv[id] || 0) : MC.mlv(w, id), maxed = MC.levelMaxed(w, id), mx = MC.levelMax(w, id);
    const tierable = id === 'clamp' || id === 'ctend';
    const tid = 'w-bt-' + id;
    if (maxed && tierable && MC.tierUpAvail(w, id)) {
      if ($(bid)) $(bid).remove();   // v1g: the tier card is its own button (reusing the level button kept its click on "buy a level", so it did nothing)
      const b = ensureBtn(g.querySelector('.acts'), tid, () => mTier(id)); const c = MC.tierUpCost(w, id), nt = MC.mtier(w, id) + 1, l = MC.MLAD[id];
      setBtn(b, 'New tier: ' + (l.tierNames[nt - 1] || l.name + ' ' + nt), tierDesc(id), VC.canPay(w, c), { kind: lineKind(id), cost: c, note: tierNote(id) }); any = true; continue;
    }
    if ($(tid)) $(tid).remove();
    if (maxed) { doneB++; if (!showDone) { if ($(bid)) $(bid).remove(); continue; }
      const db = ensureBtn(g.querySelector('.acts'), bid, () => {}); db.classList.add('done'); setBtn(db, (isV ? VC.LAD[id].name : tierName(id)) + ' (' + n + ')', mlDesc(id), false, { kind: lineKind(id), note: tx('w.maxed', { n: mx }) }); any = true; continue; }
    const b = ensureBtn(g.querySelector('.acts'), bid, () => mLevel(id)); b.classList.remove('done'); const c = MC.levelCost(w, id);
    impactTip(b, x => { if (VC.LAD[id]) { x.lv[id] = (x.lv[id] || 0) + 1; if (VC.LAD[id].burns && x.on[id] != null) x.on[id]++; } else x.m.lv[id] = MC.MLAD[id] && MC.MLAD[id].burner && MC.D.burnEff.rebuild ? MC.rebuildTo(x.m.lv[id] || 0) : (x.m.lv[id] || 0) + 1; });
    const rb = !isV && MC.MLAD[id] && MC.MLAD[id].burner && MC.D.burnEff.rebuild, shown = rb ? MC.rebuildNo(w, id) : n;   // v1j: burners count rebuilds, not levels
    setBtn(b, (isV ? VC.LAD[id].name : tierName(id)) + (rb ? ': rebuild ' + (shown + 1) : shown ? ' (' + shown + ')' : ''), mlDesc(id), VC.canPay(w, c), { kind: lineKind(id), cost: c, note: mx ? tx('vw.levels', { n, max: mx }) : '' }); any = true;
  }
  // burners: village burners and copper burners, lit or banked
  const rows = [['firepit', 'wood'], ['limekiln', 'stones'], ['rushlight', 'fiber']];
  const gl = $('mg-light'); if (gl) { const box = gl.querySelector('.burnrows');
    for (const [id, res] of rows) { const n = w.lv[id] || 0; let row = $('burn-' + id); if (!n) { if (row) row.remove(); continue; }
      if (!row) { row = burnRow(box, 'burn-' + id, () => wBurn(id, -1), () => wBurn(id, 1)); }
      const on = VC.burnersOn(w, id); row.children[0].textContent = tx('vw.burn.lit', { name: VC.LAD[id].name });
      row.children[1].textContent = tx('vw.burn.row', { use: fmtW(on * ({ firepit: VC.D.firepitWood, limekiln: VC.D.kilnStone, rushlight: VC.D.rushFiber })[id] * MC.effMult(w, id).fuel, 2), res: resName(res).toLowerCase() });
      row.children[3].textContent = on + '/' + n; row.children[2].disabled = !on; row.children[4].disabled = on >= n; } }
  const gn = MC.mlv(w, 'cuburner') ? mgroup('newsys') : null;
  if (gn) { const box = gn.querySelector('.burnrows'); let row = $('burn-cu'); if (!row) row = burnRow(box, 'burn-cu', () => mCuBurn(-1), () => mCuBurn(1));
    const n = MC.mlv(w, 'cuburner'), on = w.m.cuOn || 0; row.children[0].textContent = 'Copper burners, lit'; row.children[1].textContent = 'burning ' + fmtW(on * MC.D.cuburner.use * 3600 * MC.effMult(w, 'cuburner').fuel, 0) + ' copper/h';
    row.children[3].textContent = on + '/' + n; row.children[2].disabled = !on; row.children[4].disabled = on >= n; }
  if (w.m.cards.academy) { const g = mgroup('newsys'), box = g.querySelector('.burnrows'); let row = $('acad-row');
    if (!row) { row = document.createElement('div'); row.id = 'acad-row'; row.className = 'jrow brow'; row.innerHTML = '<span class="jn"></span><span class="jt"></span><span></span><span></span><button class="jb" style="width:auto;padding:0 0.6rem"></button>'; row.children[4].addEventListener('click', mAcademy); box.appendChild(row); }
    const on = MC.academyOn(w), sch = w.jobs.storyteller || 0, keep = Math.min(1, MC.D.perks.quietHalls.f * MC.perk(w, 'quietHalls'));
    row.children[0].textContent = 'The Light Academy: ' + (on ? 'open' : 'closed');
    row.children[1].textContent = on ? sch + ' scholars making light' + (keep > 0 ? ', keeping ' + Math.round(keep * 100) + '% of their ideas' : ' instead of ideas') : 'scholars make ideas';
    row.children[4].textContent = on ? 'Close' : 'Open'; }
  $('w-showdone').textContent = tx(showDone ? 'w.hidedone' : 'w.showdone') + ' (' + doneB + ')'; $('w-showdone').classList.toggle('hidden', !doneB);
  // relics: one per place called back, bought with copper
  [].forEach.call($('w-make').children, g => g.classList.toggle('hidden', !g.querySelector('button.act') && !g.querySelector('.jrow')));
  $('h-make').classList.remove('hidden');
  renderMapJobs(w); renderMapCards(w);
}
function burnRow(box, id, minus, plus) {
  const row = document.createElement('div'); row.id = id; row.className = 'jrow brow';
  row.innerHTML = '<span class="jn"></span><span class="jt"></span><button class="jb" aria-label="Bank one">−</button><span class="jc"></span><button class="jb" aria-label="Light one">+</button>';
  row.children[2].addEventListener('click', minus); row.children[4].addEventListener('click', plus); box.appendChild(row); return row;
}
function relicTiles(w) { return MC.relicsOpen(w).map(k => ({ k, c: MC.relicCost(w, k).copper })).sort((a, b) => a.c - b.c); }
// v1q (owner, 2026-10-16): relics back on their own tab, from the Relics and Remembering mock-up (no claimed-of-called-back counts, no marks)
const RELIC_OF = { forest: ['Heartwood', 'wood'], hills: ['Cairnstone', 'stone'], marsh: ['Reed charm', 'fiber'], river: ['River token', 'hauling'], meadow: ['Seed jar', 'food'], mountain: ['Sky shard', 'stone'], water: ['Lake glass', 'hauling'] };
// v1r (owner): a relic is named for its region, numbered within it: "The Relic of Stonebeak (3 of 9)"
function relicName(k) { const t = tileOf(k), r = t && regionOf(t); if (!r) return 'The Relic of ' + shortName(t); return 'The Relic of ' + capFirst(r.name.replace(/^the /i, '')) + ' (' + (r.tiles.indexOf(k) + 1) + ' of ' + r.tiles.length + ')'; }
// the relic card's own icon: its land's medallion, small
function relicIconHtml(land) { return '<span class="md xs" style="--c:var(--l-' + LANDC[land] + ')" aria-hidden="true">' + LANDG[land] + '</span>'; }
function relicsNeedYou(w) { const open = relicTiles(w).filter(x => w.res.copper >= x.c); return open.length ? [open.length === 1 ? 'a relic you can claim' : open.length + ' relics you can claim'] : []; }
function mRelicAll() { const w = W(); let n = 0; for (const x of relicTiles(w)) { if (w.res.copper < MC.relicCost(w, x.k).copper) break; if (MC.buyRelic(w, x.k)) n++; } if (n) { w.stats.buys.length = 0; sys(n + ' relic' + (n === 1 ? ' is' : 's are') + ' claimed.'); renderWorld(); } }
function renderRelicsTab(w) {
  const box = $('v-relics'), D = MC.D, LR = D.landRelic, lore = MC.famBuff(w, 'relicLore'), res = MC.resonantN ? null : null;
  const L = w.m.relicLand || {}, ring = {}; if (w.m.relicT) Object.keys(w.m.relicT).forEach(k => { const t = tileOf(k), rg = regionOf(t); if (D.resonance.on && rg && rg.tiles.every(q => w.m.tiles[q])) ring[t.land] = (ring[t.land] || 0) + 1; });
  const backOf = {}; Object.keys(w.m.tiles).forEach(k => { const t = tileOf(k); if (t) backOf[t.land] = (backOf[t.land] || 0) + 1; });
  const open = relicTiles(w), rr = MC.perk(w, 'relicsRemembered');
  const ringTip = 'Finish a region and its relics ring: each counts ' + (1 + D.resonance.R) + ' times.';   // v1r (owner): the old intro, now a hover
  let h = '<div class="rclaim"><p class="sech">Relics to claim' + (rr ? ' <span style="font-style:normal;color:var(--form)">· relics you claimed in an earlier run cost half</span>' : '') + '</p><div class="acts" id="rel-acts"></div></div>';
  h += '<div class="rel"><div><p class="sech">Relics by land</p><div class="rgrid">';
  let wTot = 0;
  for (const land of ['forest', 'hills', 'marsh', 'river', 'meadow', 'mountain', 'water']) {
    const RO = RELIC_OF[land], n = L[land] || 0, rg = ring[land] || 0, wt = n + D.resonance.R * rg, back = backOf[land] || 0; wTot += wt;
    const first = LR.firstOf[land] != null ? LR.firstOf[land] : LR.first, each = LR.eachOf && LR.eachOf[land] != null ? LR.eachOf[land] : LR.each;
    const resPct = n ? Math.round((first + each * Math.max(0, wt - 1)) * 100) : 0;
    h += '<div class="rcard' + (n || back ? '' : ' unfound') + '"><span class="md' + (n ? '' : ' no') + '" style="--c:var(--l-' + LANDC[land] + ')">' + LANDG[land] + '</span>' +
      '<p class="rn">' + RO[0] + (n ? ' ×' + n : '') + '</p>' +
      (n ? '<p class="rx">' + capFirst(RO[1]) + ' +' + resPct + '%</p><p class="rx2">All light +' + fmtW(LR.light * lore * wt * 100, 1) + '%</p>'
        : back ? '<p class="rx">First claimed: ' + RO[1] + ' +' + Math.round(first * 100) + '%</p>' : '<p class="rx">' + LANDN[land] + ': none called back yet</p>') +
      (rg ? '<p class="rw" style="color:var(--form)">' + rg + ' ringing (region finished)</p>' : '') + '</div>';
  }
  h += '</div><div class="rtot"><span>All light from relics: <b>×' + fmtW(MC.relicMult(w), 2) + '</b></span>' + (lore > 1 ? '<span>Relic lore: <b>×' + fmtW(lore, 2) + '</b> on every relic’s light</span>' : '') +
    '<span class="tipme" tabindex="0" data-tip="' + ringTip + '">Ringing relics: <b>' + Object.values(ring).reduce((a, b) => a + b, 0) + '</b></span></div></div>';
  // regions: the ones you have touched, this run or before
  const m = meta(), regs = MC.REGIONS.map((rg, i) => ({ rg, i, on: regionCount(w, rg), N: rg.tiles.length, best: m.regBest[i] || 0, fin: m.regFin[i] || 0 })).filter(r => r.on || r.best);
  regs.sort((a, b) => (b.on === b.N) - (a.on === a.N) || b.on / b.N - a.on / a.N);
  h += '<div><p class="sech"><span class="tipme" tabindex="0" data-tip="' + ringTip + '">Regions</span></p><div class="regs">';
  for (const r of regs) { const fin = r.on === r.N, name = capFirst(r.rg.name);
    const nx = (w.m.target && r.rg.tiles.includes(w.m.target)) ? 1 : 0; let pips = ''; if (r.N <= 24) for (let i = 0; i < r.N; i++) pips += '<i class="' + (i < r.on ? 'on' : i < r.on + nx ? 'nx' : '') + '"></i>';
    const past = r.fin && r.fin < m.run ? 'finished in run ' + r.fin + (fin ? ' too' : '') : r.best && !fin ? 'best: ' + r.best + ' of ' + r.N + ', in an earlier run' : fin ? 'first finished this run' : '';
    h += '<div class="reg' + (fin ? ' fin' : '') + (past ? ' past' : '') + '"><span class="rgn"><span class="md sm" style="--c:var(--l-' + LANDC[r.rg.land] + ')"></span><span>' + name + '</span></span><span class="tally" aria-label="' + r.on + ' of ' + r.N + ' back">' + pips + '<span class="tct">' + (fin ? '✓ rings' : r.on + ' of ' + r.N) + '</span></span>' +
      (fin ? '<span class="rgx">Its relics count ' + (1 + D.resonance.R) + ' times' + (past ? '. ' + capFirst(past) + '.' : '.') + '</span>' : past ? '<span class="rgx">' + capFirst(past) + '</span>' : '') + '</div>'; }
  if (!regs.length) h += '<p class="note" style="color:var(--ash);font-style:italic">Call back a place and its region appears here.</p>';
  h += '</div></div></div>';
  if (box.dataset.sig !== h) { box.dataset.sig = h; box.innerHTML = h;
    box.querySelectorAll('[data-tip]').forEach(e => { ['mouseenter', 'focus'].forEach(ev => e.addEventListener(ev, () => showTextTip(e, e.textContent.replace(/:.*$/, ''), [e.dataset.tip]))); ['mouseleave', 'blur'].forEach(ev => e.addEventListener(ev, hideTip)); }); }
  const acts = $('rel-acts'), shown = open.slice(0, 6).map(x => x.k);
  Array.from(acts.children).forEach(b => { if (b.dataset.k && !shown.includes(b.dataset.k)) b.remove(); if (b.id === 'w-rel-all' && !(rr >= 2)) b.remove(); });
  if (rr >= 2 && open.length > 1) { const tot = open.reduce((a, x) => a + x.c, 0), b = ensureBtn(acts, 'w-rel-all', () => mRelicAll(), 'relic'); setBtn(b, 'Claim every relic you can', open.length + ' waiting; ' + fmtC(tot) + ' copper for all of them. Cheapest first.', w.res.copper >= open[0].c, { cost: { copper: open[0].c } }); }
  for (const x of open.slice(0, 6)) { const t = tileOf(x.k), b = ensureBtn(acts, 'w-rel-' + x.k.replace(/[^\w]/g, '_'), () => mRelic(x.k), 'relic'); b.dataset.k = x.k;
    setBtn(b, relicName(x.k), capFirst(relicGain(w, x.k)) + '. ' + LANDN[t.land] + '.' + (rr && w.m.relicKnown && w.m.relicKnown[x.k] ? ' Remembered: half price.' : ''), VC.canPay(w, { copper: x.c }), { cost: { copper: x.c } }); relicIconOn(b, t.land); }
  if (!open.length && !acts.children.length) acts.innerHTML = '<p class="note" style="color:var(--ash);font-style:italic;margin:0">No relics waiting. Each place you call back brings one.</p>';
  else { const pn = acts.querySelector('p.note'); if (pn && open.length) pn.remove(); }
}
// put the land's small medallion in front of a relic button's title (once)
function relicIconOn(b, land) { const bt = b.querySelector('.bt'); if (bt && !bt.querySelector('.md')) bt.insertAdjacentHTML('afterbegin', relicIconHtml(land) + ' '); }
function renderRelicBox(w) {
  const g = mgroup('relics'), box = g.querySelector('.acts'), open = relicTiles(w), shown = open.slice(0, 3).map(x => x.k);
  g.querySelector('.bgh').textContent = 'Relics: ' + (w.m.relicsN || 0) + ' claimed of ' + w.m.restored + ' places (×' + fmtW(MC.relicMult(w), 2) + ' light)';
  Array.from(box.children).forEach(b => { if (!shown.includes(b.dataset.k)) b.remove(); });
  for (const x of open.slice(0, 3)) { const t = tileOf(x.k), b = ensureBtn(box, 'w-rel-' + x.k.replace(/[^\w]/g, '_'), () => mRelic(x.k), 'relic'); b.dataset.k = x.k;
    setBtn(b, relicName(x.k), capFirst(relicGain(w, x.k)) + '. ' + LANDN[t.land] + '.', VC.canPay(w, { copper: x.c }), { cost: { copper: x.c } }); relicIconOn(b, t.land); }
}
function renderMapJobs(w) {
  const jb = $('w-jobs'); if (!w.pop) return; $('h-jobs').classList.remove('hidden');
  $('w-idle').textContent = tx('w.idle', { free: w.pop - VC.jobsTotal(w), pop: w.pop, food: fmtW(MC.eatRate(w), 2) }) + (MC.hungry(w) < 0.999 ? ' ' + tx('w.idle.hungry') : '') + (w.m.pending > 0 ? ' ' + w.m.pending + ' more waiting for room.' : '');
  const jobs = VC.JOBS.map(j => j.id === 'storyteller' ? Object.assign({}, j, SCHOLAR) : j).concat([{ id: 'smelter', name: 'Smelter', tag: 'wood, stones → copper', desc: 'Smelts copper from wood and a little stone.' }, { id: 'glowcrafter', name: 'Glowcrafter', tag: 'stones, food → glowstones', desc: 'Works stone and food into glowstones. Each one kept makes all light a little stronger.' }]);
  jobs.forEach((j, ji) => {
    if (!MC.jobOpen(w, j.id)) return; let row = $('job-' + j.id); if (row) row.classList.remove('hint');   // v1q: the village's idle-hauler glow stays in the village
    if (!row) { row = document.createElement('div'); row.id = 'job-' + j.id; row.className = 'jrow reveal'; row.tabIndex = 0;
      row.innerHTML = '<span class="jn"></span><span class="jt"></span><button class="jb" aria-label="Remove one">−</button><span class="jc"></span><button class="jb" aria-label="Add one">+</button>';
      row.children[2].addEventListener('click', e => wJob(j.id, -1, e)); row.children[4].addEventListener('click', e => wJob(j.id, 1, e));
      ['mouseenter', 'focus'].forEach(ev => row.addEventListener(ev, () => showTextTip(row, j.name, [mapJobDesc(j)]))); ['mouseleave', 'blur'].forEach(ev => row.addEventListener(ev, hideTip));
      jb.appendChild(row); }
    if (!row.children[0].firstChild || row.children[0].firstChild.nodeValue !== j.name) row.children[0].textContent = j.name; { const tg = j.id === 'storyteller' && MC.academyOn(w) ? 'light, at the Academy' : j.id === 'firekeeper' && !MC.D.keeperFuelMap ? MT.keeperTag : j.tag; if (row.children[1].textContent !== tg) row.children[1].textContent = tg; }
    { const idleH = j.id === 'hauler' && steady('haulIdleM', (w.jobs.hauler || 0) > 0 && !w.m.proj), needH = j.id === 'hauler' && steady('haulNeedM', !!w.m.proj && !w.m.awaitClick && !(w.jobs.hauler > 0)); let d = row.children[0].querySelector('.rdot');   // v1g: haulers idle, or a build with no one carrying
      if ((idleH || needH) && !d) { d = document.createElement('i'); d.className = 'rdot'; row.children[0].appendChild(d); } else if (!(idleH || needH) && d) d.remove();
      if (d) d.title = idleH ? 'Nothing to carry: put them to other work' : 'A build is waiting for haulers'; }
    row.children[3].textContent = w.jobs[j.id] || 0; row.children[2].disabled = !(w.jobs[j.id] > 0); row.children[4].disabled = VC.jobsTotal(w) >= w.pop;
  });
  renderCombatJobs(w, jb);
}
// v1r: once the map opens, firekeepers make light from a settler alone (keeperFuelMap 0), so their words change too
function mapJobDesc(j) { return j.id === 'firekeeper' && !MC.D.keeperFuelMap ? MT.keeperDesc : j.desc; }
function renderMapCards(w) {
  const box = $('w-research'); let any = false;
  const vc = VC.CARDS.filter(c => w.cards[c.id] == null && VC.gateOk(w, c.at));
  const mc = MC.CARDS.filter(c => MC.cardAvail(w, c));
  const songL = VC.LAD.songs, songOn = MC.levelOpen(w, 'songs') && !MC.levelMaxed(w, 'songs');   // v1s (owner): Fire song sits with the ideas and upgrades
  const want = new Set(vc.map(c => 'w-r-' + c.id).concat(mc.map(c => 'w-m-' + c.id)).concat(songOn ? ['w-b-songs'] : []));
  Array.from(box.children).forEach(b => { if (!want.has(b.id)) b.remove(); });
  if (songOn) { any = true; const n = w.lv.songs || 0, c = MC.levelCost(w, 'songs'), mx = MC.levelMax(w, 'songs'), sb = ensureBtn(box, 'w-b-songs', () => mLevel('songs')); sb.classList.remove('done');
    setBtn(sb, songL.name + (n ? ' (' + n + ')' : ''), mlDesc('songs'), VC.canPay(w, c), { kind: 'upgrade', cost: c, note: mx ? tx('vw.levels', { n, max: mx }) : '' });
    if (box.firstChild !== sb) box.insertBefore(sb, box.firstChild); }
  for (const c of vc) { any = true; const b = ensureBtn(box, 'w-r-' + c.id, () => mVCard(c.id)); setBtn(b, c.name, scholarText(c.desc), VC.canPay(w, c.cost), { kind: c.kind, cost: c.cost }); }
  for (const c of mc) { any = true; const b = ensureBtn(box, 'w-m-' + c.id, () => mCard(c.id)), cc = MC.cardCost(w, c);
    setBtn(b, c.name, c.desc, VC.canPay(w, cc), { kind: c.project ? 'building' : c.away ? 'upgrade' : 'idea', cost: cc }); }
  $('w-showdone-ideas').classList.add('hidden'); $('h-ideas').classList.toggle('hidden', !any);
}

/* ---------- the drawer, in the map phase ---------- */
function renderMapDrawer(w) {
  const dr = $('w-drawer'), vs = $('w-vstrip'), ps = $('w-pstrip'); dr.classList.remove('hidden');
  const closed = w.drawer === 'closed'; dr.classList.toggle('closed', closed); $('dr-toggle').textContent = tx(closed ? 'dr.show' : 'dr.hide');
  const t = w.m.target ? tileOf(w.m.target) : null, L = MC.lightRate(w), amp = t ? MC.ampMult(w, t.key) : 1;
  const need = t ? MC.tileCost(t, w) : 0, got = t ? (w.m.got[t.key] || 0) : 0, f = t ? Math.min(1, got / need) : 0;
  if (closed) { const parts = [t ? 'Calling back ' + shortName(t) + ', ' + Math.floor(f * 100) + '%' : MT.stripNone + (w.m.pool >= 1 ? ', ' + fmtC(w.m.pool) + ' saved up' : '')]; if (w.m.proj) parts.push(pname(w, w.m.proj.id) + ', ' + Math.floor(mProjFrac(w) * 100) + '% built'); $('dr-sum').textContent = parts.join(' · '); return; }
  $('dr-sum').textContent = ''; vs.classList.remove('hidden');
  $('vl-lab').textContent = t ? MT.stripTo : MT.stripNone; $('vl-name').textContent = t ? tileName(t) : MT.stripPick;
  $('vl-rate').textContent = tx('w.lrate', { n: fmtW(L * amp, L < 100 ? 2 : 0) }) + (amp > 1 ? ' (amplified ×' + fmtW(amp, 0) + ')' : '');
  const pool = w.m.pool || 0, pcap = MC.poolCap(w);
  const pt = t ? fmtW(Math.floor(f * 1000) / 10, 1) + '%' : fmtC(pool), pe = $('vl-pct'), rest = t ? ' ' + fmtW(got) + ' of ' + fmtW(need) + ' light' : fill(MT.poolSaved, { cap: fmtC(pcap) });
  if (pe.dataset.s !== pt + rest) { pe.dataset.s = pt + rest; pe.textContent = ''; const bb = document.createElement('b'); bb.textContent = pt; pe.append(bb, rest); }
  const lu = (w.m.lineup || []).filter(k => !w.m.tiles[k]), then = lu.length ? fill(MT.thenLine, { list: lu.slice(0, 3).map(k => shortName(tileOf(k))).join(', ') + (lu.length > 3 ? ' and ' + (lu.length - 3) + ' more' : '') }) : MC.perk(w, 'waymarks') ? MT.thenOn : '';
  $('vl-left').textContent = t ? 'about ' + fmtTime((need - got) / Math.max(1e-9, L * amp)) + ' left' + then : (pool >= pcap - 1 ? MT.poolFull : MT.poolLeft);
  $('vl-bar').style.width = ((t ? f : Math.min(1, pool / pcap)) * 100).toFixed(2) + '%'; $('vl-bar').parentNode.classList.toggle('pooling', !t);
  // stoke sends a burst to the tile
  const va = vs.querySelector('.st-act'); { const om = $('vl-map'); if (om) om.remove(); } if (w.cards.stoking) { const sb = ensureBtn(va, 'm-stoke', mBurst, 'slim');
    const bc = MC.burstCost(w), bcs = Object.keys(bc).map(k => fmtW(bc[k]) + ' ' + resName(k).toLowerCase()).join(', ');
    if (w.m.trip > 0) setBtn(sb, MT.burst, fill(MT.burstAway, { t: fmtTime(w.m.trip) }), false, {});
    else setBtn(sb, MT.burst, fill(MT.burstShort, { c: bcs, n: fmtC(MC.burstLight(w)), where: t ? 'here' : 'saved' }), VC.canPay(w, bc), {});
    sb.title = fill(t ? MT.burstSub : MT.burstStore, { n: fmtC(MC.burstLight(w)), s: (w.m.cards.packs ? 60 : 30), t: fmtTime(MC.burstTrip(w)) }) + ' Costs ' + bcs + '.'; }
  // the project being built
  if (!w.m.proj && !w.m.awaitClick) { ps.classList.add('hidden'); $('vp-act').innerHTML = ''; return; }
  ps.classList.remove('hidden');
  const act = $('vp-act');
  if (w.m.awaitClick) {
    const p = MC.projDef(w, w.m.awaitClick), isA = w.m.awaitClick.indexOf('anchor:') === 0, ok = !isA || MC.relicFreeKey(w, w.m.awaitClick.slice(7));
    $('vp-lab').textContent = 'Ready'; $('vp-name').textContent = pname(w, w.m.awaitClick); $('vp-step').textContent = isA ? (ok ? 'Set its relic in it to finish.' : 'Its relic must be claimed first (Relics, in the settlement).') : 'Light it to finish.';
    $('vp-pct').textContent = '100% built'; $('vp-left').textContent = w.m.proj ? 'next: ' + pname(w, w.m.proj.id) + ' waits' : ''; $('vp-left').classList.remove('nohaul'); $('w-pstrip').classList.remove('nohaul'); $('vp-bar').style.width = '100%'; $('vp-draw').textContent = '';
    { const tr = $('vp-track'); tr.style.setProperty('--segs', p.stages.length); tr.classList.toggle('one', p.stages.length === 1); }
    const b = ensureBtn(act, 'vp-finish', mFinish, 'primary'); setBtn(b, isA ? 'Set the relic' : 'Light it', '', ok, {});
    const fb = $('vp-first'); if (fb) fb.remove(); return;
  }
  const fin = $('vp-finish'); if (fin) fin.remove();
  const pd = MC.projDef(w, w.m.proj.id), st = pd.stages[w.m.proj.stage], nd = MC.projNeeds(w), fr = mProjFrac(w);
  $('vp-lab').textContent = 'Building'; $('vp-name').textContent = pname(w, w.m.proj.id);
  const nxs = pd.stages[w.m.proj.stage + 1], n = pd.stages.length;
  $('vp-step').textContent = tx('vp.step', { k: w.m.proj.stage + 1, n, name: stageName(pd, w.m.proj.stage) }) + (nxs ? ' \u00b7 ' + tx('vw.nextstage', { name: stageName(pd, w.m.proj.stage + 1), list: costList(nxs.cost) }) : '') + (w.m.queue.length ? ' \u00b7 then ' + w.m.queue.map(id => pname(w, id)).slice(0, 3).join(', ') : '');
  { const tr = $('vp-track'); tr.style.setProperty('--segs', n); tr.classList.toggle('one', n === 1); }
  $('vp-pct').textContent = Math.floor(fr * 100) + '% built'; $('vp-bar').style.width = (fr * 100).toFixed(1) + '%';
  const left = Object.keys(nd).reduce((a, k) => a + nd[k], 0); const noH = !(w.jobs.hauler > 0); $('vp-left').textContent = noH ? tx('vp.nohaul') : 'about ' + fmtTime(left / Math.max(1e-9, MC.haulRate(w))) + ' left on this stage';
  $('vp-left').classList.toggle('nohaul', noH); $('w-pstrip').classList.toggle('nohaul', noH);
  const items = Object.keys(st.cost).filter(k => nd[k] > 1e-6).map(k => resName(k) + ' ' + fmtW(st.cost[k] - nd[k]) + ' / ' + fmtW(st.cost[k]));
  const dl = $('vp-draw'), sig = items.join('|'); if (dl.dataset.s !== sig) { dl.dataset.s = sig; dl.innerHTML = ''; items.forEach(x => { const sp = document.createElement('span'); sp.textContent = x; dl.appendChild(sp); }); }
  if (w.m.queue.length) { const q = w.m.queue[0], b = ensureBtn(act, 'vp-first', () => mFirst(q), 'slim'); setBtn(b, 'Build ' + pname(w, q) + ' first', '', true, {}); } else { const fb = $('vp-first'); if (fb) fb.remove(); }
}
// a stage's name and needs, for the strip, its preview of the next stage, and the hover
function stageName(pd, i) { const st = pd.stages[i]; return (st && st.name) || 'Stage ' + (i + 1); }
function costList(c) { return Object.keys(c).map(k => fmtW(c[k]) + ' ' + resName(k).toLowerCase()).join(', '); }
function mapProjTip(anchor, withGives) {
  const w = W(); if (!w || !w.m) return; const id = w.m.awaitClick || (w.m.proj && w.m.proj.id); if (!id) return;
  const pd = MC.projDef(w, id), cur = w.m.awaitClick ? pd.stages.length : w.m.proj.stage, nd = w.m.awaitClick ? {} : MC.projNeeds(w), isA = id.indexOf('anchor:') === 0;
  const lines = pd.stages.map((st, i) => tx('vp.step', { k: i + 1, n: pd.stages.length, name: stageName(pd, i) }) + ': ' + (i < cur ? tx('vp.tip.done') : i === cur ? 'carrying ' + Object.keys(st.cost).map(k => resName(k).toLowerCase() + ' ' + fmtW(st.cost[k] - (nd[k] || 0)) + ' of ' + fmtW(st.cost[k])).join(', ') + '.' : tx('vp.tip.needs', { list: costList(st.cost) })));
  lines.push((w.m.awaitClick ? 'Now: ' : 'Then: ') + (isA ? 'set its relic in it to finish.' : 'light it to finish.'));
  showTextTip(anchor, pname(w, id), withGives ? [pd.gives].concat(lines) : lines.concat([{ cls: 'tipx', t: pd.gives }, { cls: 'tipx', t: tx('vw.tip.store') }]));
}
function mProjFrac(w) { if (!w.m.proj) return 0; const pd = MC.projDef(w, w.m.proj.id), st = pd.stages[w.m.proj.stage], tot = Object.keys(st.cost).reduce((a, k) => a + st.cost[k], 0), nd = MC.projNeeds(w), left = Object.keys(nd).reduce((a, k) => a + nd[k], 0); return (w.m.proj.stage + (tot - left) / tot) / pd.stages.length; }

