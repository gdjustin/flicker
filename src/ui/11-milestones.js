/* ---------- Playtest: milestones, recorded with the play time they were reached ---------- */
const MILES = [
  ['stood', 'Stood up (end of the prologue)', () => S.flags.stood],
  ['fire', 'Fire built', () => S.w && S.w.cards.fire != null],
  ['settler', 'First settler', () => S.w && S.w.pop >= 1],
  ['pop10', '10 settlers', () => S.w && S.w.pop >= 10],
  ['pop25', '25 settlers', () => S.w && S.w.pop >= 25],
  ['light25', 'Home tile 25% lit', () => S.w && S.w.pct >= 25],
  ['light50', 'Home tile 50% lit', () => S.w && S.w.pct >= 50],
  ['light75', 'Home tile 75% lit', () => S.w && S.w.pct >= 75],
  ['light100', 'Home tile fully lit', () => S.w && S.w.pct >= 100]
].concat(VC.PROJECTS.map(p => ['p_' + p.id, p.name + ' built', () => S.w && S.w.done[p.id] != null]), [['end', 'Village done (home lit, beacon built)', () => S.w && S.w.flags.end]], (() => { const M = () => S.w && S.w.m, run = () => (S.meta && S.meta.run) || 1, r1 = f => () => M() && run() === 1 && f(S.w.m);
  return [['map', 'Map opened (run 1)', () => !!M() && run() === 1], ['run2', 'First scatter (run 2 begun)', () => run() >= 2], ['run3', 'Run 3 begun', () => run() >= 3], ['best100', '100 places in one run', () => S.meta && (S.meta.best || 0) >= 100]]; })());
function checkMiles() {
  const first = !S.miles; if (first) S.miles = {};
  for (const [k, , cond] of MILES) { if (S.miles[k]) continue; let ok = false; try { ok = !!cond(); } catch (e) {} if (ok) S.miles[k] = first ? { t: null } : { t: S.playTime || 0, at: Date.now() }; }
  try { checkRun(); } catch (e) {}
}
/* v1n: milestones by run (owner, 2026-10-15): each run keeps its own marks, timed from that run's start (village included, on the run's own clock),
   so run 1, run 2 and later runs can be read side by side. Playtest help (skips, the lab bot) is recorded with the run it touched. */
const RUN_MARKS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200];
const RUN_FIRSTS = [['village', 'Village done', w => w.flags.end], ['map', 'Map opened', w => !!w.m], ['copper', 'Copper found', w => w.m && w.m.copperFound],
  ['region1', 'First region finished', w => w.m && (w.m.regionsDone || 0) >= 1], ['relic1', 'First relic claimed', w => w.m && (w.m.relicsN || 0) >= 1],
  ['amp1', 'First amplifier tower lit', w => w.m && w.m.amps.some(a => a.lit && !a.story)], ['anchor1', 'First Light Anchor lit', w => w.m && (w.m.anchors || []).some(a => a.lit)],
  ['cuburner1', 'First copper burner', w => w.m && (w.m.lv.cuburner || 0) > 0], ['ctend1', 'Fire-tending begun', w => w.m && (w.m.lv.ctend || 0) > 0],
  ['clamp1', 'First copper lamp', w => w.m && (w.m.lv.clamp || 0) > 0], ['cbrazier1', 'First copper brazier', w => w.m && (w.m.lv.cbrazier || 0) > 0],
  ['academy', 'Light Academy open', w => w.m && w.m.cards.academy], ['scatter', 'The scatter can be taken', w => canScatter(w)]];
function runRec() {
  const m = meta(), w = S.w; m.runs = m.runs || {}; let r = m.runs[m.run];
  if (!r) {
    r = m.runs[m.run] = { run: m.run, at: Date.now(), hs: m.hsLife, mem: memMultFor(m.hsLife), perks: Object.assign({}, m.perks), prevBest: m.run > 1 ? (m.best || 0) : 0, marks: {}, firsts: {}, help: [], speed: S.speed || 1 };
    // a run already under way when records began: what came before is unknown, except what the save keeps times for
    if (w && w.m && w.m.restored > 0) { r.joined = { tiles: w.m.restored, t: w.t };
      // what this run began with: heartstones before its own new ones, the best of the runs before it
      r.hs = m.hsLife - (w.m.hsNew || 0); r.mem = memMultFor(r.hs); r.prevBest = m.run > 1 ? Math.max(0, ...(m.hist || []).map(h => h.tiles || 0)) : 0;
      for (const [k, , f] of RUN_FIRSTS) { let ok = false; try { ok = !!f(w); } catch (e) {} if (ok) r.firsts[k] = null; }
      r.firsts.map = w.m.t0 != null ? w.m.t0 : null;
      if (w.m.regionList && w.m.regionList.length) r.firsts.region1 = w.m.regionList[0][0];
      if (w.m.relicT) { const v = Object.values(w.m.relicT); if (v.length) r.firsts.relic1 = Math.min(...v); } }
  }
  return r;
}
function checkRun() {
  const w = S.w; if (!w || S.inPerks) return; const r = runRec();
  r.speed = Math.max(r.speed || 1, S.speed || 1);
  for (const [k, , f] of RUN_FIRSTS) if (!(k in r.firsts)) { let ok = false; try { ok = !!f(w); } catch (e) {} if (ok) r.firsts[k] = w.t; }
  if (!w.m) return; const n = w.m.restored;
  for (const k of RUN_MARKS) if (n >= k && !(k in r.marks)) r.marks[k] = r.joined && k <= r.joined.tiles ? null : w.t;
  if (r.prevBest > 0 && n >= r.prevBest && !('regain' in r.firsts)) r.firsts.regain = r.joined && r.joined.tiles >= r.prevBest ? null : w.t;
  r.now = { tiles: n, t: w.t, hs: w.m.hsNew || 0, pop: w.pop, light: MC.lightRate(w), regions: MC.regionsDone(w) };
}
function runHelp(note) { try { if (S.w) runRec().help.push([S.w.t || 0, note]); } catch (e) {} }
function runsText() {
  const m = meta(), runs = Object.values(m.runs || {}).sort((a, b) => a.run - b.run); if (!runs.length) return '';
  const d = s => s == null ? 'before records began' : s < 0 ? 'while the lab bot played' : fmtDur(s), L = [];
  const hist = {}; (m.hist || []).forEach(h => { hist[h.run] = h; });
  L.push('', 'RUNS, SIDE BY SIDE (time from each run’s start, village included; time away counts up to the limit)');
  // the tile marks, compared across runs
  for (const k of RUN_MARKS) { const xs = runs.filter(r => r.marks[k] != null); if (!xs.length) continue;
    L.push(k + (k === 1 ? ' place' : ' places') + ': ' + xs.map((r, i) => { let s = 'run ' + r.run + ' ' + d(r.marks[k]); const p = i > 0 ? xs[i - 1].marks[k] : null;
      if (p && r.marks[k]) s += ' (' + (p / r.marks[k] >= 1 ? '×' + (p / r.marks[k]).toFixed(1) + ' faster' : '×' + (r.marks[k] / p).toFixed(1) + ' slower') + ')'; return s; }).join(' · ')); }
  for (const r of runs) {
    const h = hist[r.run], live = r.run === m.run;
    L.push('', 'RUN ' + r.run + (live ? ' (now)' : '') + (r.run > 1 ? ': ' + fmtW(r.hs) + ' heartstones, memory ×' + fmtW(r.mem, 2) : ''));
    const pk = Object.keys(r.perks || {}).filter(k => r.perks[k]).map(k => (MC.D.perks[k] ? MC.D.perks[k].name : k) + (r.perks[k] > 1 ? ' ' + r.perks[k] : '')); if (r.run > 1) L.push('  Gifts: ' + (pk.length ? pk.join(', ') : 'none'));
    if (r.joined) L.push('  Records began mid-run, at ' + r.joined.tiles + ' places (' + fmtDur(r.joined.t) + ' in).');
    for (const [k, label] of RUN_FIRSTS) if (k in r.firsts) L.push('  ' + label + ': ' + d(r.firsts[k]));
    if (r.prevBest > 0) L.push('  Back to the last best (' + r.prevBest + ' places): ' + ('regain' in r.firsts ? d(r.firsts.regain) : 'not yet'));
    const e = r.end || (live ? r.now : null) || (h ? { tiles: h.tiles, hs: h.hsNew, t: null } : null);
    if (e) L.push('  ' + (r.end ? 'Scattered' : live ? 'So far' : 'Ended') + ': ' + e.tiles + ' places' + (e.t != null ? ' in ' + fmtDur(e.t) : h ? ' in ' + fmtDur(h.play) + ' of play' : '') + (e.hs != null ? ', ' + fmtW(e.hs) + ' new heartstones' : '') + (e.pop ? ', ' + e.pop + ' settlers' : '') + (e.light ? ', light ' + fmtW(e.light) + '/s' : ''));
    if ((r.speed || 1) > 1) L.push('  Game speed used: up to ×' + r.speed);
    if (r.help.length) L.push('  Playtest help: ' + r.help.map(x => x[1] + ' (at ' + fmtDur(x[0]) + ')').join('; '));
  }
  // run 1 from before run records existed
  const known = new Set(runs.map(r => r.run)); (m.hist || []).filter(h => !known.has(h.run)).forEach(h => L.splice(2, 0, 'Run ' + h.run + ' (before run records): ' + h.tiles + ' places, ' + fmtW(h.hsNew) + ' new heartstones, ' + fmtDur(h.play) + ' of play.'));
  return L.join('\n');
}
function fmtDur(sec) { const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60); return (d ? d + ' d ' : '') + (d || h ? h + ' h ' : '') + m + ' min'; }
function milesText() {
  const st = S.miles && S.miles.stood && S.miles.stood.t, lines = [];
  for (const [k, label] of MILES) { const r = S.miles && S.miles[k]; if (!r) continue;
    if (r.t == null) { lines.push(label + ': reached before logging began'); continue; }
    let line = label + ': ' + fmtDur(r.t) + ' of play'; if (st != null && k !== 'stood' && r.t >= st) line += ' (' + fmtDur(r.t - st) + ' after standing up)';
    lines.push(line + ', ' + new Date(r.at).toLocaleString()); }
  return (lines.length ? lines.join('\n') : 'No milestones yet.') + runsText();
}

