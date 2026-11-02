/* ---------- the Defense tab, one page (owner, 2026-11-01): the battle front, Buildings, the Bestiary ----------
   The battle front draws only the land you have called back, as your defenders see it: places made safe in their land's colour,
   the 14 next battles (the combat horizon) with their family's symbol, strength and odds, and everything else beyond the horizon,
   dim and hatched. No amplifiers, no attunement. Any place called back can be picked to see its battles. */

// the 23 family symbols (mocked 2026-11-01; revised: spiders with eight legs, bandits as crossed swords, trolls as a tusked face)
const FSYM = (() => {
  const C = (x, y, r) => 'M' + (x - r) + ' ' + y + ' a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0 ';
  const R = (x, y, w, h) => 'M' + x + ' ' + y + ' h' + w + ' v' + h + ' h' + -w + ' Z ';
  return {
    wolves: 'M5 9 L7 3 L10 8 H14 L17 3 L19 9 L17 15 L12 21 L7 15 Z M9.5 12 h0.1 M14.5 12 h0.1',
    spiders: C(12, 13.5, 3.2) + C(12, 8.6, 1.8) + 'M9.4 11.6 L6 8 L3 9 M9 12.8 L5 11.6 L2.5 13 M9 14.4 L5 15.4 L3 18.5 M9.8 15.8 L7.5 18.8 L6.5 21.5 M14.6 11.6 L18 8 L21 9 M15 12.8 L19 11.6 L21.5 13 M15 14.4 L19 15.4 L21 18.5 M14.2 15.8 L16.5 18.8 L17.5 21.5',
    hags: 'M3 19 H21 M7 19 L12 3 L15 11 L13 13 L17 19',
    thorns: 'M4 21 C8 15 11 10 20 3 M8 16 L5 13 M11 12 L14 10 M14 9 L11 6 M17 6 L20 8',
    boars: C(12, 13, 6) + 'M9 16 C7 20 4 19 5 16 M15 16 C17 20 20 19 19 16 M7 9 L5 4 L9 7 M17 9 L19 4 L15 7',
    bandits: 'M8 16 L19 5 L19.5 4.5 M6 14 L10 18 M8 16 L5 19 M16 16 L5 5 L4.5 4.5 M18 14 L14 18 M16 16 L19 19 ' + C(4.2, 19.8, 0.9) + C(19.8, 19.8, 0.9),
    goblins: 'M8 8 C8 4 16 4 16 8 V14 C16 19 8 19 8 14 Z M8 10 L3 6 L6 13 M16 10 L21 6 L18 13 M10.5 11 h0.1 M13.5 11 h0.1',
    bats: 'M2 10 C5 8 7 10 8 13 C9 10 10 9 12 10 C14 9 15 10 16 13 C17 10 19 8 22 10 C19 12 18 15 18 17 C16 15 14 16 12 18 C10 16 8 15 6 17 C6 15 5 12 2 10 Z',
    bears: C(12, 13, 7) + C(6, 6.5, 2.5) + C(18, 6.5, 2.5) + 'M11 15 h2',
    oozes: 'M4 19 C4 12 7 7 12 7 C17 7 20 12 20 19 C18 17 16 20 14 18 C12 20 10 17 8 19 C6 17 5 20 4 19 Z M10 12 h0.1 M14 12 h0.1',
    bog: 'M3 19 C5 17 7 21 9 19 C11 17 13 21 15 19 C17 17 19 21 21 19 M7 11 C9 6 15 6 17 11 C15 15 9 15 7 11 Z ' + C(12, 11, 1.4),
    trolls: 'M5 10 C5 4 19 4 19 10 V15 C19 20 16 21 12 21 C8 21 5 20 5 15 Z M5 10.5 C2.5 10.5 2.5 14.5 5 14.5 M19 10.5 C21.5 10.5 21.5 14.5 19 14.5 M7 9.5 L10.8 10.8 M17 9.5 L13.2 10.8 M9.5 12.6 h0.1 M14.5 12.6 h0.1 M12 12 L11 15.2 H13 M8.5 18.4 H15.5 M9.2 18.4 L9.2 16.4 M14.8 18.4 L14.8 16.4',
    harpies: 'M12 4 V12 M12 12 C9 13 7 16 7 20 M12 12 V20 M12 12 C15 13 17 16 17 20 M8 7 L12 4 L16 7',
    dead: 'M6 11 C6 5 18 5 18 11 C18 14 16 15 16 17 H8 C8 15 6 14 6 11 Z M10 17 V20 M14 17 V20 ' + C(9.5, 11, 1.4) + C(14.5, 11, 1.4),
    wisps: 'M12 3 C15 7 18 10 18 14 C18 18 15 21 12 21 C9 21 6 18 6 14 C6 11 9 9 10 6 C11 9 12 10 13 10 C13 8 12 5 12 3 Z',
    golems: R(7, 3, 10, 6) + R(5, 10, 14, 6) + R(7, 17, 4, 4) + R(13, 17, 4, 4),
    serpents: 'M18 5 C14 3 8 5 9 9 C10 13 16 11 16 15 C16 19 10 21 6 19 M18 5 L21 4 M18 5 L20 8',
    wyverns: 'M3 18 C8 16 10 10 12 3 C13 9 16 12 21 12 C17 14 15 16 14 20 C12 17 8 17 3 18 Z',
    keep: 'M6 21 V8 H18 V21 Z M6 8 V4 H9 V6 H11 V4 H13 V6 H15 V4 H18 V8 M10 21 V16 C10 14 14 14 14 16 V21',
    redhost: 'M6 21 V3 M6 4 H19 L16 8 L19 12 H6',
    choir: 'M7 17 C7 9 9 5 12 5 C15 5 17 9 17 17 Z M5 17 H19 M12 17 V20 M12 3 V5',
    rot: 'M12 3 C14 8 18 11 18 15 C18 19 15 21 12 21 C9 21 6 19 6 15 C6 11 10 8 12 3 Z M10 15 C10 17 11 18 12 18',
    thinning: C(12, 12, 8) + C(12, 12, 2)
  };
})();
// the rim tells the kind of foe: beasts, uncanny things, outlaws; the four great threats wear a doubled gold rim
const FKIND = {}; [['beast', 'wolves boars bears spiders bats serpents harpies wyverns'], ['uncanny', 'hags thorns oozes bog trolls dead wisps golems'], ['outlaw', 'bandits goblins keep'], ['great', 'redhost choir rot thinning']].forEach(([k, ids]) => ids.split(' ').forEach(f => { FKIND[f] = k; }));
const FRIM = { beast: ['#2b2118', '#b08a5a', '#5c4a35'], uncanny: ['#221d2b', '#9a88c4', '#4d4466'], outlaw: ['#2b1a1c', '#c45a60', '#5e2a2e'], great: ['#2a1414', '#d9a64e', '#d9a64e'] };
function famBadge(f, px, tip) {
  const k = FRIM[FKIND[f] || 'beast'], small = px < 22;
  return (tip ? '<span class="fbw" data-fam="' + f + '">' : '') + '<svg class="fbadge" width="' + px + '" height="' + px + '" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="' + k[0] + '" stroke="' + k[1] + '" stroke-width="' + (small ? 2.4 : 1.6) + '"></circle>' +
    (small ? '' : '<circle cx="16" cy="16" r="12.6" fill="none" stroke="' + k[2] + '" stroke-width="0.8"></circle>') +
    '<path d="' + (FSYM[f] || '') + '" transform="translate(6.4 6.4) scale(0.8)" fill="none" stroke="#f1e4d6" stroke-width="' + (small ? 2.7 : 2) + '" stroke-linecap="round" stroke-linejoin="round"' + (f === 'thinning' ? ' stroke-dasharray="3 2.2"' : '') + '></path></svg>' + (tip ? '</span>' : '');
}
// owner, 2026-11-01: hovering an enemy's symbol (anywhere but the map) shows what that enemy is like
function famTip(f) { const L = cLife(), fm = CMX.families().find(x => x.id === f); if (!fm) return []; const out = [fm.traitText, capFirst(CMX.DANGER_NAME[fm.danger]) + ' danger. ' + capFirst(CB.tierOf(f)) + '.'];
  const lands = Object.keys(fm.lands || {}).sort((a, b) => fm.lands[b] - fm.lands[a]).slice(0, 2).map(l => LANDP[l] || LANDN[l].toLowerCase()); if (lands.length) out.push('Found most in ' + lands.join(' and ') + '.');
  if (fm.names && fm.names.length > 1) out.push('From ' + fm.names[0].replace(/^A /, 'a ') + ' to ' + fm.names[fm.names.length - 1].replace(/^The /, 'the ') + '.');
  const n = L.beast[f] || 0; out.push(n ? { cls: 'tg', t: 'Bestiary: stage ' + CB.beastStages(L, f) + ', ×' + fmtW(CB.beastEdge(L, f), 2) + ' against them.' } : { cls: 'tg', t: 'Not met yet.' }); return out; }
// a place's name: its own if it has one, else its land and region
function dPlace(t) { if (!t) return ''; if (t.name) return t.name; const r = MC.MAP.regions[t.region]; return LANDN[t.land] + (r ? ', ' + r.name : ''); }
function dOdds(pv) { return !pv ? 'bad' : pv.sure ? 'ok' : pv.none ? 'bad' : 'mid'; }
function dEsc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
// the place picked on the battle front: what you picked, else the weakest on the horizon
function dSel(w, C, fr) { const k = CMV.dsel; if (k && w.m.tiles[k] && CB.byKey(k)) return k; return fr.length ? fr[0].key : null; }
function dPick(k) { CMV.dsel = k; hideTip(); renderWorld(); }
// owner, 2026-11-01: "Fight them all" fights every battle on the horizon that is 100% to win, weakest first, steady and with everything you have
function cFightEasy() {
  const w = W(), C = cRun(w); if (!C) return; const L = cLife(), form = CMV.form, lead = CMV.lead; CMV.form = 'steady'; CMV.lead = false; let n = 0;
  for (let g = 0; g < 80; g++) { const c = combatHorizonList(w, C).map(x => ({ x, pv: CB.preview(w, C, L, x.key, { frac: 1 }) })).filter(o => o.pv && o.pv.sure).sort((a, b) => a.pv.D - b.pv.D).map(o => o.x).find(x => { const pv = CB.preview(w, C, L, x.key, { frac: 1 }); return pv && pv.sure; }); if (!c) break; cAttack(c.key); n++; }
  CMV.form = form; CMV.lead = lead; if (n > 1) sys(n + ' easy battles fought.');
}
// the battle front's map zooms (+ and −, from the whole land to close up) and scrolls; drag it with the mouse (touch scrolls natively)
function dZoom(f) { const mb = $('cd-mapbox'); if (!mb) return; const z0 = CMV.dzoom || 1, z1 = Math.max(1, Math.min(64 / Math.max(10, CMV.dfit || 20), z0 * f)); if (z1 === z0) return;
  const cx = (mb.scrollLeft + mb.clientWidth / 2) / Math.max(1, mb.scrollWidth), cy = (mb.scrollTop + mb.clientHeight / 2) / Math.max(1, mb.scrollHeight);
  CMV.dzoom = z1; renderDefenseTab(W()); mb.scrollLeft = cx * mb.scrollWidth - mb.clientWidth / 2; mb.scrollTop = cy * mb.scrollHeight - mb.clientHeight / 2; }
function dPan(v) { let d = null;
  v.addEventListener('pointerdown', e => { if (e.button !== 0 || e.pointerType !== 'mouse') return; d = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop, moved: false, id: e.pointerId }; });
  v.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) { d.moved = true; v.classList.add('drag'); try { v.setPointerCapture(d.id); } catch (er) {} }
    if (d.moved) { v.scrollLeft = d.l - dx; v.scrollTop = d.t - dy; } });
  const end = () => { if (!d) return; if (d.moved) { CMV.dragEnd = Date.now(); v.classList.remove('drag'); } d = null; };
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
  v.addEventListener('click', e => { if (CMV.dragEnd && Date.now() - CMV.dragEnd < 250) { e.stopPropagation(); e.preventDefault(); } }, true); }
const DGROUPS = [['recruit', 'Recruit', 'how many defend', ['barracks']], ['arm', 'Arm', 'how well armed', ['armory', 'avatar']], ['train', 'Train', 'how fast the bar refills', ['drill', 'rally']],
  ['supply', 'Supply', 'iron and stores', ['mine', 'ironStore', 'reserves']], ['support', 'Support', 'opened by the Bestiary', ['healers', 'scouts', 'council']], ['light', 'For the light', 'kept for good', []]];

function renderDefenseTab(w) {
  const box = $('v-defense'), C = cRun(w), L = cLife();
  if (!C) { box.innerHTML = '<p class="mmut">Nothing fights back yet.</p>'; delete box.dataset.built; return; }
  const open = cCapOpen(C);
  if (!box.dataset.built) { box.dataset.built = '1';
    box.innerHTML = '<div class="cdsec" id="cd-sec-muster"><div id="cd-muster"></div></div>' +
      '<section class="cdsec" id="cd-sec-front" aria-labelledby="cd-h-front"><h2 class="dsh" id="cd-h-front">The battle front</h2><div class="dfront">' +
        '<div class="dmapcol"><div class="dmapwrap"><div class="dmapbox" id="cd-mapbox"><div class="dmap" id="cd-map" role="group" aria-label="The land you have called back, as your defenders see it"></div></div>' +
        '<div class="mzoom dzoom"><button type="button" id="cd-zin" aria-label="Zoom in">+</button><button type="button" id="cd-zout" aria-label="Zoom out">−</button></div></div></div>' +
        '<div class="dlistcol"><div id="cd-easy"></div><p class="sech" id="cd-hzh">On the horizon: the next battles, weakest first</p><div class="dlist" id="cd-front" role="list"></div></div>' +
        '<div class="dcardcol" id="cd-card"></div></div></section>' +
      '<section class="cdsec" id="cd-sec-make" aria-labelledby="cd-h-make"><h2 class="dsh" id="cd-h-make">Buildings</h2><div class="dchain" id="cd-chain"></div><div class="dgroups" id="cd-make">' +
        DGROUPS.map(g => '<div class="dgroup hidden" id="cd-g-' + g[0] + '"><h3><span>' + g[1] + '</span><span class="dgs">' + g[2] + '</span></h3><div class="acts"></div></div>').join('') + '</div></section>' +
      '<section class="cdsec" id="cd-sec-beast" aria-labelledby="cd-h-beast"><h2 class="dsh" id="cd-h-beast">Bestiary</h2><p class="mmut dbnote" id="cd-beastn"></p><div class="dbeasts" id="cd-beast"></div></section>';
    $('cd-map').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) dPick(b.dataset.k); });
    $('cd-front').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) dPick(b.dataset.k); });
    $('cd-zin').addEventListener('click', () => dZoom(1.25)); $('cd-zout').addEventListener('click', () => dZoom(0.8)); dPan($('cd-mapbox'));
    box.addEventListener('mouseover', e => { const el = e.target.closest('[data-fam]'); if (!el || el === CMV.tipEl) return; CMV.tipEl = el; showTextTip(el, FAMN[el.dataset.fam], famTip(el.dataset.fam)); });
    box.addEventListener('mouseout', e => { const el = e.target.closest('[data-fam]'); if (el && !el.contains(e.relatedTarget)) { CMV.tipEl = null; hideTip(); } });
  }
  $('cd-sec-muster').classList.toggle('hidden', !open); $('cd-sec-front').classList.toggle('hidden', !open);
  if (open && S.view === 'defense') L.frontSeen = true;
  // the horizon: the 10 next battles, weakest next battle first
  const fr = open ? combatHorizonList(w, C) : [], pvs = {}; fr.forEach(c => { pvs[c.key] = CB.preview(w, C, L, c.key, { frac: 1 }); });
  const sel = open ? dSel(w, C, fr) : null;

  // your defenders: the bar, Reserves, iron; then how fast it fills, bloodstones and the charge
  if (open) { const m = $('cd-muster'), cap = CB.cap(C, L), rc = CB.resCap(C, L), drillOn = CB.drillSlots(C) > 0, fh = CB.fillH(C, L);
    const sig = [fmtCP(C.cp), fmtCP(cap), fmtCP(C.res), fmtCP(rc), Math.floor(C.hr * 6), C.rallies, drillOn, C.clearedN, L.bs, L.bsPending].join('|');
    if (m.dataset.s !== sig) { m.dataset.s = sig;
      const bar = (lab, now, of, side, cls) => '<div class="dbar"><div class="dbl"><span>' + lab + ' <b>' + fmtCP(now) + '</b> of ' + fmtCP(of) + '</span>' + (side ? '<span class="mmut">' + side + '</span>' : '') + '</div><div class="dtrack ' + cls + '"><i style="width:' + (of > 0 ? Math.min(100, now / of * 100) : 0).toFixed(1) + '%"></i></div></div>';
      const left = cap > 0 && C.cp < cap ? 'full in ' + fmtTime(Math.max(0, (cap - C.cp) / Math.max(1e-12, CB.resolveH(C, L))) * 3600) : 'full';
      m.innerHTML = '<div class="dstrip">' + bar('Combat power', C.cp, cap, left, 'cp') + (rc > 0 ? bar('Reserves', C.res, rc, '', 'res') : '<div></div>') + '</div>' +
        '<p class="cline">' + fill2(CT.resolveIs, { t: fmtTime(fh * 3600) }) + '</p>' +
        '<p class="cline">Bloodstones: <b>' + fmtW(L.bs) + '</b> holding (combat power ×' + fmtW(cFlatFor(L.bs), 2) + ')' + (L.bsPending ? ', <b>' + fmtW(L.bsPending) + '</b> more waiting for the traveler' : '') + '; ' + fmtW(L.bs + (L.bsPending || 0) - CB.perkSpent(L.perks)) + ' to spend with him.</p>'; } }

  // the battle front: the map
  if (open) { const mp = $('cd-map'), hz = combatHorizon(w, C), keys = Object.keys(w.m.tiles); let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    keys.forEach(k => { const p = k.split(','), x = +p[0], y = +p[1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
    const nx = x1 - x0 + 1, ny = y1 - y0 + 1, mb = $('cd-mapbox'), fit = Math.max(10, Math.floor(Math.min(((mb.clientWidth || 420) - 16) / nx, ((mb.clientHeight || 420) - 16) / ny)) - 1);
    CMV.dfit = fit; const cs = Math.round(Math.min(64, fit * (CMV.dzoom || 1))), big = cs >= 24; $('cd-zin').disabled = cs >= 64; $('cd-zout').disabled = (CMV.dzoom || 1) <= 1;
    const sig = [x0, y0, nx, ny, cs, keys.length, C.clearedN, sel, fr.map(c => c.key + ':' + (C.bdone[c.key] || 0) + ':' + dOdds(pvs[c.key]) + ':' + fmtShortCP(pvs[c.key].D * CPU)).join(',')].join('|');
    if (mp.dataset.s !== sig) { mp.dataset.s = sig; mp.style.setProperty('--nx', nx); mp.style.setProperty('--cs', cs + 'px'); let h = '';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = x + ',' + y, t = tileOf(k);
        if (k === '0,0') { h += '<span class="dc home" title="Your home">⌂</span>'; continue; }
        if (!t || !w.m.tiles[k]) { h += '<span class="dc"></span>'; continue; }
        const c = CB.byKey(k), land = 'var(--l-' + LANDC[t.land] + ')', nm = dEsc(dPlace(t)), sl = k === sel ? ' sel' : '';
        if (!c || C.cleared[k]) { h += '<button type="button" class="dc safe' + sl + '" style="--c:' + land + '" data-k="' + k + '" title="' + nm + ': made safe"></button>'; continue; }
        if (hz[k] && pvs[k]) { const pv = pvs[k], st = fmtShortCP(pv.D * CPU);
          h += '<button type="button" class="dc hz ' + dOdds(pv) + sl + '" style="--c:' + land + '" data-k="' + k + '" title="' + nm + ': ' + dEsc(c.famName) + ', ' + st + ', ' + cPct(pv.pwin) + '% to win">' + famBadge(c.fam, Math.round(cs * (big ? 0.5 : 0.7))) + (big ? '<span>' + st + '</span>' : '') + '</button>'; continue; }
        h += '<button type="button" class="dc far' + sl + '" style="--c:' + land + '" data-k="' + k + '" title="' + nm + ': beyond the horizon"></button>'; }
      mp.innerHTML = h; } }

  // the battle front: easy fights and the horizon list
  if (open) { const ez = fr.filter(c => pvs[c.key].sure).length, eb = $('cd-easy'), es = 'e' + ez;
    if (eb.dataset.s !== es) { eb.dataset.s = es; eb.innerHTML = ez ? '<div class="deasy"><span>' + ez + ' easy fight' + (ez === 1 ? '' : 's') + ' ready <span class="mmut">· 100% to win</span></span><button type="button" class="dfight" id="cd-easyb">Fight ' + (ez === 1 ? 'it' : 'them all') + '</button></div>' : '';
      const b = $('cd-easyb'); if (b) b.addEventListener('click', cFightEasy); }
    $('cd-hzh').textContent = fr.length ? 'On the horizon: the ' + (fr.length === 1 ? 'next battle' : fr.length + ' next battles') + ', weakest first' : 'On the horizon';
    const f = $('cd-front'), sig = fr.map(c => c.key + ':' + (C.bdone[c.key] || 0) + ':' + cPct(pvs[c.key].pwin) + ':' + fmtShortCP(pvs[c.key].D * CPU)).join(',') + '|' + sel;
    if (f.dataset.s !== sig) { f.dataset.s = sig;
      f.innerHTML = fr.length ? fr.map(c => { const pv = pvs[c.key], o = dOdds(pv);
        return '<button type="button" role="listitem" class="drow' + (c.key === sel ? ' sel' : '') + '" data-k="' + c.key + '">' + famBadge(c.fam, 26, true) + '<span class="dn"><span>' + dEsc(dPlace(tileOf(c.key))) + '</span><span class="mmut">' + dEsc(c.famName) + ' · battle ' + ((C.bdone[c.key] || 0) + 1) + ' of ' + (c.nb + (C.extra[c.key] || 0)) + '</span></span>' +
          '<span class="dst">⚔ ' + fmtShortCP(pv.D * CPU) + '</span><span class="dpw ' + o + '">' + cPct(pv.pwin) + '%</span></button>'; }).join('')
        : '<p class="mmut">Every place you have called back is safe. Call back more.</p>'; } }

  // the battle front: the picked place's battles
  if (open) { const cb = $('cd-card'), sig = sel ? sel + '|' + combatSig(w, sel) : '-';
    if (cb.dataset.s !== sig) { cb.dataset.s = sig; cb.innerHTML = '';
      if (!sel) cb.innerHTML = '<p class="mmut">Pick a place on the map to see its battles.</p>';
      else { const t = tileOf(sel), c = CB.byKey(sel), hd = document.createElement('div'); hd.className = 'dch';
        const r = MC.MAP.regions[t.region]; hd.innerHTML = '<span class="dcl">' + dEsc(LANDN[t.land] + (r ? ' · ' + r.name : '')) + '</span><span class="dcn">' + famBadge(c.fam, 30, true) + '<span>' + dEsc(t.name || c.name) + '</span></span>'; cb.appendChild(hd); combatCard(w, sel, cb); } } }

  // Buildings: where your strength comes from, then the lines by what they do (only what is open: the mine first)
  { const ch = $('cd-chain'), cap = CB.cap(C, L), parts = CB.capParts(C, L), sum = parts.reduce((a, p) => a + p[1], 0), sig = fmtCP(cap) + '|' + parts.map(p => p[1].toFixed(3)).join(',');
    ch.classList.toggle('hidden', !open || !(cap > 0));
    if (open && cap > 0 && ch.dataset.s !== sig) { ch.dataset.s = sig; const nm = { 'Barracks (recruit)': 'Barracks', 'Armory (arm)': 'Armory', 'Bloodstones, flat': 'Bloodstones', 'Combat relics': 'Battle relics', 'Bloodstone perks': 'Bloodstone perks' };
      ch.innerHTML = '<span class="mmut">Your full strength</span><b class="dfull">' + fmtCP(cap) + '</b><span class="mmut">=</span><span class="dpill"><span class="mmut">Base</span> <b>' + fmtCP(cap / Math.pow(10, sum)) + '</b></span>' +
        parts.filter(p => p[1] > 0.004).map(p => '<span class="dpill"><span class="mmut">' + (nm[p[0]] || p[0]) + '</span> <b>×' + fmtW(Math.pow(10, p[1]), 2) + '</b></span>').join(''); } }
  const opts = CB.options(w, C, L), byId = {}; opts.forEach(o => { byId[o.id] = o; });
  DGROUPS.forEach(([gid, , , ids]) => { const acts = $('cd-g-' + gid).querySelector('.acts');
    ids.forEach(id => { const o = byId[id], bid = 'cd-b-' + id;
      if (!o || !LINE[id]) { if ($(bid)) $(bid).remove(); return; }
      const b = ensureBtn(acts, bid, () => cBuy(id)), lv = id === 'armory' ? (C.lv.armory || C.tier.armory > 1 ? C.tier.armory + '/' + C.lv.armory : 0) : C.lv[id];
      setBtn(b, (id === 'mine' && !C.lv.mine ? 'Reopen the iron mine' : LINE[id][0]) + (lv ? ' (' + lv + ')' : ''), LINE[id][1](w, C, L), CB.canBuy(w, C, L, id), { kind: LINE[id][2], cost: o.cost });
      hoverTip(b, () => { const ww = W(), CC = cRun(ww); if (!CC) return; const t = cWhatAdds(ww, CC, cLife(), id); if (t) showTextTip(b, 'If you build this', t); });
      if (S.view === 'defense') { L.seenLine = L.seenLine || {}; L.seenLine[id] = true; }
      let d = b.querySelector('.ndot'); const nw = cNew(id); if (nw && !d) { d = document.createElement('i'); d.className = 'ndot'; d.setAttribute('aria-hidden', 'true'); b.appendChild(d); } else if (!nw && d) d.remove(); }); });
  // for the light: iron for the fires, standards (queued for the haulers, all at once if you like)
  { const lb = $('cd-g-light').querySelector('.acts'), op = CB.oneOffsOpen(C, L), want = new Set(op.map(x => 'cd-o-' + x.id)), std = CB.stdOpen(C, L, w);
    Array.from(lb.querySelectorAll('.act')).forEach(b => { if (b.id && b.id.indexOf('cd-o-') === 0 && !want.has(b.id)) b.remove(); });
    op.forEach(x => { const b = ensureBtn(lb, 'cd-o-' + x.id, () => cOneOff(x.id)); setBtn(b, x.name, 'Iron for the fires: ' + oneOffWhat(x) + (CB.P.keepLight ? '. Kept for good.' : '. This run of your defense only.'), C.iron >= x.iron, { kind: 'upgrade', cost: { iron: x.iron } }); });
    const toQ = std.filter(k => !stdQueued(w, k)), sb = $('cd-stdall'), pb = $('cd-stdpause'), nw = stdWaiting(w);
    if (toQ.length) { const b = ensureBtn(lb, 'cd-stdall', cStdAll); setBtn(b, fill2(CT.stdAll, { n: toQ.length }), fill2(CT.stdAllSub, { pct: fmtW(CB.P.standard.x * 100, 1), raised: L.stdN || 0 }), true, { kind: 'building', cost: CB.stdCost(L) }); } else if (sb) sb.remove();
    if (nw) { const b = ensureBtn(lb, 'cd-stdpause', cStdPause); setBtn(b, CT.stdPause, fill2(CT.stdPauseSub, { n: nw }), true, {}); } else if (pb) pb.remove(); }
  DGROUPS.forEach(([gid]) => { const g = $('cd-g-' + gid); g.classList.toggle('hidden', !g.querySelector('.act')); });

  // the Bestiary: the families you have studied, and those on the horizon you have not met yet
  { const bx = $('cd-beast'), met = Object.keys(CB.famCount).filter(f => (L.beast[f] || 0) > 0).sort((a, b) => (L.beast[b] || 0) - (L.beast[a] || 0)), seen = new Set(met), fresh = [];
    fr.forEach(c => { if (!seen.has(c.fam)) { seen.add(c.fam); fresh.push(c.fam); } });
    const fams = met.concat(fresh), sig = 'b|' + fams.map(f => f + (L.beast[f] || 0)).join(',');
    $('cd-sec-beast').classList.toggle('hidden', !fams.length);
    if (bx.dataset.s !== sig) { bx.dataset.s = sig;
      bx.innerHTML = fams.map(f => { const n = L.beast[f] || 0, st = CB.beastStages(L, f); let th = CB.P.bestiary.first[CB.tierOf(f)]; for (let i = 0; i < st; i++) th *= CB.P.bestiary.g;
        return '<div class="dbeast' + (n ? '' : ' unmet') + '"><div class="dbh">' + famBadge(f, 34, true) + '<span><b>' + dEsc(FAMN[f]) + '</b><span class="mmut">' + CB.tierOf(f) + '</span></span></div>' +
          '<div class="dtrack res"><i style="width:' + (n ? Math.min(100, n / th * 100) : 0).toFixed(1) + '%"></i></div>' +
          '<div class="dbf"><span>' + (n ? 'stage ' + st + ' · studied ' + fmtW(n) + ' / ' + fmtW(Math.ceil(th)) : 'not met yet') + '</span><span class="dedge">×' + fmtW(CB.beastEdge(L, f), 2) + ' against them</span></div></div>'; }).join('');
      $('cd-beastn').textContent = 'Each battle won and each raid teaches you more of a family. Each stage is ×' + fmtW(1 + CB.P.bestiary.edge, 1) + ' in its battles, for good. Healers, scouts and the council table open as stages add up (' + CB.beastTotal(L) + ' so far).'; } }
}
