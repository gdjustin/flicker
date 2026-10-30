
// Light core for A Flicker in the Dark: Light Lab v1 (2026-10-16), the simpler light shape on Map A v4.
// Built from the map phase 1 branch v1p's rules. Changes (owner calls, 2026-10-15/16): three fires (firekeepers make light
// from a settler alone; burners burn materials, with rare, big rebuilds; lamps are bought with copper and ask nothing), fire-tending's
// cap raised by a prestige line, long songs strengthen firekeepers only (capped), the Light Academy, glowstones, Light Anchors, the
// copper hearth and Kindled cut, relics take in the anchors' power, memory and the family perks reach the village, perks by family,
// Map A v4 dealt by land (draft 1's darkness deck, ranked by push step x land x wobble), the copper place back beside home.
// Catch-up and automation perks are stand-ins until their design pass.
// Data plus pure rules, no DOM, built on the village core (VC): the Map Lab and the map branch both run
// this file, so the lab's bot plays exactly what the player plays. Every number is a dial; nothing is decided.
// Starts from the village's real end state: leftover village lines stay on sale at village prices (the tail),
// and each phase-1 line unlocks when its village line is maxed (the hybrid, owner 2026-10-12).
var MCORE = function (VC) {
  'use strict';

  var D = {
    // darkness: a step-1 tile needs C1 light; each step out x F; terrain multiplies; a fixed wobble per tile
    C1: 40000, F: 12, fuzz: 0.15,
    terrain: { meadow: 0.6, forest: 1, hills: 2.5, marsh: 1.4, river: 0.3, mountain: 10, water: 1 },   // v1o: draft 1's; Light reads the dealt card now (water: lakes and sea, places since v1o)
    deal: 'land',               // Light Lab v1: 'land' = draft 1's deck dealt by push step x each place's own land x wobble; 'card' = v1p (draft 1's cards in push order)
    keeperFuelMap: 0,           // Light Lab v1 (owner Leaning): once the map opens, firekeepers make light from a settler alone (0); 1 = they burn wood as in the village
    tileBonus: 0,               // v1j: 0 (was +5% to the matching raw resource per restored tile of that land; relics by land replace it)
    landRes: { forest: 'wood', hills: 'stones', marsh: 'fiber', meadow: 'food', river: 'food', mountain: 'stones', water: 'food' },
    riverSettlers: 2,           // river valley tiles send 2 settlers (Considering)
    // copper: all of it is smelted (owner). The copper tile gives 1, as flavour, and the idea to smelt.
    smeltWood: 0.5, smeltStone: 0.15, smeltCopper: 0.02,
    smithy: 0.5, bellowsHouse: 0.5, oreFloor: 0.5,   // small smelting projects, each +50% copper
    miningBoost: 0.5,           // the mining tile a few steps out: +50% copper
    easeTiles: 0, easeX: 1,     // test dial: from this many tiles restored, copper output x easeX (0 = off)
    // research
    scholarBoost: 0,            // reserved
    booksGrowth: 1.3, booksPriceShare: 0.6, booksCopperShare: 0.02,
    // storage: stockpiles continue; past level 25 they also take a little copper (option 2)
    reinforceAt: 25, reinforceCopper: 0.02,
    autoStoreHours: 0,          // 0 = use the time-away limit; else keep this many hours of income as room (stewards 'away' only)
    stewards: 'atCap',          // v1r (owner, 2026-10-16): 'atCap' = a full stockpiled store buys the next stockpile if affordable, any time; 'away' = v1q's top-up when you leave
    eatMap: 4.5,                // v1h (owner agreed 2026-10-13): settlers eat 4.5x the village's 0.06 food a second once the map opens (about 1 in 9 foraging)
    // v1h copper store (owner 2026-10-13): a small chest until Lined stockpiles is learned, then stockpiles hold copper too, retroactive to
    // the first stockpile: copper room = cuRoom x the wood room. Generous, so a long night never spills copper; tied to stockpiles, so it can't pile up early
    cuBase: 100, cuRoom: 1,
    beaconAt: { 2: 12 },
    resonance: { on: 1, R: 2 },   // v1k (owner 2026-10-13): built. Each relic in a finished region counts 1 + R; the flat region light goes   // lab: region resonance (see resonant()); 0 = finished regions add flat light as before
    // v1h timed boosts (owner 2026-10-13, flavour more than balance): a place called back quickens its land's work for a short while.
    // x: the boost; mins: how long; a second of the same kind restarts the clock (they don't stack). Upgrades to lengthen or strengthen: to revisit
    surge: { reclear: 1, x: 0.2, mins: 10, effect: { forest: 'wood', hills: 'stones', mountain: 'stones', marsh: 'fiber', meadow: 'food', river: 'haul', water: 'haul' } },
    overflowAt: 0.8, overflowOn: 0,   // Overflow (removed in v1g, to revisit): while away, burners burn only what sits above this share of a store
    // housing
    houseRoom: 4, houseCost: { wood: 500, stones: 400, fiber: 100 }, houseGrowth: 1.3   /* v1g: fiber at a quarter of the stone price, for flavour (owner Leaning) */, hallRoom: 10,
    // light families
    keeperTend: { a: 0.12, wood: 0.1 },         // copper tending: +12% keeper light, +10% keeper wood a level (tier 1)
    tendTier: { L: 6, tiers: 99, dip: 0.85, J: 1.4, cost: { copper: 30, stones: 400 }, g: 1.6, tp: 30 },
    // v1j fire-tending (owner: test it): the copper fire-irons line becomes endless; each level, firekeepers make +x of their light for every lit burner
    fireTend: { on: 1, x: 0.01, g: 1.6, cap: 20, gMin: 1.45, warden: 5 },   /* Light Lab v1: the cap stays at 20 and Fire-warden (a keeper perk) raises it by `warden` a level */   /* v1n: cap = most lit fires a tending level counts; gMin = the price growth Firewright can't cut below */
    lamp: { b: 0.6, L: 10, tiers: 99, J: 2, cost: { copper: 12, stones: 250 }, g: 1.18, tp: 4, runCap: 99 },   /* Light Lab v1: runCap = lamp tiers a run (99 = none), raised by Glasswright */
    burnEff: { a: 0.25, fuel: 0.15, L: 99, cost: { copper: 40, wood: 300 }, g: 1.4, rebuild: 2, rebuildX: 2,
      // Light Lab v1 (owner): burners climb in rare, big rebuilds. Rebuild r: the kind's light x Lx^r, its fuel x Fx^r; the next costs base x Pg^r,
      // in copper and the kind's own fuel. rebuild 1 = v1p's consolidated levels (kept to compare)
      Lx: 3, Fx: 1.8, Pg: 12, base: { copper: 300, fuel: 2500 }, runCap: 99 },   /* runCap = rebuilds a run for each kind (99 = none), raised by Firebrick */   /* v1n: back to x2, the single levels' math */   /* rebuildX: light × per rebuild (2 = the single levels' math) */   // v1j rebuild 1: levels come in rebuilds, each doubling the kind's light (owner: same math, consolidated)
    tool: { a: 0.15, L: 8, cost: { copper: 25, wood: 200, stones: 150 }, g: 2.0 },
    longSong: 0.1, longSongCost: 4000, longSongGrowth: 1.6, longSongMax: 10,   // Light Lab v1 (owner): long songs strengthen firekeepers only, a capped line
    beaconStep: 0.4, beaconMax: 99,   /* v1k: +40% (was 30%), part of the hearth's budget; Beacon fire perks add to it per level */              // each beacon upgrade +30% all light, additive; endless (owner, 2026-10-12)
    beaconEvery: 6.5, beaconGrowth: 2.6, beaconResearch: 400, beaconResearchGrowth: 2.4,   // upgrade n opens at 3 + (n-1) x every tiles
    // copper braziers (Considering): the lamp/brazier combo kept; each brazier lights, and every copper lamp gains a little per brazier
    cbrazier: { on: 1, b: 0.5, lampBonus: 0.04, cost: { copper: 20, stones: 400 }, g: 1.15 },
    // heartstones by step (Budget Lab): 1 a tile to step `kick`, then doubling
    hs: { kick: 3, G: 2 },
    // the light burst (v24e's, restored 2026-10-12; was Stoke the fire in the map): 30 s of your light, sent at once; one at a time
    burst: { secs: 30, wood: 200, food: 25, foodG: 1.6, tripBase: 60, tripStep: 30 },
    // prestige: memory +2.5% light per lifetime heartstone (flat currency); remembered tiles cost / pave
    memPct: 0.05, pave: 1.5,
    villageReach: 1,
    // Light Lab v2 dials: srcScope 'phase' = the fire buffs (src) touch only this phase's lines (owner 2026-10-16), 'all' = v1;
    // vHearthMax: the village hearth's levels (10 in v1p); villageStart: the village's opening stores (owner: 40 stone and wood, not a perk; v1r: from run 2 on)
    srcScope: 'all', vHearthMax: 10, villageStart: { wood: 0, stones: 0 },
    perkCompound: 0,            // Light Lab v1 dial: 1 = the family buff perks compound (x(1+x) a level), 0 = they add (+x a level)            // Light Lab v1 (owner): memory and the family perks reach the village too (0 = off, as in v1p)
    // copper hearth (hybrid of the village hearth, endless): +a all light a level, additive; opens when the village hearth is maxed
    chearth: { a: 0.04, cost: { copper: 60, stones: 2000 }, g: 1.5, on: 0 },   // v1k (owner 2026-10-13): the copper hearth is removed; its light budget is spread to the beacon and every light source (src)
    // v1k light buff (owner): each map-phase light source's own multiplier, sized in the lab. fire: the great fire; lamps: village and copper lamps and braziers
    src: { fire: 1.2, keepers: 1.2, lamps: 1.9, burners: 1.6, academy: 1.2 },   // v1n (owner's playtest, 2026-10-15): burners x1.6 (the x3.6/x3.42 buff was sized on a bot that barely lit burners); lamps keep x1.9 (owner: left alone)   // v1l (owner): 5% of burners' light handed back to lamps and braziers (burners x3.6 -> x3.42, lamps x1.2 -> x1.9, the same light at the phase's end); then left alone   // v1k lab: the hearth's budget spread (x1.2 each, with the beacon at +40%), and burners, the lagging source, x3 more
    // regions: a finished region multiplies all light (light only, so it never feeds burners twice)
    regionX: 1.2, regionAdd: 0,      // 0: finished regions compound (×1.2 each); 1: they add (+20% each)
    // perks, bought with lifetime heartstones; they stay spent from run to run (v1q, owner 2026-10-16), and only a respec gives them back
    // kind: enabling (raises a ladder's ceiling or cuts its price growth), direct (power from the start), qol (catch-up)
    perks: {
      // Beacon: two lines (owner, 2026-10-12): one strengthens every upgrade, one opens upgrades sooner (the ladder is endless)
      beaconFire: { fam: 'beacon', kind: 'enabling', role: 'buff', name: 'Beacon fire', desc: 'Each beacon upgrade is +{x}% stronger per level.', x: 0.1, base: 6, g: 1.9, max: 8 },
      beaconSurvey: { fam: 'beacon', kind: 'enabling', role: 'extend', name: 'Beacon-raising', desc: 'Beacon upgrades unlock {cut}% faster per level.', cut: 0.88, base: 5, g: 1.8, max: 8 },
      ampSites: { fam: 'map', kind: 'enabling', role: 'extend', name: 'Amplifier sites', desc: 'You can construct one more amplifier tower.', base: 6, g: 2.5, max: 4 },
      wideLenses: { fam: 'map', kind: 'enabling', role: 'buff', name: 'Wide lenses', desc: 'Amplifier cones grow, covering a greater area: 3,3,1 then 5,3,3,1 then 5,5,5,3.', base: 15, g: 3, max: 2 },
      firewright: { fam: 'keepers', kind: 'enabling', role: 'cheaper', name: 'Firewright', desc: 'Reduces fire-tending price growth -{cut}% per level.', base: 3, g: 1.6, max: 10, cut: 0.85 },   // v1l: replaces Hearthwright (the copper hearth is gone), same prices and shape
      keeperLore: { fam: 'keepers', kind: 'enabling', role: 'buff', name: 'Keepers\u2019 lore', desc: 'Increases fire-tending and long songs\u2019 firekeepers boost +{x}% a level.', x: 0.25, base: 6, g: 1.8, max: 10 },
      fireWarden: { fam: 'keepers', kind: 'enabling', role: 'extend', name: 'Fire-warden', desc: 'Fire-tending buffs count 5 more burner buildings per level (the cap starts at 20).', base: 4, g: 1.9, max: 20 },
      lampwright: { fam: 'lamps', kind: 'enabling', role: 'cheaper', name: 'Lampwright', desc: 'Copper lamp price growth reduced -{cut}% per level.', base: 3, g: 1.6, max: 10, cut: 0.85 },
      brightGlass: { fam: 'lamps', kind: 'enabling', role: 'buff', name: 'Bright glass', desc: 'Copper lamps and braziers make +{x}% more light per level (not the village\u2019s).', x: 0.25, base: 6, g: 1.8, max: 10 },
      hotHearths: { fam: 'burners', kind: 'enabling', role: 'buff', name: 'Hot hearths', desc: 'Burner building tier buffs grow +{x}% per level.', x: 0.25, base: 6, g: 1.8, max: 10 },
      kilnwright: { fam: 'burners', kind: 'enabling', role: 'cheaper', name: 'Kilnwright', desc: 'Each burner rebuild\u2019s price reduced -{cut}% per level.', base: 3, g: 1.6, max: 10, cut: 0.9 },
      cuburnerUnlock: { fam: 'burners', kind: 'enabling', role: 'unlock', name: 'Copper burning', desc: 'Unlocks copper burners. You can now directly burn copper to generate light.', base: 10, g: 1, max: 1, sys: 'cuburner' },
      bankedFires: { fam: 'burners', kind: 'enabling', role: 'buff', name: 'Banked fires', desc: 'Burners burn {cut}% less fuel per level for the same light.', cut: 0.9, base: 6, g: 1.8, max: 10 },
      woodcraft: { fam: 'raw', kind: 'direct', role: 'raw', name: 'Woodcraft', desc: 'All wood made +{x}% per level.', x: 0.15, base: 8, g: 2, max: 4 },
      stonecraft: { fam: 'raw', kind: 'direct', role: 'raw', name: 'Stonecraft', desc: 'All stone made +{x}% a level.', x: 0.15, base: 8, g: 2, max: 4 },
      fibercraft: { fam: 'raw', kind: 'direct', role: 'raw', name: 'Fibercraft', desc: 'All fiber made +{x}% a level.', x: 0.15, base: 8, g: 2, max: 4 },
      relicLore: { fam: 'map', kind: 'enabling', role: 'buff', name: 'Relic lore', desc: 'Each light relic\u2019s light bonus grows +{x}% per level.', x: 0.25, base: 6, g: 1.8, max: 8 },
      scholarLore: { fam: 'raw', kind: 'direct', role: 'raw', name: 'Scholars\u2019 lore', desc: 'All research +{x}% per level.', x: 0.2, base: 8, g: 2, max: 5 },
      // Light Lab v2 (owner, 2026-10-16): the beacon and copper lines
      beaconWrights: { fam: 'beacon', kind: 'enabling', role: 'cheaper', name: 'Beacon-wrights', desc: 'Beacon upgrades require -{x}% fewer materials per level.', x: 0.1, base: 4, g: 1.8, max: 5 },
      coppercraft: { fam: 'raw', kind: 'direct', role: 'raw', name: 'Coppercraft', desc: 'All copper made +{x}% a level; smelters burn 8% more raw resources a level.', x: 0.1, use: 0.08, base: 3, g: 2, max: 4 },
      // comforts (Light Lab v2, owner 2026-10-16): cheap, not a tree, affordable by the end of phase 1. They speed up catching up
      // to the last frontier and never push it. costs: heartstones for each level in turn
      waymarks: { kind: 'comfort', tier: 'cheap', name: 'Waymarks', desc: 'When a place comes back and nothing is lined up, your light moves on to the cheapest place beside your land by itself', costs: [3] },
      skipPrologue: { kind: 'comfort', tier: 'cheap', name: 'Skip the prologue', desc: 'Runs begin in the village (no effect in the lab: the bot starts in the village)', costs: [3] },
      oldLessons: { kind: 'comfort', tier: 'cheap', name: 'Old lessons I, II', desc: 'Research learned in an earlier run costs 50%, then 25%', f: [0.5, 0.25], costs: [8, 30] },
      sureHands: { kind: 'comfort', tier: 'medium', name: 'Sure hands I, II', desc: 'Hand gathering gives twice, then four times as much', hand: [2, 4], costs: [12, 30] },
      stewardsKept: { kind: 'comfort', tier: 'medium', name: 'Stewards kept', desc: 'Your stewards are there from the first place: when a store is full, they buy the next stockpile if you can afford it', costs: [20] },
      openDoors: { kind: 'comfort', tier: 'medium', name: 'Open doors I\u2013IV', desc: 'The village starts with 5, 15, 25, then 50 settlers (past 25 they wait at the reveal)', pop: [5, 15, 25, 50], costs: [15, 30, 60, 100] },
      lightRemembers: { kind: 'comfort', tier: 'medium', name: 'The light remembers I\u2013III', desc: 'Remembered places need {x}% less light again a level', x: 0.33, costs: [20, 40, 70] },   // R1 adds a fourth level, the rebirth branch's last gift
      headStart: { kind: 'comfort', tier: 'medium', name: 'Head start', desc: 'The map opens with wood, stone, fiber, food and copper stores full', costs: [20] },
      practisedHaulers: { kind: 'comfort', tier: 'medium', name: 'Practised haulers', desc: 'Projects built in an earlier run haul 2.5\u00d7 as fast (village and map)', x: 2.5, costs: [20] },
      relicsRemembered: { kind: 'comfort', tier: 'medium', name: 'Relics remembered I, II', desc: 'I: relics claimed in an earlier run cost half. II: buy all (no effect in the lab: the bot buys them anyway)', f: 0.5, costs: [15, 30] },
      oldFlames: { kind: 'comfort', tier: 'medium', name: 'Old flames I\u2013IV', desc: 'Last run\u2019s upgrade lines come back already bought: I copper tools, books and timber houses; II + fire-tending and long songs; III + copper lamps and braziers; IV + burner rebuilds and copper burners', costs: [10, 25, 50, 90], share: 1,
        lines: [['ct_axes', 'ct_mattocks', 'ct_spindles', 'ct_baskets', 'books', 'house'], ['ctend', 'longsong'], ['clamp', 'cbrazier'], ['eff_firepit', 'eff_limekiln', 'eff_rushlight', 'cuburner', 'eff_cuburner']] },
      keptLights: { kind: 'comfort', tier: 'late', name: 'Kept lights', desc: 'Light projects built in an earlier run stay built (not the beacon, the amplifiers or the tower)', costs: [80] },
      villageComplete: { kind: 'comfort', tier: 'late', name: 'The village complete', desc: 'Village projects build themselves, free, as soon as they are planned (end of phase 1)', costs: [120] },
      // the rebirth branch (2026-10-18): a gift only, never sold. The run wakes at the map, the village as it stood when the map last opened
      villageSkip: { kind: 'comfort', tier: 'gift', name: 'The village stands', desc: 'You wake at the edge of your land: the village is as it stood when you last looked out', costs: [], gift: 1 }
    },
    // Light Anchors (Considering): built in the village, one per restored tile; the last step installs a relic of that tile's land (a click).
    // Each returns `r` of its tile's darkness as light a day, outside the light multipliers (it calls light back from the land).
    // anchor mode 'focus' (owner, 2026-10-12): an anchor sets its tile's relic in the great fire and multiplies that relic's
    // bonus by 1 + focus (anchor craft and lore raise it); 'return': the earlier design, light back from its tile's darkness
    anchor: { mode: 'focus', focus: 1, r: 0.1, needRelic: 1, cost: { stones: 3000, wood: 2000 }, stepGrowth: 2.2, craft: { a: 0.25, cost: { copper: 150, stones: 3000 }, g: 1.6 } },
    // glowstones (Considering): glowcrafters (a settler job) turn stone and food into glow; each glowstone costs more glow than the last
    // and adds a share of all light, additive. Own ladder: glow-cutting.
    glow: { stone: 0.6, food: 0.12, rate: 1, first: 300, g: 1.3, x: 0.01, cut: { a: 0.1, cost: { copper: 120, fiber: 2000 }, g: 1.6 } },
    // Light Academy (approved to lab): a toggle; while on, scholars make light instead of research. Own ladder: lecture halls.
    academy: { b: 2, halls: { a: 0.15, cost: { copper: 200, stones: 4000 }, g: 1.6 } },
    // the copper burner (Considering): burns copper directly for light; built with stone and wood, lit by the player
    cuburner: { b: 0.4, use: 0.01, cost: { stones: 2000, wood: 1500 }, g: 1.3 },
    // amplifiers: a directional cone, x ampX on light sent into tiles in it; areas don't stack
    ampX: 3, cones: [[3, 3, 1], [5, 3, 3, 1], [5, 5, 5, 3]], ampMax: 2,
    // relics (lab test): 'off' | 'small' (+2% light a tile, additive) | 'chunky' (one per land per 4 tiles, +20% each, copper)
    // how each new system opens (owner, 2026-10-12): perk 1 = bought as a prestige perk (one-off), 0 = a card in run 1 at `tiles` restored
    unlock: { cuburner: { perk: 1, tiles: 6 } },   // Light Lab v1: copper burners from the first prestige (owner); the Academy, glowstones and anchors are cut
    // relics, one per restored tile (owner hard rule, 2026-10-12): 'tile'. Each restored tile offers its own relic, bought with
    // copper; price grows with the tile's step. kind 'light': +light each (adding up). kind 'raw': +its land's resource each
    // (forest wood, hills and mountain stone, marsh fiber, meadow and river food), adding to the raw-craft perks; mountain
    // relics also give a little light. Older modes kept to compare: 'chunky', 'small', 'off'.
    memExp: 1,
    relic: { kind: 'land', light: 0.03, raw: 0.05, mountLight: 0.05, copper: 30, stepG: 2.5, nG: 1 },
    // land relics (kind 'land', Considering 2026-10-13): what each land's relic boosts, the first of a land's size, each after, and the nerfed light part
    landRelic: { effect: { forest: 'wood', mountain: 'stones', marsh: 'fiber', meadow: 'food', river: 'haul', hills: 'stones', water: 'haul' }, first: 0.25, firstOf: { mountain: 0.5, water: 0.05 }, each: 0.06, eachOf: { mountain: 0.12 },   /* v1o: water relics (lakes, sea) +5% hauling each, no big first one */ light: 0.03, anchorLand: 0, anchorRaw: 0, terrainK: 0,   /* Light Lab v1: anchors cut, their power folded in (light part 2.5% -> 3%, each after +5% -> +6%) */
      botEq: { wood: 0.25, stones: 0.3, fiber: 0.2, food: 0.05, haul: 0.15, smeltFuel: 0.25, copper: 0.8, ideas: 0.8 } },   // botEq: the bot's light value of +1 of each effect (from the lab's boost runs)
    // lab test boosts: a flat share added to one effect for every run (all 0 in the game)
    boost: { wood: 0, stones: 0, fiber: 0, food: 0, copper: 0, haul: 0, ideas: 0, light: 0, smeltFuel: 0 },
    relicMode: 'tile', relicSmall: 0.02, relicChunky: 0.2, relicEvery: 4, relicCopper: 40, relicGrowth: 2.2,
    // time away
    awaySteps: [1, 2, 4, 6, 8, 12],
    feastBoost: 0.5,
    // ------------------------------------------------ the rebirth branch (2026-10-18, Considering; off unless dial set R1 is applied)
    // rb: rebirths come at scripted milestones (places called back in one run). `at[i]` ends run i+1. A rebirth is forced, on screen:
    // at the milestone the land beyond stops answering until the player is reborn. Rebirths 1 to last-1 reset the run and hand everyone a
    // packet of gifts (the comforts, now free and automatic, cumulative); the last one resets nothing: the self is whole, the land stays,
    // memory grows as you go, and combat would open. Heartstones then buy power only (the comforts leave the heartstone screen).
    rb: { on: 0, at: [35, 60, 85, 110, 130], last: 5,
      // r1c (owner, 2026-10-18): the floor The village stands wakes with. Tools: half of each line (axes 4 of 8 ...); carrying frames 1 of 12
      stand: { hearth: 'max', lamp: 'max', brazier: 'max', tally: 10, axes: 'half', mattocks: 'half', spindles: 'half', baskets: 'half', keepcraft: 'half', frames: 1 },   // owner 2026-10-18 (Considering): a 15-day floor for phase 1, 15 to 20 ideal; combat about 130. Lab: 35, 60, 85, 110, 130 puts the check-in bot whole on day 15.5
     
      packets: [
        { skipPrologue: 1, waymarks: 1, oldLessons: 1, sureHands: 1, lightRemembers: 1, stewardsKept: 1 },
        { openDoors: 2, oldLessons: 2, sureHands: 2, practisedHaulers: 1, relicsRemembered: 1, oldFlames: 1, lightRemembers: 2 },
        { villageSkip: 1, lightRemembers: 3, oldFlames: 2, headStart: 1 },
        { lightRemembers: 4, oldFlames: 4, relicsRemembered: 2, keptLights: 1 }
      ] },
    // mastery (Leaning shape, math tentative; opens once the self is whole): light sent to a place already called back masters it.
    // Tier n needs base^n clears (10, 100, 1,000); a clear costs the place's full darkness (no paved path). Each tier on a place adds its
    // heartstones to your mastery; light reaching NEW land is x(1 + mastery / k). The bonus never speeds mastering itself (owner + Claude, 2026-10-18).
    // weight 'star': every tier on any place is one star, and light reaching new land is x(1 + per x stars), adding up (Claude, 2026-10-18);
    // weight 'hs': each tier counts the place's heartstones, x(1 + points / k)
    mastery: { on: 0, tiers: 3, base: 10, need: null, weight: 'star', per: 0.02, k: 200 },   // need: clears for each tier, if set (else base^tier)
    // the traveling merchant (Considering): once the self is whole he comes every `every` seconds (real time in the game, game time in the lab),
    // waits until visited and sent on, and sells the heartstone perks at their usual prices. `first`: his first visit after the self is whole
    merchant: { on: 0, every: 172800, first: 3600 }
  };

  // ---------------------------------------------------------------- Map A v4 (v1o, 2026-10-16; was draft 1): 33x33, 1,088 tiles, 106 regions
  // The value map's land (owner-approved 2026-10-16): a 6-tile home valley, every land in the first 40 places, marsh and mountains in every
  // quarter, 106 regions of 6 to 15 places (each at least 75% one land), the push north-east first and south-west last.
  // Lakes and sea are places like any other now (land 'water'). Light's difficulty is unchanged (owner): each place carries a card from
  // draft 1's deck, dealt easiest first in the value map's order: `dstep` (its step for heartstones, relic and anchor prices and bursts)
  // and `dmul` (draft 1's terrain x wobble). How each phase reads terrain and tile difficulty is for that phase's design session.
  // cells: [x, y, region, -, tag, name, land override, dstep, dmul, land code]; y grows to the south. rivers: named courses, tile by tile
  function hash(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
  var TERRAIN0 = { meadow: 0.6, forest: 1, hills: 2.5, marsh: 1.4, river: 0.3, mountain: 10, water: 1 };   // draft 1's terrain, which ranks the deal by land
  var MAPA = /*@include src/data/map-a-v4.json*/null;
  function buildMap() {
    var tiles = [], idx = {}, water = [], regs = MAPA.regions.map(function (r, i) { return { id: r.id, i: i, name: r.name, land: r.land, core: r.core, tiles: [] }; });
    MAPA.cells.forEach(function (c) {
      var x = c[0], y = c[1], key = x + ',' + y;
      if (c[2] < 0) { water.push({ key: key, x: x, y: y, region: c[3] }); return; }
      var t = { key: key, x: x, y: y, step: Math.abs(x) + Math.abs(y), land: c[6] || MAPA.regions[c[2]].land, tag: c[4] || null, name: c[5] || null, region: c[2],
        dstep: c[7] != null ? c[7] : Math.abs(x) + Math.abs(y), dmul: c[8] != null ? c[8] : null, code: c[9] || null };
      idx[key] = tiles.length; tiles.push(t); regs[c[2]].tiles.push(key);
    });
    tiles.sort(function (p, q) { return p.step - q.step; }); idx = {}; tiles.forEach(function (t, i) { idx[t.key] = i; });
    // Light Lab v1 (owner): the copper place moves back beside home, onto the place north of it (its land unchanged); the copper hills keep their name
    var oldCu = tiles.filter(function (t) { return t.tag === 'copper'; })[0], newCu = tiles[idx['0,-1']];
    if (oldCu && newCu && !newCu.tag) { oldCu.tag = null; newCu.tag = 'copper'; newCu.name = newCu.name || 'The copper seam'; }
    // two deals of draft 1's darkness deck: v1p's (cards in push order) and by land. A card is (step, terrain x wobble)
    var cards = tiles.filter(function (t) { return t.dmul != null; }).map(function (t) { return { s: t.dstep, m: t.dmul, d: Math.pow(12, t.dstep - 1) * t.dmul, t: t }; });
    cards.sort(function (a, b) { return a.d - b.d; });   // v1p dealt cards easiest first along the push order, so this rank is the push order
    var ps = cards.map(function (c) { return c.s; }).sort(function (a, b) { return a - b; });   // ring-sized blocks: the push step of each rank
    cards.forEach(function (c, i) { c.t.card = { s: c.s, m: c.m }; c.t.push = i + 1; c.t.pstep = ps[i];
      var wob = 1 + 0.15 * (2 * hash(c.t.x, c.t.y) - 1); c.t.key2 = Math.pow(12, ps[i] - 1) * (TERRAIN0[c.t.land] || 1) * wob; });
    var byKey = cards.map(function (c) { return c.t; }).sort(function (a, b) { return a.key2 - b.key2; });
    byKey.forEach(function (t, i) { t.byLand = { s: cards[i].s, m: cards[i].m }; });

    var byStep = []; tiles.forEach(function (t) { (byStep[t.step] = byStep[t.step] || []).push(t); });
    var rdirs = {}; Object.keys(MAPA.rivers || {}).forEach(function (nm) { var pts = MAPA.rivers[nm];
      pts.forEach(function (p, i) { [pts[i - 1], pts[i + 1]].forEach(function (q) { if (!q || Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) !== 1) return; var k = p[0] + ',' + p[1]; (rdirs[k] = rdirs[k] || []).push([q[0] - p[0], q[1] - p[1]]); }); }); });
    return { tiles: tiles, idx: idx, water: water, regions: regs, byStep: byStep, size: MAPA.size, rdirs: rdirs, rivers: MAPA.rivers || {} };
  }
  var MAP = buildMap();
  // which deal Light reads: each place's step (heartstones, prices) and darkness factor follow its card
  function applyDeal() { MAP.tiles.forEach(function (t) { var c = D.deal === 'card' ? t.card : t.byLand; if (c) { t.dstep = c.s; t.dmul = c.m; } }); MAP.dealt = D.deal; }
  applyDeal();
  // tiles out to one step past the farthest restored (what can be reachable), for fast scans
  function nearTiles(s) { var out = [], mx = (s.m.maxStep || 0) + 1; for (var st = 1; st <= mx && st < MAP.byStep.length; st++) if (MAP.byStep[st]) out = out.concat(MAP.byStep[st]); return out; }
  // regions: every tile belongs to one; a finished region multiplies all light (owner: candidate for rework)
  var REGIONS = MAP.regions;
  function regionsDone(s) { return s.m.regionsDone || 0; }
  function regionMult(s) { if (D.resonance.on) return 1; var n = regionsDone(s); return D.regionAdd ? 1 + (D.regionX - 1) * n : Math.pow(D.regionX, n); }
  // region resonance (lab only, Considering 2026-10-13): a finished region's relics ring together. Each relic in a finished region counts
  // 1 + R times, in its light part and its land's resource part; the flat light bonus for a finished region goes. Off in the game.
  var RES_CACHE = new WeakMap();
  function resonant(s) {
    var key = (s.m.relicsN || 0) + '|' + (s.m.regionsDone || 0), hit = RES_CACHE.get(s.m); if (hit && hit.k === key) return hit.v;
    var out = { n: 0, land: {} };
    if (s.m.relicT) Object.keys(s.m.relicT).forEach(function (k) { var t = MAP.tiles[MAP.idx[k]], rg = REGIONS[t.region];
      if (rg && rg.tiles.every(function (q) { return s.m.tiles[q]; })) { out.n++; out.land[t.land] = (out.land[t.land] || 0) + 1; } });
    RES_CACHE.set(s.m, { k: key, v: out }); return out;
  }
  function resW(s, land) { if (!D.resonance.on || !tileRelicMode()) return 0; var r = resonant(s); return D.resonance.R * (land ? r.land[land] || 0 : r.n); }
  function tileCost(t, s) {
    // v1o: the darkness card the place was dealt (draft 1's step and terrain x wobble), so Light's difficulty is draft 1's, placed anew
    var c = t.dmul != null ? D.C1 * Math.pow(D.F, t.dstep - 1) * t.dmul : D.C1 * Math.pow(D.F, t.step - 1) * D.terrain[t.land] * (1 + D.fuzz * (2 * hash(t.x, t.y) - 1));
    if (s && s.m && s.m.known && s.m.known[t.key]) c /= D.pave * Math.pow(1 / (1 - D.perks.lightRemembers.x), perk(s, 'lightRemembers'));
    return c;
  }

  // ---------------------------------------------------------------- phase-1 cards (research), gates: tiles, prerequisites
  function vmax(id) { return function (s) { return (s.lv[id] || 0) >= VC.LAD[id].max; }; }
  var CARDS = [
    { id: 'books', name: 'Bound books', cost: { ideas: 150 }, at: { tiles: 7 }, desc: 'Unlocks books, allowing your researches to store more ideas.' },
    { id: 'cubins', name: 'Lined stockpiles', cost: { ideas: 100 }, at: { copper: true }, desc: 'Line the stockpiles with clay and bark: they now hold copper too.' },
    { id: 'away2', name: 'Long watches', cost: { ideas: 120 }, at: { tiles: 1 }, away: 2, desc: 'Log up to 2 hours of offline progress.' },
    { id: 'houses', name: 'Timber houses', cost: { ideas: 250 }, at: { tiles: 2 }, desc: 'Unlocks timber houses: room for 4 settlers each.' },
    { id: 'smithy', name: 'The smithy', cost: { ideas: 200 }, at: { copper: true, tiles: 15 }, project: 'smithy', desc: 'Plan a smithy: smelters make 50% more copper.' },
    { id: 'ctools', name: 'Copper tools', cost: { ideas: 300 }, at: { copper: true, fn: function (s) { return ['axes', 'mattocks', 'spindles', 'baskets'].some(function (i) { return vmax(i)(s); }); } }, desc: 'Unlocks copper tools.' },
    { id: 'clamps', name: 'Copper lamps', cost: { ideas: 300 }, at: { copper: true, fn: vmax('lamp') }, desc: 'Unlocks copper lamps: these burn brighter the more copper braziers you have.' },
    { id: 'ctend', name: 'Copper fire-irons', cost: { ideas: 300 }, at: { copper: true, fn: vmax('keepcraft') }, desc: 'Unlocks copper tending: firekeepers will keep brighter fires.' },
    { id: 'away4', name: 'Night watch', cost: { ideas: 450 }, at: { tiles: 6 }, away: 4, desc: 'Log up to 4 hours of offline progress.' },
    { id: 'beff', name: 'Hotter burning', cost: { ideas: 500 }, at: { copper: true, tiles: 9 }, desc: 'Unlocks burner work: each burner burns hotter and gives more light.' },
    // the line-up ladder (owner, 2026-10-12): first tier at 2 places back, ending at 8. Waymarks moved to a QOL perk
    { id: 'harvest', name: 'Harvest feast', cost: { ideas: 300 }, at: { tiles: 5, fn: function (s) { return !!s.cards.feasting; } }, desc: 'Feasts become harvest feasts: twice the food, twice as long, and all light 55% stronger instead of 50%.' },
    { id: 'packs', name: 'Held breath', cost: { ideas: 800 }, at: { fn: function (s) { return (s.m.bursts || 0) >= 5; } }, desc: 'You hold the light longer before you let it go: double the power of your Light Burst.' },   // r1e (owner): re-themed, was Pack frames
    { id: 'waystations', name: 'Quickened light', cost: { ideas: 2400 }, at: { fn: function (s) { return !!s.m.cards.packs && (s.m.bursts || 0) >= 25; } }, desc: 'The light answers you sooner: Reduce the Light Burst cooldown by 50%.' },   // r1e (owner): re-themed, was Waystations
    { id: 'darkread', name: 'Sensing the void', cost: { ideas: 1600 }, at: { tiles: 19 }, scout: 1, desc: 'You can sense unrestored lands from even further away.' },
    { id: 'farsight', name: 'Far sight', cost: { ideas: 4000 }, at: { tiles: 21, fn: function (s) { return !!s.m.cards.darkread; } }, scout: 2, desc: 'You can sense unrestored lands from even further away.' },
    { id: 'plan1', name: 'Planning', cost: { ideas: 250 }, at: { tiles: 2 }, lineup: 1, desc: 'When your light restores a land, it will now automatically move to the next.' },
    { id: 'plan2', name: 'Longer plans', cost: { ideas: 1000 }, at: { tiles: 8, fn: function (s) { return !!s.m.cards.plan1; } }, lineup: 3, desc: 'Line up 3 total lands for your light to fill next.' },
    { id: 'plan3', name: 'Charted routes', cost: { ideas: 3500 }, at: { tiles: 18, fn: function (s) { return !!s.m.cards.plan2; } }, lineup: 8, desc: 'Line up 8 total lands for your light to fill next.' },
    // v1g: the broken tower is found on the map, not learned: its tile's card offers the repair (owner, 2026-10-13)
    { id: 'bellows', name: 'The bellows house', cost: { ideas: 700 }, at: { proj: 'smithy', tiles: 24 }, project: 'bellows', desc: 'Plan a bellows house: smelters make 50% more copper, again.' },
    { id: 'longsongs', name: 'Long songs', cost: { ideas: 900 }, at: { fn: vmax('songs') }, desc: 'Opens long songs: songs for the firekeepers on the long watch. Each makes firekeepers stronger.' },
    { id: 'away6', name: 'Watch fires', cost: { ideas: 1000 }, at: { tiles: 11 }, away: 6, desc: 'Log up to 6 hours of offline progress.' },
    // Overflow removed in v1g (owner, 2026-10-13): to revisit or redesign later. Its rule stays in the tick behind D.overflowOn (0)
    { id: 'amps', name: 'Amplifier towers', cost: { ideas: 1400 }, at: { tiles: 10, fn: function (s) { return !!s.m.done.repair || !!(s.m.builtBefore && s.m.builtBefore.repair); } }, desc: 'Build towers on the map to amplify your light.' },   // r1f (owner): from run 2 the old tower need not be mended first
    { id: 'away8', name: 'Long night', cost: { ideas: 2200 }, at: { tiles: 14 }, away: 8, desc: 'Log up to 8 hours of offline progress.' },
    { id: 'autostore', name: 'Stewards', cost: { ideas: 2500 }, at: { tiles: 13 }, desc: 'When storage space fills, your Stewards automatically purchase another Stockpile, if you can afford it.' },
    { id: 'orefloor', name: 'Ore floor', cost: { ideas: 2600 }, at: { proj: 'bellows', tiles: 32 }, project: 'orefloor', desc: 'Plan an ore floor: smelters make 50% more copper.' },
    { id: 'hall', name: 'The great hall', cost: { ideas: 1800 }, at: { pop: 38 }, project: 'hall', desc: 'Plan a great hall: room for ten more settlers.' },
    { id: 'away12', name: 'Keepers of the void', cost: { ideas: 6000 }, at: { tiles: 20 }, away: 12, desc: 'Log up to 12 hours of offline progress.' },
  ];
  // beacon upgrades are generated so their count, strength and price are dials (owner, 2026-10-12)
  // r1l (owner, 2026-10-27): the second lens is gone; past the sun, Beacon Raising and the stage's number in Roman numerals. Strength and prices unchanged.
  var BEACON_NAMES = ['Raise the beacon', 'Beacon: the lens', 'Beacon: the mirror', 'Beacon: the crown', 'Beacon: the flame', 'Beacon: the spire', 'Beacon: the halo', 'Beacon: the star', 'Beacon: the sun'];
  function roman(n) { var v = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], o = ''; v.forEach(function (p) { while (n >= p[0]) { o += p[1]; n -= p[0]; } }); return o; }
  function beaconName(n) { return BEACON_NAMES[n - 1] || 'Beacon Raising ' + roman(n); }
  for (var bn = 1; bn <= 40; bn++) (function (n) {
    CARDS.push({ id: 'beacon' + n, name: beaconName(n), cost: { ideas: 0 }, project: 'beacon' + n, beacon: n,
      at: { fn: function (s) { return n <= D.beaconMax && s.m.restored >= beaconGate(s, n) && (n === 1 || !!s.m.cards['beacon' + (n - 1)]); } },   // v1q (owner's playtest): the next upgrade's research shows once the last is planned, not built
      desc: 'Plan a beacon upgrade: all light stronger.' });
  })(bn);
  // r1i (owner): once the self is whole, two inexpensive research cards open the long game's features
  CARDS.push({ id: 'mastery', name: 'Light Attunement', cost: { ideas: 1500 }, at: { fn: function (s) { return !!(D.rb.on && s.m.whole); } }, desc: 'Pour your light back into previously-recalled land. HINT: This will make you much stronger from here on out....' });   // owner, 2026-10-26
  CARDS.push({ id: 'traveler', name: 'A mysterious traveler', cost: { ideas: 1500 }, at: { fn: function (s) { return !!(D.rb.on && s.m.whole); } }, desc: 'Your settlement has attracted the attention of a traveling merchant who deals in heartstones and other rarities.' });
  CARDS.push({ id: 'cuburners', name: 'Copper burners', cost: { ideas: 600 }, sys: 'cuburner', at: { copper: true, tiles: 6 }, desc: 'Opens copper burners: copper burned for light.' });
  CARDS.push({ id: 'cbraziers', name: 'Copper braziers', cost: { ideas: 350 }, at: { copper: true, fn: function (s) { return D.cbrazier.on > 0 && (s.lv.brazier || 0) >= VC.LAD.brazier.max; } }, desc: 'Unlocks copper braziers: another way to generate light.' });
  // r1f (owner): a chain of research shows one step at a time; the next appears once the one before is learned
  [['away2', 'away4', 'away6', 'away8', 'away12']].forEach(function (ch) { ch.forEach(function (id, i) { if (!i) return; var c = CARD0(id), prev = ch[i - 1], f0 = c.at.fn;
    c.at = Object.assign({}, c.at, { fn: function (s) { return !!s.m.cards[prev] && (!f0 || f0(s)); } }); }); });
  function CARD0(id) { for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return CARDS[i]; return null; }
  function refreshCards() { CARDS.forEach(function (c) { if (c.beacon) { c.cost = { ideas: Math.ceil(D.beaconResearch * Math.pow(D.beaconResearchGrowth, c.beacon - 1)) }; c.desc = 'Plan a beacon upgrade: all light ' + Math.round(D.beaconStep * 100) + '% stronger.'; } }); }
  var CARD = {}; CARDS.forEach(function (c) { CARD[c.id] = c; });

  // ---------------------------------------------------------------- projects (hauled; stages far above what stores hold)
  function P(id, name, kind, stages, gives) { return { id: id, name: name, kind: kind, stages: stages, gives: gives }; }
  var PROJECTS = [
    P('smithy', 'The smithy', 'small', [{ cost: { stones: 1500, wood: 1200 } }], 'Smelters +50% copper.'),
    P('bellows', 'The bellows house', 'small', [{ cost: { wood: 4000, fiber: 1500, stones: 2500 } }], 'Smelters +50% copper.'),
    P('orefloor', 'The ore floor', 'small', [{ cost: { stones: 14000, wood: 6000 } }], 'Smelters +50% copper.'),
    P('repair', 'Mend the broken tower', 'small', [{ name: 'Clear the rubble, reset the footing', cost: { stones: 3000, wood: 1500 } }, { name: 'Grind a new lens', cost: { copper: 20, fiber: 300 } }], 'The old tower is lit again: light sent into its cone ×3.'),
    P('hall', 'The great hall', 'big', [{ name: 'The timber frame', cost: { wood: 12000, stones: 6000 } }, { name: 'Stone walls and roof', cost: { fiber: 4000, stones: 8000, copper: 60 } }], 'Room for ten more settlers.')
  ];
  var PROJ = {}; PROJECTS.forEach(function (p) { PROJ[p.id] = p; });
  // amplifier n (built this run) costs ampBase x ampGrowth^n, in two stages; click to finish
  var AMP = { stages: [{ name: 'The footing', cost: { stones: 12000, wood: 8000 } }, { name: 'The lens and rigging', cost: { copper: 200, fiber: 4000 } }], growth: 3 };
  function ampProject(n) {
    var m = Math.pow(AMP.growth, n);
    return P('amp' + n, 'Amplifier tower ' + (n + 1), 'big', AMP.stages.map(function (st) { var c = {}; for (var k in st.cost) c[k] = Math.ceil(st.cost[k] * m); return { name: st.name, cost: c }; }), 'Light sent into its cone x' + D.ampX + '.');
  }
  // beacon n: the first upgrade's stages x beaconGrowth^(n-1), a third stage from the mirror on
  var BEACON = [{ name: 'The scaffold', cost: { stones: 6000, wood: 3000 } }, { name: 'The fitting', cost: { copper: 40, fiber: 2000, stones: 3000 } }, { name: 'The setting', cost: { stones: 4500, copper: 25 } }];
  function beaconProject(n, s) {
    var m = Math.pow(D.beaconGrowth, n - 1) * (s && s.m && enabling(s) ? Math.max(0.1, 1 - D.perks.beaconWrights.x * perk(s, 'beaconWrights')) : 1), st = (n >= 3 ? BEACON : BEACON.slice(0, 2)).map(function (x) { var c = {}; for (var k in x.cost) c[k] = Math.ceil(x.cost[k] * m); return { name: x.name, cost: c }; });
    return P('beacon' + n, beaconName(n), 'big', st, 'All light +' + Math.round(D.beaconStep * 100) + '%.');
  }
  // an anchor for tile key: two raw stages scaled by the tile's step; the relic goes in with a click at the end
  function anchorProject(key) {
    var t = MAP.tiles[MAP.idx[key]], m = Math.pow(D.anchor.stepGrowth, t.dstep - 1), c1 = {}, c2 = {};
    for (var k in D.anchor.cost) { c1[k] = Math.ceil(D.anchor.cost[k] * m); }
    c2.fiber = Math.ceil(1000 * m); c2.wood = Math.ceil(D.anchor.cost.wood * m * 0.5);
    return P('anchor:' + key, 'Light Anchor: ' + (t.name || t.land) + ' (' + key + ')', 'big', [{ name: 'The standing stone', cost: c1 }, { name: 'The binding', cost: c2 }], 'Calls its land\u2019s light back into the great fire.');
  }
  function projDef(s, id) { if (PROJ[id]) return PROJ[id]; if (id.indexOf('amp') === 0) return ampProject(+id.slice(3)); if (/^beacon\d+$/.test(id)) return beaconProject(+id.slice(6), s); if (id.indexOf('anchor:') === 0) return anchorProject(id.slice(7)); return null; }

  // ---------------------------------------------------------------- phase-1 ladders
  // tiered (Trimps equipment prestige): levels reset at each tier; tier t's first level costs tp^(t-1) more
  var JOB_TOOL = { woodcutter: 'axes', gatherer: 'mattocks', twiner: 'spindles', forager: 'baskets' };
  var ML = [
    // owner, 2026-10-30: lamp tiers past Mirrored lamps are Lamps IV, V, VI and on
    { id: 'clamp', name: 'Copper lamps', tierNames: ['Copper lamps', 'Tempered copper lamps', 'Mirrored lamps'].concat(Array.from({ length: 37 }, function (_, i) { return 'Lamps ' + roman(i + 4); })), spec: 'lamp', card: 'clamps' },
    { id: 'ctend', name: 'Copper fire-irons', tierNames: ['Copper fire-irons', 'Tempered fire-irons'], spec: 'tendTier', card: 'ctend' },
    { id: 'cbrazier', name: 'Copper brazier', card: 'cbraziers' },
    { id: 'cuburner', name: 'Copper burner', card: 'cuburners' },
    { id: 'eff_cuburner', name: 'Hotter copper burners', card: 'cuburners', burner: 'cuburner' },
    { id: 'house', name: 'Timber house', card: 'houses' },
    { id: 'books', name: 'Books', card: 'books', storage: 'ideas' },
    { id: 'longsong', name: 'Long song', card: 'longsongs' },
    { id: 'eff_firepit', name: 'Hotter firepits', card: 'beff', burner: 'firepit' },
    { id: 'eff_limekiln', name: 'Hotter kilns', card: 'beff', burner: 'limekiln' },
    { id: 'eff_rushlight', name: 'Hotter rushlights', card: 'beff', burner: 'rushlight' },
    { id: 'ct_axes', name: 'Copper axes', card: 'ctools', tool: 'axes', job: 'woodcutter' },
    { id: 'ct_mattocks', name: 'Copper picks', card: 'ctools', tool: 'mattocks', job: 'gatherer' },
    { id: 'ct_spindles', name: 'Copper spindles', card: 'ctools', tool: 'spindles', job: 'twiner' },
    { id: 'ct_baskets', name: 'Copper sickles', card: 'ctools', tool: 'baskets', job: 'forager' }
  ];
  var MLAD = {}; ML.forEach(function (l) { MLAD[l.id] = l; });

  // ---------------------------------------------------------------- state
  function init(vs, prestige) {
    refreshCards();
    var s = vs;   // the village state carries on as it is
    s.res.copper = s.res.copper || 0;
    s.m = { tiles: {}, target: null, got: {}, restored: 0, pending: 0, cards: {}, lv: {}, tier: {}, done: {}, proj: null, queue: [], lineup: [], pool: 0,
      amps: [], awaitClick: null, away: 1, copperFound: false, made: { copper: 0, light: 0 }, relics: {}, relicsN: 0, log: [],
      t0: s.t, wasted: 0, autoBuys: 0, spent: {}, memHS: prestige ? prestige.hs : 0, known: {}, perks: prPerks(prestige),
      knownCards: {}, noEnabling: !!(prestige && prestige.noEnabling) };
    // the rebirth branch: which run this is, and the milestone that ends it (none once the self is whole)
    s.m.run = (prestige && prestige.run) || 1; s.m.rbAt = rbAt(s.m.run); s.m.rbReady = 0; s.m.whole = !!(D.rb.on && s.m.run > D.rb.last);
    if (prestige && prestige.cards) prestige.cards.forEach(function (k) { s.m.knownCards[k] = true; });
    if (prestige && prestige.known) prestige.known.forEach(function (k) { s.m.known[k] = true; });
    s.jobs.smelter = s.jobs.smelter || 0; s.jobs.glowcrafter = 0; s.pv = null;   // the village's prestige hook switches off once the map opens (the map phase counts memory itself)
    // stand-in (Light Lab v1): Old flames, a head start on the fire ladders from the last run's levels
    var of = 0, pl = prestige && prestige.levels;   // Light Lab v3: Old flames is a ladder of returning lines (below)
    if (of > 0 && pl) {
      ['ctend', 'cbrazier', 'eff_firepit', 'eff_limekiln', 'eff_rushlight', 'eff_cuburner', 'longsong'].forEach(function (id) { var v = Math.floor((pl.lv[id] || 0) * of); if (/^eff_/.test(id)) v = Math.min(v, runCapOf(s, 'burner')); if (v > 0) s.m.lv[id] = v; });
      var t0 = pl.tier.clamp || 1, lamps = (t0 - 1) * D.lamp.L + (pl.lv.clamp || 0), keep = Math.floor(lamps * of);
      if (keep > 0) { var tt = Math.min(runCapOf(s, 'lamp'), 1 + Math.floor(keep / D.lamp.L)); s.m.tier.clamp = tt; s.m.lv.clamp = tt > 1 + Math.floor(keep / D.lamp.L) - 1 ? keep % D.lamp.L : D.lamp.L; }
      s.m.headStart = of;
    }
    // Light Lab v2 comforts
    s.m.builtBefore = {}; s.m.relicKnown = {};
    if (prestige && prestige.built) prestige.built.forEach(function (k) { s.m.builtBefore[k] = true; });
    if (prestige && prestige.relics) prestige.relics.forEach(function (k) { s.m.relicKnown[k] = true; });
    if (perk(s, 'stewardsKept')) s.m.cards.autostore = true;   // r1h fix (owner): stewards kept means the Stewards research is never bought again
    if (perk(s, 'keptLights')) Object.keys(s.m.builtBefore).forEach(function (k) { if (PROJ[k] && k !== 'repair' && !/^beacon|^amp|^anchor/.test(k)) s.m.done[k] = s.t; });
    if (perk(s, 'headStart')) { ['wood', 'stones', 'fiber', 'food'].forEach(function (r) { s.res[r] = Math.max(s.res[r] || 0, cap(s, r)); }); s.res.copper = Math.max(s.res.copper, cap(s, 'copper')); }
    if (s.pvExtra) { s.m.pending += s.pvExtra; s.pvExtra = 0; }
    var ofl = perk(s, 'oldFlames'); if (ofl && pl) { var OF = D.perks.oldFlames, back = 0;
      OF.lines.slice(0, ofl).forEach(function (ids) { ids.forEach(function (id) {
        var v = Math.floor((pl.lv[id] || 0) * OF.share), t = pl.tier && pl.tier[id] || 0;
        if (t > 1) { s.m.tier[id] = t; back++; } if (v > 0) { s.m.lv[id] = Math.max(s.m.lv[id] || 0, v); back++; }
        // r1g (owner's playtest): a line that comes back brings its research with it, so it is never bought again for nothing
        if ((t > 1 || v > 0) && MLAD[id] && MLAD[id].card) { s.m.cards[MLAD[id].card] = true; (s.m.oldFlamesList = s.m.oldFlamesList || []).push([id, s.m.lv[id] || 0, t]); } }); });
      s.m.headStart = ofl; s.m.oldFlamesBack = back; }
    return s;
  }
  // spending by sink, for the lab: tools, lamps, tending, burners, storage, houses, songs, cards, projects, relics
  function sinkOf(id) {
    if (/^ct_/.test(id) || /^(axes|mattocks|spindles|baskets|frames)$/.test(id)) return 'tools';
    if (/^(clamp|lamp|brazier|cbrazier)$/.test(id)) return 'lamps';
    if (/^(ctend|keepcraft)$/.test(id)) return 'tending';
    if (/^eff_/.test(id) || /^(firepit|limekiln|rushlight|cuburner)$/.test(id)) return 'burners';
    if (/^(anchorcraft|glowcut|halls)$/.test(id)) return 'new systems';
    if (/^(stockpile|cache|tally|books)$/.test(id)) return 'storage';
    if (/^(house|shelter)$/.test(id)) return 'houses';
    if (/^(longsong|songs|hearth|shrine|chearth)$/.test(id)) return 'songs';
    return 'other';
  }
  function spend(s, cat, c) { var b = s.m.spent[cat] = s.m.spent[cat] || {}; for (var k in c) b[k] = (b[k] || 0) + c[k]; }
  var mlv = function (s, id) { return s.m.lv[id] || 0; };
  var mtier = function (s, id) { return s.m.tier[id] || 1; };
  var hasC = function (s, id) { return !!s.m.cards[id]; };

  // ---------------------------------------------------------------- map helpers
  function restored(s, key) { return key === '0,0' || !!s.m.tiles[key]; }
  function reachable(s, t) {
    if (restored(s, t.key)) return false;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return restored(s, (t.x + d[0]) + ',' + (t.y + d[1])); });
  }
  function landCount(s, land) { var n = 0; for (var k in s.m.tiles) if (MAP.tiles[MAP.idx[k]].land === land) n++; return n; }
  function coneOf(s) { var n = s && enabling(s) ? perk(s, 'wideLenses') : 0; return D.cones[Math.min(D.cones.length - 1, n)]; }
  function coneTiles(a, s) {
    var out = [], dx = a.dir[0], dy = a.dir[1];
    coneOf(s).forEach(function (w, i) {
      var cx = a.x + dx * (i + 1), cy = a.y + dy * (i + 1), h = (w - 1) / 2;
      for (var o = -h; o <= h; o++) out.push((cx + (dy ? o : 0)) + ',' + (cy + (dx ? o : 0)));
    });
    return out;
  }
  function ampMult(s, key) {
    var m = 1;
    s.m.amps.forEach(function (a) { if (a.lit && coneTiles(a, s).indexOf(key) >= 0) m = Math.max(m, D.ampX); });
    return m;
  }
  function gateOk(s, at) {
    if (!at) return true;
    if (at.tiles != null && s.m.restored < at.tiles) return false;
    if (at.copper && !s.m.copperFound) return false;
    if (at.proj && !s.m.done[at.proj]) return false;
    if (at.pop != null && s.pop < at.pop) return false;
    if (at.tagDone && !MAP.tiles.some(function (t) { return t.tag === at.tagDone && s.m.tiles[t.key]; })) return false;
    if (at.fn && !at.fn(s)) return false;
    return true;
  }
  // a new system's card: in run 1 at its tile gate, or (perk mode) only once its unlock perk is held, then from the first tile
  function sysOpen(s, sys) {
    var u = D.unlock[sys]; if (!u) return true;
    if (u.perk) { var id = unlockPerkOf(sys); return enabling(s) && perk(s, id) > 0 && s.m.restored >= 1; }
    return s.m.restored >= u.tiles;
  }
  function unlockPerkOf(sys) { for (var id in D.perks) if (D.perks[id].sys === sys) return id; return null; }
  function sysHeld(sys, lv) { var u = D.unlock[sys]; if (!u || !u.perk) return true; return !!lv[unlockPerkOf(sys)]; }
  function cardAvail(s, c) { if (c.sys) { var at = Object.assign({}, c.at); delete at.tiles; return !s.m.cards[c.id] && gateOk(s, at) && sysOpen(s, c.sys); } return !s.m.cards[c.id] && gateOk(s, c.at); }

  // ---------------------------------------------------------------- storage
  function cap(s, r) {
    if (r === 'copper') return hasC(s, 'cubins') ? Math.max(D.cuBase, VC.cap(s, 'wood') * D.cuRoom) : D.cuBase;   // v1h: a chest, then the stockpiles
    if (r === 'ideas') return VC.cap(s, 'ideas') * Math.pow(D.booksGrowth, mlv(s, 'books'));
    return VC.cap(s, r);
  }
  function addRes(s, r, n) { s.res[r] = Math.max(0, Math.min(cap(s, r), (s.res[r] || 0) + n)); }

  // ---------------------------------------------------------------- prices
  function tierPrice(spec, t, n) { var c = {}, m = Math.pow(spec.tp || 1, t - 1) * Math.pow(spec.g, n); for (var k in spec.cost) c[k] = Math.ceil(spec.cost[k] * m); return c; }
  function levelCost(s, id) {
    // village ladders: village prices, plus a little copper on reinforced stockpiles (option 2)
    if (VC.LAD[id]) {
      var c = VC.ladderCost(s, VC.LAD[id]);
      if (id === 'stockpile' && (s.lv.stockpile || 0) >= D.reinforceAt) c.copper = Math.ceil(c.wood * D.reinforceCopper);
      return c;
    }
    var l = MLAD[id], n = mlv(s, id);
    if (id === 'clamp') return tierPrice(Object.assign({}, D.lamp, { g: enabling(s) ? cutG(D.lamp.g, perk(s, 'lampwright'), D.perks.lampwright.cut) : D.lamp.g }), mtier(s, id), n);
    if (id === 'ctend') return D.fireTend.on ? tierPrice({ cost: D.tendTier.cost, g: enabling(s) ? Math.max(D.fireTend.gMin, cutG(D.fireTend.g, perk(s, 'firewright'), D.perks.firewright.cut)) : D.fireTend.g }, 1, n) : tierPrice(D.tendTier, mtier(s, id), n);
    if (id === 'cbrazier') return tierPrice(D.cbrazier, 1, n);
    if (id === 'cuburner') return tierPrice(D.cuburner, 1, n);
    if (id === 'anchorcraft') return tierPrice(D.anchor.craft, 1, n);
    if (id === 'glowcut') return tierPrice(D.glow.cut, 1, n);
    if (id === 'halls') return tierPrice(D.academy.halls, 1, n);
    if (id === 'chearth') return tierPrice({ cost: D.chearth.cost, g: enabling(s) ? cutG(D.chearth.g, perk(s, 'hearthwright'), D.perks.hearthwright.cut) : D.chearth.g }, 1, n);
    if (id === 'house') { var h = {}; for (var k in D.houseCost) h[k] = Math.ceil(D.houseCost[k] * Math.pow(D.houseGrowth, n)); return h; }
    if (id === 'books') { var room = cap(s, 'ideas'); return { fiber: Math.ceil(room * D.booksPriceShare), copper: Math.ceil(room * D.booksCopperShare) }; }
    if (id === 'longsong') return { ideas: Math.ceil(D.longSongCost * Math.pow(D.longSongGrowth, n)) };
    if (l.burner && D.burnEff.rebuild === 2) {   // Light Lab v1: rebuild n+1, in copper and the kind's own fuel
      var pg = enabling(s) ? cutG(D.burnEff.Pg, perk(s, 'kilnwright'), D.perks.kilnwright.cut) : D.burnEff.Pg, mm = Math.pow(pg, n), fuelR = l.burner === 'cuburner' ? 'stones' : VC.LAD[l.burner].burns, out = { copper: Math.ceil(D.burnEff.base.copper * mm) };
      out[fuelR] = (out[fuelR] || 0) + Math.ceil(D.burnEff.base.fuel * mm); return out; }
    if (l.burner) { if (!D.burnEff.rebuild) return tierPrice(D.burnEff, 1, n);
      var to = rebuildTo(n), c = {}; for (var q = n; q < to; q++) { var p1 = tierPrice(D.burnEff, 1, q); for (var k1 in p1) c[k1] = (c[k1] || 0) + p1[k1]; } return c; }
    if (l.tool) return tierPrice(D.tool, 1, n);
    return null;
  }
  function levelMax(s, id) {
    if (VC.LAD[id]) return VC.LAD[id].max;
    if (id === 'clamp') return D.lamp.L;
    if (id === 'ctend') return D.fireTend.on ? null : D.tendTier.L;
    if (id === 'longsong') return D.longSongMax;
    if (MLAD[id].burner) return D.burnEff.L;
    if (MLAD[id].tool) return D.tool.L;
    return null;
  }
  function levelOpen(s, id) {
    if (VC.LAD[id]) return VC.ladderOpen(s, VC.LAD[id]);
    var l = MLAD[id]; if (!hasC(s, l.card)) return false;
    if (id === 'chearth' && !D.chearth.on) return false;   // v1m: the copper hearth is gone, even where its card was learned before v1k
    if (l.tool) return (s.lv[l.tool] || 0) >= VC.LAD[l.tool].max;   // the hybrid: village line maxed first
    if (l.burner) return l.burner === 'cuburner' ? mlv(s, 'cuburner') > 0 : (s.lv[l.burner] || 0) > 0;
    return true;
  }
  function runCapOf(s, which) { var b = which === 'lamp' ? D.lamp.runCap : D.burnEff.runCap; if (b >= 99) return 99; return b + (enabling(s) ? perk(s, which === 'lamp' ? 'glasswright' : 'firebrick') : 0); }
  function levelMaxed(s, id) { if (MLAD[id] && MLAD[id].burner && D.burnEff.rebuild === 2 && mlv(s, id) >= runCapOf(s, 'burner')) return true; var mx = levelMax(s, id); return mx != null && (VC.LAD[id] ? s.lv[id] || 0 : mlv(s, id)) >= mx; }
  // the next tier is open once this tier is maxed, and costs tp^(t) times tier 1's first level
  function tierSpec(id) { return id === 'clamp' ? D.lamp : id === 'ctend' && !D.fireTend.on ? D.tendTier : null; }
  // v1j: burner rebuilds. Rebuild r ends at the level where the kind's light is 2^r (1 + a x n = 2^r); the price is every level's in between
  function rebuildTo(n) { if (D.burnEff.rebuild === 2) return n + 1; var r = 1; while ((Math.pow(2, r) - 1) / D.burnEff.a <= n + 1e-9) r++; return Math.round((Math.pow(2, r) - 1) / D.burnEff.a); }
  function rebuildNo(s, id) { if (D.burnEff.rebuild === 2) return mlv(s, id); var n = mlv(s, id), r = 0; while (Math.round((Math.pow(2, r + 1) - 1) / D.burnEff.a) <= n) r++; return r; }
  function tierUpAvail(s, id) { var sp = tierSpec(id); return !!sp && levelOpen(s, id) && levelMaxed(s, id) && mtier(s, id) < sp.tiers && !(id === 'clamp' && mtier(s, id) >= runCapOf(s, 'lamp')); }
  function tierUpCost(s, id) { return tierPrice(tierSpec(id), mtier(s, id) + 1, 0); }

  // ---------------------------------------------------------------- production
  function toolMult(s, job) { var t = JOB_TOOL[job]; return t ? 1 + D.tool.a * mlv(s, 'ct_' + t) : 1; }
  function tileMult(s, r) { var n = 0; for (var land in D.landRes) if (D.landRes[land] === r) n += landCount(s, land); return 1 + D.tileBonus * n; }
  function eatRate(s) { return VC.D.eat * D.eatMap; }   // food a settler eats a second in the map phase (eatMap: lab dial, 1 = as in the village)
  function hungry(s) {
    if (s.pop <= 0 || s.res.food > 1e-6) return 1;
    return jobMake(s, 'food', true) >= s.pop * eatRate(s) ? 1 : VC.D.hungry;
  }
  function jobMake(s, r, noHunger) {
    var t = 0, hf = noHunger ? 1 : hungry(s);
    for (var id in VC.D.job) {
      var n = s.jobs[id] || 0; if (!n || !VC.D.job[id][r]) continue;
      var acad = id === 'storyteller' && r === 'ideas' && academyOn(s) ? (enabling(s) ? Math.min(1, D.perks.quietHalls.f * perk(s, 'quietHalls')) : 0) : 1;
      t += n * VC.D.job[id][r] * VC.jobMult(s, id) * toolMult(s, id) * hf * acad;
    }
    if (r !== 'ideas') t *= tileMult(s, r) * rawPerk(s, r); else t *= (1 + boostOf(s, 'ideas')) * (1 + D.perks.scholarLore.x * perk(s, 'scholarLore'));
    return t;
  }
  // raw boosts blend by adding: the raw-craft perks plus raw relics plus land relics (and the lab's test boosts)
  function rawPerk(s, r) { var id = r === 'wood' ? 'woodcraft' : r === 'stones' ? 'stonecraft' : r === 'fiber' ? 'fibercraft' : null; return 1 + (id ? D.perks[id].x * perk(s, id) : 0) + relicRaw(s, r) + boostOf(s, r); }
  // land relics (2026-10-13 rework, Considering): each relic boosts its land's effect; the first of a land is large, the rest add a little.
  // Effects add up within their kind, never multiply each other. `boost` holds the lab's flat test boosts (all 0 in the game).
  function landRelicBoost(s, eff) {
    if (!tileRelicMode() || D.relic.kind !== 'land') return 0;
    var L = s.m.relicLand || {}, AL = s.m.relicAnchLand || {}, t = 0, LR = D.landRelic;
    for (var land in LR.effect) if (LR.effect[land] === eff) {
      var n = L[land] || 0; if (!n) continue;
      var w = (LR.anchorLand ? relicWeight(s, n, AL[land] || 0) : n) + resW(s, land);
      t += ((LR.firstOf[land] != null ? LR.firstOf[land] : LR.first) + (LR.eachOf && LR.eachOf[land] != null ? LR.eachOf[land] : LR.each) * Math.max(0, w - 1) + (LR.anchorRaw || 0) * (AL[land] || 0)) * landScale(land);
    }
    return t;
  }
  function landScale(land) { return Math.pow(D.terrain[land] || 1, D.landRelic.terrainK || 0); }   // harder land, bigger relic (terrainK 0 = all alike)
  function boostOf(s, eff) { return (D.boost[eff] || 0) + landRelicBoost(s, eff) + surgeOf(s, eff); }
  // v1h: the timed boost a place gives when it comes back (its land's work, for a few minutes)
  function surgeOf(s, eff) { var g = s.m && s.m.surge && s.m.surge[eff]; return g && g.end > s.t ? g.x : 0; }
  function surgeLeft(s, eff) { var g = s.m && s.m.surge && s.m.surge[eff]; return g && g.end > s.t ? g.end - s.t : 0; }
  function startSurge(s, t) { var eff = D.surge.effect[t.land]; if (!eff || !(D.surge.x > 0) || !(D.surge.mins > 0)) return null; if (!D.surge.reclear && s.m.known && s.m.known[t.key]) return null;
    s.m.surge = s.m.surge || {}; var g = s.m.surge[eff], end = s.t + D.surge.mins * 60;
    s.m.surge[eff] = { x: Math.max(D.surge.x, g && g.end > s.t ? g.x : 0), end: Math.max(end, g ? g.end : 0) }; return eff; }
  function academyOn(s) { return !!(s.m && s.m.academyOn && hasC(s, 'academy')); }
  function smeltMult(s) {
    var m = (s.m.done.smithy ? 1 + D.smithy : 1) * (s.m.done.bellows ? 1 + D.bellowsHouse : 1) * (s.m.done.orefloor ? 1 + D.oreFloor : 1);
    if (s.m.miningDone) m *= 1 + D.miningBoost;
    if (D.easeTiles > 0 && s.m.restored >= D.easeTiles) m *= D.easeX;
    return m * hungry(s);
  }
  function copperMake(s, share) { return (s.jobs.smelter || 0) * D.smeltCopper * smeltMult(s) * (1 + boostOf(s, 'copper') + D.perks.coppercraft.x * perk(s, 'coppercraft')) * (share == null ? 1 : share); }
  function smeltUse(s) { return smeltFuel(s) * (1 + D.perks.coppercraft.use * perk(s, 'coppercraft')); }
  function haulRate(s) { return VC.haulRate(s) * (1 + boostOf(s, 'haul')) * (perk(s, 'practisedHaulers') && s.m.proj && s.m.builtBefore && s.m.builtBefore[s.m.proj.id] ? D.perks.practisedHaulers.x : 1); }
  function smeltFuel(s) { return 1 / (1 + boostOf(s, 'smeltFuel')); }   // hills relics: smelters burn less for the same copper

  // ---------------------------------------------------------------- light
  function effMult(s, b) { var n = mlv(s, 'eff_' + b), bank = enabling(s) ? Math.pow(D.perks.bankedFires.cut, perk(s, 'bankedFires')) : 1, hh = famBuff(s, 'hotHearths');
    if (D.burnEff.rebuild === 2) return { light: Math.pow(D.burnEff.Lx, n) * hh, fuel: Math.pow(D.burnEff.Fx, n) * bank };
    return { light: (D.burnEff.rebuild && D.burnEff.rebuildX ? Math.pow(D.burnEff.rebuildX, rebuildNo(s, 'eff_' + b)) * (1 + D.burnEff.a * n) / Math.pow(2, rebuildNo(s, 'eff_' + b)) : 1 + D.burnEff.a * n) * hh, fuel: (1 + D.burnEff.fuel * n) * bank }; }
  function litBurners(s) { return burnersOn(s, 'firepit') + burnersOn(s, 'limekiln') + burnersOn(s, 'rushlight') + (s.m && s.m.cuOn || 0); }
  function tendMult(s) {
    var kl = famBuff(s, 'keeperLore') * (1 + D.longSong * mlv(s, 'longsong')), bank = D.keeperFuelMap;   // Light Lab v1: long songs strengthen keepers only; keepers burn wood only if keeperFuelMap is on
    if (D.fireTend.on) return { light: (1 + D.fireTend.x * mlv(s, 'ctend') * Math.min(tendCap(s), litBurners(s))) * kl, wood: bank };
    var n = mlv(s, 'ctend'), t = mtier(s, 'ctend'), sp = D.tendTier, base = 1, top = 1 + D.keeperTend.a * sp.L;
    if (t === 1) return { light: 1 + D.keeperTend.a * n, wood: 1 + D.keeperTend.wood * n };
    for (var i = 2; i < t; i++) top = top * sp.J;
    var start = top * sp.dip, end = top * sp.J;
    // wood climbs with each tier too, more slowly than light (converter rule)
    return { light: start + (end - start) * n / sp.L, wood: Math.pow(1 + D.keeperTend.wood * sp.L, t - 1) * (1 + D.keeperTend.wood * n) };
  }
  function tendCap(s) { return D.fireTend.cap + (enabling(s) ? D.fireTend.warden * perk(s, 'fireWarden') : 0); }
  function burnersOn(s, id) { return VC.burnersOn(s, id); }
  function burnDemand(s) {
    var tm = tendMult(s);
    return {
      wood: (s.jobs.firekeeper || 0) * VC.keeperWood(s) * tm.wood + burnersOn(s, 'firepit') * VC.D.firepitWood * effMult(s, 'firepit').fuel + (s.jobs.smelter || 0) * D.smeltWood * smeltUse(s),
      stones: burnersOn(s, 'limekiln') * VC.D.kilnStone * effMult(s, 'limekiln').fuel + (s.jobs.smelter || 0) * D.smeltStone * smeltUse(s),
      fiber: burnersOn(s, 'rushlight') * VC.D.rushFiber * effMult(s, 'rushlight').fuel
    };
  }
  // share of demand met: full while the store has any; otherwise what comes in, shared out equally
  function burnShare(s, r) {
    var d = burnDemand(s)[r]; if (!d) return 1;
    if (s.res[r] > 1e-6) return 1;
    return Math.min(1, jobMake(s, r) / d);
  }
  var RELIC_RAW = { forest: 'wood', hills: 'stones', mountain: 'stones', marsh: 'fiber', meadow: 'food', river: 'food', water: 'food' };
  function tileRelicMode() { return D.relicMode === 'tile'; }
  function anchorFocus(s) { return D.anchor.focus * (1 + D.anchor.craft.a * mlv(s, 'anchorcraft')) * (1 + (enabling(s) ? D.perks.anchorLore.x * perk(s, 'anchorLore') : 0)); }
  function focusMode() { return tileRelicMode() && D.anchor.mode === 'focus'; }
  // a relic's weight: 1, or 1 + focus once an anchor holds it (focus mode)
  function relicWeight(s, n, nAnch) { return n + (focusMode() ? nAnch * anchorFocus(s) : 0); }
  function relicRaw(s, r) {
    if (!tileRelicMode() || D.relic.kind !== 'raw') return 0;
    var L = s.m.relicLand || {}, AL = s.m.relicAnchLand || {}, t = 0;
    for (var land in RELIC_RAW) if (RELIC_RAW[land] === r) t += relicWeight(s, L[land] || 0, AL[land] || 0);
    return D.relic.raw * t;
  }
  function relicMult(s) {
    if (tileRelicMode()) {
      if (D.relic.kind === 'light') return 1 + D.relic.light * (relicWeight(s, s.m.relicsN, s.m.relicAnch || 0) + resW(s));
      if (D.relic.kind === 'land') return 1 + D.landRelic.light * famBuff(s, 'relicLore') * (s.m.relicsN + resW(s));
      var L = s.m.relicLand || {}, AL = s.m.relicAnchLand || {};
      return 1 + D.relic.mountLight * relicWeight(s, L.mountain || 0, AL.mountain || 0);
    }
    if (D.relicMode === 'small') return 1 + D.relicSmall * s.m.restored;
    if (D.relicMode === 'chunky') return 1 + D.relicChunky * s.m.relicsN;
    return 1;
  }
  function glowMult(s) { var n = s.m.glowN || 0; return 1 + D.glow.x * n * (1 + D.glow.cut.a * mlv(s, 'glowcut')) * (1 + (enabling(s) ? D.perks.glowLore.x * perk(s, 'glowLore') : 0)); }
  function anchorLight(s) {
    if (focusMode()) return 0;
    var tot = 0, f = D.anchor.r / 86400 * (1 + D.anchor.craft.a * mlv(s, 'anchorcraft')) * (1 + (enabling(s) ? D.perks.anchorLore.x * perk(s, 'anchorLore') : 0));
    (s.m.anchors || []).forEach(function (a) { if (a.lit) tot += tileCost(MAP.tiles[MAP.idx[a.key]]) * f; });
    return tot;
  }
  // memory: memPct x heartstones^memExp (memExp 1 = straight line; under 1 = each heartstone worth less as the pool grows)
  function memMult(s) { return 1 + D.memPct * Math.pow(s.m.memHS || 0, D.memExp); }
  function phaseMult(s) {
    return (1 + (D.boost.light || 0)) * memMult(s) * regionMult(s) * (1 + beaconStepOf(s) * beaconLv(s)) * relicMult(s);   // Light Lab v1: three multipliers (beacon; relics and regions; memory), nothing else
  }
  function beaconLv(s) { var n = 0; for (var i = 1; i <= 40; i++) if (s.m.done['beacon' + i]) n++; return n; }
  function beaconStepOf(s) { return D.beaconStep + (enabling(s) ? D.perks.beaconFire.x * perk(s, 'beaconFire') : 0); }
  function lightParts(s) {
    var m = VC.lightMult(s) * phaseMult(s), out = [], tm = tendMult(s);
    var S = D.src;
    var sf = D.srcScope === 'phase' ? 1 : S.fire;
    if (s.done.greatfire) out.push(['great', VC.D.greatFire * m * sf]); else out.push(['glow', VC.D.glow * m * sf]);
    var ph = D.srcScope === 'phase', kp = ph ? kPhase(s) : null;   // Light Lab v2: src multiplies only what this phase's ladders add
    var k = s.jobs.firekeeper || 0; if (k) out.push(['keepers', k * VC.keeperLight(s) * (ph ? kp : tm.light * S.keepers) * (D.keeperFuelMap ? burnShare(s, 'wood') : 1) * m]);
    var bgl = famBuff(s, 'brightGlass');
    var b = s.lv.brazier || 0, l = s.lv.lamp || 0;
    if (b || l) out.push(['village lamps', (b * VC.D.brazier + l * (VC.D.lamp + VC.D.lampPerBrazier * b)) * m * (ph ? 1 : S.lamps * bgl)]);
    var cb = mlv(s, 'cbrazier'), cl = mlv(s, 'clamp');
    if (cl || mtier(s, 'clamp') > 1 || cb) out.push(['copper lamps', (cl * (D.lamp.b * Math.pow(D.lamp.J, mtier(s, 'clamp') - 1) + D.cbrazier.lampBonus * cb) + cb * D.cbrazier.b) * m * S.lamps * bgl]);
    [['firepit', 'firepits', VC.D.firepit, 'wood'], ['limekiln', 'kilns', VC.D.limekiln, 'stones'], ['rushlight', 'rushlights', VC.D.rushlight, 'fiber']].forEach(function (x) {
      var on = burnersOn(s, x[0]); if (on) out.push([x[1], on * x[2] * (ph ? bPhase(s, x[0]) : effMult(s, x[0]).light * S.burners) * burnShare(s, x[3]) * m]);
    });
    var cu = s.m.cuOn || 0; if (cu) out.push(['copper burners', cu * D.cuburner.b * effMult(s, 'cuburner').light * (s.m.cuShare == null ? 1 : s.m.cuShare) * m * S.burners]);
    if (false && academyOn(s) && s.jobs.storyteller) out.push(['academy', s.jobs.storyteller * D.academy.b * (1 + D.academy.halls.a * mlv(s, 'halls')) * (1 + (enabling(s) ? D.perks.academyLore.x * perk(s, 'academyLore') : 0)) * m * S.academy]);
    return out;
  }
  // Light Lab v2: keepers' and burners' phase-1 factor, with src on what the phase's ladders add (fire-tending and long songs; rebuilds) and the family perks on the whole
  // (owner 2026-10-16: the family perks carry forward to this phase's lines, but never buff the village's)
  function kPhase(s) { var tm = tendMult(s), kl = famBuff(s, 'keeperLore'); return 1 + D.src.keepers * kl * (tm.light / kl - 1); }
  function bPhase(s, b) { var e = effMult(s, b).light, hh = famBuff(s, 'hotHearths'); return 1 + D.src.burners * hh * (e / hh - 1); }
  function lightRate(s) { return lightParts(s).reduce(function (a, p) { return a + p[1]; }, 0); }
  // the parts that come from the village tail, for the lab: what the village lines alone would give
  function sentRate(s) { return s.m.target ? lightRate(s) * ampMult(s, s.m.target) * (s.m.tiles[s.m.target] ? 1 : masteryMult(s)) : 0; }

  // ---------------------------------------------------------------- projects
  function projNeeds(s) {
    var p = s.m.proj; if (!p) return null;
    var st = projDef(s, p.id).stages[p.stage], left = {};
    for (var k in st.cost) left[k] = Math.max(0, st.cost[k] - (p.got[k] || 0));
    return left;
  }
  function startProject(s, id, front) {
    if (s.m.done[id] || (s.m.proj && s.m.proj.id === id) || s.m.queue.indexOf(id) >= 0) return;
    if (!s.m.proj) { s.m.proj = { id: id, stage: 0, got: {} }; return; }
    if (front) { s.m.queue.unshift(s.m.proj.id); s.m.paused = s.m.paused || {}; s.m.paused[s.m.proj.id] = s.m.proj;
      s.m.proj = s.m.paused[id] || { id: id, stage: 0, got: {} }; delete s.m.paused[id]; }   // r1h fix (owner): a project switched back to keeps what was hauled
    else s.m.queue.push(id);
  }
  // project switching (owner): push a project to the front; the running one pauses with what it has
  function prioritize(s, id) {
    var i = s.m.queue.indexOf(id); if (i < 0) return false;
    s.m.queue.splice(i, 1); startProject(s, id, true); return true;
  }
  function nextProject(s) {
    s.m.proj = null;
    while (s.m.queue.length) {
      var id = s.m.queue.shift(); if (s.m.done[id]) continue;
      s.m.proj = (s.m.paused && s.m.paused[id]) || { id: id, stage: 0, got: {} };
      if (s.m.paused) delete s.m.paused[id];
      return;
    }
  }
  function finishProject(s, id) {
    s.m.done[id] = s.t;
    if (id.indexOf('amp') === 0) { var an = +id.slice(3), a = s.m.amps.find(function (x) { return !x.story && x.n === an; }); if (a) a.lit = true; }   // v1r: by the tower's own build number (the mended tower sits first in the list)
    if (id.indexOf('anchor:') === 0) { var key = id.slice(7), a = (s.m.anchors || []).find(function (x) { return x.key === key; }); if (a) { a.lit = true; var land = MAP.tiles[MAP.idx[key]].land; s.m.relicsSet = s.m.relicsSet || {}; s.m.relicsSet[land] = (s.m.relicsSet[land] || 0) + 1;
      if (tileRelicMode() && s.m.relicT && s.m.relicT[key]) { s.m.relicAnch = (s.m.relicAnch || 0) + 1; s.m.relicAnchLand = s.m.relicAnchLand || {}; s.m.relicAnchLand[land] = (s.m.relicAnchLand[land] || 0) + 1; } } }
    if (id === 'repair') { var t = MAP.tiles.find(function (x) { return x.tag === 'amp'; }); s.m.amps.unshift({ x: t.x, y: t.y, dir: [1, 0], lit: true, story: true }); }
  }
  // click to finish (owner): amplifiers wait for the player to be there
  // tile mode: an anchor takes its own tile's relic
  function relicFreeKey(s, key) { return tileRelicMode() ? !!(s.m.relicT && s.m.relicT[key]) : relicFree(s, MAP.tiles[MAP.idx[key]].land) >= 1; }
  function relicFree(s, land) { return (s.m.relics[land] || 0) - ((s.m.relicsSet && s.m.relicsSet[land]) || 0); }
  function clickFinish(s) {
    if (!s.m.awaitClick) return false;
    if (s.m.awaitClick.indexOf('anchor:') === 0 && D.anchor.needRelic && !relicFreeKey(s, s.m.awaitClick.slice(7))) return false; finishProject(s, s.m.awaitClick); s.m.log.push([s.t, 'lit', s.m.awaitClick]); s.m.awaitClick = null; return true; }

  // the broken tower (v1g): found on the map; once its place is back, its card offers the repair, a hauled project, lit with a click
  var RUIN = MAP.tiles.filter(function (t) { return t.tag === 'amp'; })[0] || null;
  function ruinKey() { return RUIN ? RUIN.key : null; }
  function repairOpen(s) { return !!RUIN && !!s.m.tiles[RUIN.key] && !s.m.done.repair && s.m.awaitClick !== 'repair' && !(s.m.proj && s.m.proj.id === 'repair') && s.m.queue.indexOf('repair') < 0; }
  function repairStarted(s) { return !!RUIN && (!!s.m.done.repair || s.m.awaitClick === 'repair' || !!(s.m.proj && s.m.proj.id === 'repair') || s.m.queue.indexOf('repair') >= 0); }
  function repairAmp(s) { if (!repairOpen(s)) return false; startProject(s, 'repair'); return true; }

  // ---------------------------------------------------------------- tiles
  // the light store (restored from v24e): with no place picked, light saves up to an hour of output, and pours into the next place picked
  function poolCap(s) { return 3600 * Math.max(1, lightRate(s)); }
  function setTarget(s, key) {
    if (!key) { s.m.target = null; s.m.mreg = null; return true; }
    var t = MAP.tiles[MAP.idx[key]]; if (!t || !reachable(s, t) || s.m.rbReady) return false;   // the rebirth branch: past the milestone the land beyond waits
    s.m.target = key; s.m.mreg = null; s.m.lineup = (s.m.lineup || []).filter(function (k) { return k !== key; });
    if (s.m.pool > 0) { s.m.got[key] = (s.m.got[key] || 0) + s.m.pool * ampMult(s, key) * masteryMult(s); s.m.pool = 0; }
    return true;
  }
  // scouting: how many rings past the places beside your land you can see (Reading the dark 1, Far sight 2)
  function scoutDepth(s) { var n = 0; CARDS.forEach(function (c) { if (c.scout && s.m.cards[c.id]) n = Math.max(n, c.scout); }); return n; }
  var seenCache = { sig: '', set: {} };
  function seenTiles(s) {   // key -> rings out from your land (1 = beside it), for dark places within sight
    var depth = 1 + scoutDepth(s), sig = depth + ':' + s.m.restored + ':' + Object.keys(s.m.tiles).length + ':' + s.m.t0;
    if (seenCache.sig === sig) return seenCache.set;
    var out = {}, front = [];
    MAP.tiles.forEach(function (t) { if (restored(s, t.key)) front.push(t); }); front.push({ x: 0, y: 0, key: '0,0' });
    for (var d = 1; d <= depth; d++) { var nx = [];
      front.forEach(function (t) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var k = (t.x + o[0]) + ',' + (t.y + o[1]), i = MAP.idx[k]; if (i == null || restored(s, k) || out[k]) return; out[k] = d; nx.push(MAP.tiles[i]); }); });
      front = nx; }
    seenCache = { sig: sig, set: out }; return out;
  }
  // the light burst: 30 s of your light (a minute with Pack frames), sent to the place you call back (or into the store); then a trip before the next
  function burstStep(s) { var t = s.m.target ? MAP.tiles[MAP.idx[s.m.target]] : null; return t ? t.dstep : 1; }
  function burstLight(s) { return D.burst.secs * (s.m.cards.packs ? 2 : 1) * lightRate(s) * (s.m.target ? ampMult(s, s.m.target) : 1); }
  function burstCost(s) { return { wood: D.burst.wood, food: Math.ceil(D.burst.food * Math.pow(D.burst.foodG, burstStep(s))) }; }
  function burstTrip(s) { return Math.round((D.burst.tripBase + D.burst.tripStep * burstStep(s)) * (s.m.cards.waystations ? 0.5 : 1)); }
  function burstReady(s) { return !!s.cards.stoking && !(s.m.trip > 0); }
  function burst(s) {
    if (!burstReady(s)) return 0; var c = burstCost(s); if (!VC.canPay(s, c)) return 0;
    var L = burstLight(s), trip = burstTrip(s); for (var k in c) s.res[k] -= c[k]; spend(s, 'burst', c);
    if (s.m.target && s.m.tiles[s.m.target]) { var bt = MAP.tiles[MAP.idx[s.m.target]]; s.m.mast = s.m.mast || {}; var bt0 = mTier(s, bt.key); s.m.mast[bt.key] = mClears(s, bt.key) + L / mClearCost(bt); s.m.mastN = (s.m.mastN || 0) + 1; var bt1 = mTier(s, bt.key);   // the rebirth branch: a burst into mastery
      if (bt1 > bt0) { var bev = s.m.evPending = s.m.evPending || []; bev.push(['mastery', bt.key, bt1]); if (bt1 >= D.mastery.tiers || s.m.mreg != null) afterMastery(s, bev); } }
    else if (s.m.target) s.m.got[s.m.target] = (s.m.got[s.m.target] || 0) + L * masteryMult(s); else s.m.pool = Math.min(poolCap(s) + L, (s.m.pool || 0) + L);
    s.m.trip = trip; s.m.bursts = (s.m.bursts || 0) + 1; return L;
  }
  // the line-up: places to call back next, in order. A place can be lined up if it touches your land, the place you call back, or a place already lined up
  function lineupMax(s) { var n = 0; CARDS.forEach(function (c) { if (c.lineup && s.m.cards[c.id]) n = Math.max(n, c.lineup); }); if (perk(s, 'longSight')) n = Math.max(n, 8); return n; }
  function lineupOk(s, key) {
    var t = MAP.tiles[MAP.idx[key]]; if (!t || restored(s, key) || s.m.target === key) return false;
    var lu = s.m.lineup || []; if (lu.indexOf(key) >= 0) return false;
    if (reachable(s, t)) return true;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var k = (t.x + d[0]) + ',' + (t.y + d[1]); return k === s.m.target || lu.indexOf(k) >= 0; });
  }
  function lineupAdd(s, key) { if (!lineupOk(s, key) || (s.m.lineup || []).length >= lineupMax(s)) return false; (s.m.lineup = s.m.lineup || []).push(key); return true; }
  function lineupRemove(s, key) { var lu = s.m.lineup || [], i = lu.indexOf(key); if (i < 0) return false; lu.splice(i, 1); return true; }
  // the next place to call back: the first lined-up place you can reach (places already back drop out), else Waymarks' cheapest
  function nextTarget(s) {
    if (s.m.rbReady) return null;
    var lu = s.m.lineup = (s.m.lineup || []).filter(function (k) { return !restored(s, k); });
    for (var i = 0; i < lu.length; i++) { var t = MAP.tiles[MAP.idx[lu[i]]]; if (t && reachable(s, t)) return lu[i]; }
    return perk(s, 'waymarks') ? cheapestTarget(s) : null;
  }
  // for the bot: fill the line-up with the cheapest places, as a player planning ahead would
  function lineupAuto(s) {
    var max = lineupMax(s), guard = 0;
    while ((s.m.lineup || []).length < max && guard++ < 20) {
      var best = null, bc = Infinity;
      nearTiles(s).forEach(function (t) { if (!lineupOk(s, t.key)) return; var c = tileCost(t, s) / ampMult(s, t.key); if (c < bc) { bc = c; best = t.key; } });
      if (!best) break; s.m.lineup.push(best);
    }
  }
  function cheapestTarget(s) {
    var best = null, bc = Infinity;
    nearTiles(s).forEach(function (t) { if (!reachable(s, t)) return; var c = (tileCost(t, s) - (s.m.got[t.key] || 0)) / ampMult(s, t.key); if (c < bc) { bc = c; best = t.key; } });
    return best;
  }
  function restoreTile(s, t, ev) {
    s.m.tiles[t.key] = s.t; s.m.restored++; if (t.step > (s.m.maxStep || 0)) s.m.maxStep = t.step;
    if (t.tag === 'mining') s.m.miningDone = true;
    var rg = REGIONS[t.region]; if (rg && rg.tiles.every(function (k) { return s.m.tiles[k]; })) { s.m.regionsDone = (s.m.regionsDone || 0) + 1; (s.m.regionList = s.m.regionList || []).push([s.t, rg.i]); }
    s.m.pending += t.land === 'river' ? D.riverSettlers : 1;
    if (t.tag === 'copper') { s.m.copperFound = true; s.res.copper += 1; s.m.smelting = true; ev.push(['copper']); }
    var sg = startSurge(s, t); if (sg) ev.push(['surge', t.key, sg]);
    ev.push(['restored', t.key]);
    // the rebirth branch: once whole, memory grows as new land comes back; before that, the run's milestone holds the land beyond
    if (s.m.whole && !s.m.known[t.key]) { s.m.known[t.key] = true; s.m.memHS = (s.m.memHS || 0) + hsFor(t.dstep); }
    if (s.m.rbAt && s.m.restored >= s.m.rbAt && !s.m.rbReady) { s.m.rbReady = s.t || 1e-6; ev.push(['rebirth', s.m.run]); }
  }

  // ---------------------------------------------------------------- room and settlers
  function hsFor(step) { return step <= D.hs.kick ? 1 : Math.pow(D.hs.G, step - D.hs.kick); }
  function heartstones(s) { var n = 0; for (var k in s.m.tiles) n += hsFor(MAP.tiles[MAP.idx[k]].dstep); return n; }
  function perk(s, id) { return (s.m && s.m.perks && s.m.perks[id]) || 0; }
  // ---------------------------------------------------------------- the rebirth branch (dial set R1; Considering, 2026-10-18)
  // the gifts a run holds: every packet from the rebirths before it (packet i comes with rebirth i+1), each comfort at its highest level
  function giftsFor(run) {
    var g = {}; if (!D.rb.on) return g;
    for (var i = 0; i < Math.min(run - 1, D.rb.packets.length); i++) { var p = D.rb.packets[i]; for (var id in p) g[id] = Math.max(g[id] || 0, p[id]); }
    return g;
  }
  // a run's perk levels: the heartstone perks bought, plus its gifts
  function prPerks(pr) {
    var lv = pr && pr.perks ? JSON.parse(JSON.stringify(pr.perks)) : {};
    if (pr && D.rb.on) { var g = giftsFor(pr.run || 1); for (var id in g) lv[id] = Math.max(lv[id] || 0, g[id]); }
    return lv;
  }
  // the milestone that ends run n (null once the self is whole, or with the branch off)
  function rbAt(run) { return D.rb.on && run <= D.rb.last ? D.rb.at[Math.min(run, D.rb.at.length) - 1] : null; }
  // how far the self is remembered, 0..1: one share for each rebirth taken
  function wholeShare(run) { return D.rb.on ? Math.min(1, (run - 1) / D.rb.last) : 0; }
  // the last rebirth: nothing resets. Memory takes in every heartstone, perks are what the player chose, and from now on
  // memory grows as new land comes back; mastery and the merchant open.
  function becomeWhole(s, hsLife, perks, now) {
    s.m.memHS = hsLife; s.m.perks = prPerks({ perks: perks, run: D.rb.last + 1 }); s.m.run = D.rb.last + 1; s.m.rbAt = null; s.m.rbReady = 0; s.m.whole = true;
    for (var k in s.m.tiles) s.m.known[k] = true;
    s.m.wholeAt = s.t; return true;
  }
  function perkSpentOf(lv) { var t = 0; for (var id in lv) { if (!D.perks[id] || D.perks[id].kind === 'comfort') continue; for (var i = 0; i < lv[id]; i++) t += perkCost(id, i); } return t; }
  // ---------------------------------------------------------------- mastery
  function masteryOn(s) { return !!(D.mastery.on && s.m && s.m.whole && s.m.cards.mastery); }   // r1i: opened by its research
  function mClears(s, key) { return (s.m.mast && s.m.mast[key]) || 0; }
  function mTierAt(t) { return D.mastery.need ? D.mastery.need[t - 1] : Math.pow(D.mastery.base, t); }   // clears for tier t (1-based)
  function mTierOf(c) { var t = 0; while (t < D.mastery.tiers && c >= mTierAt(t + 1) - 1e-9) t++; return t; }
  function mTier(s, key) { return mTierOf(mClears(s, key)); }
  function mNeed(s, key) { var t = mTier(s, key); return t >= D.mastery.tiers ? 0 : mTierAt(t + 1); }   // clears needed for the next tier (counting from zero)
  function mClearCost(t) { return D.C1 * Math.pow(D.F, t.dstep - 1) * (t.dmul != null ? t.dmul : D.terrain[t.land] || 1); }   // a clear: the place's full darkness, no paved path
  var MP_CACHE = { k: '', v: 0 };
  function masteryPoints(s) {
    var key = (s.m.mastN || 0) + '|' + s.m.restored; if (MP_CACHE.s === s.m && MP_CACHE.k === key) return MP_CACHE.v;
    var p = 0; if (s.m.mast) for (var k in s.m.mast) { var tr = mTierOf(s.m.mast[k]); if (tr) p += tr * mPointsOf(MAP.tiles[MAP.idx[k]]); }
    MP_CACHE = { s: s.m, k: key, v: p }; return p;
  }
  function mPointsOf(t) { return D.mastery.weight === 'hs' ? hsFor(t.dstep) : 1; }   // what one tier on this place adds to mastery
  function masteryMultAt(p) { return D.mastery.weight === 'hs' ? 1 + p / D.mastery.k : 1 + D.mastery.per * p; }
  function masteryMult(s) { return masteryOn(s) ? masteryMultAt(masteryPoints(s)) : 1; }
  function canMaster(s, key) { return masteryOn(s) && !!s.m.tiles[key] && mTier(s, key) < D.mastery.tiers; }
  // a region's places still to master, the least mastered first
  function regionToMaster(s, ri) {
    var rg = REGIONS[ri]; if (!rg) return [];
    return rg.tiles.filter(function (k) { return canMaster(s, k); }).sort(function (a, b) { return mClears(s, a) - mClears(s, b) || tileCost(MAP.tiles[MAP.idx[a]]) - tileCost(MAP.tiles[MAP.idx[b]]); });
  }
  function regionMastery(s, ri) {   // 0..1: the region's share of all its tiers
    var rg = REGIONS[ri]; if (!rg) return 0; var got = 0;
    var back = rg.tiles.filter(function (k) { return !!s.m.tiles[k]; }); if (!back.length) return 0;
    back.forEach(function (k) { got += mTier(s, k); }); return got / (back.length * D.mastery.tiers);   // of the places called back
  }
  function masterPlace(s, key) { if (!canMaster(s, key)) return false; s.m.target = key; s.m.mreg = null; return true; }
  function masterRegion(s, ri) { var l = regionToMaster(s, ri); if (!l.length) return false; s.m.mreg = ri; s.m.target = l[0]; return true; }
  // when a mastery target is done (its next tier, in a region; its last tier alone): the region's next place, else back to new land
  function afterMastery(s, ev) {
    if (s.m.mreg != null) { var l = regionToMaster(s, s.m.mreg); if (l.length) { s.m.target = l[0]; return; } ev.push(['regionMastered', s.m.mreg]); s.m.mreg = null; }
    s.m.target = null; var nk = nextTarget(s); if (nk) { setTarget(s, nk); ev.push(['next', nk]); }
  }
  // ---------------------------------------------------------------- the merchant (clock: real seconds in the game, s.t in the lab)
  function merchantArrive(s, now) {
    // r1i: his clock starts when his research is learned
    if (!D.merchant.on || !s.m.whole || !s.m.cards.traveler) return false; var M = s.m.merch; if (!M) M = s.m.merch = { next: now + D.merchant.first, here: false, visits: 0 };
    if (!M.here && now >= M.next) { M.here = true; M.came = now; return true; } return false;
  }
  function merchantHere(s) { return !!(s.m && s.m.merch && s.m.merch.here); }
  function merchantLeave(s, now) { var M = s.m.merch; if (!M) return false; M.here = false; M.visits = (M.visits || 0) + 1; M.next = now + D.merchant.every; return true; }
  // a heartstone perk bought now (from the merchant): it works at once
  function buyPerkNow(s, id, free) {
    var p = D.perks[id]; if (!p || p.kind === 'comfort' || (p.needs && !sysHeld(p.needs, s.m.perks))) return false; var n = perk(s, id); if (n >= perkMax(id)) return false;
    var c = perkCost(id, n); if (c > free) return false; s.m.perks[id] = n + 1; return c;
  }
  // Light Lab v1 (owner): memory and the family buff perks reach the village (the village has no other prestige term)
  function villagePrestige(pr) {
    if (!pr) return null;
    if (!D.villageReach) return null; var lv = prPerks(pr), P = D.perks;
    var fb = function (id) { var n = lv[id] || 0, x = P[id].x; return D.perkCompound ? Math.pow(1 + x, n) : 1 + x * n; };
    var sh = lv.sureHands || 0, od = lv.openDoors || 0, built = {}; (pr.built || []).forEach(function (k) { built[k] = true; });
    var vf = D.srcScope === 'phase' ? function () { return 1; } : fb;   // Light Lab v2 (owner): the family perks don't buff the village; memory still does
    return { all: 1 + D.memPct * Math.pow(pr.hs || 0, D.memExp), keepers: vf('keeperLore'), lamps: vf('brightGlass'), burners: vf('hotHearths'),
      hand: sh ? P.sureHands.hand[sh - 1] : 1, startPop: od ? P.openDoors.pop[od - 1] : 0, doorCards: od ? (D.rb.on ? ['foraging', 'shelters'] : ['foraging']) : [], doorShelters: od && D.rb.on ? doorShelters(P.openDoors.pop[od - 1]) : 0, built: built, haulX: lv.practisedHaulers ? P.practisedHaulers.x : 1,
      // v1q (owner's playtest): the raw crafts and research work in the village too; The village complete builds its projects at once
      raw: { wood: 1 + P.woodcraft.x * (lv.woodcraft || 0), stones: 1 + P.stonecraft.x * (lv.stonecraft || 0), fiber: 1 + P.fibercraft.x * (lv.fibercraft || 0), ideas: 1 + P.scholarLore.x * (lv.scholarLore || 0) },
      instant: !!lv.villageComplete,
      // r1f: Old lessons reaches the village's research (learned in an earlier run: half, then a quarter)
      oldL: lv.oldLessons ? { f: P.oldLessons.f[Math.min(lv.oldLessons, P.oldLessons.f.length) - 1], known: (pr.vcards || []).reduce(function (o, k) { o[k] = true; return o; }, {}) } : null };
  }
  // r1c (owner, 2026-10-18): starting with settlers brings the shelters to house them
  function doorShelters(pop) { var L = VC.LAD.shelter; return Math.max(0, Math.min(L.max, Math.ceil((pop - VC.room(VC.fresh())) / L.room))); }
  // r1c (owner, 2026-10-18): The village stands wakes with at least this much of the village built (levels; 'max' is the ladder's last)
  function villageStand(v) {
    var F = D.rb.stand || {}; v.lv = v.lv || {}; v.cards = v.cards || {};
    for (var id in F) { var L = VC.LAD[id]; if (!L) continue; var n = F[id] === 'max' ? L.max : F[id] === 'half' ? Math.floor(L.max / 2) : F[id];
      if ((v.lv[id] || 0) < n) v.lv[id] = n;
      VC.CARDS.forEach(function (c) { if (c.opens && [].concat(c.opens).indexOf(id) >= 0) v.cards[c.id] = true; }); }
    return v;
  }
  function enabling(s) { return !s.m.noEnabling; }
  function beaconMaxOf(s) { return D.beaconMax; }
  // v1h (owner 2026-10-13): unlocks pushed back; beaconAt pins a beacon upgrade's tile gate (the lens at 12), the rest follow the spacing
  function beaconGate(s, n) { var at = D.beaconAt && D.beaconAt[n]; return at != null ? Math.round(at * (enabling(s) ? Math.pow(D.perks.beaconSurvey.cut, perk(s, 'beaconSurvey')) : 1)) : Math.round(3 + (n - 1) * beaconEveryOf(s)); }
  function beaconEveryOf(s) { return D.beaconEvery * (enabling(s) ? Math.pow(D.perks.beaconSurvey.cut, perk(s, 'beaconSurvey')) : 1); }
  function ampMaxOf(s) { return D.ampMax + (enabling(s) ? perk(s, 'ampSites') : 0); }
  function cutG(g, n, f) { return 1 + (g - 1) * Math.pow(f, n); }
  function directMult(s) { return 1; }
  function famBuff(s, id) { var n = enabling(s) ? perk(s, id) : 0, x = D.perks[id].x; return D.perkCompound ? Math.pow(1 + x, n) : 1 + x * n; }   // Light Lab v1: Kindled cut (owner: it merges into memory, which stays capped)
  function perkCost(id, lv) { var p = D.perks[id]; if (p.costs) return lv < p.costs.length ? p.costs[lv] : Infinity; return Math.ceil(p.base * Math.pow(p.g, lv)); }
  function perkMax(id) { var p = D.perks[id]; return p.costs ? p.costs.length : p.max; }
  function cardCost(s, c) {
    var ol = perk(s, 'oldLessons'); if (ol && s.m.knownCards && s.m.knownCards[c.id]) { var o = {}, f = D.perks.oldLessons.f[Math.min(ol, D.perks.oldLessons.f.length) - 1]; for (var k in c.cost) o[k] = Math.ceil(c.cost[k] * f); return o; }
    return c.cost;
  }
  function room(s) { return VC.room(s) + D.houseRoom * mlv(s, 'house') + (s.m.done.hall ? D.hallRoom : 0); }

  // ---------------------------------------------------------------- automation while away
  function awayHours(s) { return s.m.away; }
  function stewardsOn(s) { return hasC(s, 'autostore') || (perk(s, 'stewardsKept') && s.m.restored >= 1); }
  // v1r (owner, 2026-10-16): stewards buy one stockpile when a store that stockpiles hold is full and one is affordable, away or not.
  // (v1q's Tidy stores comfort did the same and is gone; the old top-up when leaving stays behind the dial for the lab.)
  function autoStore(s, away) {
    if (!stewardsOn(s)) return 0;
    if (D.stewards === 'atCap') {
      var mats = ['wood', 'stones', 'fiber'].concat(hasC(s, 'cubins') ? ['copper'] : []);
      if (!mats.some(function (r) { return s.res[r] >= cap(s, r) - 1e-6; })) return 0;
      var c = levelCost(s, 'stockpile'); if (!c || !VC.canPay(s, c)) return 0;
      for (var k in c) s.res[k] -= c[k]; spend(s, 'storage', c); s.lv.stockpile = (s.lv.stockpile || 0) + 1; s.m.autoBuys++; return 1;
    }
    if (away === false) return 0;
    var hrs = D.autoStoreHours || awayHours(s), bought = 0;
    ['wood', 'stones', 'fiber', 'copper'].forEach(function (r) {
      if (r === 'copper' && (!hasC(s, 'cubins') || !hasC(s, 'autostore'))) return;   // Light Lab v2: Stewards kept is raw only
      var inc = (r === 'copper' ? copperMake(s) : jobMake(s, r)) * 3600 * hrs;
      var guard = 0;
      while (cap(s, r) < inc && guard++ < 5) {
        var c = levelCost(s, 'stockpile'); if (!VC.canPay(s, c)) break;
        for (var k in c) s.res[k] -= c[k]; spend(s, 'storage', c); s.lv.stockpile = (s.lv.stockpile || 0) + 1; bought++;
      }
    });
    s.m.autoBuys += bought; return bought;
  }

  // ---------------------------------------------------------------- tick
  function tick(s, dt, away) {
    var ev = []; if (s.m && s.m.evPending && s.m.evPending.length) { ev = s.m.evPending; s.m.evPending = []; }   // events from between ticks (a burst into mastery)
    s.t += dt;
    if (s.feast > 0) s.feast = Math.max(0, s.feast - dt);
    // overflow: while away, burners burn only what sits above 80% of a store
    if (away && D.overflowOn && hasC(s, 'overflow')) ['firepit', 'limekiln', 'rushlight'].forEach(function (id) {
      var n = s.lv[id] || 0, r = VC.LAD[id].burns; s.on[id] = s.res[r] > cap(s, r) * D.overflowAt ? n : 0;
    });
    if (s.m.trip > 0) s.m.trip = Math.max(0, s.m.trip - dt);
    // light into the target tile
    var L = lightRate(s), sent = 0;
    if (s.m.target && s.m.tiles[s.m.target]) {   // the rebirth branch: mastery, light into a place already back
      var mt = MAP.tiles[MAP.idx[s.m.target]], mc0 = mClears(s, mt.key), tr0 = mTierOf(mc0);
      if (!masteryOn(s) || tr0 >= D.mastery.tiers) { s.m.target = null; afterMastery(s, ev); }
      else {
        sent = L * ampMult(s, mt.key) * dt; s.m.mast = s.m.mast || {};
        var mc1 = mc0 + sent / mClearCost(mt), tr1 = mTierOf(mc1); s.m.mast[mt.key] = mc1; s.m.mastLight = (s.m.mastLight || 0) + L * dt;
        if (tr1 > tr0) { s.m.mastN = (s.m.mastN || 0) + 1; ev.push(['mastery', mt.key, tr1]);
          if (tr1 >= D.mastery.tiers || s.m.mreg != null) afterMastery(s, ev); }
      }
    } else if (s.m.target) {
      var t = MAP.tiles[MAP.idx[s.m.target]], need = tileCost(t, s);
      sent = L * ampMult(s, t.key) * masteryMult(s) * dt;
      s.m.got[t.key] = (s.m.got[t.key] || 0) + sent;
      if (s.m.got[t.key] >= need) {
        var spill = (s.m.got[t.key] - need) / (ampMult(s, t.key) * masteryMult(s));
        restoreTile(s, t, ev); s.m.target = null; s.m.got[t.key] = need;
        s.m.pool = Math.min(poolCap(s), (s.m.pool || 0) + spill);   // what spilled over waits in the store
        var nk = nextTarget(s); if (nk) { setTarget(s, nk); ev.push(['next', nk]); }
      }
    } else { var room0 = Math.max(0, poolCap(s) - (s.m.pool || 0)), keep = Math.min(room0, L * dt); s.m.pool = (s.m.pool || 0) + keep; s.m.wasted += L * dt - keep; }
    s.m.made.light += L * dt;
    // production, burning, eating, smelting
    var hf = hungry(s), bd = burnDemand(s);
    var share = { wood: burnShare(s, 'wood'), stones: burnShare(s, 'stones'), fiber: burnShare(s, 'fiber') };
    var smeltShare = Math.min(share.wood, share.stones);
    var cu = copperMake(s, smeltShare) * dt; s.res.copper += cu; s.m.made.copper += cu;
    var cuUse = (s.m.cuOn || 0) * D.cuburner.use * effMult(s, 'cuburner').fuel * dt;
    if (cuUse > 0) { var paid = Math.min(cuUse, s.res.copper); s.res.copper -= paid; s.m.cuShare = paid / cuUse; s.m.cuBurned = (s.m.cuBurned || 0) + paid; } else s.m.cuShare = 1;
    var cuCap = cap(s, 'copper'); if (s.res.copper > cuCap) { s.m.cuLost = (s.m.cuLost || 0) + s.res.copper - cuCap; s.res.copper = cuCap; }
    var gc = s.jobs.glowcrafter || 0;
    if (gc && hasC(s, 'glowcraft')) {
      var gs = Math.min(1, s.res.stones / Math.max(1e-9, gc * D.glow.stone * dt), s.res.food / Math.max(1e-9, gc * D.glow.food * dt));
      s.res.stones -= gc * D.glow.stone * dt * gs; s.res.food -= gc * D.glow.food * dt * gs; spend(s, 'glowstones', { stones: gc * D.glow.stone * dt * gs, food: gc * D.glow.food * dt * gs });
      s.m.glowProg = (s.m.glowProg || 0) + gc * D.glow.rate * dt * gs * hungry(s);
      var need = D.glow.first * Math.pow(D.glow.g, s.m.glowN || 0);
      while (s.m.glowProg >= need) { s.m.glowProg -= need; s.m.glowN = (s.m.glowN || 0) + 1; ev.push(['glowstone', s.m.glowN]); need = D.glow.first * Math.pow(D.glow.g, s.m.glowN); }
    }
    ['wood', 'stones', 'fiber', 'food', 'ideas', 'snails'].forEach(function (r) {
      var make = jobMake(s, r) + (r === 'ideas' ? VC.D.fireIdeas : 0) + (r === 'snails' && s.cards.snails ? VC.snailRate(s) : 0);
      var use = (bd[r] || 0) * (share[r] || 1) + (r === 'food' ? s.pop * eatRate(s) : 0);
      addRes(s, r, (make - use) * dt);
      s.stats.made[r] = (s.stats.made[r] || 0) + make * dt;
    });
    // haulers take after production, shared across what the stage still needs
    var hauled = {};
    if (s.m.proj && !s.m.awaitClick) {
      var carry = haulRate(s) * dt, need0 = projNeeds(s);
      for (var pass = 0; pass < 4 && carry > 1e-9; pass++) {
        var keys = Object.keys(need0).filter(function (k) { return need0[k] > 1e-9 && s.res[k] > 1e-9; });
        var tot = keys.reduce(function (a, k) { return a + need0[k]; }, 0); if (!tot) break;
        var used = 0;
        keys.forEach(function (k) { var take = Math.min(carry * need0[k] / tot, s.res[k], need0[k]); s.res[k] -= take; need0[k] -= take; s.m.proj.got[k] = (s.m.proj.got[k] || 0) + take; used += take; hauled[k] = (hauled[k] || 0) + take; var o = {}; o[k] = take; spend(s, 'projects', o); });
        carry -= used; if (used < 1e-12) break;
      }
      var left = 0, nd = projNeeds(s); for (var k2 in nd) left += nd[k2];
      if (left <= 1e-6) {
        var pd = projDef(s, s.m.proj.id);
        if (s.m.proj.stage + 1 < pd.stages.length) { s.m.proj.stage++; s.m.proj.got = {}; ev.push(['stage', pd.id]); }
        else if (pd.id.indexOf('amp') === 0 || pd.id.indexOf('anchor:') === 0 || pd.id === 'repair') { s.m.awaitClick = pd.id; ev.push(['await', pd.id]); nextProject(s); }
        else { finishProject(s, pd.id); ev.push(['built', pd.id]); nextProject(s); }
      }
    }
    // what was carried a second, smoothed over a few seconds so the rates don't flicker
    if (!away && dt > 0) { var hn = s.m.haulNow = s.m.haulNow || {}, a0 = Math.min(1, dt / 4); ['wood', 'stones', 'fiber', 'food', 'copper'].forEach(function (k) { hn[k] = (hn[k] || 0) * (1 - a0) + ((hauled[k] || 0) / dt) * a0; if (hn[k] < 1e-6) hn[k] = 0; }); }
    // settlers sent by restored places move in when there's room
    while (s.m.pending > 0 && s.pop < room(s)) { s.pop++; s.m.pending--; ev.push(['arrive', s.pop]); }
    if (away || D.stewards === 'atCap') autoStore(s, !!away);
    return ev;
  }

  // ---------------------------------------------------------------- actions
  function buyCard(s, id) {
    var c = CARD[id]; if (!c || !cardAvail(s, c)) return false; var cc = cardCost(s, c); if (!VC.canPay(s, cc)) return false;
    for (var k in cc) s.res[k] -= cc[k]; spend(s, 'cards', cc);
    s.m.cards[id] = true; if (c.away) s.m.away = Math.max(s.m.away, c.away);
    if (c.project) startProject(s, c.project);
    s.stats.buys.push([s.t, 'mcard', id]); return true;
  }
  function buyLevel(s, id) {
    if (!levelOpen(s, id) || levelMaxed(s, id)) return false;
    var c = levelCost(s, id); if (!VC.canPay(s, c)) return false;
    for (var k in c) s.res[k] -= c[k]; spend(s, sinkOf(id), c);
    if (VC.LAD[id]) { s.lv[id] = (s.lv[id] || 0) + 1; if (VC.LAD[id].burns) s.on[id] = (s.on[id] == null ? s.lv[id] : s.on[id] + 1); }
    else { s.m.lv[id] = MLAD[id] && MLAD[id].burner && D.burnEff.rebuild ? rebuildTo(mlv(s, id)) : mlv(s, id) + 1; if (id === 'cuburner') s.m.cuOn = (s.m.cuOn || 0) + 1; }   // r1f (owner): a copper burner is lit when it is built
    s.stats.buys.push([s.t, 'level', id]); return true;
  }
  function tierUp(s, id) {
    if (!tierUpAvail(s, id)) return false; var c = tierUpCost(s, id); if (!VC.canPay(s, c)) return false;
    for (var k in c) s.res[k] -= c[k]; spend(s, sinkOf(id), c); s.m.tier[id] = mtier(s, id) + 1; s.m.lv[id] = 1;
    s.stats.buys.push([s.t, 'tier', id]); return true;
  }
  function buyRelic(s, land) {
    if (tileRelicMode()) {
      var key = land, t = MAP.tiles[MAP.idx[key]]; if (!t || !s.m.tiles[key] || (s.m.relicT && s.m.relicT[key])) return false;
      var ct = relicCost(s, key); if (!VC.canPay(s, ct)) return false;
      for (var k0 in ct) s.res[k0] -= ct[k0]; spend(s, 'relics', ct);
      s.m.relicT = s.m.relicT || {}; s.m.relicT[key] = s.t; s.m.relicsN++; s.m.relicLand = s.m.relicLand || {}; s.m.relicLand[t.land] = (s.m.relicLand[t.land] || 0) + 1;
      var an = (s.m.anchors || []).find(function (a) { return a.key === key && a.lit; });
      if (an) { s.m.relicAnch = (s.m.relicAnch || 0) + 1; s.m.relicAnchLand = s.m.relicAnchLand || {}; s.m.relicAnchLand[t.land] = (s.m.relicAnchLand[t.land] || 0) + 1; }
      s.stats.buys.push([s.t, 'relic', key]); return true;
    }
    if (D.relicMode !== 'chunky') return false;
    var have = s.m.relics[land] || 0; if (Math.floor(landCount(s, land) / D.relicEvery) <= have) return false;
    var c = relicCost(s); if (!VC.canPay(s, c)) return false;
    for (var k in c) s.res[k] -= c[k]; spend(s, 'relics', c); s.m.relics[land] = have + 1; s.m.relicsN++;
    s.stats.buys.push([s.t, 'relic', land]); return true;
  }
  function relicCost(s, key) {
    if (tileRelicMode()) { var t = MAP.tiles[MAP.idx[key]], rf = perk(s, 'relicsRemembered') && s.m.relicKnown && s.m.relicKnown[key] ? D.perks.relicsRemembered.f : 1;
      return { copper: Math.ceil(D.relic.copper * Math.pow(D.relic.stepG, (t ? t.dstep : 1) - 1) * Math.pow(D.relic.nG, s.m.relicsN) * rf) }; }
    return { copper: Math.ceil(D.relicCopper * Math.pow(D.relicGrowth, s.m.relicsN)) };
  }
  function relicsOpen(s) {
    if (tileRelicMode()) return Object.keys(s.m.tiles).filter(function (k) { return !(s.m.relicT && s.m.relicT[k]); });
    if (D.relicMode !== 'chunky') return []; return Object.keys(D.terrain).filter(function (land) { return Math.floor(landCount(s, land) / D.relicEvery) > (s.m.relics[land] || 0); }); }
  // plan an anchor on a restored tile; it can be finished only once a relic of that land is free to set in it
  function planAnchor(s, key) {
    if (!hasC(s, 'anchors') || !s.m.tiles[key]) return false;
    s.m.anchors = s.m.anchors || [];
    if (s.m.anchors.some(function (a) { return a.key === key; })) return false;
    s.m.anchors.push({ key: key, lit: false }); startProject(s, 'anchor:' + key); return true;
  }
  // v1r: saves from before the fix may hold a finished tower that never lit
  function repairAmps(s) { var n = 0; (s.m.amps || []).forEach(function (a) { if (!a.story && !a.lit && s.m.done['amp' + a.n]) { a.lit = true; n++; } }); return n; }
  function planAmp(s, x, y, dir) {
    if (!hasC(s, 'amps')) return false;
    var built = s.m.amps.filter(function (a) { return !a.story; }).length; if (built >= ampMaxOf(s)) return false;
    if (!restored(s, x + ',' + y)) return false;
    var n = built; s.m.amps.push({ x: x, y: y, dir: dir, lit: false, n: n });
    startProject(s, 'amp' + n); return true;
  }
  // r1d (owner: the village and the map keep one rule): gathering by hand works as in the village. Sharp stone, the axe,
  // Steady hands (what your settlers make of it in 2 seconds, at this phase's rates) and Sure hands. r1e (owner): no ideas:
  // the hand's ideas fade out early in the village and never come back on the map
  function gatherAmount(s, r) {
    var a = (s.cards.sharp ? VC.D.sharpClick : VC.D.click) + (r === 'wood' && s.cards.woodcutting ? VC.D.chopBonus : 0);
    if (s.cards.steady) a += VC.D.steadySecs * jobMake(s, r);
    var sh = perk(s, 'sureHands'); return a * (sh ? D.perks.sureHands.hand[Math.min(sh, D.perks.sureHands.hand.length) - 1] : 1);
  }
  function gather(s, r) {
    if (r === 'stones' && !s.cards.lookcloser) return false; if (r === 'fiber' && !s.cards.grasswork) return false; if (r === 'food' && !s.cards.foraging) return false;
    addRes(s, r, gatherAmount(s, r)); s.hand = (s.hand || 0) + 1; return true;
  }
  function jobOpen(s, id) { if (id === 'smelter') return !!s.m.smelting; if (id === 'glowcrafter') return hasC(s, 'glowcraft'); return VC.jobOpen(s, id); }
  function setJob(s, id, n) {
    if (!jobOpen(s, id)) return false; n = Math.max(0, Math.floor(n));
    var other = 0; for (var k in s.jobs) if (k !== id) other += s.jobs[k];
    s.jobs[id] = Math.min(n, s.pop - other); return true;
  }

  // live text for a perk: {x} its strength, {cut} what a level takes off, {f} its share, as percentages
  function perkDesc(id) { var p = D.perks[id]; return String(p.desc).replace('{x}', Math.round((p.x || 0) * 100)).replace('{cut}', Math.round((1 - (p.cut || 1)) * 100)).replace('{f}', Math.round((p.f || 0) * 100)); }
  // dial sets: named overrides (dial path -> value). I = the build settings (owner, 2026-10-12): Map Lab dial set I, with the
  // Light Academy at 1.5 light a scholar, Academy lore +20% a level, and Anchor lore left at +25% a level
  var DIAL_SETS = { I: {
    memPct: 1, memExp: 0.5, regionAdd: 1,   /* v1l (owner): memory x4 (was 0.25), no higher */ 'relic.stepG': 4.5, 'anchor.focus': 0.5, 'anchor.craft.a': 0.1, 'academy.b': 1.5,
    'unlock.cuburner.perk': 1, 'unlock.glow.perk': 1, 'unlock.academy.tiles': 20, 'unlock.anchor.tiles': 8,
    'perks.beaconFire.base': 1, 'perks.beaconSurvey.base': 1, 'perks.ampSites.base': 1, 'perks.wideLenses.base': 2.5, 'perks.hearthwright.base': 1, 'perks.firewright.base': 1, 'perks.lampwright.base': 1,
    'perks.cuburnerUnlock.base': 10 / 6, 'perks.glowUnlock.base': 10 / 6, 'perks.academyUnlock.base': 10 / 6, 'perks.anchorUnlock.base': 10 / 6,
    'perks.anchorLore.base': 1, 'perks.glowLore.base': 1, 'perks.academyLore.base': 1, 'perks.quietHalls.base': 8 / 6, 'perks.bankedFires.base': 1, 'perks.keeperLore.base': 1,
    'perks.woodcraft.base': 8 / 6, 'perks.stonecraft.base': 8 / 6, 'perks.fibercraft.base': 8 / 6, 'perks.kindled.base': 1,
    // v1l (owner): the rest of the gap goes into perk powers (not prices): the buff perks x1.5
    // v1n (owner's playtest, 2026-10-15): with a bot that plays the whole economy the gap is gone, so the buff perks come down to x1.25 (were x1.5; memory x4 stays)
    'perks.beaconFire.x': 0.5, 'perks.anchorLore.x': 0.3125, 'perks.glowLore.x': 1.0, 'perks.academyLore.x': 0.25, 'perks.kindled.x': 1.0
  } };
  DIAL_SETS.L1 = {   // Light Lab v1's starting dials: set I's memory, regions and perk prices, the cut systems' perks gone
    memPct: 1, memExp: 0.5, regionAdd: 1, 'relic.stepG': 4.5,
    'perks.beaconFire.base': 1, 'perks.beaconSurvey.base': 1, 'perks.ampSites.base': 1, 'perks.wideLenses.base': 2.5, 'perks.firewright.base': 1, 'perks.lampwright.base': 1, 'perks.kilnwright.base': 1,
    'perks.cuburnerUnlock.base': 10 / 6, 'perks.bankedFires.base': 1, 'perks.keeperLore.base': 1, 'perks.brightGlass.base': 1, 'perks.hotHearths.base': 1, 'perks.fireWarden.base': 1, 'perks.relicLore.base': 1, 'perks.glasswright.base': 1, 'perks.firebrick.base': 1, 'perks.oldFlames.base': 6,
    'perks.woodcraft.base': 8 / 6, 'perks.stonecraft.base': 8 / 6, 'perks.fibercraft.base': 8 / 6, 'perks.scholarLore.base': 8 / 6, 'perks.beaconFire.x': 0.5
  };
  // V3 (owner, 2026-10-16): the v1q build. L1 plus Light Lab v3's dials (S3's fires on this phase's lines only, hearth 7, the comforts, perks stay spent)
  DIAL_SETS.V3 = Object.assign({}, DIAL_SETS.L1, {"src.keepers": 4, "burnEff.Lx": 2.5, "src.lamps": 4, "houseGrowth": 1.25, "perks.beaconFire.base": 4, "perks.beaconSurvey.base": 4, "perks.ampSites.base": 4, "perks.firewright.base": 4, "perks.lampwright.base": 4, "perks.kilnwright.base": 4, "perks.bankedFires.base": 4, "perks.keeperLore.base": 4, "perks.brightGlass.base": 4, "perks.hotHearths.base": 4, "perks.fireWarden.base": 4, "perks.relicLore.base": 4, "perkCompound": 1, "perks.keeperLore.x": 0.15, "perks.brightGlass.x": 0.15, "perks.hotHearths.x": 0.15, "perks.relicLore.x": 0.15, "perks.keeperLore.g": 1.5, "perks.brightGlass.g": 1.5, "perks.hotHearths.g": 1.5, "perks.relicLore.g": 1.5, "perks.keeperLore.max": 40, "perks.brightGlass.max": 40, "perks.hotHearths.max": 40, "perks.relicLore.max": 40, "srcScope": "phase", "perks.bankedFires.max": 5, "perks.beaconWrights.base": 4, "villageStart.wood": 40, "villageStart.stones": 40, "surge.reclear": 0, "vHearthMax": 7});
  // R1 (the rebirth branch, 2026-10-18, Considering): V3 plus scripted rebirths with gifts, the self made whole at the fifth, mastery and the merchant after it
  DIAL_SETS.R1 = Object.assign({}, DIAL_SETS.V3, { 'rb.on': 1, 'mastery.on': 1, 'merchant.on': 1, 'perks.lightRemembers.costs': [20, 40, 70, 110], 'perks.lightRemembers.name': 'The light remembers I\u2013IV',
  // r1c (owner's Leaning, 2026-10-18): mastery tiers at 100, 1,000 and 10,000 clears (was 10, 100, 1,000). Lab: 150 places in 20 days after whole against 154; the sensible player beats mastering everything by x1.09
  'mastery.need': [100, 1000, 10000],
  // r1c (owner's playtest): books are storage, and come back with the run like the other stores (brought back, research room was 150,000, 85 hours to fill)
  // r1h (owner): timber houses do not come back (the run's settlers are housed by the shelters Open doors brings)
  'perks.oldFlames.lines': [['ct_axes', 'ct_mattocks', 'ct_spindles', 'ct_baskets'], ['ctend', 'longsong'], ['clamp', 'cbrazier'], ['eff_firepit', 'eff_limekiln', 'eff_rushlight', 'cuburner', 'eff_cuburner']] });
  function applySet(name) { var o = DIAL_SETS[name] || name; for (var p in o) { var ks = p.split('.'), last = ks.pop(); var host = ks.reduce(function (a, k) { return a && a[k]; }, D); if (host) host[last] = o[p]; } if (VC.LAD && VC.LAD.hearth) { VC.LAD.hearth.max = D.vHearthMax; VC.LAD.hearth.desc = 'All light {pct}% stronger. ' + D.vHearthMax + ' levels in all.'; } refreshCards(); applyDeal(); }
  return {
    giftsFor: giftsFor, prPerks: prPerks, rbAt: rbAt, wholeShare: wholeShare, becomeWhole: becomeWhole, perkSpentOf: perkSpentOf,
    masteryOn: masteryOn, mPointsOf: mPointsOf, masteryMultAt: masteryMultAt, mClears: mClears, mTier: mTier, mTierOf: mTierOf, mTierAt: mTierAt, villageStand: villageStand, doorShelters: doorShelters, mNeed: mNeed, mClearCost: mClearCost, masteryPoints: masteryPoints, masteryMult: masteryMult,
    canMaster: canMaster, regionToMaster: regionToMaster, regionMastery: regionMastery, masterPlace: masterPlace, masterRegion: masterRegion,
    merchantArrive: merchantArrive, merchantHere: merchantHere, merchantLeave: merchantLeave, buyPerkNow: buyPerkNow,
    perkMax: perkMax, smeltUse: smeltUse, kPhase: kPhase, bPhase: bPhase, perkDesc: perkDesc, DIAL_SETS: DIAL_SETS, applySet: applySet, awayHours: awayHours, applyDeal: applyDeal, villagePrestige: villagePrestige, tendCap: tendCap, runCapOf: runCapOf, famBuff: famBuff,
    D: D, MAP: MAP, CARDS: CARDS, CARD: CARD, PROJECTS: PROJECTS, PROJ: PROJ, ML: ML, MLAD: MLAD, VC: VC,
    init: init, tick: tick, tileCost: tileCost, reachable: reachable, restored: restored, coneTiles: coneTiles, ampMult: ampMult,
    cardAvail: cardAvail, buyCard: buyCard, levelCost: levelCost, levelOpen: levelOpen, levelMaxed: levelMaxed, levelMax: levelMax, buyLevel: buyLevel,
    tierUp: tierUp, tierUpAvail: tierUpAvail, tierUpCost: tierUpCost, mlv: mlv, mtier: mtier,
    cap: cap, room: room, jobMake: jobMake, copperMake: copperMake, smeltMult: smeltMult, burnDemand: burnDemand, burnShare: burnShare, lightParts: lightParts, lightRate: lightRate, sentRate: sentRate,
    phaseMult: phaseMult, nearTiles: nearTiles, sysOpen: sysOpen, sysHeld: sysHeld, unlockPerkOf: unlockPerkOf, relicMult: relicMult, tendMult: tendMult, effMult: effMult, tileMult: tileMult, toolMult: toolMult,
    projNeeds: projNeeds, projDef: projDef, startProject: startProject, prioritize: prioritize, clickFinish: clickFinish, setTarget: setTarget, cheapestTarget: cheapestTarget, poolCap: poolCap, scoutDepth: scoutDepth, seenTiles: seenTiles, burst: burst, burstLight: burstLight, burstCost: burstCost, burstTrip: burstTrip, burstReady: burstReady, lineupMax: lineupMax, lineupOk: lineupOk, lineupAdd: lineupAdd, lineupRemove: lineupRemove, nextTarget: nextTarget, lineupAuto: lineupAuto,
    repairAmps: repairAmps, stewardsOn: stewardsOn, gather: gather, gatherAmount: gatherAmount, landScale: landScale, resonantN: function (s) { return resonant(s).n; }, rebuildNo: rebuildNo, rebuildTo: rebuildTo, litBurners: litBurners, surgeOf: surgeOf, surgeLeft: surgeLeft, eatRate: eatRate, ruinKey: ruinKey, repairOpen: repairOpen, repairStarted: repairStarted, repairAmp: repairAmp, boostOf: boostOf, landRelicBoost: landRelicBoost, smeltFuel: smeltFuel, haulRate: haulRate, buyRelic: buyRelic, relicCost: relicCost, relicsOpen: relicsOpen, planAmp: planAmp, jobOpen: jobOpen, setJob: setJob, landCount: landCount, hungry: hungry, autoStore: autoStore,
    beaconLv: beaconLv, sinkOf: sinkOf, beaconStepOf: beaconStepOf, beaconEveryOf: beaconEveryOf, coneOf: coneOf, glowMult: glowMult, anchorLight: anchorLight, academyOn: academyOn, planAnchor: planAnchor, relicFree: relicFree, relicFreeKey: relicFreeKey, relicRaw: relicRaw, anchorFocus: anchorFocus, focusMode: focusMode, RELIC_RAW: RELIC_RAW, rawPerk: rawPerk, REGIONS: REGIONS, regionsDone: regionsDone, regionMult: regionMult, directMult: directMult, perk: perk, perkCost: perkCost, cardCost: cardCost, beaconMaxOf: beaconMaxOf, ampMaxOf: ampMaxOf, heartstones: heartstones, hsFor: hsFor, memMult: memMult, refreshCards: refreshCards
  };
};
if (typeof module !== 'undefined') module.exports = MCORE;

