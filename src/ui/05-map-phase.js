/* =====================================================================
   CHAPTER 3: THE MAP, rebuilt (map phase 1 branch, 2026-10-12)
   Every number and rule lives in the map core (MC, loaded above), the same file
   the Map Lab's bot plays, on dial set I (the build settings). This part shows
   it and takes clicks: the map, the settlement's phase-1 lines, relics, anchors,
   amplifiers, the Academy, and the scatter between runs.
   ===================================================================== */
/* v1p: Map A's land, drawn as one landscape (owner's pick, 2026-10-16: option 6, the grid on the frontier only).
   One colour family per land, drawn in map space rather than per tile: land edges wander a few pixels, trees, hills
   and peaks scatter across tiles, fields make a patchwork with hedges, water has a shoreline, rivers curve, and broad
   soft patches of tone replace pixel noise. The whole map is drawn once at 16 px a tile; each frame only shades it by
   what you know of each place (restored, beside your land, seen from afar, dark) into one canvas under the grid.
   The noise is the map lab's (map-a-legibility-landscape), so the heartland matches the approved mockup. */
const LAND = (function () {
  const TN = 16, MR = 16, N = 2 * MR + 1, W = N * TN, SH = (MR - 8) * TN;   // SH: the lab drew a 17 x 17 window
  const h01 = (x, y, k) => { const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
  const vn = (x, y, per, k) => { const gx = x / per, gy = y / per, x0 = Math.floor(gx), y0 = Math.floor(gy); let fx = gx - x0, fy = gy - y0;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = h01(x0, y0, k), b = h01(x0 + 1, y0, k), c = h01(x0, y0 + 1, k), d = h01(x0 + 1, y0 + 1, k);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  const mod = (a, n) => ((a % n) + n) % n;
  const hx = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const PAL = {   // base, light patch, dark patch, feature, feature light, feature dark
    G: ['#c3b85e', '#cfc56c', '#b4a952', '#9c8e3e'], F: ['#d0b055', '#dcbe66', '#c3a24a', '#a8853a'], C: ['#d8cc9e', '#e3d8ae', '#cbbd8c', '#b3a272'],
    R: ['#8dbf5c', '#9acb68', '#7fb150', '#6c9d3f', '#f2ecd0'], W: ['#2c552b', '#335f30', '#264b25', '#3f7a38', '#5b9447', '#1f3d1f'],
    H: ['#a98a52', '#b5965c', '#9c7e48', '#b27a47', '#d09c66', '#7f5430'], M: ['#5f8c76', '#6a987f', '#55806b', '#3e6a5a', '#86bcc4'],
    L: ['#3b70ae', '#4379b6', '#3568a4', '#6b9dd6', '#bcd8ee'], S: ['#2a5490', '#305b98', '#264d86', '#4e7fbe', '#a8c8e6'],
    X: ['#857f78', '#908a82', '#7a746e', '#8b86a0', '#b4b0c6', '#5d5874'], P: ['#8c867f', '#97918a', '#817b74', '#9893ac', '#c4c0d4', '#666180']
  };
  const P = {}; for (const k in PAL) P[k] = PAL[k].map(hx);
  const SAND = hx('#d9c995'), FOAM = hx('#d6e8f2'), RIV = hx('#4f8bcf'), RIVL = hx('#7fb0e4'), HEDGE = hx('#7d7a3a'), GREENISH = hx('#8a9a40'),
    SNOW = hx('#f2f1f6'), SNOW2 = hx('#cfcde0'), DARK = hx('#16120f'), VOID = hx('#0a0908');   // v1s: the dark itself is near-black; glimpsed places still fade toward DARK
  const WATER = c => c === 'L' || c === 'S';
  let L = null, IMG = null, MAP = null;
  // window (lab) coordinates: pixel (0, 0) is the top-left of tile (-8, -8)
  const tileOf = (wx, wy) => [Math.floor((wx + SH) / TN) - MR, Math.floor((wy + SH) / TN) - MR];
  function codeAt(tx, ty) { if (tx === 0 && ty === 0) return 'R'; const i = MAP.idx[tx + ',' + ty]; const t = i == null ? null : MAP.tiles[i]; return t && t.code && t.code !== 'HOME' ? t.code : 'S'; }
  function build(map) {
    MAP = map; const codes = {};
    for (let y = -MR; y <= MR; y++) for (let x = -MR; x <= MR; x++) codes[x + ',' + y] = codeAt(x, y);
    const cd = (tx, ty) => (Math.abs(tx) > MR || Math.abs(ty) > MR) ? null : codes[tx + ',' + ty];
    L = new Array(W * W);
    for (let iy = 0; iy < W; iy++) for (let ix = 0; ix < W; ix++) {
      const wx = ix - SH, wy = iy - SH, own = tileOf(wx, wy);
      const dx = (vn(wx, wy, 7, 11) - .5) * 7, dy = (vn(wx, wy, 7, 23) - .5) * 7, q = tileOf(wx + dx, wy + dy);
      L[iy * W + ix] = cd(q[0], q[1]) || cd(own[0], own[1]);
    }
    const land = (wx, wy) => L[Math.min(W - 1, Math.max(0, wy + SH)) * W + Math.min(W - 1, Math.max(0, wx + SH))];
    IMG = new Array(W * W);
    for (let iy = 0; iy < W; iy++) for (let ix = 0; ix < W; ix++) {
      const c = L[iy * W + ix], pal = P[c], n = vn(ix - SH, iy - SH, 20, 3 + c.charCodeAt(0));
      IMG[iy * W + ix] = n > .66 ? pal[1] : n < .30 ? pal[2] : pal[0];
    }
    const S = (wx, wy, col) => { const ix = wx + SH, iy = wy + SH; if (ix >= 0 && ix < W && iy >= 0 && iy < W) IMG[iy * W + ix] = col; };
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // fields: a patchwork, furrows across or down each field, a hedge where a field meets other land
    for (let iy = 0; iy < W; iy++) for (let ix = 0; ix < W; ix++) {
      if (L[iy * W + ix] !== 'F') continue;
      const wx = ix - SH, wy = iy - SH, p = tileOf(wx, wy), vert = h01(p[0], p[1], 5) < .5, k = mod(vert ? wx : wy, 4);
      if (k === 3) IMG[iy * W + ix] = h01(p[0], p[1], 6) < .6 ? P.F[3] : mix(P.F[3], GREENISH, .5);
      if (NB.some(([a, b]) => !'FGCR'.includes(land(wx + a, wy + b)))) IMG[iy * W + ix] = HEDGE;
    }
    // shorelines: foam on the water's edge, sand on the land's
    for (let iy = 0; iy < W; iy++) for (let ix = 0; ix < W; ix++) {
      const wx = ix - SH, wy = iy - SH, c = L[iy * W + ix], nb = NB.map(([a, b]) => land(wx + a, wy + b));
      if (WATER(c) && nb.some(n => !WATER(n))) IMG[iy * W + ix] = mod(wx + wy, 3) ? FOAM : P[c][4];
      else if (!WATER(c) && !'XPW'.includes(c) && nb.some(WATER)) IMG[iy * W + ix] = SAND;
    }
    // scattered features, in map space, drawn back to front
    const feats = [];
    function scatter(step, k, jit, fn) {
      const g0 = -2 - step * Math.ceil(SH / step), g1 = W - SH + 2;
      for (let gy = g0; gy < g1; gy += step) for (let gx = g0; gx < g1; gx += step) {
        const x = gx + Math.trunc((h01(gx, gy, k) - .5) * 2 * jit) + (mod(Math.floor(gy / step), 2) ? Math.floor(step / 2) : 0), y = gy + Math.trunc((h01(gx, gy, k + 1) - .5) * 2 * jit);
        fn(x, y, land(x, y));
      }
    }
    scatter(6, 100, 2, (x, y, c) => {
      if ((c === 'G' || c === 'R') && h01(x, y, 9) < (c === 'G' ? .55 : .35)) feats.push([y, 'tuft', x, c]);
      if (c === 'R' && h01(x, y, 19) < .12) feats.push([y, 'flower', x, c]);
      if (c === 'C' && h01(x, y, 29) < .25) feats.push([y, 'pebble', x, c]);
      if (c === 'M' && h01(x, y, 39) < .7) feats.push([y, h01(x, y, 40) < .65 ? 'reed' : 'pool', x, c]);
      if (WATER(c) && h01(x, y, 49) < .3) feats.push([y, 'wave', x, c]);
    });
    scatter(4, 200, 1, (x, y, c) => { if (c === 'W' && h01(x, y, 59) < .82) feats.push([y, 'tree', x, c]); });
    scatter(10, 300, 3, (x, y, c) => { if (c === 'H' && h01(x, y, 63) < .75) feats.push([y, 'hill', x, c]); });
    scatter(8, 400, 2, (x, y, c) => { if (c === 'X' || c === 'P') feats.push([y, 'peak', x, c]); });
    feats.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || a[2] - b[2] || (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0));
    for (const [y, kind, x, c] of feats) {
      const pal = P[c];
      if (kind === 'tuft') { S(x, y, pal[3]); S(x + 1, y + 1, pal[3]); S(x + 2, y, pal[3]); }
      else if (kind === 'flower') S(x, y, pal[4]);
      else if (kind === 'pebble') { S(x, y, pal[3]); S(x + 1, y, pal[3]); }
      else if (kind === 'reed') { for (let b = 0; b < 3; b++) S(x, y - b, pal[3]); S(x + 2, y - 1, pal[3]); S(x + 2, y, pal[3]); }
      else if (kind === 'pool') { for (let a = 0; a < 4; a++) S(x + a, y, pal[4]); }
      else if (kind === 'wave') { S(x, y, pal[3]); S(x + 1, y - 1, pal[3]); S(x + 2, y - 1, pal[3]); S(x + 3, y, pal[3]); }
      else if (kind === 'tree') {
        const mid = h01(x, y, 64) < .7 ? pal[3] : mix(pal[3], pal[5], .35);
        for (let b = -3; b < 3; b++) for (let a = -3; a < 4; a++) { const d = (a / 3.2) ** 2 + ((b + .3) / 2.7) ** 2; if (d <= 1) S(x + a, y + b, a + b < -2 ? pal[4] : a + b > 2 ? pal[5] : mid); }
      } else if (kind === 'hill') {
        const w = 5 + Math.trunc(h01(x, y, 61) * 3), h = 3 + Math.trunc(h01(x, y, 62) * 2);
        for (let a = -w; a <= w; a++) { const top = h * Math.sqrt(Math.max(0, 1 - (a / (w + .5)) ** 2)), ct = Math.ceil(top);
          for (let b = 0; b <= ct; b++) S(x + a, y - b, b >= ct - 1 && a < 0 ? pal[4] : a > w * .35 ? pal[5] : pal[3]); }
      } else if (kind === 'peak') {
        const h = 8 + Math.trunc(h01(x, y, 71) * 4), snow = c === 'P' ? 4 : 3;
        for (let b = 0; b < h; b++) { const half = Math.trunc(b * .75);
          for (let a = -half; a <= half; a++) S(x + a, y - h + b + 1, b < snow ? (a <= 0 ? SNOW : SNOW2) : a < 0 ? pal[4] : pal[5]); }
      }
    }
    // rivers: a curving line along each river's course
    for (const nm in MAP.rivers) {
      const pts = MAP.rivers[nm], cen = pts.map(p => [(p[0] + 8) * TN + 8 + (h01(p[0], p[1], 81) - .5) * 5, (p[1] + 8) * TN + 8 + (h01(p[0], p[1], 82) - .5) * 5]);
      for (let i = 0; i < cen.length - 1; i++) {
        if (Math.abs(pts[i][0] - pts[i + 1][0]) + Math.abs(pts[i][1] - pts[i + 1][1]) !== 1) continue;
        const p0 = i ? cen[i - 1] : cen[i], p1 = cen[i], p2 = cen[i + 1], p3 = i + 2 < cen.length ? cen[i + 2] : cen[i + 1];
        for (let s = 0; s < 40; s++) {
          const t = s / 40, t2 = t * t, t3 = t2 * t, cr = j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
          const xi = Math.trunc(cr(0)), yi = Math.trunc(cr(1));
          if (WATER(land(xi, yi))) continue;
          S(xi, yi, RIV); S(xi + 1, yi, RIV); S(xi, yi + 1, RIV); S(xi + 1, yi + 1, RIV); if (s % 9 === 3) S(xi, yi, RIVL);
        }
      }
    }
  }
  // how much of a place shows: restored in full; beside your land, dimmed; seen from afar, dimmer; the dark, nothing
  const VIS = { lit: 1, reach: .48, far: .26, dark: 0 };
  function shade(c, v, out, o) {
    if (v >= .999) { out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; }
    else if (v <= .001) { out[o] = VOID[0]; out[o + 1] = VOID[1]; out[o + 2] = VOID[2]; }
    else { const g = .3 * c[0] + .59 * c[1] + .11 * c[2], k = .35 + (1 - v) * .3;
      for (let i = 0; i < 3; i++) { const d = Math.round(c[i] + (g - c[i]) * k); out[o + i] = Math.round(d + (DARK[i] - d) * (1 - v)); } }
    out[o + 3] = 255;
  }
  let lastSig = '';
  // paint the window of radius V into the canvas; st: place key -> 'lit' | 'reach' | 'far' | 'dark'
  function paint(cv, map, V, st) {
    if (!L) build(map);
    const n = 2 * V + 1, S = n * TN; let sig = V + ':';
    for (let y = -V; y <= V; y++) for (let x = -V; x <= V; x++) sig += (st[x + ',' + y] || 'dark')[0];
    if (sig === lastSig && cv.width === S) return; lastSig = sig;
    if (cv.width !== S) { cv.width = S; cv.height = S; }
    const ctx = cv.getContext('2d'), im = ctx.createImageData(S, S), d = im.data;
    for (let ty = -V; ty <= V; ty++) for (let tx = -V; tx <= V; tx++) {
      const v = VIS[st[tx + ',' + ty] || 'dark'];
      for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++) {
        const src = ((ty + MR) * TN + j) * W + (tx + MR) * TN + i, o = (((ty + V) * TN + j) * S + (tx + V) * TN + i) * 4;
        shade(IMG[src], v, d, o);
      }
    }
    ctx.putImageData(im, 0, 0);
  }
  return { paint, build: m => build(m) };
})();

const MC = MCORE(VC); MC.applySet(GAME.branch === 'rebirth' ? 'R1' : 'V3');   // the rebirth branch (2026-10-18): dial set R1   // v1q: Light Lab v3's dials (owner, 2026-10-16)
/*@if-test*/const MB = MBOT(MC, VBOT);/*@end-test*/
const inMap = () => !!(S.w && S.w.m);
const MV = { sel: null, ampDir: null, ampArm: false, perk: null, lastMap: 0, cells: null, prest: null };
const LANDN = { meadow: 'Meadow', forest: 'Forest', hills: 'Hills', marsh: 'Marsh', river: 'River valley', mountain: 'Mountains', water: 'Water' };
const LANDC = { meadow: 'meadow', forest: 'forest', hills: 'hills', marsh: 'marsh', river: 'valley', mountain: 'mountains', water: 'water' };
const LANDG = { meadow: '⁘', forest: '♣', hills: '▲', marsh: '≋', river: '≈', mountain: 'Λ', water: '~' };
const DIRS = [[0, -1, 'north'], [1, 0, 'east'], [0, 1, 'south'], [-1, 0, 'west']];
const MT = {   // the map's text, in one place for the text editor
  tabVillage: 'Settlement', tabMap: 'Map',
  revealH: 'The world beyond', reveal1: 'Your light reaches the edge of your homeland and finds nothing beyond. Not darkness, but a yawning void.',
  reveal2: 'But your light has changed. It’s no longer mere firelight. You sense this light can be used to call the world back, and you dare to hope.',
  reveal3: 'You are beginning to remember. Copper to the north. Something big to the east. Choose land beyond your home and call it back.', revealOk: 'Choose a land to call back',
  keeperTag: 'tends the light', keeperDesc: 'Tends the light all day. Out here a firekeeper needs no wood: the light feeds itself. The best light there is, for a settler.',
  keeperLog: 'Your firekeepers no longer need wood. The light feeds itself now.',
  ampH: 'An Amplifier Restored', amp1: 'You have discovered and repaired an ancient amplifier. Who built it? How long has it been here?',
  amp2: 'You recall these massive structures help focus and boost light energy. Light you send to the east (in the highlighted land marked on the map) will now arrive in that land three times as strong.',
  amp3: 'Soon you’ll be able to build your own amplifiers, choose where they stand, and which direction they face.', ampOk: 'Back to the map',
  stripTo: 'Invoking the light to call back', stripNone: 'Your light is waiting', stripPick: 'Pick a tile on the map, then send light there.',
  poolSaved: ' of {cap} light saved up', poolLeft: 'Send it somewhere and it all pours in at once.', poolFull: 'The store is full: an hour’s worth. Light beyond it is lost until you send it somewhere.',
  poolTip: 'The light waits, up to an hour’s worth.', thenOn: ' · then on to the cheapest place beside your land', thenLine: ' · then {list}',
  lineNext: 'Send light here next', lineOut: 'Take out of line', lineFull: 'Your plans hold {n} place{s}. Learn more planning to line up more.',
  burst: 'Light burst', burstSub: 'Send {n} light here at once: {s} seconds of your light. Then a trip of {t} before the next.', burstStore: 'Save {n} light at once: {s} seconds of your light. Then a trip of {t} before the next.', burstAway: 'Next burst in {t}', burstShort: 'Burn {c}: +{n} light {where}',
  seenH: 'Seen from afar', lightAway: '{n} light was made.', keepLearn: 'Learn {name} to keep it working for {h} hours.', keepLater: 'Later research will keep it working longer.',
  scholars: 'Your storytellers have turned to study: in the world beyond they are scholars now.',
  restored: '{name} is back. People step out of it and into your light.', region: 'All of {region} is back: all light +{pct}%.', resonate: 'All of {region} is back, and its relics ring together: each one there counts {k} times, now and when claimed later.',
  copper: 'Copper, in the hills. Someone remembers how to smelt it: a settler can work as a smelter. A chest holds the first hundred; Lined stockpiles hold more.',
  surge: '{name} is back: {what} goes {pct}% faster for {mins} minutes.',
  eatMore: 'Out here the settlers range farther and work harder: each eats {x} times what they ate in the village.',
  newHS: '+{n} heartstone{s}', oldHS: 'remembered ground',
  thirtyH: 'The light could be scattered', thirty1: 'You have called back thirty places. You could scatter your light now and begin again, remembering everything.',
  thirty2: 'It is stronger to wait: about ten more places will give you far more to remember. The choice is always yours.', thirtyOk: 'Keep going',
  prestBtn: 'Scatter the light', prestH: 'Scatter the light and begin again?',
  prest1: 'Everything here goes dark again: the village, its stores and the places you called back. You keep what you remember.',
  prest2: 'You remember {hs} heartstones ({new} new this run). Memory makes all light ×{m1} now; next run ×{m2}.',
  prest3: 'You choose your gifts before the run ends. Gifts you chose before stay yours; change your mind and you come back here with nothing lost. Places you have called back before come back faster (paved path).',
  prestGo: 'See what you would remember', prestNo: 'Not yet',
  // the rebirth branch (2026-10-18): Claude's drafts, for the owner's text pass
  rbLog: 'You have called back enough of the land to remember more of yourself. The dark beyond will not answer until you are reborn ({n} of 5).',
  rbLastLog: 'The last of you comes back. You are nearly whole.',
  rbH: 'You remember more of yourself', rbLastH: 'You remember all of yourself',
  rb1: 'The land you called back has given you back a piece of who you were. Hold on to it: let this body go, and wake again remembering more.',
  rb1Last: 'This time you do not come apart. Everything you called back stays called back, and you stay with it.',
  rbGo: 'Choose what you remember', rbLastGo: 'Choose what you remember',
  rbWait: 'The land beyond waits until you are reborn.', rbBtn: 'Be reborn',
  rbPill: 'Remembered {pct}% · {n} of {at} places', rbPillReady: 'Ready to be reborn',
  wholeH: 'Whole', whole1: 'You remember all of yourself. From now on nothing you call back fades: the land stays, and every new place adds to what you remember at once.',
  whole2: 'You can go back over land you know and master it, and a traveler has started walking toward your light.',
  combatH: 'Something has seen your light', combat1: 'Smoke rises past the ford. Not everything you called back is friendly, and not all of this land is yours.',
  combatTest: 'Playtest: in the game, combat opens here. This branch has no combat: keep playing to try mastery and the traveling merchant.',
  combatOk: 'Keep playing',
  mastLog: '{name} is {word}: {pct}%.', mastRegion: 'All of {region} is mastered.',
  merchLog: 'A traveler has come to the edge of your land. He trades in heartstones, and he will wait.',
  merchPill: 'A traveler waits', merchH: 'The traveler', merchKick: 'A traveling merchant · he comes every two days and waits',
  merchSub: 'He wants heartstones and knows the old gifts. What you buy works at once.', merchGo: 'Send him on his way',
  glow: 'A glowstone is cut and set by the fire. ({n} now)',
  // v1g: the broken tower, found on the map (owner, 2026-10-13)
  ruinGlimpse: 'Something tall stands up out of the dark here, too straight to be a hill.',
  ruinStory: 'On the rise stands an old tower of fitted stone, its great lens cracked and its rigging rotted away. Someone built this to throw light far into the dark. You think you could repair it.',
  ruinFound: 'Where the land comes back there is an old tower, broken but standing. Its card on the map says what it might do.',
  ruinStart: 'Haulers start clearing the rubble around the old tower.'
};

// a project's name for the drawer: anchors are named by their place
function pname(w, id) { if (String(id).indexOf('anchor:') === 0) return 'Light Anchor for ' + shortName(tileOf(id.slice(7))); const p = MC.projDef(w, id); return p ? p.name : id; }
/* ---------- meta: what lasts between runs ---------- */
function meta() { if (!S.meta) S.meta = { run: 1, ever: {}, hsLife: 0, perks: {}, cards: [], hist: [], best: 0 }; const m = S.meta; m.built = m.built || []; m.relics = m.relics || []; m.regBest = m.regBest || {}; m.regFin = m.regFin || {}; return m; }
function memMultFor(hs) { return 1 + MC.D.memPct * Math.pow(hs || 0, MC.D.memExp); }
function prestigeObj() { const m = meta(); return m.run > 1 ? { run: m.run, hs: m.hsLife, known: Object.keys(m.ever), perks: m.perks, cards: m.cards, built: m.built, relics: m.relics, levels: m.levels || null, villageSnap: m.villageSnap || null } : null; }
function tileOf(key) { const i = MC.MAP.idx[key]; return i == null ? null : MC.MAP.tiles[i]; }
function tileName(t) { if (!t) return ''; const r = MC.REGIONS[t.region]; return (t.name || LANDN[t.land]) + (r ? ', in ' + r.name : ''); }
function shortName(t) { return t ? (t.name || LANDN[t.land]) : ''; }
// the rebirth branch: mastery's words. A place's percent: 100% called back, 101% bronze (10 clears), 102% silver (100), 103% gold (1,000)
const MASTER_WORD = ['', 'bronze', 'silver', 'gold', 'radiant', 'radiant'];
const mastPct = tier => 100 + tier;
function regionOf(t) { return MC.REGIONS[t.region]; }
function regionCount(w, r) { return r.tiles.filter(k => w.m.tiles[k]).length; }
function dirWord(t) { const a = Math.atan2(-t.y, t.x) * 180 / Math.PI; return a > 112.5 || a < -112.5 ? (a > 157.5 || a < -157.5 ? 'west' : a > 0 ? 'northwest' : 'southwest') : a > 67.5 ? 'north' : a < -67.5 ? 'south' : a > 22.5 ? 'northeast' : a < -22.5 ? 'southeast' : 'east'; }

function fmtC(n) { n = Math.floor(n); const nf = opt('num'); if (nf === 'full') return fmtW(n); if (nf === 'sci') return n >= 1e5 ? n.toExponential(2).replace('e+', 'e') : fmtW(n); return n >= 1e7 ? fmtW(n / 1e6, 1) + 'M' : n >= 1e5 ? fmtW(n / 1e3) + 'k' : fmtW(n); }
/* ---------- starting the map ---------- */
function startMap() {
  const w = W(); if (!w || w.m) return;
  if (MC.D.rb.on) { try { meta().villageSnap = JSON.parse(JSON.stringify(w)); } catch (e) {} }   // the rebirth branch: what The village stands brings back
  MC.init(w, prestigeObj());
  w.m.run = meta().run; w.m.hsNew = 0; w.m.startPlay = S.playTime || 0; w.m.flags = {};
  w.seen.copper = false; S.view = 'map';
  resetWorldDom(); sys('The map is open. Pick a dark place beside your home and send your light there.'); if (w.jobs.storyteller || w.cards.storytelling) sys(MT.scholars);
  if (MC.D.eatMap > 1) sys(fill(MT.eatMore, { x: fmtW(MC.D.eatMap, 1) }));
  if (!MC.D.keeperFuelMap && (w.jobs.firekeeper || w.cards.firekeeping)) sys(MT.keeperLog);   // v1r
  renderWorld(); save(true);
}
function showReveal() {
  $('moment-h').textContent = MT.revealH; const body = $('moment-body'); body.innerHTML = '';
  [MT.reveal1, MT.reveal2, MT.reveal3].forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  $('moment-ok').textContent = MT.revealOk; $('moment').dataset.kind = 'map'; $('moment').classList.remove('hidden'); $('moment-ok').focus();
}
// v1r: the first time the broken tower is mended (once ever)
function showAmpRestored() {
  $('moment-h').textContent = MT.ampH; const body = $('moment-body'); body.innerHTML = '';
  [MT.amp1, MT.amp2, MT.amp3].forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  $('moment-ok').textContent = MT.ampOk; $('moment').dataset.kind = ''; $('moment').classList.remove('hidden'); $('moment-ok').focus();
}
function showThirty() {
  $('moment-h').textContent = MT.thirtyH; const body = $('moment-body'); body.innerHTML = '';
  [MT.thirty1, MT.thirty2].forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); });
  $('moment-ok').textContent = MT.thirtyOk; $('moment').dataset.kind = ''; $('moment').classList.remove('hidden');
}

/* ---------- the tick, in the map phase ---------- */
function mapTick(dt, away) {
  const w = W(), regBefore = MC.regionsDone(w);
  const ev = MC.tick(w, dt, away);
  for (const e of ev) {
    if (e[0] === 'restored') {
      const t = tileOf(e[1]), m = meta();
      let gain = 0; if (!m.ever[e[1]]) { m.ever[e[1]] = true; gain = MC.hsFor(t.dstep); m.hsLife += gain; w.m.hsNew = (w.m.hsNew || 0) + gain; w.m.newPlaces = (w.m.newPlaces || 0) + 1; }
      wsay(fill(MT.restored, { name: shortName(t) }));
      MV.flashU = MV.flashU || {}; MV.flashU[e[1]] = Date.now() + 320; MV.lastMap = 0;   // v1k: the flash, then the bloom into the land's colour
      MV.floats = MV.floats || []; MV.floats.push([e[1], gain ? fill(MT.newHS, { n: fmtW(gain), s: gain === 1 ? '' : 's' }) : MT.oldHS]);
      if (MV.sel === e[1]) MV.sel = e[1];
      if (w.m.restored > (m.best || 0)) m.best = w.m.restored;
      if (w.m.restored >= 30 && m.run === 1 && !w.m.flags.thirty && !MC.D.rb.on) { w.m.flags.thirty = true; showThirty(); }
      if (e[1] === MC.ruinKey() && !w.m.done.repair) wsay(MT.ruinFound);
    }
    if (e[0] === 'next') sys('Your light moves on to ' + shortName(tileOf(e[1])) + '.');
    if (e[0] === 'surge' && !away) sys(fill(MT.surge, { name: shortName(tileOf(e[1])), what: surgeWhat(e[2]), pct: Math.round(MC.D.surge.x * 100), mins: MC.D.surge.mins }));
    if (e[0] === 'copper') { w.seen.copper = true; sys(MT.copper); }
    if (e[0] === 'arrive') { if (!w.m.flags.arr) { w.m.flags.arr = true; wsay(tx('m.msg.settler')); } }
    if (e[0] === 'stage') sys(pname(w, e[1]) + ': a stage is done.');
    if (e[0] === 'built') { const p = MC.projDef(w, e[1]); if (p) wsay(pname(w, e[1]) + ' is built. ' + (p.gives || '')); }
    if (e[0] === 'await') sys(pname(w, e[1]) + ': ready. Finish it from the projects strip.');
    if (e[0] === 'glowstone') sys(fill(MT.glow, { n: e[1] }));
    // the rebirth branch
    if (e[0] === 'rebirth') { wsay(e[1] >= MC.D.rb.last ? MT.rbLastLog : fill(MT.rbLog, { n: e[1] })); MV.lastMap = 0; if (!away) { MV.rbAsked = true; setTimeout(askScatter, 400); } }
    if (e[0] === 'mastery') { const t = tileOf(e[1]); MV.floats = MV.floats || []; MV.floats.push([e[1], mastPct(e[2]) + '%']); MV.lastMap = 0;
      if (!away) sys(fill(MT.mastLog, { name: shortName(t), pct: mastPct(e[2]), word: MASTER_WORD[e[2]] })); }
    if (e[0] === 'regionMastered' && !away) wsay(fill(MT.mastRegion, { region: MC.REGIONS[e[1]].name }));
  }
  if (w.m.whole && MC.merchantArrive(w, Date.now() / 1000)) { wsay(MT.merchLog); MV.lastMap = 0; }
  const regAfter = MC.regionsDone(w);
  if (regAfter > regBefore) { const rl = w.m.regionList[w.m.regionList.length - 1], r = MC.REGIONS[rl[1]]; wsay(MC.D.resonance.on ? fill(MT.resonate, { region: r.name, k: 1 + MC.D.resonance.R }) : fill(MT.region, { region: r.name, pct: Math.round((MC.D.regionX - 1) * 100) })); }
  if (w.res.copper > 0 || w.m.copperFound) w.seen.copper = true;
  if (w.res.ideas >= 1) w.seen.ideas = true;
}

/* ---------- actions ---------- */
function mGather(res) {   // gathering by hand still works; stores in the map phase use the map's room (books raise ideas)
  const w = W(); if (res === 'stones' && !w.cards.lookcloser) return; if (res === 'fiber' && !w.cards.grasswork) return; if (res === 'food' && !w.cards.foraging) return;
  w.res[res] = Math.min(MC.cap(w, res), (w.res[res] || 0) + VC.gatherAmount(w, res)); renderWorld();
}
function mBurst() {   // the light burst (was Stoke the fire): 30 s of your light at once, to the place you call back or into the store
  const w = W(); const L = MC.burst(w); if (!L) return;
  if (w.m.bursts === 5 || w.m.bursts === 25) MV.lastMap = 0; mapTick(0); renderWorld();
}
function mLevel(id) { const w = W(); if (MC.buyLevel(w, id)) { w.stats.buys.length = 0; renderWorld(); } }
function mTier(id) { const w = W(); if (MC.tierUp(w, id)) { w.stats.buys.length = 0; sys('A new tier: ' + tierName(id) + '.'); renderWorld(); } }
function mCard(id) {
  const w = W(), c = MC.CARD[id]; if (!MC.buyCard(w, id)) return; w.stats.buys.length = 0;
  sys(tx('w.msg.learned', { name: c.name }));
  if (id === 'academy') sys('Open the Academy in the settlement when you want scholars to make light instead of ideas.');
  renderWorld(); save(true);
}
function mVCard(id) { const w = W(); if (!VC.buyCard(w, id)) return; w.stats.buys.length = 0; sys(tx('w.msg.learned', { name: VC.CARD[id].name })); renderWorld(); }
// v1j: what a place's relic gives, in words (relics by land: its land's work, and a little light)
const RES_WORD = { wood: 'wood', stones: 'stone', fiber: 'fiber', food: 'food', haul: 'hauling' };
function relicGain(w, key) { const t = tileOf(key), D = MC.D;
  if (D.relic.kind !== 'land') return 'all light +' + Math.round(D.relic.light * 100) + '%';
  const LR = D.landRelic, E = LR.effect[t.land], n = ((w.m.relicLand || {})[t.land]) || 0;
  const g = n ? (LR.eachOf && LR.eachOf[t.land] != null ? LR.eachOf[t.land] : LR.each) : (LR.firstOf[t.land] != null ? LR.firstOf[t.land] : LR.first);
  const rings = D.resonance.on && regionOf(t).tiles.every(q => w.m.tiles[q]);
  return (RES_WORD[E] || E) + ' +' + Math.round(g * 100) + '%' + (n ? '' : ' (the first ' + LANDN[t.land].toLowerCase() + ' relic)') + ', all light +' + fmtW(LR.light * 100, 1) + '%' + (rings ? '; its region is whole, so it rings: counts ' + (1 + D.resonance.R) + ' times' : ''); }
function mRelic(key) { const w = W(), gainTxt = relicGain(w, key); if (MC.buyRelic(w, key)) { w.stats.buys.length = 0; sys(relicName(key) + ' is claimed: ' + gainTxt + '.'); /* v1s fix: the journal names relics by region too */ renderWorld(); } }
function mAnchor(key) { const w = W(); if (MC.planAnchor(w, key)) { sys('A Light Anchor is planned for ' + shortName(tileOf(key)) + '. Haulers will build it.'); renderWorld(); } }
function mTarget(key) { const w = W(); const had = w.m.pool || 0; if (MC.setTarget(w, key)) { if (had >= 1) sys('The light you saved, ' + fmtC(had) + ', pours into ' + shortName(tileOf(key)) + '.'); mapTick(0); renderWorld(); } }
function mMaster(key) { const w = W(); if (MC.masterPlace(w, key)) { sys('Your light turns back to ' + shortName(tileOf(key)) + ', to master it.'); mapTick(0); renderWorld(); } }
function mMasterRegion(ri) { const w = W(); if (MC.masterRegion(w, ri)) { sys('Your light turns back to ' + MC.REGIONS[ri].name + ', to master all of it.'); mapTick(0); renderWorld(); } }
function mLineup(key) { const w = W(); if (MC.lineupAdd(w, key)) renderWorld(); }
function mUnline(key) { const w = W(); if (MC.lineupRemove(w, key)) { renderWorld(); } }
function mFinish() { const w = W(); const id = w.m.awaitClick; if (MC.clickFinish(w)) { const p = MC.projDef(w, id); wsay(pname(w, id) + ' is finished.'); renderWorld(); save(true);
  if (id === 'repair' && !meta().ampSeen) { meta().ampSeen = true; showAmpRestored(); save(true); } } }
function mRepair() { const w = W(); if (MC.repairAmp(w)) { MC.prioritize(w, 'repair'); sys(MT.ruinStart); renderWorld(); save(true); } }
function mFirst(id) { const w = W(); if (MC.prioritize(w, id)) renderWorld(); }
function mAcademy() { const w = W(); w.m.academyOn = !w.m.academyOn; renderWorld(); }
function mCuBurn(d) { const w = W(); const n = MC.mlv(w, 'cuburner'); w.m.cuOn = Math.max(0, Math.min(n, (w.m.cuOn || 0) + d)); renderWorld(); }
function mAmp(dir) {
  const w = W(), t = tileOf(MV.sel); if (!t) return;
  if (!MV.ampArm || MV.ampDir !== dir) { MV.ampDir = dir; MV.ampArm = true; renderWorld(); return; }
  const d = DIRS[dir]; if (MC.planAmp(w, t.x, t.y, [d[0], d[1]])) { sys('An amplifier tower is planned at ' + shortName(t) + ', facing ' + d[2] + '.'); }
  MV.ampArm = false; MV.ampDir = null; renderWorld();
}
// v1g: what a new tier does to the line's light, said plainly (owner asked whether tiers dip first)
function tierNow(w, id) { return id === 'clamp' ? MC.mlv(w, 'clamp') * MC.D.lamp.b * Math.pow(MC.D.lamp.J, MC.mtier(w, 'clamp') - 1) : MC.tendMult(w).light; }
function tierAfter(w, id, n) { const x = JSON.parse(JSON.stringify({ lv: w.m.lv, tier: w.m.tier })), o = { m: { lv: x.lv, tier: x.tier } };
  o.m.tier[id] = MC.mtier(w, id) + 1; o.m.lv[id] = n; return id === 'clamp' ? n * MC.D.lamp.b * Math.pow(MC.D.lamp.J, o.m.tier[id] - 1) : MC.tendMult(Object.assign({}, w, o)).light; }
function tierDesc(id) { const w = W(), l = MC.MLAD[id], nt = MC.mtier(w, id) + 1;
  if (id === 'clamp') return 'Each ' + (l.tierNames[nt - 1] || 'lamp').toLowerCase().replace(/s$/, '') + ' makes ' + MC.D.lamp.J + '× the light of a lamp now, but you start again from one.';
  return 'Fires burn hotter again: the line climbs past where it stops now.'; }
function tierNote(id) { const w = W(), now = tierNow(w, id), L = MC.levelMax(w, id); let back = 0; for (let n = 1; n <= L; n++) if (tierAfter(w, id, n) >= now - 1e-9) { back = n; break; }
  const first = tierAfter(w, id, 1), top = tierAfter(w, id, L), pct = Math.round((1 - first / now) * 100);
  return (pct > 0 ? 'First level: ' + pct + '% less ' + (id === 'clamp' ? 'lamp light' : 'fire') + ' than now. ' : '') + (back ? 'Back to today’s at level ' + back + ' of ' + L + '; ' : '') + 'tops out ' + fmtW(top / now, 1) + '× today’s.'; }
function tierName(id) { const l = MC.MLAD[id], t = MC.mtier(W(), id); return l.tierNames ? (l.tierNames[t - 1] || l.name + ' ' + t) : l.name; }

/* ---------- flows and light, in the map phase ---------- */
// storytellers are scholars once the map opens (owner, 2026-10-12)
const SCHOLAR = { name: 'Scholar', tag: '+ideas', desc: 'Studies what the light remembers. Ideas come of it, and at the Light Academy, light.' };
function mJobName(j, n) { return j.id === 'storyteller' ? (n === 1 ? 'scholar' : 'scholars') : jobName(j, n); }
const scholarText = t => String(t).replace(/Storytellers/g, 'Scholars').replace(/storytellers/g, 'scholars').replace(/Storyteller/g, 'Scholar').replace(/storyteller/g, 'scholar');
function mapFlows(r) {
  const w = W(), out = [], hf = MC.hungry(w), D = VC.D, bd = MC.burnDemand(w), sh = k => MC.burnShare(w, k);
  for (const j of VC.JOBS) { const n = w.jobs[j.id] || 0, o = D.job[j.id]; if (!n || !o || !o[r]) continue;
    const acad = j.id === 'storyteller' && r === 'ideas' && MC.academyOn(w) ? Math.min(1, MC.D.perks.quietHalls.f * MC.perk(w, 'quietHalls')) : 1;
    out.push([n + ' ' + mJobName(j, n) + (acad < 1 ? ' (at the Academy)' : ''), n * o[r] * VC.jobMult(w, j.id) * MC.toolMult(w, j.id) * hf * acad * (r !== 'ideas' ? MC.tileMult(w, r) * MC.rawPerk(w, r) : 1)]); }
  if (r === 'ideas') out.push([tx('w.flow.watch'), D.fireIdeas]);
  if (r === 'snails' && w.cards.snails) out.push([tx('w.flow.snails'), VC.snailRate(w)]);
  if (r === 'copper' && w.jobs.smelter) out.push([w.jobs.smelter + ' smelting', MC.copperMake(w, Math.min(sh('wood'), sh('stones')))]);
  if (r === 'copper' && w.m.cuOn) out.push(['Copper burners (' + w.m.cuOn + ' lit)', -w.m.cuOn * MC.D.cuburner.use * MC.effMult(w, 'cuburner').fuel * (w.m.cuShare == null ? 1 : w.m.cuShare)]);
  if (r === 'wood') { const kw = (w.jobs.firekeeper || 0) * VC.keeperWood(w) * MC.tendMult(w).wood; if (kw) out.push([tx('vw.flow.keepers', { n: w.jobs.firekeeper }), -kw * sh('wood')]);
    const pw = VC.burnersOn(w, 'firepit') * D.firepitWood * MC.effMult(w, 'firepit').fuel; if (pw) out.push([tx('vw.flow.pits', { n: VC.burnersOn(w, 'firepit') }), -pw * sh('wood')]);
    if (w.jobs.smelter) out.push([w.jobs.smelter + ' smelting', -w.jobs.smelter * MC.D.smeltWood * sh('wood')]); }
  if (r === 'stones') { const kn = VC.burnersOn(w, 'limekiln'); if (kn) out.push([tx('vw.flow.kilns', { n: kn }), -kn * D.kilnStone * MC.effMult(w, 'limekiln').fuel * sh('stones')]);
    if (w.jobs.smelter) out.push([w.jobs.smelter + ' smelting', -w.jobs.smelter * MC.D.smeltStone * sh('stones')]);
    if (w.jobs.glowcrafter) out.push([w.jobs.glowcrafter + ' glowcrafters', -w.jobs.glowcrafter * MC.D.glow.stone]); }
  if (r === 'fiber' && bd.fiber) out.push([tx('vw.flow.rush', { n: VC.burnersOn(w, 'rushlight') }), -bd.fiber * sh('fiber')]);
  if (r === 'food') { if (w.pop) out.push([tx('vw.flow.eat', { n: w.pop }), -w.pop * MC.eatRate(w)]); if (w.jobs.glowcrafter) out.push([w.jobs.glowcrafter + ' glowcrafters', -w.jobs.glowcrafter * MC.D.glow.food]); }
  if (w.m.proj && !w.m.awaitClick) { let hv = (w.m.haulNow || {})[r] || 0;
    // an empty store that haulers are emptying: everything that comes in goes out to the build, so it shows no gain (v1g bug fix)
    if ((w.res[r] || 0) < 0.01 && (MC.projNeeds(w) || {})[r] > 0 && w.jobs.hauler > 0) { const rest = out.reduce((a, f) => a + f[1], 0); hv = Math.max(0, rest); }
    if (hv > 1e-6) out.push(['Carried to ' + pname(w, w.m.proj.id), -hv]); }
  return out;
}
const MAPLIGHT = { glow: 'The fire', great: 'The great fire', keepers: 'Firekeepers', 'village lamps': 'Braziers and ember lamps', 'copper lamps': 'Copper lamps and braziers', firepits: 'Firepits', kilns: 'Lime kilns', rushlights: 'Rushlight works', 'copper burners': 'Copper burners', academy: 'The Light Academy', anchors: 'Light Anchors' };
function mapLightTip(anchor) {
  const w = W(), x = v => fmtW(v, 2), lines = MC.lightParts(w).map(p => '+' + fmtW(p[1], p[1] < 100 ? 2 : 0) + '/s  ' + (MAPLIGHT[p[0]] || p[0]));
  const mult = [{ t: 'All light is multiplied by:', cls: 'tipsep' }];
  mult.push('The village (hearth, fire lore, songs, shrines' + (w.feast > 0 ? ', the feast' : '') + '): ×' + x(VC.lightMult(w)));
  const mm = MC.memMult(w); if (mm > 1.001) mult.push('Memory: ×' + x(mm));
  const rg = MC.regionMult(w); if (rg > 1.001) mult.push('Regions finished, ' + MC.regionsDone(w) + ': ×' + x(rg));
  if (MC.D.resonance.on && MC.regionsDone(w)) mult.push('Relics in finished regions ring (each counts ' + (1 + MC.D.resonance.R) + '×): ' + MC.resonantN(w) + ' of them, in the relics\u2019 ×' + x(MC.relicMult(w)));
  const rl = MC.relicMult(w); if (rl > 1.001) mult.push('Relics, ' + (w.m.relicsN || 0) + ': ×' + x(rl));
  const bl = MC.beaconLv(w); if (bl) mult.push('Beacon upgrades, ' + bl + ': ×' + x(1 + MC.beaconStepOf(w) * bl));
  const am = w.m.target ? MC.ampMult(w, w.m.target) : 1; if (am > 1) mult.push('An amplifier on the tile you call back: ×' + x(am));
  if (MC.masteryOn(w)) mult.push({ t: 'Mastery (' + fmtW(MC.masteryPoints(w)) + (MC.D.mastery.weight === 'hs' ? ' mastered heartstones' : ' stars') + '): light reaching new land ×' + x(MC.masteryMult(w)) + '. Light into land you master is not.', cls: 'tipx' });
  const ls = MC.mlv(w, 'longsong'); const kept = keptLightLines(w); if (ls || kept.length) mult.push({ t: 'On single lines:', cls: 'tipsep' }); if (ls) mult.push('Long songs, ' + ls + ': firekeepers ×' + x(1 + MC.D.longSong * ls)); kept.forEach(t => mult.push(t));
  if (!w.m.target) mult.push({ cls: 'tipx', t: MT.poolTip + ' Saved now: ' + fmtC(w.m.pool || 0) + ' of ' + fmtC(MC.poolCap(w)) + '.' });
  showTextTip(anchor, 'Light', lines.concat(mult));
}

