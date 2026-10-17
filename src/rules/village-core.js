
// Village core for A Flicker in the Dark: village rebuild (rebuild step 5).
// All-new math. Data plus pure rules, no DOM: the Village Lab and the game branch both run this file,
// so the lab's bot plays exactly what the player plays.
// Every number here is a dial. Nothing in it is decided.
var VC = (function () {
  'use strict';

  // ---------------------------------------------------------------- dials
  var D = {
    // The home tile's light bar. Each percent costs `barGrowth` times the last; the whole bar is barTotal light.
    barTotal: 30000, barGrowth: 1.045,
    // Settler n arrives at this bar percent (n = 1..25), if there's room. Faster early, slower later.
    settlerPct: [2, 3, 4, 5, 7, 9, 11, 14, 17, 21, 25, 29, 33, 37, 42, 47, 52, 57, 62, 68, 74, 79, 84, 89, 94],
    settlerGap: 20,           // seconds between arrivals at least
    maxSettlers: 25,
    eat: 0.06,                // food a settler eats a second
    hungry: 0.5,              // pace once the food store is empty
    // hand actions
    click: 1, sharpClick: 2, steadySecs: 2, chopBonus: 3,
    clickIdeas: 0.25,         // ideas per hand action while alone, falling to none at 4 settlers
    stokeWood: 10, bellowsWood: 25,
    // light (per second unless noted)
    glow: 0.25,               // the small fire
    perWood: 0.3,             // light per wood burned (stoking, firekeepers)
    keeperWood: 0.4,          // wood a firekeeper burns a second
    tendLight: 0.35, tendWood: 0.15,   // each tending level: +35% of a keeper's base light, +15% of its base wood
    keeperLight: 0.45,         // a firekeeper's light a second at base (0.4 wood x 0.3 x 5 for tending well)
    greatFire: 2.5,             // replaces the glow
    brazier: 0.1, lamp: 0.02, lampPerBrazier: 0.003,
    firepit: 0.25, firepitWood: 0.4,
    limekiln: 0.3, kilnStone: 0.4,
    rushlight: 0.25, rushFiber: 0.3,
    hearthStep: 0.12,         // +12% all light per hearth level (finite)
    shrineStep: 0.01,         // each shell shrine: all light +1% (owner, 2026-10-13; was 2%)
    fireLore: 1.5,
    feast: { perSettler: 6, min: 20, secs: 180, boost: 0.5 },
    harvest: { perSettler: 12, min: 40, secs: 360, boost: 0.55 },
    // jobs: base output a second
    job: {
      forager: { food: 0.35 },
      gatherer: { wood: 0.1, stones: 0.25 },
      woodcutter: { wood: 0.6 },
      twiner: { fiber: 0.25 },
      storyteller: { ideas: 0.07 }
    },
    fireIdeas: 0.05,          // watching the fire
    haul: 1.2,                // units a hauler carries a second
    toolStep: 0.25,           // each tool level: +25% for that job (finite ladders)
    // storage: every level multiplies room; its price is always a share of the room it has now, so it never out-prices
    stockBase: 50, stockGrowth: 1.25, stockPriceShare: 0.5,
    foodBase: 40, foodGrowth: 1.3, foodPriceShare: 0.5,
    ideasBase: 20, ideasGrowth: 1.3, ideasPriceShare: 0.6
  };

  // ---------------------------------------------------------------- resources
  var RES = ['wood', 'stones', 'fiber', 'food', 'ideas', 'snails'];
  var RAW = ['wood', 'stones', 'fiber'];

  // ---------------------------------------------------------------- unlocks
  // Only two kinds of gate (owner, 2026-10-11): a share of the home tile relit, or an unmissable
  // prerequisite (a card bought, a project built, a settler count reached). `at` lists all that must hold.
  // ---------------------------------------------------------------- cards (the Ideas & upgrades box)
  // kind: idea (new gameplay), upgrade (a flat buff), tool (opens a tool ladder), building (opens a building ladder)
  var CARDS = [
    // before the first settler
    { id: 'lookcloser', kind: 'idea', name: 'Look closer', cost: { ideas: 2 }, at: {}, desc: 'Notice the stones underfoot. Unlocks Gather stones.' },
    { id: 'fire', kind: 'idea', name: 'Fire', cost: { ideas: 4, wood: 20, stones: 10 }, at: { card: 'lookcloser' }, desc: 'Build a small fire. It glows, and the dark around your home starts to give way.' },
    { id: 'stoking', kind: 'idea', name: 'Feed the fire', cost: { ideas: 3 }, at: { card: 'fire' }, desc: 'Burn wood by hand for a burst of light.' },
    { id: 'sharp', kind: 'upgrade', name: 'Sharp stone', cost: { stones: 15 }, at: { card: 'fire' }, desc: 'Each gather click brings 2 instead of 1.' },
    { id: 'stockpiling', kind: 'building', name: 'Stockpiles', cost: { ideas: 6 }, at: { card: 'fire' }, opens: 'stockpile', desc: 'Opens stockpiles: more room for wood, stones and fiber.' },
    { id: 'tally', kind: 'building', name: 'Tally stones', cost: { ideas: 8 }, at: { card: 'stoking' }, opens: 'tally', desc: 'Opens tally stones: room for more ideas.' },
    // first settlers
    { id: 'foraging', kind: 'idea', name: 'Foraging', cost: { ideas: 4 }, at: { pop: 1 }, desc: 'Settlers can forage for food. Everyone eats.' },
    { id: 'sharing', kind: 'idea', name: 'Sharing the work', cost: { ideas: 6 }, at: { card: 'foraging' }, desc: 'Settlers can gather wood and stones.' },
    { id: 'shelters', kind: 'building', name: 'Shelters', cost: { ideas: 8 }, at: { pop: 2 }, opens: 'shelter', desc: 'Opens shelters: room for more settlers to stay.' },
    { id: 'grasswork', kind: 'idea', name: 'Grasswork', cost: { ideas: 10, wood: 30, stones: 20 }, at: { pop: 3 }, desc: 'Twist grass into cord. Unlocks fiber, Pull grass and the twiner.' },
    { id: 'caches', kind: 'building', name: 'Food caches', cost: { ideas: 10 }, at: { card: 'foraging', pop: 3 }, opens: 'cache', desc: 'Opens food caches: room for more food.' },
    { id: 'firekeeping', kind: 'idea', name: 'Firekeeping', cost: { ideas: 14 }, at: { card: 'stoking', pop: 5 }, desc: 'A settler can tend the fire all day, burning wood for light.' },
    { id: 'woodcutting', kind: 'idea', name: 'Woodcutting', cost: { ideas: 16, wood: 40, stones: 40, fiber: 20 }, at: { card: 'grasswork', pop: 6 }, desc: 'A stone axe, bound with cord. Settlers can cut wood, and Chop wood brings 3 more wood a click.' },
    { id: 'hearth', kind: 'building', name: 'Hearthstones', cost: { ideas: 16 }, at: { pct: 6 }, opens: 'hearth', desc: 'Opens the hearth: every level makes all light stronger. It has an end.' },
    { id: 'storytelling', kind: 'idea', name: 'Storytelling', cost: { ideas: 10, food: 20 }, at: { pop: 4 }, desc: 'Settlers who tell stories by the fire bring ideas.' },
    { id: 'feasting', kind: 'idea', name: 'Feasting', cost: { ideas: 24 }, at: { pop: 7 }, desc: 'Spend food on a feast: all light half again as strong for 3 minutes.' },
    // the village grows
    { id: 'axes', kind: 'tool', name: 'Better axes', cost: { ideas: 20, stones: 60, fiber: 40 }, at: { card: 'woodcutting', pct: 10 }, opens: 'axes', desc: 'Opens axe work: woodcutters bring more wood.' },
    { id: 'baskets', kind: 'tool', name: 'Baskets', cost: { ideas: 24, wood: 50, fiber: 50 }, at: { card: 'grasswork', pct: 12 }, opens: 'baskets', desc: 'Opens baskets: foragers bring more food.' },
    { id: 'bellows', kind: 'upgrade', name: 'Bellows', cost: { ideas: 24, wood: 60, fiber: 40 }, at: { pct: 12 }, desc: 'Each Stoke burns 25 wood instead of 10.' },
    { id: 'braziers', kind: 'building', name: 'Braziers', cost: { ideas: 30 }, at: { card: 'hearth', pct: 14 }, opens: 'brazier', desc: 'Opens braziers: a little light each, burning nothing.' },
    { id: 'hauling', kind: 'idea', name: 'Hauling', cost: { ideas: 30 }, at: { pct: 15 }, desc: 'Settlers can carry materials to big projects. Starts the meeting circle.', startsProject: 'circle' },
    { id: 'steady', kind: 'upgrade', name: 'Steady hands', cost: { ideas: 30, wood: 80, stones: 80 }, at: { pop: 9 }, desc: 'Each gather click also brings what your settlers make of it in 2 seconds.' },
    { id: 'mattocks', kind: 'tool', name: 'Mattocks', cost: { ideas: 35, wood: 80, fiber: 60 }, at: { card: 'sharing', pct: 18 }, opens: 'mattocks', desc: 'Opens mattocks: gatherers bring more wood and stones.' },
    { id: 'spindles', kind: 'tool', name: 'Drop spindles', cost: { ideas: 40, wood: 100, stones: 60 }, at: { card: 'grasswork', pct: 20 }, opens: 'spindles', desc: 'Opens spindles: twiners bring more fiber.' },
    { id: 'snails', kind: 'idea', name: 'Snail-watching', cost: { ideas: 40 }, at: { pct: 25 }, opens: ['lettuce', 'shrine'], desc: 'Something small and patient lives by the stream.' },
    { id: 'longhouse', kind: 'idea', name: 'The longhouse', cost: { ideas: 30 }, at: { proj: 'circle', pct: 28 }, desc: 'Plan a longhouse: room for six more settlers.', startsProject: 'longhouse' },
    { id: 'lamps', kind: 'building', name: 'Ember lamps', cost: { ideas: 60 }, at: { card: 'braziers', pct: 26 }, opens: 'lamp', desc: 'Opens lamps: small lights that burn brighter near braziers.' },
    { id: 'worksongs', kind: 'upgrade', name: 'Work songs', cost: { ideas: 70, food: 120 }, at: { pct: 28 }, desc: 'Gatherers, woodcutters, twiners and foragers all bring 25% more.' },
    { id: 'keepcraft', kind: 'tool', name: 'Long pokers', cost: { ideas: 70, wood: 150, fiber: 80 }, at: { card: 'firekeeping', pct: 30 }, opens: 'keepcraft', desc: 'Opens tending: each firekeeper keeps a brighter fire.' },
    { id: 'firepits', kind: 'building', name: 'Firepits', cost: { ideas: 70 }, at: { pct: 30 }, opens: 'firepit', desc: 'Opens firepits: each burns wood for light, no settler needed. Light them when wood piles up.' },
    { id: 'kilns', kind: 'building', name: 'Lime kilns', cost: { ideas: 80 }, at: { pct: 40 }, opens: 'limekiln', desc: 'Opens lime kilns: each burns stones down to a white glare, no settler needed. Light them when stones pile up.' },
    { id: 'smokehouse', kind: 'idea', name: 'Smoking food', cost: { ideas: 50 }, at: { proj: 'longhouse', pct: 38 }, desc: 'Plan a smokehouse: food keeps, and foragers bring more.', startsProject: 'smokehouse' },
    { id: 'firelore', kind: 'upgrade', name: 'Fire lore', cost: { ideas: 110, stones: 200 }, at: { card: 'storytelling', pct: 38 }, desc: 'All light half again as strong.' },
    { id: 'reckoning', kind: 'upgrade', name: 'Reckoning', cost: { ideas: 120, stones: 150 }, at: { pct: 40 }, desc: 'Storytellers bring 25% more ideas.' },
    { id: 'frames', kind: 'tool', name: 'Carrying frames', cost: { ideas: 120, wood: 200, fiber: 150 }, at: { proj: 'longhouse', pct: 42 }, opens: 'frames', desc: 'Opens carrying frames: haulers carry more. Most of this work comes after your home is lit.' },
    { id: 'songs', kind: 'building', name: 'Fire songs', cost: { ideas: 50 }, at: { card: 'storytelling', pct: 35 }, opens: 'songs', desc: 'Opens fire songs: each makes all light stronger, and each costs more ideas than the last. They have an end.' },
    { id: 'greatfire', kind: 'idea', name: 'The great fire', cost: { ideas: 75 }, at: { pct: 48 }, desc: 'Plan the great fire: a bonfire to replace the small one.', startsProject: 'greatfire' },
    { id: 'rushlights', kind: 'building', name: 'Rushlights', cost: { ideas: 120 }, at: { proj: 'greatfire' }, opens: 'rushlight', desc: 'Opens rushlight works: each burns fiber for light.' },
    { id: 'storehouse', kind: 'idea', name: 'The storehouse', cost: { ideas: 100 }, at: { proj: 'smokehouse', pct: 50 }, desc: 'Plan a storehouse: all wood, stones and fiber room doubled.', startsProject: 'storehouse' },
    { id: 'pathlore', kind: 'upgrade', name: 'Trodden paths', cost: { ideas: 180, stones: 400 }, at: { pct: 58 }, desc: 'Haulers carry half again as much.' },
    { id: 'beacon', kind: 'idea', name: 'The home beacon', cost: { ideas: 120 }, at: { proj: 'storehouse', pct: 72 }, desc: 'Plan the home beacon, to throw your light past the edge of home.', startsProject: 'beacon' }
  ];

  // ---------------------------------------------------------------- ladders (the Buildings section, incl. Tools)
  // price(level n) = base x growth^n for each resource. max: a finite ladder ends.
  var LADDERS = [
    { id: 'stockpile', group: 'storage', name: 'Stockpile', storage: 'raw', descEarly: 'Room for wood and stones grows to {room}. A stockpile always costs about half the room it has.', desc: 'Room for wood, stones and fiber grows to {room}. A stockpile always costs about half the room it has.' },
    { id: 'cache', group: 'storage', name: 'Food cache', storage: 'food', desc: 'Room for food grows to {room}.' },
    { id: 'tally', group: 'storage', name: 'Tally stones', storage: 'ideas', max: 20, desc: 'Room for ideas grows to {room}.' },
    { id: 'shelter', group: 'homes', name: 'Shelter', cost: { wood: 25, fiber: 12 }, growth: 1.28, max: 10, room: 2, desc: 'Room for 2 more settlers.' },
    { id: 'hearth', group: 'light', name: 'Raise the hearth', cost: { stones: 40, wood: 20 }, growth: 1.5, max: 10, desc: 'All light {pct}% stronger. Ten levels in all.' },
    { id: 'brazier', group: 'light', name: 'Brazier', cost: { stones: 60, wood: 40 }, growth: 1.14, max: 20, desc: 'Burns nothing. Each makes {n} light a second, and adds {pb} to every Ember lamp ({nl} now).' },
    { id: 'lamp', group: 'light', name: 'Ember lamp', cost: { stones: 40, fiber: 40 }, growth: 1.15, max: 25, desc: 'Burns nothing. Each makes {n} light a second: {own} of its own and {pb} for each of your {b} braziers.' },
    { id: 'firepit', group: 'light', name: 'Firepit', cost: { stones: 100, wood: 60 }, growth: 1.3, burns: 'wood', desc: 'Each burns {use} wood a second for {n} light.' },
    { id: 'limekiln', group: 'light', name: 'Lime kiln', cost: { stones: 120, wood: 60 }, growth: 1.3, burns: 'stones', desc: 'Each burns {use} stones a second for {n} light.' },
    { id: 'rushlight', group: 'light', name: 'Rushlight works', cost: { wood: 150, stones: 100 }, growth: 1.3, burns: 'fiber', desc: 'Each burns {use} fiber a second for {n} light.' },
    { id: 'axes', group: 'tools', name: 'Axes', cost: { stones: 50, fiber: 30 }, growth: 1.45, max: 8, desc: 'Woodcutters bring {pct}% more wood.' },
    { id: 'mattocks', group: 'tools', name: 'Mattocks', cost: { wood: 60, fiber: 40 }, growth: 1.45, max: 8, desc: 'Gatherers bring {pct}% more wood and stones.' },
    { id: 'baskets', group: 'tools', name: 'Baskets', cost: { wood: 40, fiber: 30 }, growth: 1.45, max: 6, desc: 'Foragers bring {pct}% more food.' },
    { id: 'spindles', group: 'tools', name: 'Spindles', cost: { wood: 60, stones: 40 }, growth: 1.45, max: 8, desc: 'Twiners bring {pct}% more fiber.' },
    { id: 'keepcraft', group: 'tools', name: 'Tending', cost: { stones: 80, fiber: 60 }, growth: 1.5, max: 6, desc: 'Each firekeeper\u2019s fire burns {pct}% brighter, and takes {wpct}% more wood.' },
    { id: 'frames', group: 'tools', name: 'Carrying frames', cost: { wood: 200, fiber: 150 }, growth: 1.6, max: 12, desc: 'Haulers carry {pct}% more.' },
    { id: 'songs', group: 'light', name: 'Fire song', cost: { ideas: 60 }, growth: 1.55, max: 10, desc: 'All light {pct}% stronger. Each song costs more ideas than the last.' },
    { id: 'lettuce', group: 'snails', name: 'Lettuce bed', cost: { snails: 2 }, growth: 1.45, desc: 'Snails come a little faster.' },
    { id: 'shrine', group: 'snails', name: 'Shell shrine', cost: { snails: 6 }, growth: 2.2, max: 8, desc: 'All light {pct}% stronger.' }
  ];
  var LADDER_OPENED_BY = {};
  CARDS.forEach(function (c) { if (c.opens) [].concat(c.opens).forEach(function (o) { LADDER_OPENED_BY[o] = c.id; }); });

  // ---------------------------------------------------------------- projects (the drawer)
  // Stages cost far more than storage holds; haulers carry the materials in from stores.
  var PROJECTS = [
    { id: 'circle', name: 'The meeting circle', stages: [{ name: 'Set the stones', cost: { stones: 200, wood: 100 } }],
      gives: 'Storytellers bring 25% more ideas.' },
    { id: 'longhouse', name: 'The longhouse', stages: [{ name: 'Raise the frame', cost: { wood: 260, stones: 120, fiber: 60 } }, { name: 'Thatch the roof', cost: { fiber: 200, stones: 160 } }],
      gives: 'Room for six more settlers.' },
    { id: 'smokehouse', name: 'The smokehouse', stages: [{ name: 'Build it', cost: { stones: 650, wood: 500 } }],
      gives: 'Food room doubled; foragers bring 25% more.' },
    { id: 'greatfire', name: 'The great fire', stages: [{ name: 'Gather the fuel', cost: { wood: 650, fiber: 250 } }, { name: 'Ring it with stone', cost: { stones: 1100 } }],
      gives: 'A bonfire replaces the small fire: 3 light a second, made stronger by everything that strengthens light.' },
    { id: 'storehouse', name: 'The storehouse', stages: [{ name: 'Lay the floor', cost: { stones: 1000, wood: 300 } }, { name: 'Raise the walls', cost: { wood: 600, fiber: 400, stones: 200 } }],
      gives: 'Room for wood, stones and fiber doubled.' },
    { id: 'beacon', name: 'The home beacon', stages: [{ name: 'Lay the footing', cost: { stones: 1400 } }, { name: 'Raise the tower', cost: { wood: 800, fiber: 400, stones: 200 } }, { name: 'Hang the bowl', cost: { stones: 700, fiber: 300, wood: 400 } }],
      gives: 'When your home is fully lit, the beacon throws the light past its edge.' }
  ];
  var PROJ = {}; PROJECTS.forEach(function (p) { PROJ[p.id] = p; });
  var CARD = {}; CARDS.forEach(function (c) { CARD[c.id] = c; });
  var LAD = {}; LADDERS.forEach(function (l) { LAD[l.id] = l; });

  var JOBS = [
    { id: 'forager', card: 'foraging', name: 'Forager', tag: '+food', desc: 'Picks berries and roots. Everyone eats.' },
    { id: 'gatherer', card: 'sharing', name: 'Gatherer', tag: '+stones, wood', desc: 'Brings in stones, and a little wood.' },
    { id: 'woodcutter', card: 'woodcutting', name: 'Woodcutter', tag: '+wood', desc: 'Cuts wood.' },
    { id: 'twiner', card: 'grasswork', name: 'Twiner', tag: '+fiber', desc: 'Twists grass into fiber.' },
    { id: 'storyteller', card: 'storytelling', name: 'Storyteller', tag: '+ideas', desc: 'Tells stories by the fire. Ideas come of it.' },
    { id: 'firekeeper', card: 'firekeeping', name: 'Firekeeper', tag: 'wood \u2192 light', desc: 'Tends a fire all day, burning wood for light. The best light there is, for a settler and their wood.' },
    { id: 'hauler', card: 'hauling', name: 'Hauler', tag: 'carries to projects', desc: 'Carries materials from the stores to the project being built.' }
  ];

  // ---------------------------------------------------------------- state
  function fresh() {
    var res = {}; RES.forEach(function (r) { res[r] = 0; });
    var jobs = {}; JOBS.forEach(function (j) { jobs[j.id] = 0; });
    return { t: 0, res: res, jobs: jobs, cards: {}, lv: {}, on: {}, pop: 0, light: 0, pct: 0, done: {}, proj: null, queue: [],
      feast: 0, lastArrive: -999, hand: 0, stats: { buys: [], made: {} }, haulFrom: {}, leftStack: [] };
  }

  // ---------------------------------------------------------------- helpers
  var has = function (s, id) { return !!s.cards[id]; };
  var lv = function (s, id) { return s.lv[id] || 0; };

  function gateOk(s, at) {
    if (!at) return true;
    if (at.pct != null && s.pct < at.pct) return false;
    if (at.card && !s.cards[at.card]) return false;
    if (at.proj && !s.done[at.proj]) return false;
    if (at.pop != null && s.pop < at.pop) return false;
    return true;
  }
  function cardAvail(s, c) { return !s.cards[c.id] && gateOk(s, c.at); }
  function ladderOpen(s, l) { var by = LADDER_OPENED_BY[l.id]; return !!(by && s.cards[by]); }
  function ladderMaxed(s, l) { return l.max != null && lv(s, l.id) >= l.max; }

  // storage
  function cap(s, r) {
    if (r === 'snails') return Infinity;
    if (r === 'food') return D.foodBase * Math.pow(D.foodGrowth, lv(s, 'cache')) * (s.done.smokehouse ? 2 : 1);
    if (r === 'ideas') return D.ideasBase * Math.pow(D.ideasGrowth, lv(s, 'tally'));
    return D.stockBase * Math.pow(D.stockGrowth, lv(s, 'stockpile')) * (s.done.storehouse ? 2 : 1);
  }
  function ladderCost(s, l) {
    var n = lv(s, l.id), out = {};
    if (l.storage === 'raw') { var v = D.stockPriceShare * D.stockBase * Math.pow(D.stockGrowth, n); out.wood = Math.ceil(v); out.stones = Math.ceil(v * 0.6); return out; }
    if (l.storage === 'food') { var f = D.foodPriceShare * D.foodBase * Math.pow(D.foodGrowth, n); out.wood = Math.ceil(f); out.fiber = Math.ceil(f * 0.5); return out; }
    if (l.storage === 'ideas') { var i = D.ideasPriceShare * D.ideasBase * Math.pow(D.ideasGrowth, n); out.stones = Math.ceil(i * 2); return out; }
    for (var k in l.cost) out[k] = Math.ceil(l.cost[k] * Math.pow(l.growth, n));
    return out;
  }
  function canPay(s, c) { for (var k in c) if ((s.res[k] || 0) < c[k] - 1e-9) return false; return true; }
  function pay(s, c) { for (var k in c) s.res[k] -= c[k]; }
  function addRes(s, r, n) { s.res[r] = Math.max(0, Math.min(cap(s, r), s.res[r] + n)); }

  function room(s) { return 3 + 2 * lv(s, 'shelter') + (s.done.longhouse ? 6 : 0); }

  // ---------------------------------------------------------------- production
  function hungerMult(s) {
    if (s.pop <= 0 || s.res.food > 1e-6) return 1;
    return jobMake(s, 'food', true) >= s.pop * D.eat ? 1 : D.hungry;
  }
  function jobMult(s, id) {
    var m = 1, songs = has(s, 'worksongs') ? 1.25 : 1;
    if (id === 'woodcutter') m = (1 + D.toolStep * lv(s, 'axes')) * songs;
    if (id === 'gatherer') m = (1 + D.toolStep * lv(s, 'mattocks')) * songs;
    if (id === 'twiner') m = (1 + D.toolStep * lv(s, 'spindles')) * songs;
    if (id === 'forager') m = (1 + D.toolStep * lv(s, 'baskets')) * songs * (s.done.smokehouse ? 1.25 : 1);
    if (id === 'storyteller') m = (s.done.circle ? 1.25 : 1) * (has(s, 'reckoning') ? 1.25 : 1);
    return m;
  }
  function jobMake(s, r, noHunger) {
    var t = 0, hf = noHunger ? 1 : hungerMult(s);
    for (var id in D.job) { var n = s.jobs[id] || 0; if (n && D.job[id][r]) t += n * D.job[id][r] * jobMult(s, id) * hf; }
    return t * (s.pv && s.pv.raw && s.pv.raw[r] ? s.pv.raw[r] : 1);   // v1q: the raw crafts in the village
  }
  function haulRate(s) { return (s.jobs.hauler || 0) * D.haul * (1 + 0.2 * lv(s, 'frames')) * (has(s, 'pathlore') ? 1.5 : 1) * hungerMult(s) * (s.pv && s.pv.built && s.proj && s.pv.built[s.proj.id] ? s.pv.haulX : 1); }

  // ---------------------------------------------------------------- light
  function lightMult(s) {
    return (s.pv ? s.pv.all : 1) * (1 + D.hearthStep * lv(s, 'hearth')) * (has(s, 'firelore') ? D.fireLore : 1) * (s.feast > 0 ? 1 + feastSpec(s).boost : 1) * (1 + D.shrineStep * lv(s, 'shrine')) * (1 + 0.06 * lv(s, 'songs'));
  }
  // tending: light climbs, wood climbs less, so each keeper gets more light per log (as in earlier builds)
  function keeperLight(s) { return D.keeperLight * (1 + D.tendLight * lv(s, 'keepcraft')) * (s.pv ? s.pv.keepers : 1); }
  function keeperWood(s) { return D.keeperWood * (1 + D.tendWood * lv(s, 'keepcraft')); }
  function burnersOn(s, id) { var n = lv(s, id); var o = s.on[id]; return o == null ? n : Math.min(o, n); }
  // what burning wants a second, by resource (firekeepers, firepits, rushlights)
  function burnDemand(s) {
    return { wood: (s.jobs.firekeeper || 0) * keeperWood(s) + burnersOn(s, 'firepit') * D.firepitWood, stones: burnersOn(s, 'limekiln') * D.kilnStone, fiber: burnersOn(s, 'rushlight') * D.rushFiber };
  }
  // share of demand met: full while the store has any; else what comes in, shared out
  function burnShare(s, r) {
    var d = burnDemand(s)[r]; if (!d) return 1;
    if (s.res[r] > 1e-6) return 1;
    return Math.min(1, jobMake(s, r) / d);
  }
  function lightParts(s) {
    var m = lightMult(s), out = [];
    if (s.done.greatfire) out.push(['great', D.greatFire * m]); else if (has(s, 'fire')) out.push(['glow', D.glow * m]);
    var k = s.jobs.firekeeper || 0; if (k) out.push(['keepers', k * keeperLight(s) * burnShare(s, 'wood') * m]);
    var pl = s.pv ? s.pv.lamps : 1, pb = s.pv ? s.pv.burners : 1;
    var b = lv(s, 'brazier'); if (b) out.push(['braziers', b * D.brazier * m * pl]);
    var l = lv(s, 'lamp'); if (l) out.push(['lamps', l * (D.lamp + D.lampPerBrazier * b) * m * pl]);
    var fp = burnersOn(s, 'firepit'); if (fp) out.push(['firepits', fp * D.firepit * burnShare(s, 'wood') * m * pb]);
    var f = burnersOn(s, 'limekiln'); if (f) out.push(['limekilns', f * D.limekiln * burnShare(s, 'stones') * m * pb]);
    var r = burnersOn(s, 'rushlight'); if (r) out.push(['rushlights', r * D.rushlight * burnShare(s, 'fiber') * m * pb]);
    return out;
  }
  function lightRate(s) { return lightParts(s).reduce(function (a, p) { return a + p[1]; }, 0); }

  // the bar: light needed to reach percent p (0..100)
  var G = D.barGrowth, C0 = D.barTotal * (G - 1) / (Math.pow(G, 100) - 1);
  function lightFor(p) { return C0 * (Math.pow(G, p) - 1) / (G - 1); }
  function pctFor(light) { return Math.min(100, Math.log(1 + light * (G - 1) / C0) / Math.log(G)); }
  function recalcBar() { G = D.barGrowth; C0 = D.barTotal * (G - 1) / (Math.pow(G, 100) - 1); }
  function addLight(s, n) { s.light = Math.min(D.barTotal, s.light + n); s.pct = s.light >= D.barTotal - 1e-6 ? 100 : pctFor(s.light); }

  // ---------------------------------------------------------------- projects
  function projNeeds(s) {
    if (!s.proj) return null;
    var st = PROJ[s.proj.id].stages[s.proj.stage], left = {};
    for (var k in st.cost) left[k] = Math.max(0, st.cost[k] - (s.proj.got[k] || 0));
    return left;
  }
  // what haulers take this second, by resource: split across what's still needed, from stores
  function haulDraw(s) {
    var need = projNeeds(s); if (!need || s.proj.paused) return {};
    var H = haulRate(s); if (!H) return {};
    var keys = Object.keys(need).filter(function (k) { return need[k] > 0; });
    var tot = keys.reduce(function (a, k) { return a + need[k]; }, 0), out = {};
    keys.forEach(function (k) { out[k] = H * need[k] / tot; });
    return out;
  }
  function startProject(s, id) {
    if (s.done[id] || (s.proj && s.proj.id === id) || s.queue.indexOf(id) >= 0) return;
    if (s.proj) s.queue.push(id); else s.proj = { id: id, stage: 0, got: {} };
  }

  // ---------------------------------------------------------------- tick
  // Returns events (arrivals, stage done, project done) for the game's log.
  function tick(s, dt) {
    var ev = [];
    s.t += dt;
    if (s.feast > 0) { s.feast = Math.max(0, s.feast - dt); if (!s.feast) ev.push(['feastEnd']); }
    // light first, while the burners' fuel is still on hand
    if (has(s, 'fire')) addLight(s, lightRate(s) * dt);
    // production and burning, then eating
    var hf = hungerMult(s), bd = burnDemand(s);
    var wb = burnShare(s, 'wood'), sb = burnShare(s, 'stones'), fb = burnShare(s, 'fiber');
    RES.forEach(function (r) {
      var make = jobMake(s, r) + (r === 'ideas' && has(s, 'fire') ? D.fireIdeas : 0);
      var use = (bd[r] || 0) * (r === 'wood' ? wb : r === 'stones' ? sb : r === 'fiber' ? fb : 1) + (r === 'food' ? s.pop * D.eat : 0);
      if (r === 'snails' && has(s, 'snails')) make += snailRate(s);
      var before = s.res[r];
      addRes(s, r, (make - use) * dt);
      s.stats.made[r] = (s.stats.made[r] || 0) + make * dt;
    });
    // haulers take after production: their carrying is shared across what the stage still needs, and whatever
    // can't be carried of an empty material goes to the others (so one running out doesn't slow the rest)
    s.haulNow = {};
    if (s.proj && !s.proj.paused) {
      var carry = haulRate(s) * dt, need0 = projNeeds(s);
      for (var pass = 0; pass < 4 && carry > 1e-9; pass++) {
        var keys = Object.keys(need0).filter(function (k) { return need0[k] > 1e-9 && s.res[k] > 1e-9; });
        var tot = keys.reduce(function (a, k) { return a + need0[k]; }, 0); if (!tot) break;
        var used = 0;
        keys.forEach(function (k) { var take = Math.min(carry * need0[k] / tot, s.res[k], need0[k]);
          s.res[k] -= take; need0[k] -= take; s.proj.got[k] = (s.proj.got[k] || 0) + take; s.haulNow[k] = (s.haulNow[k] || 0) + take / dt; used += take; });
        carry -= used; if (used < 1e-12) break;
      }
    }
    // stage and project completion
    if (s.proj) {
      var need = projNeeds(s), left = 0; for (var k in need) left += need[k];
      if (left <= 1e-6) {
        var p = PROJ[s.proj.id];
        if (s.proj.stage + 1 < p.stages.length) { ev.push(['stage', p.id, s.proj.stage]); s.proj.stage++; s.proj.got = {}; }
        else { s.done[p.id] = s.t; ev.push(['built', p.id]); s.proj = null; if (s.queue.length) startProject(s, s.queue.shift()); else ev.push(['haulersFree']); }
      }
    }
    // settlers arrive along the light curve, if there's room
    var od = false;   // Light Lab v3: Open doors' settlers are there from the start (the village bot sets them)
    if (s.pop < D.maxSettlers && (od || (s.pop < room(s) && s.pct >= D.settlerPct[s.pop])) && s.t - s.lastArrive >= D.settlerGap) {   // Light Lab v2: Open doors waives the light thresholds for its settlers
      s.pop++; s.lastArrive = s.t; ev.push(['arrive', s.pop]);
      if (s.pop === 1) s.res.food = Math.max(s.res.food, 20);
    }
    return ev;
  }

  // snails: very slow, optional, whimsical (kept from before, in shape)
  function snailRate(s) { return (0.5 + 0.25 * lv(s, 'lettuce')) / 3600; }

  // ---------------------------------------------------------------- actions (return true if done)
  function buyCard(s, id) {
    var c = CARD[id]; if (!c || !cardAvail(s, c) || !canPay(s, c.cost)) return false;
    pay(s, c.cost); s.cards[id] = true; s.stats.buys.push([s.t, 'card', id]);
    if (c.startsProject) startProject(s, c.startsProject);
    return true;
  }
  function buyLevel(s, id) {
    var l = LAD[id]; if (!l || !ladderOpen(s, l) || ladderMaxed(s, l)) return false;
    var c = ladderCost(s, l); if (!canPay(s, c)) return false;
    pay(s, c); s.lv[id] = lv(s, id) + 1; if (l.burns) s.on[id] = burnersOn(s, id) + (s.on[id] == null ? 0 : 1);
    s.stats.buys.push([s.t, 'level', id]);
    return true;
  }
  function gatherAmount(s, r, plain) {
    var a = (has(s, 'sharp') ? D.sharpClick : D.click) + (r === 'wood' && has(s, 'woodcutting') ? D.chopBonus : 0);
    if (has(s, 'steady') && !plain) a += D.steadySecs * jobMake(s, r);
    return a * (s.pv && s.pv.hand ? s.pv.hand : 1);   // Light Lab v2: Sure hands
  }
  function handIdeas(s) { return D.clickIdeas * Math.max(0, 1 - Math.max(0, s.pop - (s.doorPop || 0)) / 4); }   // Light Lab v3: Open doors' settlers bring the ideas their arrival would cost
  function gather(s, r, plain) {
    if (r === 'stones' && !has(s, 'lookcloser')) return false;
    if (r === 'fiber' && !has(s, 'grasswork')) return false;
    if (r === 'food' && !has(s, 'foraging')) return false;
    addRes(s, r, gatherAmount(s, r, plain)); addRes(s, 'ideas', handIdeas(s)); s.hand++; return true;
  }
  function stoke(s) {
    if (!has(s, 'stoking')) return false;
    var n = has(s, 'bellows') ? D.bellowsWood : D.stokeWood; if (s.res.wood < n) return false;
    s.res.wood -= n; addLight(s, n * D.perWood * lightMult(s)); addRes(s, 'ideas', handIdeas(s)); s.hand++; return true;
  }
  function feastSpec(s) { return s.m && s.m.cards && s.m.cards.harvest ? D.harvest : D.feast; }
  function feastCost(s) { var f = feastSpec(s); return Math.max(f.min, f.perSettler * s.pop); }
  function feast(s) { if (!has(s, 'feasting') || s.feast > 0 || s.res.food < feastCost(s)) return false; s.res.food -= feastCost(s); s.feast = feastSpec(s).secs; return true; }
  function jobOpen(s, id) { var j = JOBS.find(function (x) { return x.id === id; }); return !!(j && s.cards[j.card]); }
  function jobsTotal(s) { var t = 0; for (var k in s.jobs) t += s.jobs[k]; return t; }
  function setJob(s, id, n) {
    if (!jobOpen(s, id)) return false; n = Math.max(0, Math.floor(n));
    var other = jobsTotal(s) - s.jobs[id]; n = Math.min(n, s.pop - other);
    s.jobs[id] = n; return true;
  }

  return {
    D: D, RES: RES, RAW: RAW, CARDS: CARDS, LADDERS: LADDERS, PROJECTS: PROJECTS, JOBS: JOBS, CARD: CARD, LAD: LAD, PROJ: PROJ,
    fresh: fresh, tick: tick, cap: cap, room: room, ladderCost: ladderCost, canPay: canPay, cardAvail: cardAvail, ladderOpen: ladderOpen,
    ladderMaxed: ladderMaxed, gateOk: gateOk, jobMake: jobMake, jobMult: jobMult, lightRate: lightRate, lightParts: lightParts, lightMult: lightMult,
    keeperLight: keeperLight, keeperWood: keeperWood, burnDemand: burnDemand, burnShare: burnShare, burnersOn: burnersOn, haulRate: haulRate, haulDraw: haulDraw, projNeeds: projNeeds,
    hungerMult: hungerMult, lightFor: lightFor, pctFor: pctFor, recalcBar: recalcBar, startProject: startProject,
    buyCard: buyCard, buyLevel: buyLevel, gather: gather, gatherAmount: gatherAmount, stoke: stoke, feast: feast, feastCost: feastCost, feastSpec: feastSpec,
    jobOpen: jobOpen, jobsTotal: jobsTotal, setJob: setJob, snailRate: snailRate, handIdeas: handIdeas
  };
})();
if (typeof module !== 'undefined') module.exports = VC;

