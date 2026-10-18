// The combat phase (phase 2): the spine's rules, the player's actions and the lab's bot, no DOM (2026-10-18, branch combat-test).
// The game calls tick() each game tick and the player's actions (attack, raid, rally, buy, raise a standard); the Flicker Lab's
// engine calls pre(), tick() and act() (its bot) through its hooks, loading this file from here (labs never keep copies).
// Miners and drillmasters are settler jobs: the game sets them from its job rows (syncJobs), the lab's bot lends settlers (pre).
// Kept unchanged (owner): the battle module and the 23 families (src/rules/combat-map.js), CP = darkness ÷ 100,000.
// The spine as the owner set it on 2026-10-17 (bible: Combat rebuild, "Owner's calls (late)"):
//   - the unlock (placeholder): place 112 claimed, 2 iron, which buys the iron mine; miners are a settler job; iron is the clock
//   - Recruit (Barracks: how many companies) × Arm (Armory tiers with a Forge wing at each) = the CP cap; both priced mostly in iron
//   - Train: drillmasters (a settler job) shorten the fill time toward a floor; the drillmasters needed grow with the CP cap;
//     Drill yards (a ladder) add places for them
//   - Resolve = cap ÷ fill time refills the bar; Reserves hold more past a full bar; the Reserves line is quality of life
//   - Rally (a feast): Resolve × for some hours, then a cooldown; the avatar joins a battle once a day (upgradable to every 4 h)
//   - raids on cleared places for relic rolls and Bestiary study; the Bestiary by rarity tier; defense buildings by Bestiary stages
//   - standards and iron buffs send power to Light; bloodstones and perks; combat relics
// Owner, 2026-10-18: bloodstones are paid like heartstones (by a place's difficulty), with memory's curve for the flat CP bonus;
// nothing compounds (runaway is worse than slow progress).
// Every number here is a dial, nothing is decided but what the owner decided.
var CPHASE = function (MC, CM, dialsIn) {
  'use strict';
  var L10 = Math.log10, D = MC.D, T = CM.tiles(), DICE = CM.DICE, DANGER = CM.DANGER;

  // ---------------------------------------------------------------- dials
  function defaults() {
    return {
      seed: 11,
      unlock: { places: 112, iron: 2 },
      cp0K: 0.9,                      // the CP base, × the cheapest place's power (owner, 2026-10-18: the first companies win a couple of places only; the cap
                                      // is 0 until the first Barracks or Armory level, then about 13 to 16 shown)
      startCP: 1.25,                  // when the cap first opens, CP starts at this × the weakest open battle (owner, Considering: enough to win one), never over the cap
      strategy: 'full',               // 'full': the bot saves for a full bar (owner); 'odds': it fights with what it has when the odds are good
      fightFloor: 0.5, sureWin: 0.97, oddsFloor: 0.85,
      share: 0.15,                    // the most of the settlers the bot puts on combat's jobs (miners and drillmasters together)
      // iron: the mine (bought with the starting 2 iron), deepened with wood, stone and copper, never iron
      mine: { price: 2, perMinerH: 0.5, slots0: 2, slotsLv: 1, depthX: 1.08, cost: { stones: 15000, wood: 25000 }, g: 1.4 },
      landIron: { open: 4, perH: 1, cap: 1.5, lands: { marsh: 'Bog iron', river: 'River placer', hills: 'Hill ore', mountain: 'Hill ore' } },
      battleIron: 0,                  // owner: combat need not supply iron
      // Recruit: companies (the first cap factor). Arm: equipment (the second). Cap = cp0 × (1 + a n) × (1 + a J^(t-1) n) × the rest
      // the first company adds 'first' of the base, each one after it 'a' (2026-10-18: a small start, about 13 shown, then the reach the lab had)
      barracks: { first: 0.35, a: 1.05, g: 1.08, cost: { iron: 1, wood: 6000, stones: 2000 } },
      armory: { a: 0.6, L: 8, J: 3, g: 1.2, tp: 4, cost: { iron: 2 }, forge: { wood: 20000, stones: 10000 }, forgeG: 2 },
      // Train: fill time = floor + (base − floor) / (1 + drillmasters ÷ need); need = n0 × (cap ÷ cp0)^beta (owner: the sink grows with power)
      drill: { opens: 6, baseH: 12, floorH: 4, n0: 2, beta: 0.18, slots0: 2, slotsLv: 2, cost: { wood: 8000, stones: 3000, food: 5000 }, g: 1.25 },
      reserves: { opens: 9, bars: 2.5, perLv: 0.5, cost: { wood: 5000, food: 4000 }, g: 1.5, max: 10 },
      rally: { opens: 5, x: 2, xLv: 0.25, hours: 2, cooldownH: 6, foodH: 3, cost: { food: 15000, wood: 10000 }, g: 1.6, max: 12 },
      avatar: { opens: 3, edge: 0.5, cooldownH: 24, minH: 4, cutLv: 0.85, cost: { iron: 10 }, g: 2, max: 12 },
      raid: { bars: 0.6, study: 2, relic: 0.15 },
      bestiary: { first: { 'very common': 5, common: 3, uncommon: 2, rare: 1 }, g: 2.2, edge: 0.4, tiers: [60, 30, 15] },   // edge: × (1 + edge) a stage
      defense: {   // opened by Bestiary stages (all families together); priced in iron with raw
        healers: { opens: 3, x: 0.12, cost: { iron: 6, wood: 10000 }, g: 1.5 },
        scouts: { opens: 6, x: 0.08, cost: { iron: 8, stones: 10000 }, g: 1.5 },
        council: { opens: 10, x: 0.12, cost: { iron: 10, fiber: 15000 }, g: 1.5 }
      },
      standard: { x: 0.02, cost: { wood: 5000, stones: 2000, fiber: 3000 }, g: 1.35, iron: 0 },
      oneOffs: [   // iron buffs for Light's fires (owner: inexpensive one-off buys, not keys); the gate is combat places cleared (best ever)
        { id: 'grates', name: 'Iron grates', src: 'burners', x: 3, iron: 10, opens: 8 },
        { id: 'firedogs', name: 'Iron fire-dogs', src: 'keepers', x: 3, iron: 30, opens: 18 },
        { id: 'crown', name: 'The wrought crown (beacon)', src: 'all', x: 1.5, iron: 70, opens: 32 },
        { id: 'bellows2', name: 'Iron bellows', src: 'burners', x: 3, iron: 140, opens: 48 },
        { id: 'tongs', name: 'Iron tongs', src: 'keepers', x: 3, iron: 260, opens: 64 },
        { id: 'lens2', name: 'The iron lens (beacon)', src: 'all', x: 1.5, iron: 450, opens: 84 },
        { id: 'hearthiron', name: 'Iron-bound fireboxes', src: 'burners', x: 2.5, iron: 700, opens: 104 },
        { id: 'spire', name: 'The iron spire (beacon)', src: 'all', x: 1.5, iron: 1000, opens: 124 }
      ],
      saveH: 10,
      // bloodstones: first clears pay by the place's difficulty; a flat bonus on CP and on Light, both 1 + pct × bloodstones^exp (owner: 1:1)
      // owner (2026-10-18): as many bloodstones as heartstones, and memory's curve for the flat CP bonus (1 + bloodstones^0.5).
      // pay: 'heartstones', or c × (power ÷ the first place's)^gamma, or a × g^(rank − 1); light: Light's share of the flat bonus (0 here: 1:1 overshot Light)
      bs: { pay: 'heartstones', gamma: null, c: 1, a: 2, g: 1.04, pct: 1, exp: 0.5, light: 0 },
      perks: [
        { id: 'hardened', name: 'Hardened companies', kind: 'direct', target: 'cap', x: 1, base: 3, g: 1.2 },   // + x a level (no compounding: owner, runaway is worse than slow)
        { id: 'quick', name: 'Quick to rally', kind: 'direct', target: 'resolve', x: 0.25, base: 2, g: 1.45 },
        { id: 'forgeLore', name: 'Forge lore', kind: 'enabling', target: 'armory', effect: 'levels', x: 1, base: 3, g: 1.55 },
        { id: 'quarterm', name: 'Quartermasters', kind: 'enabling', target: 'barracks', effect: 'growth', x: 0.05, base: 2, g: 1.6 },
        { id: 'drillLore', name: 'Drill lore', kind: 'enabling', target: 'drill', effect: 'need', x: 0.1, base: 3, g: 1.6 },
        { id: 'keen', name: 'Keen eyes', kind: 'enabling', target: 'relic', effect: 'drop', x: 0.2, base: 3, g: 1.7 },
        { id: 'lore', name: 'Relic lore', kind: 'enabling', target: 'relic', effect: 'value', x: 0.15, base: 4, g: 1.6 },
        { id: 'standing', name: 'Standing barracks', kind: 'qol', target: 'barracks', effect: 'start', x: 6, base: 2, g: 2, max: 15 },
        { id: 'veterans', name: 'Veterans remember', kind: 'qol', target: 'combat', effect: 'paved', x: 0.25, base: 3, g: 2.2, max: 10 }
      ],
      perkShares: { enabling: 0.45, direct: 0.4, qol: 0.15 },
      paved: 1.5,                     // a place cleared in an earlier run is this much weaker each run since (veterans remember)
      relic: { battle: 0.1, climax: 2, pity: 6, cp: 0.01, landEdge: 0.1 },
      // one store (the game has one): combat buys from the village's stores, but leaves Light this share of what is there
      keep: { wood: 0.5, stones: 0.5, fiber: 0.5, food: 0.5, copper: 0.9 },
      stall: { rule: 'combat', windowH: 8, k: 0.5, minRunH: 12, maxRunD: 8 },   // rule 'combat': rebirth once new bloodstones come slower than half their rate since the first this run (owner: a stall every 1 to 2 days); minRunH: hours of combat in the run
      off: {}                          // lines switched off, for probes and the 'without' replays: { barracks: 1, drill: 1, ... }
    };
  }
  function merge(d, o) { if (!o) return d; Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v === 'object' && !Array.isArray(v) && d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = merge(Object.assign({}, d[k]), v); else d[k] = v; }); return d; }
  var P = merge(defaults(), dialsIn);
  var cp0 = T[0].power * P.cp0K;

  // ---------------------------------------------------------------- the map's combat side: rarity tiers for the Bestiary, bloodstones
  var famCount = {}; T.forEach(function (c) { famCount[c.fam] = (famCount[c.fam] || 0) + 1; });
  function tierOf(fam) { var n = famCount[fam] || 0, t = P.bestiary.tiers; return n >= t[0] ? 'very common' : n >= t[1] ? 'common' : n >= t[2] ? 'uncommon' : 'rare'; }
  // bloodstone pay: 'heartstones' (owner, 2026-10-18: the same pay as heartstones, by the place's difficulty step), or a × g^(rank − 1), or with gamma set, c × (power ÷ the first place's)^gamma (pay follows power, as heartstones follow difficulty)
  var byKey = {}; T.forEach(function (c) { byKey[c.key] = c; c.bs = P.bs.pay === 'heartstones' ? MC.hsFor(c.dstep) : Math.max(1, Math.round(P.bs.gamma != null ? P.bs.c * Math.pow(c.power / T[0].power, P.bs.gamma) : P.bs.a * Math.pow(P.bs.g, c.rank - 1))); c.tier = tierOf(c.fam); });

  // ---------------------------------------------------------------- lifetime and the run
  function newLife() { return { opened: false, openDay: null, ever: {}, bs: 0, perks: {}, relics: {}, relicN: 0, relicLand: {}, relicTries: {}, relicFrom: { battle: 0, raid: 0, pity: 0 }, best: 0, beast: {}, stds: {}, stdN: 0, runs: 0 }; }
  function newRun(life, ri) {
    var C = { open: life.opened, run: ri, cp: 0, res: 0, iron: 0, lv: { mine: 0, barracks: 0, armory: 0, drill: 0, reserves: 0, rally: 0, avatar: 0, healers: 0, scouts: 0, council: 0 }, tier: { armory: 1 },
      bdone: {}, extra: {}, lastFight: {}, cleared: {}, clearedN: 0, landN: {}, bank: { wood: 0, stones: 0, fiber: 0, food: 0, copper: 0 }, taken: {}, miners: 0, drillers: 0,
      rallyEnd: -1e9, rallyNext: -1e9, avatarNext: -1e9, oneOffs: {}, ironKeep: 0, T0: null, hr: 0, openHr: null,
      made: { iron: 0, ironMine: 0, ironLand: 0, ironBattle: 0, bs: 0, relics: 0, resolve: 0, lost: 0 }, spent: {}, ironOn: {}, rawOn: {}, newly: {}, newlyT: [], clearedT: [], buysT: [],
      fights: 0, wins: 0, losses: 0, lossCP: 0, raids: 0, raidCP: 0, rallies: 0, avatarUses: 0, waits: { bar: 0, odds: 0, none: 0 }, traitHits: {}, formUse: { overwhelm: 0, steady: 0, cautious: 0 },
      fillLog: [], samples: [], settlerH: { miners: 0, drillers: 0, minerSlots: 0, drillSlots: 0, h: 0 } };
    var st = perkLv(life, 'standing'); if (st && !P.off.barracks) C.lv.barracks = Math.round(perk('standing').x * st);
    if (C.open) openRun(C, life);
    return C;
  }
  // owner, 2026-10-18: combat opens slowly. The run starts with 2 iron, which buys the mine; the mine opens the Barracks and the Armory; the first
  // level of either opens the cap (and the CP bar). CP starts low (startCP), not full.
  function openRun(C, life) { C.open = true; C.iron = Math.max(C.iron, P.unlock.iron); C.res = 0; C.cp = 0; C.capOpen = false; }   // the cap opens on the next tick or buy (topUp)
  function companies(C) { return C.lv.barracks + C.lv.armory + (C.tier.armory > 1 ? 1 : 0); }
  function startCP(C, life) { var f = SS, c = cap(C, life), w = Infinity; if (f) frontier(C, f).forEach(function (t) { var nb = nextBattle(t, C, life, C.hr / 24); w = Math.min(w, nb.D / edgeOf(C, life, t)); }); C.cp = Math.min(c, isFinite(w) ? w * P.startCP : c * 0.5); }
  // the lines that open at places made safe this run (owner, Considering: 3, 6 and 9, like Light's upgrades)
  function opened(C, id) { var o = P[id] && P[id].opens; return o == null || id === 'rally' ? true : C.clearedN >= o; }
  function perk(id) { for (var i = 0; i < P.perks.length; i++) if (P.perks[i].id === id) return P.perks[i]; return null; }
  function perkLv(life, id) { return (life && life.perks[id]) || 0; }
  function perkX(life, id) { var p = perk(id); return p ? p.x * perkLv(life, id) : 0; }

  // ---------------------------------------------------------------- the meters
  function recruitAt(n) { var B = P.barracks; return n > 0 ? 1 + (B.first != null ? B.first : B.a) + B.a * (n - 1) : 1; }
  function recruitF(C) { return P.off.barracks ? 1 : recruitAt(C.lv.barracks); }
  function armF(C) { return P.off.armory ? 1 : 1 + P.armory.a * Math.pow(P.armory.J, C.tier.armory - 1) * C.lv.armory; }
  function armL(life) { return P.armory.L + Math.round(perkX(life, 'forgeLore')); }
  function flatBS(life) { return 1 + P.bs.pct * Math.pow(life.bs, P.bs.exp); }
  function relicCP(life) { return 1 + P.relic.cp * (1 + perkX(life, 'lore')) * life.relicN; }
  // the direct perk: + x a level, or compounding (× (1 + x) a level) when its effect is 'compound', a memory-like engine on the bloodstone pool
  function hardF(life) { var p = perk('hardened'); if (!p) return 1; return p.effect === 'compound' ? Math.pow(1 + p.x, perkLv(life, 'hardened')) : 1 + perkX(life, 'hardened'); }
  function cap(C, life) { return C.open && companies(C) > 0 ? cp0 * recruitF(C) * armF(C) * flatBS(life) * relicCP(life) * hardF(life) : 0; }
  function capParts(C, life) {
    return [['Barracks (recruit)', L10(recruitF(C))], ['Armory (arm)', L10(armF(C))], ['Bloodstones, flat', L10(flatBS(life))], ['Combat relics', L10(relicCP(life))], ['Bloodstone perks', L10(hardF(life))]];
  }
  function drillNeed(C, life) { return P.drill.n0 * Math.pow(Math.max(1, cap(C, life) / cp0), P.drill.beta) * Math.pow(1 - (perk('drillLore') ? perk('drillLore').x : 0), perkLv(life, 'drillLore')); }
  function fillH(C, life, drillers) { var d = P.drill, n = drillers == null ? C.drillers : drillers; if (P.off.drill) n = 0; return d.floorH + (d.baseH - d.floorH) / (1 + n / drillNeed(C, life)); }
  function rallyX(C) { return P.rally.x + P.rally.xLv * Math.max(0, C.lv.rally - 1); }
  function resolveH(C, life) { if (!C.open) return 0; var r = cap(C, life) / fillH(C, life) * (1 + perkX(life, 'quick')); if (C.hr < C.rallyEnd) r *= rallyX(C); return r; }
  function resCap(C, life) { return P.off.reserves ? cap(C, life) * P.reserves.bars : C.lv.reserves ? cap(C, life) * (P.reserves.bars + P.reserves.perLv * (C.lv.reserves - 1)) : 0; }   // no Reserves until the first Storehouse (owner)
  function mineSlots(C) { return C.lv.mine ? P.mine.slots0 + P.mine.slotsLv * (C.lv.mine - 1) : 0; }
  function drillSlots(C) { return P.off.drill || !opened(C, 'drill') ? 0 : P.drill.slots0 + P.drill.slotsLv * C.lv.drill; }
  function ironPerMinerH(C) { return P.mine.perMinerH * Math.pow(P.mine.depthX, Math.max(0, C.lv.mine - 1)); }
  function landIronH(C) { var o = {}, t = 0, LI = P.landIron; Object.keys(LI.lands).forEach(function (land) { var n = C.landN[land] || 0; if (n < LI.open) return; var src = LI.lands[land]; o[src] = (o[src] || 0) + LI.perH * Math.min(LI.cap, n / LI.open); });
    for (var k in o) t += o[k]; return { by: o, total: P.off.landIron ? 0 : t }; }
  function ironH(C, miners) { return (miners == null ? C.miners : miners) * ironPerMinerH(C) + landIronH(C).total; }
  function avatarCd(C) { return Math.max(P.avatar.minH, P.avatar.cooldownH * Math.pow(P.avatar.cutLv, C.lv.avatar)); }
  function beastStages(life, fam) { var n = (life.beast[fam] || 0), th = P.bestiary.first[tierOf(fam)], k = 0; while (n >= th && k < 60) { k++; th *= P.bestiary.g; } return k; }
  function beastTotal(life) { var t = 0; Object.keys(famCount).forEach(function (f) { t += beastStages(life, f); }); return t; }
  function beastEdge(life, fam) { return P.off.bestiary ? 1 : Math.pow(1 + P.bestiary.edge, beastStages(life, fam)); }
  function relicLandEdge(life, land) { return 1 + P.relic.landEdge * (life.relicLand[land] || 0); }
  function defOpen(life, id) { return !P.off[id] && beastTotal(life) >= P.defense[id].opens; }
  function healF(C) { return 1 / (1 + P.defense.healers.x * C.lv.healers); }
  function scoutF(C) { return 1 / (1 + P.defense.scouts.x * C.lv.scouts); }   // the dice swing narrower
  function councilF(C) { return 1 + P.defense.council.x * C.lv.council; }      // formations: the overwhelm strength

  // ---------------------------------------------------------------- the frontier: places Light has called back that combat hasn't cleared
  function paved(life) { return P.paved + perkX(life, 'veterans'); }
  function placePower(c, life, C, day) {
    var k = life.ever[c.key], p = c.power;
    if (k != null) p /= Math.pow(paved(life), Math.max(1, C.run - k));
    if (c.trait === 'drift') p *= 1 + 0.35 * Math.sin(2 * Math.PI * (day || 0) / 3 + CM.hash(c.x, c.y, 2) * 6.28);
    return p;
  }
  function frontier(C, s) { var out = []; for (var i = 0; i < T.length && out.length < 14; i++) { var c = T[i]; if (C.cleared[c.key] || !s.m.tiles[c.key]) continue; out.push(c); } return out; }
  function nextBattle(c, C, life, day) { var i = C.bdone[c.key] || 0, Tp = placePower(c, life, C, day), n = c.nb + (C.extra[c.key] || 0), share = i < c.nb ? c.shares[i] : 0.5; return { D: Tp * share, i: i, n: n, climax: i === c.nb - 1, T: Tp }; }
  function edgeOf(C, life, c) { return beastEdge(life, c.fam) * relicLandEdge(life, c.land); }
  function diceOf(C, c) { return DICE[c.dice] * scoutF(C); }

  // ---------------------------------------------------------------- settlers: miners first (iron is the clock), then drillmasters
  function wantSettlers(C, life, pop) {
    var room = Math.floor(pop * P.share), m = Math.min(mineSlots(C), room), d = Math.min(drillSlots(C), room - m);
    return { miners: m, drillers: Math.max(0, d) };
  }
  var PULL = ['gatherer', 'twiner', 'woodcutter', 'storyteller', 'forager', 'firekeeper'];
  // before each tick: lend the settlers to combat's jobs for the tick (they still eat); hand back after
  function pre(s, dt, away, C, life) {
    if (!C.open) return null;
    var w = wantSettlers(C, life, s.pop), need = w.miners + w.drillers, got = 0, pulled = [];
    var pool = 0; PULL.forEach(function (j) { pool += Math.max(0, (s.jobs[j] || 0) - 1); });
    if (pool > 0) PULL.forEach(function (j) { var n = Math.min(need - got, Math.round(need * Math.max(0, (s.jobs[j] || 0) - 1) / pool)); n = Math.min(n, Math.max(0, (s.jobs[j] || 0) - 1)); if (n > 0) { s.jobs[j] -= n; got += n; pulled.push([j, n]); } });
    if (got < need) PULL.forEach(function (j) { var n = Math.min(need - got, Math.max(0, (s.jobs[j] || 0) - 1)); if (n > 0) { s.jobs[j] -= n; got += n; pulled.push([j, n]); } });
    C.miners = Math.min(w.miners, got); C.drillers = Math.max(0, got - C.miners);
    var h = dt / 3600; C.settlerH.h += h; C.settlerH.miners += C.miners * h; C.settlerH.drillers += C.drillers * h; C.settlerH.minerSlots += mineSlots(C) * h; C.settlerH.drillSlots += drillSlots(C) * h;
    return function () { pulled.forEach(function (p) { s.jobs[p[0]] += p[1]; }); };
  }
  // after each tick: Resolve into the bar, then Reserves; iron; hauling to combat's stores; the Red Host's leak while away
  function tick(s, dt, away, C, life) {
    if (!C.open) return;
    var h = dt / 3600; C.hr = s && s.t != null ? s.t / 3600 : C.hr + h;   // combat's clock is the game's
    if (!C.capOpen && s && s.m) { SS = s; topUp(C, life); }
    var cp = cap(C, life), rc = resCap(C, life), add = resolveH(C, life) * h; C.made.resolve += add;
    var toCP = Math.min(add, Math.max(0, cp - C.cp)); C.cp += toCP; add -= toCP; var toR = Math.min(add, Math.max(0, rc - C.res)); C.res += toR; C.made.lost += add - toR;
    var mi = C.miners * ironPerMinerH(C) * h, li = landIronH(C).total * h; C.iron += mi + li; C.made.iron += mi + li; C.made.ironMine += mi; C.made.ironLand += li;
    if (away) { var open2 = 0; for (var k in C.bdone) if (!C.cleared[k] && C.bdone[k] > 0 && byKey[k].trait === 'raider') open2++; if (open2) { C.res *= 1 - Math.min(0.05, 0.005 * open2) * h; C.traitHits.raider = (C.traitHits.raider || 0) + 1; } }
  }

  // ---------------------------------------------------------------- a check-in: fight, raid, rally, buy
  var FORM = { overwhelm: [1.25, 1.5, -1], steady: [1, 1, 0], cautious: [0.85, 0.6, 1] };   // strength ×, losses ×, danger step
  function topUp(C, life) { if (!C.capOpen) { if (cap(C, life) <= 0) return; C.capOpen = true; startCP(C, life); return; } var m = Math.min(cap(C, life) - C.cp, C.res); if (m > 0) { C.cp += m; C.res -= m; } }
  function chooseForm(C, life, S, b, c) {
    if (!C.lv.council) return 'steady';
    var d = diceOf(C, c); if (CM.pwin(S * 0.85, b.D, d) >= P.sureWin) return 'cautious';
    if (CM.pwin(S, b.D, d) >= Math.max(P.fightFloor, 0.75)) return 'steady'; return 'overwhelm';
  }
  function act(s, C, life, r, day) {
    if (!C.open) return;
    SS = s;
    topUp(C, life);
    for (var k in C.bdone) { var c0 = byKey[k]; if (C.cleared[k] || !(C.bdone[k] > 0)) continue; if ((c0.trait === 'regrow' || c0.trait === 'rot') && C.hr - (C.lastFight[k] || C.hr) >= 8) { C.bdone[k] = Math.max(0, C.bdone[k] - (c0.trait === 'rot' ? 2 : 1)); C.lastFight[k] = C.hr; C.traitHits[c0.trait] = (C.traitHits[c0.trait] || 0) + 1; } }
    // a rally when the next battle needs more than the bar holds and the cooldown is over (the bot rallies once the bar is low, a player would too)
    for (var guard = 0; guard < 80; guard++) {
      var full = C.cp >= cap(C, life) * 0.999;
      if (P.strategy === 'full' && !full) { C.waits.bar++; break; }
      var best = null, bp = -1, nb = null, form = 'steady', S0 = 0;
      frontier(C, s).forEach(function (c) { var b = nextBattle(c, C, life, day), S = C.cp * edgeOf(C, life, c), f = chooseForm(C, life, S, b, c), F = FORM[f][0] * (f === 'overwhelm' ? councilF(C) : 1), p = CM.pwin(S * F, b.D, diceOf(C, c)); if (p > bp) { bp = p; best = c; nb = b; form = f; S0 = S; } });
      if (!best) { C.waits.none++; break; }
      var useAv = false;
      if (bp < (P.strategy === 'full' ? P.sureWin : P.oddsFloor) && avatarReady(C)) { var pa = CM.pwin(S0 * FORM[form][0] * (1 + P.avatar.edge), nb.D, diceOf(C, best)); if (pa > bp) { bp = pa; useAv = true; } }
      if (bp < (P.strategy === 'full' ? P.fightFloor : P.oddsFloor)) { C.waits.odds++; break; }
      battle(s, C, life, best, nb, form, useAv, r);
      topUp(C, life);
    }
    if (C.res >= resCap(C, life) * 0.98) raid(C, life, r);
    rally(s, C, life);
    standards(C, life);
    buy(s, C, life);
  }
  // a battle: commit a share of the bar (frac, 1 = all of it); losses come out of what was committed. Returns what happened.
  function battle(s, C, life, c, nb, form, useAv, r, frac) {
    frac = frac == null ? 1 : Math.max(0.05, Math.min(1, frac));
    var F = FORM[form], st = F[0] * (form === 'overwhelm' ? councilF(C) : 1) * (useAv ? 1 + P.avatar.edge : 1), b = DANGER[Math.max(0, Math.min(3, c.danger + F[2]))];
    if (useAv) { C.avatarNext = C.hr + avatarCd(C); C.avatarUses++; }
    var sent = C.cp * frac, f = CM.fight(sent * edgeOf(C, life, c) * st, nb.D, diceOf(C, c), b, c.tau, r), out = { key: c.key, i: nb.i, n: nb.n, climax: nb.climax, win: false, lost: 0, cleared: false, relic: false, rout: false, elusive: false, sent: sent };
    var lossShare = f.loss * F[1] * healF(C); if (!f.win && c.trait === 'dread') { lossShare *= 2; C.traitHits.dread = (C.traitHits.dread || 0) + 1; }
    if (c.trait === 'elusive' && r() < 0.2) { lossShare = 0.02; f.win = false; out.elusive = true; C.traitHits.elusive = (C.traitHits.elusive || 0) + 1; }
    var lost = Math.min(sent, lossShare * sent); C.cp -= lost; C.lossCP += lost; C.fights++; C.formUse[form]++; C.lastFight[c.key] = C.hr; out.lost = lost;
    if (c.trait === 'drain') { C.res *= 0.95; C.traitHits.drain = (C.traitHits.drain || 0) + 1; }
    if (!f.win) { C.losses++; if (c.trait === 'regen' && (C.bdone[c.key] || 0) > 0) { C.bdone[c.key]--; C.traitHits.regen = (C.traitHits.regen || 0) + 1; } return out; }
    C.wins++; out.win = true; life.beast[c.fam] = (life.beast[c.fam] || 0) + 1;
    if (P.battleIron) { var ir = P.battleIron * c.power / c.nb; C.iron += ir; C.made.iron += ir; C.made.ironBattle += ir; }
    if (life.ever[c.key] == null && !life.relics[c.key]) out.relic = rollRelic(C, life, c, nb.climax ? P.relic.climax : 1, r, 'battle');
    C.bdone[c.key] = (C.bdone[c.key] || 0) + 1;
    if (c.trait === 'split' && (C.extra[c.key] || 0) < 2 && r() < 0.25) { C.extra[c.key] = (C.extra[c.key] || 0) + 1; C.traitHits.split = (C.traitHits.split || 0) + 1; }
    var rout = c.trait === 'zeal' && f.ratio >= 1.6; if (rout) { out.rout = true; C.traitHits.zeal = (C.traitHits.zeal || 0) + 1; }
    if (rout || C.bdone[c.key] >= c.nb + (C.extra[c.key] || 0)) {
      out.cleared = true; C.cleared[c.key] = true; C.clearedN++; C.landN[c.land] = (C.landN[c.land] || 0) + 1; C.clearedT.push([C.hr, c.key]);
      if (life.ever[c.key] == null && !C.newly[c.key]) { C.newly[c.key] = true; C.newlyT.push([C.hr, c.bs]); C.made.bs += c.bs; out.bs = c.bs; }
    }
    return out;
  }
  function rollRelic(C, life, c, mult, r, how) {
    if (P.off.relics) return;
    var ch = (how === 'raid' ? P.raid.relic : P.relic.battle) * mult * (1 + perkX(life, 'keen'));
    life.relicTries[c.key] = (life.relicTries[c.key] || 0) + 1;
    var pity = life.relicTries[c.key] >= P.relic.pity, hit = r() < ch;
    if (hit || pity) { life.relics[c.key] = c.land; life.relicN++; life.relicLand[c.land] = (life.relicLand[c.land] || 0) + 1; life.relicFrom[hit ? how : 'pity']++; C.made.relics++; return true; }
    return false;
  }
  // raids: spare Reserves on a cleared place, for a relic roll there and Bestiary study of its family (owner: generic raids, to test)
  function raid(C, life, r) {
    if (P.off.raids) return;
    var tiles = Object.keys(C.cleared).map(function (k) { return byKey[k]; }); if (!tiles.length) return;
    tiles.sort(function (a, b) { var ra = life.relics[a.key] ? 1 : 0, rb = life.relics[b.key] ? 1 : 0; return ra - rb || b.power - a.power; });
    var c = tiles[0], cost = cap(C, life) * P.raid.bars; if (C.res < cost) return;
    C.res -= cost; C.raidCP += cost; C.raids++; life.beast[c.fam] = (life.beast[c.fam] || 0) + P.raid.study;
    if (!life.relics[c.key]) rollRelic(C, life, c, 1, r, 'raid');
  }
  // Rally: when the bar is low and the cooldown is over, if the food store can pay
  function rallyCost(C, s) { var o = {}, m = Math.pow(P.rally.g, Math.max(0, C.lv.rally - 1)); return o; }
  function rally(s, C, life) {
    if (P.off.rally || !C.lv.rally || C.hr < C.rallyNext) return;
    if (C.cp >= cap(C, life) * 0.999 || C.res > cap(C, life) * 0.1) return;   // only while waiting for the bar
    var foodH = Math.max(1, (MC.jobMake(s, 'food') - s.pop * MC.eatRate(s)) * 3600), need = foodH * P.rally.foodH;
    if (have(C, 'food') < need) return;
    s.res.food -= need; C.spent.food = (C.spent.food || 0) + need; C.rawOn.rallyFeast = (C.rawOn.rallyFeast || 0) + need; C.rallyEnd = C.hr + P.rally.hours; C.rallyNext = C.hr + P.rally.hours + P.rally.cooldownH; C.rallies++;
  }
  // standards: raised once a place is cleared the first time ever (lifetime), a hauled step of raw, each adds to Light
  function stdCost(life) { var m = Math.pow(P.standard.g, Math.sqrt(life.stdN)), o = {}; for (var k in P.standard.cost) o[k] = Math.ceil(P.standard.cost[k] * m); if (P.standard.iron) o.iron = P.standard.iron; return o; }
  function standards(C, life) {
    if (P.off.standards) return;
    Object.keys(C.newly).forEach(function (k) { if (life.stds[k]) return; var c = stdCost(life); if (!canPay(C, c)) return; pay(C, c, 'standards'); life.stds[k] = true; life.stdN++; });
  }

  // ---------------------------------------------------------------- buying
  var SS = null;   // the store combat buys from this moment (the village's; set by act and by the player's actions; never saved)
  // keep: the share of each store the lab's bot leaves for Light. The player spends the whole store (owner, 2026-10-18), so the game's calls run asPlayer.
  var FULL = false;
  function asPlayer(f) { return function () { FULL = true; try { return f.apply(null, arguments); } finally { FULL = false; } }; }
  function have(C, k) { if (k === 'iron') return Math.max(0, C.iron - C.ironKeep); var s = SS; return s ? Math.max(0, (s.res[k] || 0) * (FULL ? 1 : 1 - (P.keep[k] != null ? P.keep[k] : 0.5))) : 0; }
  function canPay(C, cost) { for (var k in cost) if (cost[k] > have(C, k)) return false; return true; }
  function pay(C, cost, line) { for (var k in cost) { if (k === 'iron') { C.iron -= cost[k]; C.ironOn[line] = (C.ironOn[line] || 0) + cost[k]; } else { SS.res[k] -= cost[k]; C.rawOn[line] = (C.rawOn[line] || 0) + cost[k]; } C.spent[k] = (C.spent[k] || 0) + cost[k]; } }
  function priceOf(spec, n, growth) { var o = {}, m = Math.pow(growth || spec.g, n); for (var k in spec.cost) o[k] = Math.ceil(spec.cost[k] * m); return o; }
  function growthB(life) { var g = P.barracks.g; return 1 + (g - 1) * Math.pow(1 - perk('quarterm').x, perkLv(life, 'quarterm')); }
  function armPrice(C, life) {
    var A = P.armory, t = C.tier.armory, n = C.lv.armory, up = n >= armL(life), o = {};
    if (up) { var m = Math.pow(A.tp, t); for (var k in A.cost) o[k] = Math.ceil(A.cost[k] * m); for (var k2 in A.forge) o[k2] = Math.ceil(A.forge[k2] * Math.pow(A.forgeG, t - 1)); return { cost: o, up: true }; }
    var m2 = Math.pow(A.tp, t - 1) * Math.pow(A.g, n); for (var k3 in A.cost) o[k3] = Math.ceil(A.cost[k3] * m2); return { cost: o, up: false };
  }
  function incomeH(s, C, life, k) {
    if (k === 'iron') return Math.max(0.05, ironH(C));
    var sh = 0.25;   // the bot counts on about a quarter of each income for combat (Light spends the rest)
    if (k === 'copper') return Math.max(1, MC.copperMake(s) * 3600 * sh);
    if (k === 'food') return Math.max(1, (MC.jobMake(s, 'food') - s.pop * MC.eatRate(s)) * 3600 * sh);
    return Math.max(1, (MC.jobMake(s, k) || 0) * 3600 * sh);
  }
  // what each buy is worth, in zeros of the CP cap (or of its pace, or of iron), as the bot reads it
  var WEIGHT = { cap: 1, pace: 0.6, iron: 0.8, qol: 0.05 };
  function options(s, C, life) {
    var o = [], cp = cap(C, life), pop = s.pop;
    if (!C.lv.mine) { o.push({ id: 'mine', cost: { iron: P.mine.price }, gain: 1, w: WEIGHT.iron }); return o; }
    var B = P.barracks; if (!P.off.barracks) o.push({ id: 'barracks', cost: priceOf(B, C.lv.barracks, growthB(life)), gain: L10(recruitAt(C.lv.barracks + 1) / recruitF(C)), w: WEIGHT.cap });
    if (!P.off.armory) { var ap = armPrice(C, life), A = P.armory, t = C.tier.armory, n = C.lv.armory, g0 = armF(C), g1;
      if (ap.up) { var half = Math.max(1, Math.round(armL(life) / 2)); g1 = (L10(1 + A.a * Math.pow(A.J, t) * half) - L10(g0)) / half; } else g1 = L10(1 + A.a * Math.pow(A.J, t - 1) * (n + 1)) - L10(g0);
      o.push({ id: 'armory', cost: ap.cost, up: ap.up, gain: Math.max(0.002, g1), w: WEIGHT.cap }); }
    if (C.lv.mine) { var w0 = wantSettlers(C, life, pop), i0 = ironH(C, w0.miners), sv = C.lv.mine; C.lv.mine++; var w1 = wantSettlers(C, life, pop), i1 = ironH(C, w1.miners); C.lv.mine = sv;
      o.push({ id: 'mine', cost: priceOf(P.mine, C.lv.mine - 1), gain: L10(i1 / Math.max(1e-9, i0)), w: WEIGHT.iron }); }
    if (!P.off.drill && opened(C, 'drill')) { var wd = wantSettlers(C, life, pop), f0 = fillH(C, life, wd.drillers), sd = C.lv.drill; C.lv.drill++; var wd1 = wantSettlers(C, life, pop), f1 = fillH(C, life, wd1.drillers); C.lv.drill = sd;
      o.push({ id: 'drill', cost: priceOf(P.drill, C.lv.drill), gain: L10(f0 / f1), w: WEIGHT.pace }); }
    if (!P.off.reserves && opened(C, 'reserves') && C.lv.reserves < P.reserves.max) o.push({ id: 'reserves', cost: priceOf(P.reserves, C.lv.reserves), gain: L10((P.reserves.bars + P.reserves.perLv * (C.lv.reserves + 1)) / (P.reserves.bars + P.reserves.perLv * C.lv.reserves)), w: WEIGHT.qol });
    if (!P.off.rally && C.clearedN >= P.rally.opens && C.lv.rally < P.rally.max) o.push({ id: 'rally', cost: priceOf(P.rally, C.lv.rally), gain: C.lv.rally ? (C.rallies ? L10((rallyX(C) + P.rally.xLv) / rallyX(C)) * 0.3 : 0) : 0.05, w: WEIGHT.pace });
    if (!P.off.avatar && opened(C, 'avatar') && C.lv.avatar < P.avatar.max) o.push({ id: 'avatar', cost: priceOf(P.avatar, C.lv.avatar), gain: C.avatarUses ? 0.004 : 0, w: WEIGHT.pace });
    ['healers', 'scouts', 'council'].forEach(function (id) { if (!defOpen(life, id)) return; var Dd = P.defense[id], n = C.lv[id];
      o.push({ id: id, cost: priceOf(Dd, n), gain: L10((1 + Dd.x * (n + 1)) / (1 + Dd.x * n)) * (id === 'healers' ? 0.5 : id === 'scouts' ? 0.3 : 0.8), w: WEIGHT.cap }); });
    return o;
  }
  function buy(s, C, life) {
    var best0 = Math.max(life.best || 0, C.clearedN), keep = 0, ih = incomeH(s, C, life, 'iron');
    C.ironKeep = 0;
    if (!P.off.oneOffs) P.oneOffs.forEach(function (x) { if (C.oneOffs[x.id] || best0 < x.opens) return; if (C.iron >= x.iron + keep) { pay(C, { iron: x.iron }, 'oneOffs'); C.oneOffs[x.id] = C.hr; C.buysT.push([C.hr, x.id]); } else if (x.iron - C.iron <= ih * P.saveH) keep += x.iron; });
    C.ironKeep = keep;
    for (var guard = 0; guard < 80; guard++) {
      var best = null, bs = 0;
      options(s, C, life).forEach(function (x) {
        if (!canPay(C, x.cost)) return;
        var hrs = 0; for (var k in x.cost) hrs = Math.max(hrs, x.cost[k] / incomeH(s, C, life, k));
        var sc = x.w * x.gain / Math.max(0.1, hrs); if (sc > bs) { bs = sc; best = x; }
      });
      if (!best) break;
      pay(C, best.cost, best.id);
      if (best.id === 'armory') { if (best.up) { C.tier.armory++; C.lv.armory = 1; } else C.lv.armory++; } else C.lv[best.id]++;
      C.buysT.push([C.hr, best.id]);
      if (best.id === 'barracks' || best.id === 'armory') topUp(C, life);
    }
  }
  function lightSrc(C) { var o = { burners: 1, keepers: 1, all: 1 }; P.oneOffs.forEach(function (x) { if (C.oneOffs[x.id]) o[x.src] = (o[x.src] || 1) * x.x; }); return o; }
  function lightFlat(life) { return 1 + (flatBS(life) - 1) * P.bs.light; }
  function lightStd(life) { return P.off.standards ? 1 : 1 + P.standard.x * life.stdN; }

  // ---------------------------------------------------------------- prestige: bloodstones and perks
  function perkCost(p, n) { return Math.ceil(p.base * Math.pow(p.g, n)); }
  function allocPerks(points) {
    var lv = {}, spent = { enabling: 0, direct: 0, qol: 0 }, left = points, sh = P.perkShares;
    for (var g = 0; g < 3000; g++) {
      var best = null, bsc = Infinity;
      P.perks.forEach(function (p) { var n = lv[p.id] || 0; if (p.max && n >= p.max) return; var c = perkCost(p, n); if (c > left) return; var s2 = sh[p.kind] || 0; if (s2 <= 0) return; var sc = (spent[p.kind] + c) / s2; if (sc < bsc) { bsc = sc; best = p; } });
      if (!best) break;
      var c2 = perkCost(best, lv[best.id] || 0); lv[best.id] = (lv[best.id] || 0) + 1; spent[best.kind] += c2; left -= c2;
    }
    return { lv: lv, spent: spent, left: left };
  }
  function rebirth(C, life) {
    Object.keys(C.newly).forEach(function (k) { if (life.ever[k] == null) { life.ever[k] = C.run; life.bs += byKey[k].bs; } });
    life.best = Math.max(life.best || 0, C.clearedN); life.runs++;
    var al = allocPerks(life.bs); life.perks = P.off.perks ? {} : al.lv; return al;
  }

  // ---------------------------------------------------------------- the player's actions (the game's buttons)
  function regrow(C) { for (var k in C.bdone) { var c0 = byKey[k]; if (C.cleared[k] || !(C.bdone[k] > 0)) continue; if ((c0.trait === 'regrow' || c0.trait === 'rot') && C.hr - (C.lastFight[k] || C.hr) >= 8) { C.bdone[k] = Math.max(0, C.bdone[k] - (c0.trait === 'rot' ? 2 : 1)); C.lastFight[k] = C.hr; C.traitHits[c0.trait] = (C.traitHits[c0.trait] || 0) + 1; } } }
  function fightable(s, C, key) { var c = byKey[key]; return !!(C.open && c && s.m.tiles[key] && !C.cleared[key]); }
  function avatarReady(C) { return !P.off.avatar && opened(C, 'avatar') && C.hr >= C.avatarNext; }
  // what a battle would look like, before it is fought: strength, theirs, the win chance and the losses to expect
  var Q = []; for (var qi = 0; qi < 64; qi++) Q.push([((qi * 0.6180339887) % 1), ((qi * 0.7548776662 + 0.5) % 1)]);
  function preview(s, C, life, key, o) {
    o = o || {}; var c = byKey[key]; if (!c) return null; var nb = nextBattle(c, C, life, C.hr / 24), frac = o.frac == null ? 1 : o.frac, form = o.form || 'steady', av = !!o.avatar && avatarReady(C);
    var F = FORM[form], st = F[0] * (form === 'overwhelm' ? councilF(C) : 1) * (av ? 1 + P.avatar.edge : 1), sent = C.cp * frac, S = sent * edgeOf(C, life, c) * st, d = diceOf(C, c), b = DANGER[Math.max(0, Math.min(3, c.danger + F[2]))];
    var w = Math.log(1 + d), lw = 0, ll = 0, nw = 0;
    Q.forEach(function (q) { var a = S * Math.exp((q[0] * 2 - 1) * w), e = nb.D * Math.exp((q[1] * 2 - 1) * w); if (a > e) { nw++; lw += CM.winnerLoss(e / a, b) * c.tau; } else ll += (1 - b) * Math.sqrt(c.tau) * (c.trait === 'dread' ? 2 : 1); });
    var h = healF(C) * F[1], pw = CM.pwin(S, nb.D, d);
    return { S: S, D: nb.D, pwin: pw, sent: sent, lossWin: nw ? lw / nw * h * sent : 0, lossLose: Q.length - nw ? ll / (Q.length - nw) * h * sent : 0, i: nb.i, n: nb.n, climax: nb.climax, T: nb.T, avatar: av, sure: pw >= P.sureWin, none: pw <= 0.001 };
  }
  function attack(s, C, life, key, o, r) {
    o = o || {}; if (!fightable(s, C, key) || C.cp <= 1e-9) return null; SS = s; regrow(C);
    var c = byKey[key], nb = nextBattle(c, C, life, C.hr / 24), av = !!o.avatar && avatarReady(C), form = (o.form && C.lv.council) ? o.form : 'steady';
    var out = battle(s, C, life, c, nb, form, av, r, o.frac == null ? 1 : o.frac); topUp(C, life); return out;
  }
  // a raid on a place won this run: spare Reserves for a relic roll there and study of its family
  function raidCost(C, life) { return cap(C, life) * P.raid.bars; }
  function raidAt(s, C, life, key, r) {
    var c = byKey[key]; if (P.off.raids || !c || !C.cleared[key]) return null; var cost = raidCost(C, life); if (C.res < cost) return null;
    C.res -= cost; C.raidCP += cost; C.raids++; life.beast[c.fam] = (life.beast[c.fam] || 0) + P.raid.study;
    return { study: P.raid.study, relic: !life.relics[key] ? rollRelic(C, life, c, 1, r, 'raid') : false };
  }
  function rallyFood(s) { return Math.max(1, (MC.jobMake(s, 'food') - s.pop * MC.eatRate(s)) * 3600) * P.rally.foodH; }
  function rallyNow(s, C, life) {
    if (P.off.rally || !C.lv.rally || C.hr < C.rallyNext) return false; SS = s; var need = rallyFood(s); if (have(C, 'food') < need) return false;
    s.res.food -= need; C.spent.food = (C.spent.food || 0) + need; C.rawOn.rallyFeast = (C.rawOn.rallyFeast || 0) + need; C.rallyEnd = C.hr + P.rally.hours; C.rallyNext = C.hr + P.rally.hours + P.rally.cooldownH; C.rallies++; return true;
  }
  function optionOf(s, C, life, id) { var o = options(s, C, life); for (var i = 0; i < o.length; i++) if (o[i].id === id) return o[i]; return null; }
  function canBuy(s, C, life, id) { SS = s; var x = optionOf(s, C, life, id); return !!(x && canPay(C, x.cost)); }
  function buyLine(s, C, life, id) {
    SS = s; C.ironKeep = 0; var x = optionOf(s, C, life, id); if (!x || !canPay(C, x.cost)) return false;
    pay(C, x.cost, x.id); if (x.id === 'armory') { if (x.up) { C.tier.armory++; C.lv.armory = 1; } else C.lv.armory++; } else C.lv[x.id]++;
    C.buysT.push([C.hr, x.id]); if (x.id === 'barracks' || x.id === 'armory') topUp(C, life); return true;
  }
  function oneOffsOpen(C, life) { var best = Math.max(life.best || 0, C.clearedN); return P.oneOffs.filter(function (x) { return !C.oneOffs[x.id] && best >= x.opens; }); }
  function buyOneOff(s, C, life, id) { SS = s; C.ironKeep = 0; var x = null; P.oneOffs.forEach(function (o) { if (o.id === id) x = o; }); if (!x || C.oneOffs[id] || C.iron < x.iron) return false; pay(C, { iron: x.iron }, 'oneOffs'); C.oneOffs[id] = C.hr; return true; }
  function stdOpen(C, life) { return Object.keys(C.newly).filter(function (k) { return !life.stds[k]; }); }
  function raiseStd(s, C, life, key) { SS = s; if (P.off.standards || !C.newly[key] || life.stds[key]) return false; var c = stdCost(life); if (!canPay(C, c)) return false; pay(C, c, 'standards'); life.stds[key] = true; life.stdN++; return true; }
  function canStd(s, C, life) { SS = s; return canPay(C, stdCost(life)); }
  // the game's jobs: miners and drillmasters, up to their places
  function syncJobs(s, C) { C.miners = Math.min(s.jobs.miner || 0, mineSlots(C)); C.drillers = Math.min(s.jobs.drillmaster || 0, drillSlots(C)); }
  // banking at a rebirth (the game: the player then chooses perks; the lab's bot allocates them itself)
  function bank(C, life) { var n = 0; Object.keys(C.newly).forEach(function (k) { if (life.ever[k] == null) { life.ever[k] = C.run; life.bs += byKey[k].bs; n += byKey[k].bs; } }); life.best = Math.max(life.best || 0, C.clearedN); life.runs++; return n; }
  function perkSpent(lv) { var t = 0; P.perks.forEach(function (p) { for (var i = 0; i < (lv[p.id] || 0); i++) t += perkCost(p, i); }); return t; }
  function lightGifts(C, life) { var ls = lightSrc(C); return { burners: ls.burners, keepers: ls.keepers, all: (ls.all || 1) * lightStd(life) * lightFlat(life), std: lightStd(life), flat: lightFlat(life), buffs: ls.all || 1 }; }

  // ---------------------------------------------------------------- readouts
  function snapshot(C, life, s) {
    var f = frontier(C, s), nx = f.length ? nextBattle(f[0], C, life) : null;
    return { hr: C.hr, cp: C.cp, cap: cap(C, life), res: C.res, iron: C.iron, ironH: ironH(C), fillH: fillH(C, life), need: drillNeed(C, life), miners: C.miners, drillers: C.drillers, mineSlots: mineSlots(C), drillSlots: drillSlots(C),
      cleared: C.clearedN, front: nx ? nx.T : null, rally: C.hr < C.rallyEnd, beast: beastTotal(life), relics: life.relicN, std: life.stdN, bs: life.bs };
  }

  return { P: P, defaults: defaults, cp0: cp0, recruitAt: recruitAt, T: T, byKey: function (k) { return byKey[k]; }, famCount: famCount, tierOf: tierOf, newLife: newLife, newRun: newRun, openRun: openRun,
    pre: pre, tick: tick, act: act, rebirth: rebirth, allocPerks: allocPerks, perkCost: perkCost, cap: cap, capParts: capParts, resolveH: resolveH, resCap: resCap, fillH: fillH, drillNeed: drillNeed,
    ironH: ironH, landIronH: landIronH, mineSlots: mineSlots, drillSlots: drillSlots, beastStages: beastStages, beastTotal: beastTotal, flatBS: flatBS, lightFlat: lightFlat, lightSrc: lightSrc, lightStd: lightStd, frontier: frontier,
    nextBattle: nextBattle, avatarCd: avatarCd, armPrice: armPrice, have: asPlayer(function (C, k, s) { if (s) SS = s; return have(C, k); }), options: function (s, C, life) { SS = s; return options(s, C, life); }, incomeH: incomeH, snapshot: snapshot, armL: armL, recruitF: recruitF, armF: armF,
    preview: preview, attack: attack, fightable: fightable, avatarReady: avatarReady, raidAt: raidAt, raidCost: raidCost, rallyNow: asPlayer(rallyNow), rallyFood: rallyFood, rallyX: rallyX, canBuy: asPlayer(canBuy), buyLine: asPlayer(buyLine), oneOffsOpen: oneOffsOpen, buyOneOff: buyOneOff,
    stdOpen: stdOpen, stdCost: stdCost, raiseStd: asPlayer(raiseStd), canStd: asPlayer(canStd), syncJobs: syncJobs, bank: bank, perkSpent: perkSpent, perk: perk, perkLv: perkLv, lightGifts: lightGifts, edgeOf: edgeOf, beastEdge: beastEdge, defOpen: defOpen, ironPerMinerH: ironPerMinerH, healF: healF, scoutF: scoutF, councilF: councilF, hardF: hardF, relicCP: relicCP, cpOf0: function () { return cp0; } };
};
if (typeof module !== 'undefined') module.exports = CPHASE;
