/* ---------- Game text registry (see Game text above) ---------- */
const TEXT = [];
function regText(group, label, key, obj, field) { if (obj && typeof obj[field] === 'string') TEXT.push({ key, group, label, def: obj[field], obj, field }); }
function buildTextRegistry() {
  const F = { name: 'name', desc: 'description', msg: 'message', label: 'button', labelAxe: 'button with the axe', tag: 'short tag', gives: 'what it gives' };
  const each = (group, list, prefix, fields, nameOf) => list.forEach(it => fields.forEach(f =>
    regText(group, nameOf(it) + ' · ' + F[f], prefix + '.' + (it.id || it.res) + '.' + f, it, f)));
  each('Prologue: becoming', CONTENT.parts, 'p.part', ['name', 'desc', 'msg'], it => it.name);
  each('Prologue: learning', CONTENT.upgrades, 'p.up', ['name', 'desc', 'msg'], it => it.name);
  CONTENT.self.forEach((x, i) => regText('Prologue', 'Title: ' + x.text, 'p.self.' + i, x, 'text'));
  Object.keys(WORLD.res).forEach(k => regText('Village: resource hovers', 'Resource name: ' + WORLD.res[k], 'world.res.' + k, WORLD.res, k));
  WORLD.looks.forEach((x, i) => regText('Village: looking around', 'Look ' + (i + 1), 'world.look.' + i, x, 'text'));
  each('Village: actions', WORLD.gathers, 'world.gather', ['label', 'labelAxe'], it => WORLD.res[it.res]);
  each('Village: ideas and upgrades', VC.CARDS, 'world.card', ['name', 'desc'], it => it.name);
  each('Village: buildings and tools', VC.LADDERS, 'world.lad', ['name', 'desc'], it => it.name);
  each('Village: projects', VC.PROJECTS, 'world.proj', ['name', 'gives'], it => it.name);
  VC.PROJECTS.forEach(p => p.stages.forEach((st, i) => regText('Village: projects', p.name + ' · stage ' + (i + 1), 'world.proj.' + p.id + '.stage' + i, st, 'name')));
  each('Village: settlers', VC.JOBS, 'world.job', ['name', 'desc', 'tag'], it => it.name);
  Object.keys(WORLD.groups).forEach(k => regText('Village: headings and buttons', 'Buildings group: ' + WORLD.groups[k], 'world.group.' + k, WORLD.groups, k));
  Object.keys(WORLD.kinds).forEach(k => regText('Village: headings and buttons', 'Card kind: ' + WORLD.kinds[k], 'vw.kind.' + k, WORLD.kinds, k));
  Object.keys(WORLD.text).forEach(k => regText('Village messages', k, 'world.text.' + k, WORLD.text, k));
  UI_DEFS.forEach(d => regText(d[1], d[2], d[0], UI, d[0]));
  Object.keys(MT).forEach(k => regText('Map (phase 1 branch)', k, 'mt.' + k, MT, k));
}
buildTextRegistry();
const TEXT_BY_KEY = Object.fromEntries(TEXT.map(e => [e.key, e]));
try { const m = JSON.parse(localStorage.getItem('spark-text-overrides') || '{}'); for (const e of TEXT) if (Object.prototype.hasOwnProperty.call(m, e.key)) e.obj[e.field] = m[e.key]; } catch (err) { /* ignore */ }

