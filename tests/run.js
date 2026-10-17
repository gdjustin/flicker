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
const page = assemble();
const scripts = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
let parseErr = null;
scripts.forEach((s, i) => { try { new vm.Script(s, { filename: 'page-script-' + i }); } catch (e) { parseErr = parseErr || ('script ' + i + ': ' + e.message); } });
check('page builds and every script parses', !parseErr, parseErr || scripts.length + ' scripts');

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
