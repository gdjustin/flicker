/* ---------- State and saves (keyed, versioned, migratable) ---------- */
// v20: the main save again. The village projects branch's save is read once if it was played more recently
// v22 branch: its own save, so playing it never touches the main prototype's. The first time, it starts from the main save
const SAVE_KEY = 'flicker-map1-branch-v1';   // its own save; the first time, it starts from the village rebuild's
const SAVE_VERSION = 1;
const MIGRATIONS = {};

function fresh() {
  return { motes: D(0), form: D(0), formEver: 0, drift: 0, parts: {}, ups: {}, flags: {},
    stats: { motesEver: D(0), gathers: 0, startedAt: Date.now(), finishedAt: null },
    lastSeen: Date.now(), log: [], w: null, speed: 1 };
}
function serialize(s) {
  return JSON.stringify({ v: SAVE_VERSION, motes: s.motes.toString(), form: s.form.toString(),
    formEver: s.formEver, drift: s.drift, parts: s.parts, ups: s.ups, flags: s.flags,
    stats: { motesEver: s.stats.motesEver.toString(), gathers: s.stats.gathers,
      startedAt: s.stats.startedAt, finishedAt: s.stats.finishedAt },
    w: s.w, meta: s.meta || null, view: s.view || null, inPerks: !!s.inPerks, speed: s.speed || 1, showDone: !!s.showDone, showDoneIdeas: !!s.showDoneIdeas, showDoneBuilds: !!s.showDoneBuilds, playTime: s.playTime || 0, lastSeen: Date.now(), log: s.log.slice(0, 30) });
}
function deserialize(json) {
  let o = JSON.parse(json);
  for (let v = (o.v || 1); v < SAVE_VERSION; v++) { if (MIGRATIONS[v]) o = MIGRATIONS[v](o); }
  const s = fresh();
  s.motes = D(o.motes || 0); s.form = D(o.form || 0); s.formEver = o.formEver || 0; s.drift = o.drift || 0;
  s.parts = o.parts || {}; s.ups = o.ups || {}; s.flags = o.flags || {};
  const st = o.stats || {};
  s.stats = { motesEver: D(st.motesEver || 0), gathers: st.gathers || 0,
    startedAt: st.startedAt || Date.now(), finishedAt: st.finishedAt || null };
  s.lastSeen = o.lastSeen || Date.now(); s.log = Array.isArray(o.log) ? o.log : [];
  s.w = o.w || null; s.meta = o.meta || null; s.view = o.view || null; s.inPerks = !!o.inPerks; s.speed = o.speed || 1; s.showDone = !!o.showDone; s.showDoneIdeas = !!o.showDoneIdeas; s.showDoneBuilds = !!o.showDoneBuilds; s.playTime = o.playTime || 0;
  return s;
}
function save(quiet) {
  try { localStorage.setItem(SAVE_KEY, serialize(S)); if (!quiet) notice('Saved.'); }
  catch (e) { notice('Could not save in this browser. Use Export save to keep a copy.'); }
}
function loadSaved() {
  try { const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('flicker-village-rebuild-v1'); return raw ? deserialize(raw) : null; } catch (e) { return null; }
}

