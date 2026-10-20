#!/usr/bin/env node
// Headless checks, run on every push (GitHub Actions) and before every publish.
//
//   node tests/run.js           run every check; exit 1 on any failure
//   node tests/run.js --update  re-record tests/golden.json after an intended balance change
//
// The rules and bots are the same files the game ships, loaded in page order. The bots have no randomness,
// so the same rules always give the same numbers: any change in tests/golden.json is a real change in play.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { assemble, loadSource } = require('../tools/build.js');

const GOLDEN = path.join(__dirname, 'golden.json');
const update = process.argv.includes('--update');
const results = {};
const failures = [];
const check = (name, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : '')); if (!ok) failures.push(name); };
const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

// 1. The page builds, and every script in it parses (a stray edit that breaks the page fails here, not in a player's browser).
for (const [name, test] of [['test build', true], ['public build', false]]) {
  const page = assemble(test);
  const scripts = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
  let parseErr = null;
  scripts.forEach((s, i) => { try { new vm.Script(s, { filename: 'page-script-' + i }); } catch (e) { parseErr = parseErr || ('script ' + i + ': ' + e.message); } });
  check(name + ': page builds and every script parses', !parseErr, parseErr || scripts.length + ' scripts');
  // v1s: the public build carries no playtest tools, bot hooks or text editor
  if (!test) check('public build: no playtest tools, bots or text editor', !/id="f-debug"|id="tx"|window\.__T|VBOT\.run|MBOT\(/.test(page) && /test: false/.test(page));
}

// 2. The rules, loaded the way the page loads them.
function loadRules() {
  const ctx = vm.createContext({ console, Math, JSON, Date });
  for (const f of ['src/rules/village-core.js', 'src/bots/village-bot.js', 'src/rules/light-core.js', 'src/bots/checkin-bot.js']) {
    vm.runInContext(loadSource(f), ctx, { filename: f });
  }
  return vm.runInContext('({ VC, VBOT, MCORE, MBOT })', ctx);
}
const { VC, VBOT, MCORE, MBOT } = loadRules();

// 3. The village: an active player finishes it, with every project built and all settlers home.
{
  const v = VBOT.run(VC, {});
  const projects = Object.keys(v.s.done || {}).sort();
  check('village: the active bot lights the home fully', v.s.pct >= 100, 'lit ' + round(v.s.pct, 1) + '%');
  check('village: every project is built', ['beacon', 'circle', 'greatfire', 'longhouse', 'smokehouse', 'storehouse'].every(p => projects.includes(p)), projects.join(', '));
  results.village = { minutes: round(v.end / 60, 1), lightPerSec: round(v.light, 2), settlers: v.s.pop };
}

// 3b. Soft-lock checks (v1r): players who play badly or oddly still reach the map, or the game says why not.
// Lesson from v1q2: a full store must never block the only source of another resource.
{
  const styles = {
    'clicks only until the first settler': { clickUntilPop: 1 },
    'most settlers on the fires': { keeperShare: 0.6 },
    'almost no storytellers': { storyShare: 0.03, clickUntilPop: 99 },
    'never feasts': { feasts: false },
    'very few haulers': { haulShare: 0.1 }
  };
  for (const name in styles) {
    const v = VBOT.run(VC, Object.assign({ maxT: 24 * 3600 }, styles[name]));
    check('soft-lock: ' + name + ' still reaches the map', v.s.pct >= 100 && !!v.s.done.beacon, Math.round(v.s.t / 60) + ' min, lit ' + Math.round(v.s.pct) + '%');
  }
  // never hauling can't finish a project; the remedy must be open and the project strip must say so (vp.nohaul shows when nobody hauls)
  const v = VBOT.run(VC, { maxT: 24 * 3600, noHaul: true }), s = v.s;
  check('soft-lock: a player who never hauls is told why they are stuck', !!s.proj && !s.proj.paused && !(s.jobs.hauler > 0) && VC.jobOpen(s, 'hauler'), 'stuck on ' + (s.proj && s.proj.id) + ' with the hauler job open');
}

// 4. Map phase 1, run 1: the check-in player (2 h at the reveal, then 4 check-ins a day) reaches 40 places.
{
  const MC = MCORE(VC); MC.applySet('V3');
  const r = MBOT(MC, VBOT).run({ preset: 'checkin', stopTiles: 40, econ: 'full', pick: 'need' });
  check('map run 1: the check-in player reaches 40 places', r.s.m.restored >= 40, r.s.m.restored + ' places');
  const rl = MBOT(MC, VBOT).run({ preset: 'light', stopTiles: 40, econ: 'full', pick: 'need' });
  check('map run 1: the light player (3 check-ins a day) reaches 40 places', rl.s.m.restored >= 40, rl.s.m.restored + ' places by hour ' + Math.round(rl.marks.stop || 0));
  results.mapRun1 = { villageMinutes: round(r.villageMin, 1), hoursTo10: round(r.marks[10], 2), hoursTo20: round(r.marks[20], 2), hoursTo40: round(r.marks[40], 2) };
}

// 4b. The rebirth branch (dial set R1, 2026-10-18): the milestone holds the land, gifts add up, the last rebirth makes the run whole,
// mastery multiplies light reaching new land, and the traveler comes and goes. Main's numbers above never use R1.
{
  const MC = MCORE(VC); MC.applySet('R1');
  const g3 = MC.giftsFor(3), g5 = MC.giftsFor(5);
  check('rebirth branch: gifts add up, each at its highest level', g3.skipPrologue === 1 && g3.oldLessons === 2 && g3.lightRemembers === 2 && g5.villageSkip === 1 && g5.lightRemembers === 4 && !MC.giftsFor(1).skipPrologue, JSON.stringify(g5));
  const r = MBOT(MC, VBOT).run({ preset: 'checkin', econ: 'full', pick: 'need', days: 12, stopFn: s => !!s.m.rbReady });
  const s = r.s, at = MC.rbAt(1), key = MC.cheapestTarget(s);
  check('rebirth branch: run 1 stops at its milestone and the land beyond waits', s.m.restored === at && !!s.m.rbReady && !MC.setTarget(s, key), s.m.restored + ' places, rebirth at ' + at);
  MC.becomeWhole(s, 100, {}, s.t);
  check('rebirth branch: the last rebirth makes the run whole, and the land answers again', s.m.whole && MC.masteryOn(s) && MC.setTarget(s, MC.cheapestTarget(s)));
  const home = Object.keys(s.m.tiles).sort((a, b) => MC.mClearCost(MC.MAP.tiles[MC.MAP.idx[a]]) - MC.mClearCost(MC.MAP.tiles[MC.MAP.idx[b]]))[0], m0 = MC.masteryMult(s);
  MC.masterPlace(s, home); for (let i = 0; i < 600 && MC.mTier(s, home) < MC.D.mastery.tiers; i++) MC.tick(s, 10, false);
  check('rebirth branch: mastering a place reaches gold and raises light to new land', MC.mTier(s, home) === MC.D.mastery.tiers && MC.masteryMult(s) > m0 && s.m.target !== home, 'tier ' + MC.mTier(s, home) + ', ×' + MC.masteryMult(s).toFixed(2));
  const here = MC.merchantArrive(s, s.t + MC.D.merchant.first + 1); MC.merchantLeave(s, s.t + MC.D.merchant.first + 2);
  check('rebirth branch: the traveler comes, waits and goes', here && !MC.merchantHere(s) && s.m.merch.visits === 1);
}

// 4c. r1d (owner, 2026-10-19): the village and the map keep one rule. Firekeepers burn no wood, settlers eat the same,
// and gathering by hand works the same (Sure hands, the hand's ideas). Hands bring ideas until Storytelling is learned.
{
  const MC = MCORE(VC); MC.applySet('R1');
  const v = VC.fresh(); v.pop = 6; v.cards.fire = true; v.cards.firekeeping = true; v.jobs.firekeeper = 3;
  check('one rule: firekeepers burn no wood in the village', VC.burnDemand(v).wood === 0 && VC.lightParts(v).some(p => p[0] === 'keepers' && p[1] > 0));
  check('one rule: settlers eat the same in the village and on the map', MC.eatRate(v) === VC.D.eat, MC.eatRate(v) + ' and ' + VC.D.eat + ' a second');
  const before = VC.handIdeas(v); v.cards.storytelling = true; const after = VC.handIdeas(v);
  check('ideas: hands still bring ideas until Storytelling is learned', before >= VC.D.clickIdeasFloor && after === 0, before + ' a click before, ' + after + ' after (6 settlers)');
  const m = VBOT.run(VC, { maxT: 3 * 3600 }).s; MC.init(m, { run: 2, hs: 10, perks: {}, known: [] });
  const vh = VC.gatherAmount(Object.assign({}, m, { m: null, pv: { hand: MC.D.perks.sureHands.hand[0] } }), 'stones'), mh = MC.gatherAmount(m, 'stones');
  check('one rule: Sure hands works on the map as in the village', m.m.perks.sureHands >= 1 && mh >= MC.D.perks.sureHands.hand[0] * 2, 'map click ' + mh.toFixed(1) + ' stones, village click ' + vh.toFixed(1));
}

// 5. Same rules, same numbers: compare with the recorded results.
if (update || !fs.existsSync(GOLDEN)) {
  fs.writeFileSync(GOLDEN, JSON.stringify(results, null, 2) + '\n');
  console.log('recorded tests/golden.json');
} else {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  for (const k of Object.keys(results)) {
    const same = JSON.stringify(results[k]) === JSON.stringify(golden[k]);
    check('numbers unchanged: ' + k, same, same ? JSON.stringify(results[k]) : 'was ' + JSON.stringify(golden[k]) + ', now ' + JSON.stringify(results[k]) + ' (if intended: node tests/run.js --update)');
  }
}

if (failures.length) { console.log('\n' + failures.length + ' check(s) failed'); process.exit(1); }
console.log('\nall checks passed');
