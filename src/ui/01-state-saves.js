/* ---------- State and saves (keyed, versioned, migratable) ---------- */
// The test build keeps the save key the owner's playtests have always used; the public build has its own.
const SAVE_KEY = GAME.branch ? 'flicker-' + GAME.branch + '-branch-v1' + (GAME.test ? '' : '-public') : GAME.test ? 'flicker-map1-branch-v1' : 'flicker-v0';   // the rebirth branch keeps its own save
const GOOD_KEY = SAVE_KEY + '.good';       // v1s: an automatic copy of the last save that loaded cleanly
const SAVE_VERSION = 1;
const MIGRATIONS = {};                     // MIGRATIONS[n](o) turns a version-n save into version n+1; every public save must keep loading

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
    w: s.w, meta: s.meta || null, view: s.view || null, inPerks: !!s.inPerks, speed: s.speed || 1, showDone: !!s.showDone, showDoneIdeas: !!s.showDoneIdeas, showDoneBuilds: !!s.showDoneBuilds, playTime: s.playTime || 0,
    opt: s.opt || null, lastBackup: s.lastBackup || 0, lastBuild: s.lastBuild || null, counted: s.counted || null, persistAsked: !!s.persistAsked, born: s.born || 0,
    lastSeen: Date.now(), log: s.log.slice(0, 30) });
}
function deserialize(json) {
  let o = JSON.parse(json);
  if (!o || typeof o !== 'object' || !o.stats) throw new Error('not a save');
  for (let v = (o.v || 1); v < SAVE_VERSION; v++) { if (MIGRATIONS[v]) o = MIGRATIONS[v](o); }
  const s = fresh();
  s.motes = D(o.motes || 0); s.form = D(o.form || 0); s.formEver = o.formEver || 0; s.drift = o.drift || 0;
  s.parts = o.parts || {}; s.ups = o.ups || {}; s.flags = o.flags || {};
  const st = o.stats || {};
  s.stats = { motesEver: D(st.motesEver || 0), gathers: st.gathers || 0,
    startedAt: st.startedAt || Date.now(), finishedAt: st.finishedAt || null };
  s.lastSeen = o.lastSeen || Date.now(); s.log = Array.isArray(o.log) ? o.log : [];
  s.w = o.w || null; s.meta = o.meta || null; s.view = o.view || null; s.inPerks = !!o.inPerks; s.speed = o.speed || 1; s.showDone = !!o.showDone; s.showDoneIdeas = !!o.showDoneIdeas; s.showDoneBuilds = !!o.showDoneBuilds; s.playTime = o.playTime || 0;
  s.opt = o.opt || null; s.lastBackup = o.lastBackup || 0; s.lastBuild = o.lastBuild || null; s.counted = o.counted || null; s.persistAsked = !!o.persistAsked; s.born = o.born || 0;
  if (!GAME.test) { s.speed = 1; s.debug = false; }   // the public build has no playtest speed or tools
  return s;
}
// the text a player keeps: the same format the game has always exported
const exportText = () => btoa(unescape(encodeURIComponent(serialize(S))));
const importText = t => deserialize(decodeURIComponent(escape(atob(String(t).trim()))));

/* v1s: one tab at a time. The tab playing holds a lock it renews every second or so; a second tab waits behind a wall
   (it can take over), and a tab that loses the lock stops saving, so two tabs never overwrite each other. */
const TAB = { id: Math.random().toString(36).slice(2), owner: true, key: SAVE_KEY + '.tab' };
function tabRead() { try { return JSON.parse(localStorage.getItem(TAB.key) || 'null'); } catch (e) { return null; } }
function tabWrite(t) { try { localStorage.setItem(TAB.key, JSON.stringify({ id: TAB.id, t: t == null ? Date.now() : t })); } catch (e) {} }
const tabOther = () => { const l = tabRead(); return !!(l && l.id !== TAB.id && Date.now() - l.t < 5000); };
{ let take = false; try { take = sessionStorage.getItem('flicker-take') === '1'; sessionStorage.removeItem('flicker-take'); } catch (e) {}
  if (!take && tabOther()) TAB.owner = false; else tabWrite(); }

let lastGood = 0;
function save(quiet) {
  if (!TAB.owner) return;
  try { const raw = serialize(S); localStorage.setItem(SAVE_KEY, raw); if (!quiet) notice('Saved.');
    if (Date.now() - lastGood > 30 * 60000) { lastGood = Date.now(); localStorage.setItem(GOOD_KEY, JSON.stringify({ at: Date.now(), raw })); } }
  catch (e) { notice('Could not save in this browser. Open Save and download a copy to keep your game.'); }
}
let LOAD_NOTE = '';
function loadSaved() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY) || (GAME.test && !GAME.branch ? localStorage.getItem('flicker-village-rebuild-v1') : null); } catch (e) { return null; }
  if (!raw) return null;
  try { const s = deserialize(raw); try { localStorage.setItem(GOOD_KEY, JSON.stringify({ at: Date.now(), raw })); lastGood = Date.now(); } catch (e) {} return s; }
  catch (err) {
    // the save could not be read: keep it aside, and load the automatic copy instead of starting over
    try { localStorage.setItem(SAVE_KEY + '.unreadable', raw); } catch (e) {}
    try { const g = JSON.parse(localStorage.getItem(GOOD_KEY) || 'null'); if (g && g.raw) { const s = deserialize(g.raw);
      LOAD_NOTE = 'Your save could not be read, so the game loaded its automatic copy from ' + new Date(g.at).toLocaleString() + '. The unreadable save is kept aside.'; return s; } } catch (e) {}
    LOAD_NOTE = 'Your save could not be read. It is kept aside in this browser; if you have a downloaded copy, load it from Save.';
    return null;
  }
}
