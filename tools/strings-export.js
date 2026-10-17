#!/usr/bin/env node
// Collects every player-facing string in the game into rows, for the owner's text pass.
//   node tools/strings-export.js > dist/strings.json
// Each row: { id, sheet, where, what, text, file, line, flags, journal, trigger }.
// The id says where the text lives, so edits can be folded back:
//   key:<registry key>          a row of UI_DEFS in src/text/game-text.js
//   ui:<OBJECT>.<path>          a field of a text object in src/ui (MT, WORLD, CONTENT, ...)
//   rules:<core>.<list>.<id>.<field>   a field in src/rules (cards, ladders, jobs, perks, projects)
//   code:<file>:<line>          a string written straight into the screen code
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./build.js');
const ROOT = path.join(__dirname, '..');
const rel = p => path.relative(ROOT, p);

const rows = [];
const seen = new Set();
function add(r) { if (typeof r.text !== 'string' || !/[A-Za-z]{2}/.test(r.text)) return; const k = r.id; if (seen.has(k)) return; seen.add(k); rows.push(r); }

// ---------- where a string sits in the source (first exact occurrence)
const SRC = {};
for (const dir of ['src/ui', 'src/text', 'src/rules', 'src/page']) for (const f of fs.readdirSync(path.join(ROOT, dir))) SRC[dir + '/' + f] = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
function locate(text) {
  if (typeof text !== 'string') return { file: '', line: 0 };
  for (const f in SRC) { const s = SRC[f]; let i = s.indexOf(text); if (i < 0) i = s.indexOf(JSON.stringify(text).slice(1, -1)); if (i < 0) i = s.indexOf(text.replace(/’/g, '\\u2019')); if (i >= 0) return { file: f, line: s.slice(0, i).split('\n').length }; }
  return { file: '', line: 0 };
}

// ---------- 1. the rules' own text (cards, ladders, jobs, projects, perks)
const ctx = vm.createContext({ console, Math, JSON, Date });
for (const f of ['src/rules/village-core.js', 'src/rules/light-core.js']) vm.runInContext(loadSource(f), ctx, { filename: f });
const { VC, MCORE } = vm.runInContext('({ VC, MCORE })', ctx);
const MC = MCORE(VC); MC.applySet('V3');
const fieldWhat = { name: 'name', desc: 'description', tag: 'short tag', gives: 'what it gives', msg: 'message' };
function each(core, list, arr, sheet, where, fields) {
  arr.forEach(it => fields.forEach(f => { if (typeof it[f] === 'string') { const loc = locate(it[f]); add({ id: 'rules:' + core + '.' + list + '.' + it.id + '.' + f, sheet, where, what: (it.name || it.id) + ' · ' + fieldWhat[f], text: it[f], file: loc.file, line: loc.line }); } }));
}
each('village', 'cards', VC.CARDS, 'Cards and upgrades', 'Village: Ideas and upgrades', ['name', 'desc', 'msg']);
each('village', 'ladders', VC.LADDERS, 'Cards and upgrades', 'Village: Buildings', ['name', 'desc']);
each('village', 'projects', VC.PROJECTS, 'Cards and upgrades', 'Village: projects', ['name', 'gives']);
VC.PROJECTS.forEach(p => p.stages.forEach((st, i) => add({ id: 'rules:village.projects.' + p.id + '.stage' + i, sheet: 'Cards and upgrades', where: 'Village: projects', what: p.name + ' · stage ' + (i + 1), text: st.name, ...locate(st.name) })));
each('village', 'jobs', VC.JOBS, 'Settlers and resources', 'Village and map: settler jobs', ['name', 'tag', 'desc']);
each('light', 'cards', MC.CARDS, 'Cards and upgrades', 'Map phase: research cards', ['name', 'desc', 'msg']);
each('light', 'ladders', MC.ML, 'Cards and upgrades', 'Map phase: buildings and lines', ['name', 'desc']);
each('light', 'projects', MC.PROJECTS, 'Cards and upgrades', 'Map phase: projects', ['name', 'gives']);
(MC.PROJECTS || []).forEach(p => (p.stages || []).forEach((st, i) => add({ id: 'rules:light.projects.' + p.id + '.stage' + i, sheet: 'Cards and upgrades', where: 'Map phase: projects', what: p.name + ' · stage ' + (i + 1), text: st.name, ...locate(st.name) })));
Object.keys(MC.D.perks).forEach(id => { const p = MC.D.perks[id]; ['name', 'desc'].forEach(f => { if (typeof p[f] === 'string') add({ id: 'rules:light.perks.' + id + '.' + f, sheet: 'Rebirth and perks', where: 'Between runs: ' + (p.kind === 'comfort' ? 'comforts' : 'perk medallions'), what: (p.name || id) + ' · ' + fieldWhat[f], text: p[f], ...locate(p[f]) }); }); });

// ---------- 2. text objects in the screen code, evaluated from their source with harmless stand-ins
const UI_OBJECTS = [['src/ui/00-start-numbers-content.js', 'CONTENT'], ['src/ui/03-village-state.js', 'WORLD'], ['src/ui/05-map-phase.js', 'MT'], ['src/ui/05-map-phase.js', 'SCHOLAR'],
  ['src/ui/05-map-phase.js', 'MAPLIGHT'], ['src/ui/05-map-phase.js', 'LANDN'], ['src/ui/05-map-phase.js', 'RES_WORD'], ['src/ui/06-map-settlement-drawer.js', 'MGROUPS'], ['src/ui/06-map-settlement-drawer.js', 'RELIC_OF'],
  ['src/ui/08-rebirth-perks.js', 'PK_FAMS'], ['src/ui/08-rebirth-perks.js', 'PK_UI'], ['src/text/game-text.js', 'UI_DEFS']];
const objRanges = {};
function literalOf(src, name) {
  const m = new RegExp('(^|\\n)const ' + name + ' = ').exec(src); if (!m) return null;
  let i = m.index + m[0].length, depth = 0, q = null, start = i;
  for (; i < src.length; i++) { const c = src[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '{' || c === '[') depth++; if (c === '}' || c === ']') { depth--; if (!depth) { i++; break; } } }
  return { text: src.slice(start, i), from: src.slice(0, start).split('\n').length, to: src.slice(0, i).split('\n').length };
}
const STUB = { D: x => x, tx: k => k, fmtW: x => String(x), fill: s => s };
const where = { CONTENT: 'Prologue', WORLD: 'Village', MT: 'Map phase', SCHOLAR: 'Map phase: scholars', MAPLIGHT: 'Light hover: sources', LANDN: 'Map: land names', RES_WORD: 'Map: resource words', MGROUPS: 'Map phase: building groups', RELIC_OF: 'Relics tab: relic names', PK_FAMS: 'Between runs: perk families', PK_UI: 'Between runs: perk medallions', UI_DEFS: '' };
function sheetFor(obj, key) {
  if (obj === 'CONTENT') return 'Prologue';
  if (obj === 'MT') return /^(prest|thirty|newHS|oldHS)/.test(key) ? 'Rebirth and perks' : /^(reveal|amp[0-9H]|ampOk|ruin)/.test(key) ? 'Modals and key moments' : 'Map and places';
  if (obj === 'PK_FAMS' || obj === 'PK_UI') return 'Rebirth and perks';
  if (obj === 'RELIC_OF' || obj === 'LANDN' || obj === 'RES_WORD' || obj === 'MGROUPS' || obj === 'SCHOLAR' || obj === 'MAPLIGHT') return 'Map and places';
  if (obj === 'WORLD') return /^text\./.test(key) ? 'Journal' : 'Settlers and resources';
  return 'Other';
}
function walk(obj, v, p, loc) {
  if (typeof v === 'string') { const l = locate(v); add({ id: 'ui:' + obj + '.' + p, sheet: sheetFor(obj, p), where: where[obj], what: p, text: v, file: l.file || loc, line: l.line }); return; }
  if (Array.isArray(v)) v.forEach((x, i) => walk(obj, x, p + '[' + i + ']', loc));
  else if (v && typeof v === 'object') for (const k in v) walk(obj, v[k], p ? p + '.' + k : k, loc);
}
function uiDefsSheet(group, key) {
  if (/^Key moments/.test(group)) return 'Modals and key moments';
  if (/scatter|perk|between|rebirth/i.test(group) || /^(pk|prest)\./.test(key)) return 'Rebirth and perks';
  if (/away/i.test(group) || /^a\./.test(key)) return 'Time away';
  if (/^Map|Amplifier|Relic/i.test(group)) return 'Map and places';
  if (/hover|tooltip|tip/i.test(group) || /\.tip\b|\.tip\./.test(key)) return 'Hovers and buttons';
  if (/message|log/i.test(group) || /\.msg\./.test(key)) return 'Journal';
  if (/^Prologue/.test(group)) return 'Prologue';
  return 'Hovers and buttons';
}
for (const [file, name] of UI_OBJECTS) {
  const lit = literalOf(SRC[file], name); if (!lit) { console.error('not found', name); continue; }
  (objRanges[file] = objRanges[file] || []).push([lit.from, lit.to]);
  let val; try { val = vm.runInContext('(' + lit.text + ')', vm.createContext(Object.assign({}, STUB))); } catch (e) { console.error('could not read', name, e.message); continue; }
  if (name === 'UI_DEFS') val.forEach(d => { const l = locate(d[3]); add({ id: 'key:' + d[0], sheet: uiDefsSheet(d[1], d[0]), where: d[1], what: d[2], text: d[3], file: file, line: l.line }); });
  else walk(name, val, '', file);
}

// ---------- 3. strings written straight into the screen code (outside those objects), one row per code line:
// the line's text pieces in order, with {…} where the code fills in a number or a name
const CSS = SRC['src/ui/../styles/game.css'] || fs.readFileSync(path.join(ROOT, 'src/styles/game.css'), 'utf8');
const cssClasses = new Set((CSS.match(/\.[a-zA-Z][\w-]*/g) || []).map(x => x.slice(1)));
function tokens(s) {   // string literals (and templates) outside comments: [{ text, line }]
  const out = []; let i = 0, line = 1;
  const pushStr = (text, at) => out.push({ text, line: at });
  while (i < s.length) {
    const c = s[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { const j = s.indexOf('*/', i + 2); line += (s.slice(i, j).match(/\n/g) || []).length; i = j + 2; continue; }
    if (c === "'" || c === '"') { const at = line; let j = i + 1, t = ''; while (j < s.length && s[j] !== c && s[j] !== '\n') { if (s[j] === '\\') { t += s[j] + s[j + 1]; j += 2; continue; } t += s[j++]; } let v; try { v = JSON.parse('"' + t.replace(/\\'/g, "'").replace(/(^|[^\\])"/g, '$1\\"') + '"'); } catch (e) { v = t; } pushStr(v, at); i = j + 1; continue; }
    if (c === '`') { const at = line; let j = i + 1, t = '', d = 0; while (j < s.length && !(s[j] === '`' && !d)) { if (s[j] === '\n') line++; if (s[j] === '$' && s[j + 1] === '{') { d++; t += '{…}'; j += 2; continue; } if (d) { if (s[j] === '}') d--; j++; continue; } t += s[j++]; } pushStr(t, at); i = j + 1; continue; }
    i++;
  }
  return out;
}
function wordy(t) {
  if (!/[A-Za-z]{3}/.test(t)) return false;
  if (/^\s*<[^>]*>\s*$/.test(t) || (/^[\s<]/.test(t) && !/>[^<]*[A-Za-z]{3}[^<]*</.test(t) && /<\/?[a-z]/.test(t) && !/[a-z]{3,} [a-z]{3,}/.test(t.replace(/<[^>]*>/g, '')))) return false;   // markup only
  const words = t.trim().split(/\s+/);
  if (words.every(w => cssClasses.has(w) || /^[a-z][\w-]*\.[\w.-]+$/.test(w))) return false;   // class lists, text keys
  if (/^(use strict|mouseenter|mouseleave|keydown|click|focus|blur|input|change|resize|visibilitychange|beforeunload|text\/plain)$/.test(t)) return false;
  if (/^[a-z][\w-]*$/.test(t) && !/^(wood|stone|stones|fiber|food|copper|ideas|light|snails|lamp light|light|ready)$/.test(t)) return false;   // ids, keys
  if (/^[\w-]+:[^ ]|^#[\w-]|^\.[a-z][\w-]*(\s|$|[,:>])|^https?:|^data:|var\(--|color-mix|rgba?\(|^[\d.]+(px|rem|em|%)/.test(t)) return false;   // css, urls
  return true;
}
// playtest-only code (the bots, the skip buttons, milestones, the text editor) isn't shipped to players
const PLAYTEST = { 'src/ui/09-away-playtest.js': [[34, 70]], 'src/ui/12-loop-offline.js': [[86, 99999]], 'src/ui/11-milestones.js': [[1, 99999]], 'src/ui/10-text-registry.js': [[1, 99999]] };
function clean(t) {   // a text piece as the player reads it: markup removed
  if (/<svg|viewBox=|points=|style=|\[data-|translate\(|aria-label/.test(t) && !/>[^<]*[A-Za-z]{3}/.test(t)) return '';
  t = t.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^[:"(;#-]|;|--[a-z]|:hover|drop-shadow|stroke|">|^[a-z.]+, [a-z.]+$|^[A-Z]{4,}( |$)/.test(t)) return '';   // css and attribute leftovers
  return t;
}
function codeStrings(file) {
  const s = SRC[file], ranges = (objRanges[file] || []).concat(PLAYTEST[file] || []), lines = s.split('\n'), byLine = {};
  for (const tk of tokens(s)) {
    if (ranges.some(([a, b]) => tk.line >= a && tk.line <= b)) continue;
    (byLine[tk.line] = byLine[tk.line] || []).push(tk.text);
  }
  for (const ln in byLine) {
    if (!byLine[ln].some(wordy)) continue;
    const parts = byLine[ln].map(t => /^[\s.,:;!?()%×+·-]{1,3}$/.test(t) ? t.trim() : wordy(t) ? clean(t) : '').filter(Boolean); if (!parts.some(t => /[A-Za-z]{3}/.test(t)) || parts.every(t => /^[a-z]+:?$/.test(t) || /^[A-Z]{2,5}$/.test(t) || /^[\s.,:;!?()%×+·-]*$/.test(t))) continue;
    const code = lines[ln - 1];
    if (/console\.|throw new|f-bot|f-skip|f-speed|f-miles|botPlay|__T\b|Playtest/.test(code)) continue;
    const text = parts.map(x => x.trim()).filter(Boolean).join(' {…} ');
    if (/^(playtest|Playtest)|Playtest:|playtest/.test(text) || /f-bot|f-skip|botPlay|__T|debug/i.test(code)) continue;   // playtest tools are not shipped text
    add({ id: 'code:' + file + ':' + ln, sheet: 'Text in the screen code', where: file.replace('src/ui/', '').replace('.js', ''), what: 'pieces of one line of code, in order ({…} = filled in by the game)', text, file, line: +ln, code: code.trim().slice(0, 300) });
  }
}
for (const f of Object.keys(SRC).filter(f => f.startsWith('src/ui/'))) codeStrings(f);
// the page's own markup: visible words in src/page/body.html
SRC['src/page/body.html'].split('\n').forEach((ln, i) => { if (/Playtest|id="f-|id="tx/.test(ln)) return; const t = ln.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); if (/[A-Za-z]{3}/.test(t)) add({ id: 'code:src/page/body.html:' + (i + 1), sheet: 'Text in the screen code', where: 'page markup', what: 'words in the page itself', text: t, file: 'src/page/body.html', line: i + 1 }); });

// ---------- flags: the fiction rule, words being retired, stale content
const FLAGS = [[/\btiles?\b/i, 'tile'], [/\bgrid\b/i, 'grid'], [/\b(\d+|\{\w+\}|one|two|three|few) steps?\b|\bsteps? (out|from|away|apart)\b|\bstep \d/i, 'steps'], [/scatter(?!ed in)/i, 'scatter → rebirth?'], [/\bmoonsilver\b/i, 'moonsilver (cut)'],
  [/\banchor/i, 'anchors (cut)'], [/\bacademy\b/i, 'Academy (cut)'], [/\bglowstone|glowcraft/i, 'glowstones (cut)'], [/\bkindled\b/i, 'Kindled (cut)'], [/\brelay/i, 'relays (old name)']];
for (const r of rows) r.flags = FLAGS.filter(([re]) => re.test(r.text)).map(f => f[1]).join(', ');

// ---------- the journal: which rows are written to the log, and the code line that writes them
const LOGCALL = /\b(sys|say|wsay|wonce)\(/;
const allLines = {}; for (const f in SRC) allLines[f] = SRC[f].split('\n');
for (const r of rows) {
  let key = null;
  if (r.id.startsWith('ui:WORLD.text.')) key = 'WORLD.text.' + r.id.slice(14);
  else if (r.id.startsWith('ui:MT.')) key = 'MT.' + r.id.slice(6);
  else if (r.id.startsWith('key:')) key = "tx('" + r.id.slice(4) + "'";
  const hits = [];
  for (const f in allLines) if (f.startsWith('src/ui/')) allLines[f].forEach((ln, i) => {
    if (!LOGCALL.test(ln)) return;
    if ((key && new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\w)').test(ln)) || (r.id.startsWith('code:') && r.file === f && r.line === i + 1)) hits.push(f.replace('src/ui/', '') + ':' + (i + 1) + '  ' + ln.trim().slice(0, 240));
  });
  if (hits.length) { r.journal = true; r.trigger = hits.join('\n'); r.sheet = 'Journal'; }
}
const WHEN = JSON.parse(fs.readFileSync(path.join(__dirname, 'journal-triggers.json'), 'utf8'));
for (const r of rows) if (r.sheet === 'Journal') r.when = WHEN[r.id] || (r.journal ? '' : 'Not written to the journal by any code now (kept text, or unused).');
process.stdout.write(JSON.stringify(rows, null, 1));
console.error(rows.length + ' rows; ' + rows.filter(r => r.journal).length + ' journal; ' + rows.filter(r => r.flags).length + ' flagged');
