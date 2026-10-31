// The combat side of Map A v4 (phase 2). Pure rules, no DOM. The Flicker Lab loads this file from here (labs never keep copies).
// Kept unchanged from Combat Lab v2 (owner, 2026-10-15: "keep the battle module and the 23 families"): the battle module
// (dice by land, danger by enemy, Lanchester losses, win odds), the 23 families with their traits and names, battle counts and
// the climax on every tile. Tile power stays Light's darkness ÷ 100,000 (owner).
// New here (2026-10-17, Considering): where the families live on the new map. Combat Lab v2 placed factions by quarter from
// step 7; Map A v4 has holders by region (the wild, the Red Host, the Choir, the Rot, the Thinning, two allies) and a threat
// strength on every place (data/map-a-v4-threats.json, from the value toy v4). Every number below is a dial.
var MAP_THREATS = /*@include src/data/map-a-v4-threats.json*/null;
var CMAP = function (MC, TH, dialsIn) {
  'use strict';
  TH = TH || MAP_THREATS;

  // ---------------------------------------------------------------- battle module (Battle math), as in Combat Lab v2
  var DICE = [0.15, 0.25, 0.35, 0.40];                 // narrow, medium, wide, widest: how far a roll swings
  var DICE_NAME = ['narrow', 'medium', 'wide', 'widest'];
  var DANGER = [0.80, 0.75, 0.70, 0.65];               // low, standard, high, brutal: the winner keeps this share at even odds
  var DANGER_NAME = ['low', 'standard', 'high', 'brutal'];
  function pwin(S, Dn, s) {
    if (Dn <= 0) return 1; if (S <= 0) return 0;
    var w = Math.log(1 + s), x = Math.log(S / Dn);
    if (x >= 2 * w) return 1; if (x <= -2 * w) return 0;
    if (x >= 0) return 1 - (2 * w - x) * (2 * w - x) / (8 * w * w);
    return (2 * w + x) * (2 * w + x) / (8 * w * w);
  }
  function winnerLoss(ratio, b) { var v = 1 - (1 - b * b) * ratio * ratio; return 1 - Math.sqrt(Math.max(0, v)); }
  function fight(S, Dn, s, b, tau, r) {
    var w = Math.log(1 + s), a = S * Math.exp((r() * 2 - 1) * w), e = Dn * Math.exp((r() * 2 - 1) * w);
    if (a > e) return { win: true, loss: winnerLoss(e / a, b) * tau, ratio: a / e };
    return { win: false, loss: (1 - b) * Math.sqrt(tau), ratio: a / e };
  }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(x, y, k) { var h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); }

  // ---------------------------------------------------------------- the 23 families (Combat Lab v2), unchanged but for `water`
  // Map A v4 made lakes and the sea places (land 'water', since v1o), so each family needs a weight there; every other weight is v2's.
  var TRAITS = {
    pack: 'Hunts in packs: 2 more battles, each smaller.', venom: 'Venom: losses one danger step worse.', hex: 'Hexes: the dice swing one step wider.',
    regrow: 'Regrows: an unfinished tile gets a battle back each night.', charge: 'Charges: the strongest battle comes first.', loot: 'Hoards: pays half again the iron.',
    swarm: 'Swarms: 3 more battles, each smaller.', swift: 'Swift: the widest dice.', lone: 'Alone: one battle, the climax.',
    split: 'Splits: a win may spawn one more small battle.', drain: 'Drains: every battle also takes 5% of Reserves.', regen: 'Regenerates: a lost battle undoes one won.',
    dread: 'Dread: a lost battle costs twice the usual.', elusive: 'Elusive: one battle more, and a fight may end with no result.', armoured: 'Armoured: the narrowest dice, low danger.',
    ambush: 'Ambush: the first battle comes at full power.', fortress: 'Fortress: six battles, low danger.',
    raider: 'Raids back: while one of its tiles is half-taken, Reserves leak each hour away.', zeal: 'Zealots: a crushing win routs the whole tile.',
    rot: 'Rots back: an unfinished tile gets two battles back each night.', drift: 'Drifts: its power swells and ebbs over the days.'
  };
  function defaultFamilies() {
    var E = function (id, name, trait, danger, w, names, extra) { return Object.assign({ id: id, name: name, trait: trait, danger: danger, w: w, names: names }, extra || {}); };
    return [
      E('wolves', 'Wolves', 'pack', 1, { forest: 5, meadow: 2, hills: 2, mountain: 1, marsh: 0.5, river: 0.5 }, ['A hungry wolf', 'A wolf pack', 'Dire wolves', 'The Winter Pack']),
      E('spiders', 'Giant spiders', 'venom', 2, { forest: 4, marsh: 2, mountain: 1, hills: 0.5 }, ['A web in the brambles', 'A spider nest', 'The broodmother’s web', 'The Weaver’s Hollow']),
      E('hags', 'Hags', 'hex', 1, { forest: 2, marsh: 3, river: 1 }, ['A hedge-witch', 'A hag’s hut', 'A coven', 'The Grandmother']),
      E('thorns', 'Blighted thorns', 'regrow', 0, { forest: 3, marsh: 2, meadow: 1 }, ['A creeping briar', 'A thorn thicket', 'A blighted grove', 'The Bramble Heart']),
      E('boars', 'Boars', 'charge', 0, { forest: 2, meadow: 3, hills: 1 }, ['A wild boar', 'A boar sounder', 'A great tusker', 'The Old Tusk']),
      E('bandits', 'Bandits', 'loot', 1, { meadow: 3, river: 2, forest: 1, hills: 1 }, ['A cutpurse', 'A bandit camp', 'A brigand band', 'The Outlaw King']),
      E('goblins', 'Goblins', 'swarm', 0, { hills: 4, mountain: 2, forest: 1 }, ['A goblin scout', 'A goblin warren', 'A goblin horde', 'The Goblin Court']),
      E('bats', 'Bats', 'swift', 0, { mountain: 4, hills: 2, forest: 0.5 }, ['A bat colony', 'A screeching roost', 'Vampire bats', 'The Night Swarm']),
      E('bears', 'Bears', 'lone', 2, { mountain: 3, forest: 2, hills: 2 }, ['A black bear', 'A cave bear', 'A great bear', 'The Mountain’s Wrath']),
      E('oozes', 'Oozes', 'split', 0, { mountain: 3, marsh: 2, hills: 1 }, ['A creeping ooze', 'A pool of slime', 'A grey ooze', 'The Living Pit']),
      E('bog', 'Bog horrors', 'drain', 2, { marsh: 4, river: 2, water: 2 }, ['Giant leeches', 'A bog horror', 'A mire beast', 'The Thing in the Fen']),
      E('trolls', 'River trolls', 'regen', 2, { river: 4, hills: 1, marsh: 1, water: 1 }, ['A bridge troll', 'A troll’s ford', 'A troll clan', 'The Drowned King']),
      E('harpies', 'Harpies', 'swift', 1, { hills: 2, mountain: 3, water: 0.5 }, ['A harpy', 'A harpy roost', 'A shrieking flight', 'The Storm Mothers']),
      E('dead', 'Restless dead', 'dread', 1, { meadow: 1, marsh: 2, hills: 1 }, ['A restless grave', 'A barrow-wight', 'A risen host', 'The Hollow Lord']),
      E('wisps', 'Will-o’-wisps', 'elusive', 0, { marsh: 2, meadow: 1, river: 1, water: 1 }, ['A flickering wisp', 'A wisp-lit mere', 'A wisp choir', 'The Lantern Court']),
      E('golems', 'Stone golems', 'armoured', 0, { mountain: 2, hills: 2 }, ['A stirring stone', 'A stone golem', 'A golem ward', 'The Unbroken']),
      E('serpents', 'Serpents', 'ambush', 1, { river: 3, marsh: 1, water: 4 }, ['A water snake', 'A river serpent', 'A great wyrm', 'The Coiled One']),
      E('wyverns', 'Wyverns', 'lone', 3, { mountain: 2, hills: 0.5 }, ['A wyvern hatchling', 'A wyvern', 'A wyvern pair', 'The Sky Tyrant']),
      E('keep', 'Brigand holds', 'fortress', 0, { hills: 1, meadow: 0.5 }, ['A watch post', 'A palisade', 'A stone keep', 'The Black Keep']),
      E('redhost', 'The Red Host', 'raider', 2, {}, ['A Red Host scout', 'A Red Host warband', 'A Red Host warcamp', 'The Red Warlord'], { faction: 'NE' }),
      E('choir', 'The Choir', 'zeal', 2, {}, ['A wandering cantor', 'A Choir chapel', 'A Choir monastery', 'The Rift-Singer'], { faction: 'NW' }),
      // v2 had the Rot in the south-west and the Thinning in the south-east (draft 2's corners); Map A v4 swapped them (Rot SE, Thinning SW)
      E('rot', 'The Rot', 'rot', 1, {}, ['A rotting thicket', 'A rot-blighted stream', 'A rot heart', 'The Blight Mother'], { faction: 'SE' }),
      E('thinning', 'The Thinning', 'drift', 3, {}, ['A thin place', 'A fading shore', 'A torn veil', 'The Unmaking'], { faction: 'SW' })
    ];
  }

  // ---------------------------------------------------------------- placement dials (2026-10-17, all Considering)
  function defaults() {
    return {
      cpScale: 100000,          // owner: CP and tile power are light and darkness ÷ 100,000
      maxBattles: 6, innerSteps: 2, rampRho: 0.3, preClimax: 0.6,
      // a faction's own family takes a place with this chance: k × its threat strength there, capped. Its raiding bands reach
      // into land the wild holds too (the value toy: "between home and Ironhold there are only raiding bands")
      faction: { k: 1.6, cap: 0.85, wildK: 0.8, floor: 0.04 },
      // kin: under a threat's rule, the wild families that fit it are more common (× on their land weight)
      kin: {
        NE: { bandits: 2, goblins: 2, keep: 2.5, wolves: 1.5 },
        NW: { hags: 2, dead: 2, harpies: 1.5, wisps: 1.5, golems: 1.5 },
        SE: { thorns: 2, oozes: 2, bog: 2, spiders: 1.5, trolls: 1.5, serpents: 1.5 },
        SW: { wisps: 2, dead: 1.5, golems: 1.5, bats: 1.5 }
      },
      // the heartland is the wild's and low danger (value toy: "the first fights after the red tile; low danger"):
      // dangerous families are rarer in heart regions (× on their weight by danger)
      heartDanger: [1, 1, 0.35, 0.1],
      // Lastlight is the haven: only low and standard danger there
      havenDangerMax: 1,
      // names grow with the place's difficulty (its dealt step): band 0 to this step, band 1 to the next, band 2 to the next, then band 3
      nameBands: [4, 8, 13],
      landDice: { meadow: 1, river: 1, forest: 1, hills: 1, marsh: 2, mountain: 3, water: 2 },   // meadow: v2's table said narrow (0), but its code read 0 as missing and played medium; kept as v2 played (owner's call)
      // hand-placed places (value toy v4's special places): the family and the name band they always get
      fixed: {
        '8,-6': { fam: 'redhost', band: 1, name: 'Raiders at the ford' },          // Bloodford's ford: the red tile candidate
        '4,-4': { fam: 'redhost', band: 2, name: 'The Red Camp' },                   // the Host's forward camp in Barrowdown
        '11,-12': { fam: 'redhost', band: 3 },                                       // the siege camp below Ironhold
        '-8,-6': { fam: 'choir', band: 2, name: 'The Rift' },
        '-16,-16': { fam: 'choir', band: 3 },                                        // the High Cloister
        '11,11': { fam: 'rot', band: 2, name: 'The Rotmouth' },
        '16,16': { fam: 'rot', band: 3 },                                            // the Sunk Abbey
        '-16,16': { fam: 'thinning', band: 3 }                                       // the Hole in the World
      },
      families: defaultFamilies()
    };
  }
  var P = (function (d, o) { if (!o) return d; Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v === 'object' && !Array.isArray(v) && d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && k !== 'families') d[k] = Object.assign({}, d[k], v); else d[k] = v; }); return d; })(defaults(), dialsIn);

  // ---------------------------------------------------------------- the map's combat side
  var T = [], byKey = {};
  function famById(id) { for (var i = 0; i < P.families.length; i++) if (P.families[i].id === id) return P.families[i]; return null; }
  function factionOf(q) { for (var i = 0; i < P.families.length; i++) if (P.families[i].faction === q) return P.families[i]; return null; }
  function bandOf(dstep) { var b = 0; while (b < P.nameBands.length && dstep > P.nameBands[b]) b++; return b; }
  function effDanger(e) { var d = e.danger; if (e.trait === 'venom') d = Math.min(3, d + 1); if (e.trait === 'armoured' || e.trait === 'fortress') d = 0; return d; }
  function strongest(th) { var best = null; Object.keys(th || {}).forEach(function (q) { if (!best || th[q] > th[best]) best = q; }); return best; }

  function pickFamily(t, h, region) {
    var fx = P.fixed[t.key]; if (fx) return { fam: famById(fx.fam), why: 'hand-placed' };
    var hold = h ? h.hold : 'wild', th = h ? h.th : {};
    // a faction's own family: on its land by its threat strength there; on wild land, its raiding bands by the strongest threat nearby
    var q = hold === 'NE' || hold === 'NW' || hold === 'SE' || hold === 'SW' ? hold : hold === 'ironhold' ? 'NE' : strongest(th);
    var heartland = !!(region && region.heart);
    if (q && hold !== 'lastlight' && !(heartland && hold === 'wild')) {   // the heartland is the wild's own: no raiding bands there
      var str = th[q] || 0, chance = hold === 'wild' ? Math.min(P.faction.cap, P.faction.wildK * str) : Math.min(P.faction.cap, Math.max(P.faction.floor, P.faction.k * str));
      if (hold === 'ironhold') chance = P.faction.cap;   // the siege: the Host round Ironhold's walls
      if (str > 0 && hash(t.x, t.y, 9) < chance) return { fam: factionOf(q), why: hold === 'wild' ? 'raiding band' : 'held' };
    }
    // otherwise a wild family by land, with the holder's kin more common and the heartland and haven gentler
    var kin = (hold === 'ironhold' ? P.kin.NE : q && hold !== 'wild' && P.kin[hold]) || {}, heart = heartland;
    var ws = P.families.filter(function (e) { return !e.faction; }).map(function (e) {
      var w = (e.w[t.land] != null ? e.w[t.land] : 0.15) * (kin[e.id] || 1);
      var dg = effDanger(e);   // the danger it fights at (venom is one step worse), so the gentle heartland stays gentle
      if (heart) w *= P.heartDanger[dg] != null ? P.heartDanger[dg] : 1;
      if (hold === 'lastlight' && dg > P.havenDangerMax) w = 0;
      return [e, w];
    }).filter(function (x) { return x[1] > 0; });
    var tot = ws.reduce(function (s, x) { return s + x[1]; }, 0), r = hash(t.x, t.y, 5) * tot;
    for (var i = 0; i < ws.length; i++) { r -= ws[i][1]; if (r <= 0) return { fam: ws[i][0], why: 'wild' }; }
    return { fam: ws[0][0], why: 'wild' };
  }

  function battleShares(c) {
    var n = c.nb, o = [];
    if (n === 1) return [1];
    for (var i = 0; i < n - 1; i++) o.push(n === 2 ? P.preClimax : P.rampRho * Math.pow(P.preClimax / P.rampRho, i / (n - 2)));
    o.push(1);
    if (c.trait === 'charge') o.reverse();
    if (c.trait === 'ambush') o[0] = 1;
    return o;
  }

  function build() {
    T = []; byKey = {};
    var all = MC.MAP.tiles.filter(function (t) { return t.key !== '0,0'; }).map(function (t) { return { t: t, light: MC.tileCost(t, null) }; }).sort(function (a, b) { return a.light - b.light; });
    all.forEach(function (o, i) {
      var t = o.t, h = TH && TH.tiles[t.key], region = TH && TH.regions[t.region], pk = pickFamily(t, h, region), e = pk.fam, tr = e.trait;
      var nb = t.dstep <= P.innerSteps ? 1 : 1 + Math.floor(hash(t.x, t.y, 3) * P.maxBattles);
      if (tr === 'pack') nb += 2; if (tr === 'swarm') nb += 3; if (tr === 'elusive') nb += 1; if (tr === 'lone') nb = 1; if (tr === 'fortress') nb = 6;
      var dice = P.landDice[t.land] != null ? P.landDice[t.land] : 1; if (tr === 'hex') dice = Math.min(3, dice + 1); if (tr === 'swift') dice = 3; if (tr === 'armoured') dice = 0;
      var danger = e.danger; if (tr === 'venom') danger = Math.min(3, danger + 1); if (tr === 'armoured' || tr === 'fortress') danger = 0;
      var fx = P.fixed[t.key], band = fx && fx.band != null ? fx.band : bandOf(t.dstep);
      var c = { key: t.key, x: t.x, y: t.y, rank: i + 1, dstep: t.dstep, land: t.land, region: t.region, regionName: region ? region.name : null, heart: !!(region && region.heart),
        hold: h ? h.hold : 'wild', threat: h ? h.threat : 0, light: o.light, power: o.light / P.cpScale, nb: nb, dice: dice, danger: danger, fam: e.id, famName: e.name, trait: tr,
        faction: e.faction || null, why: pk.why, band: band, name: fx && fx.name ? fx.name : e.names[Math.min(3, band)], push: t.push || null };
      c.shares = battleShares(c); c.tau = 1 / c.shares.reduce(function (q, x) { return q + x * x; }, 0);
      T.push(c); byKey[t.key] = c;
    });
  }
  build();

  // ---------------------------------------------------------------- readouts
  // family mix in the cheapest N places (what combat meets first, since combat follows Light's darkness)
  function mix(N) {
    var o = {}, h = {}, why = {}; T.slice(0, N).forEach(function (c) { o[c.fam] = (o[c.fam] || 0) + 1; h[c.hold] = (h[c.hold] || 0) + 1; why[c.why] = (why[c.why] || 0) + 1; });
    var top = Object.keys(o).sort(function (a, b) { return o[b] - o[a]; });
    return { n: Math.min(N, T.length), fam: o, holders: h, why: why, families: top.length, topShare: top.length ? o[top[0]] / Math.min(N, T.length) : 0, top: top[0] || null };
  }
  function families() {
    return P.families.map(function (e) {
      var mine = T.filter(function (c) { return c.fam === e.id; });
      var dangerAt = mine.length ? mine[0].danger : e.danger;
      return { id: e.id, name: e.name, trait: e.trait, traitText: TRAITS[e.trait], danger: e.danger, faction: e.faction || null, names: e.names,
        first: mine.length ? mine[0].rank : null, firstName: mine.length ? mine[0].name : null, n: mine.length,
        in40: mine.filter(function (c) { return c.rank <= 40; }).length, in140: mine.filter(function (c) { return c.rank <= 140; }).length, in250: mine.filter(function (c) { return c.rank <= 250; }).length,
        lands: (function () { var o = {}; mine.forEach(function (c) { o[c.land] = (o[c.land] || 0) + 1; }); return o; })() };
    });
  }

  return { DICE: DICE, DICE_NAME: DICE_NAME, DANGER: DANGER, DANGER_NAME: DANGER_NAME, TRAITS: TRAITS, pwin: pwin, fight: fight, winnerLoss: winnerLoss, rng: rng, hash: hash,
    defaults: defaults, dials: function () { return P; }, tiles: function () { return T; }, byKey: function (k) { return byKey[k]; }, mix: mix, families: families, bandOf: bandOf };
};
if (typeof module !== 'undefined') module.exports = CMAP;
