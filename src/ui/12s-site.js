/* ---------- The site around the game (v1s, public readiness) ----------
   The footer, save tools and the backup dot, settings, the changelog and About, one tab at a time,
   the version stamp and the new-version notice, and anonymous milestone counts. */
// (defaults inside the function: other parts call opt() before this file has run)
function opt(k) { const o = (typeof S !== 'undefined' && S && S.opt) || {}; return o[k] == null ? ({ num: 'short', calm: null, confirmRebirth: true, counts: true })[k] : o[k]; }
function setOpt(k, v) { S.opt = Object.assign({}, S.opt || {}); S.opt[k] = v; applyOpts(); save(true); render(); }
function applyOpts() {
  let calm = opt('calm'); if (calm == null) { try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { calm = false; } }
  document.body.classList.toggle('calm', !!calm);
}
const DAY = 86400000;
const ago = t => { const s = (Date.now() - t) / 1000; if (s < 90) return 'just now'; if (s < 5400) return Math.round(s / 60) + ' minutes ago';
  if (s < 129600) return Math.round(s / 3600) + ' hours ago'; const d = Math.round(s / 86400); return d === 1 ? 'a day ago' : d + ' days ago'; };

/* ---- the panel: one dialog for save tools, settings, the changelog and About ---- */
let panelKind = '', panelBack = null;
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function pbtn(label, fn, cls) { const b = el('button', 'act' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('click', fn); return b; }
// a button that needs a second click within a few seconds
function armBtn(label, armed, fn, cls) { const b = pbtn(label, () => { if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = armed; setTimeout(() => { delete b.dataset.arm; b.textContent = label; }, 5000); return; } fn(b); }, cls); return b; }
function openPanel(kind) {
  panelKind = kind; panelBack = document.activeElement; const body = $('panel-body'); body.textContent = '';
  const h = { save: 'Save', settings: 'Settings', changes: 'Changelog', about: 'About', guide: tx('g.title') }[kind]; $('panel-h').textContent = h;
  ({ save: panelSave, settings: panelSettings, changes: panelChanges, about: panelAbout, guide: panelGuide })[kind](body);
  $('panel').classList.remove('hidden'); $('panel-x').focus();
}
function closePanel() { $('panel').classList.add('hidden'); panelKind = ''; if (panelBack && panelBack.focus) try { panelBack.focus(); } catch (e) {} }

/* ---- save tools ---- */
function markBackup() { S.lastBackup = Date.now(); save(true); renderSaveDot(); }
// In the Claude artifact the viewer must allow a download (the downloads capability); elsewhere a plain file link works.
let DL;   // undefined: not known yet; null: not offered here
try { if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(d => { DL = d; }, () => { DL = null; }); else DL = null; } catch (e) { DL = null; }
function saveName() { return GAME.title.toLowerCase().replace(/\W+/g, '-') + '-save-' + new Date().toISOString().slice(0, 10) + '.txt'; }
// resolves true when the file was handed over
function downloadSave() {
  const text = exportText();
  if (DL) return DL.save({ filename: saveName(), data: text }).then(() => { markBackup(); return true; },
    e => { notice(e && e.code === 'declined' ? 'Download cancelled.' : 'This view can\u2019t download files. Use Copy as text instead.'); return false; });
  try { const blob = new Blob([text], { type: 'text/plain' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = saveName();
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); markBackup(); return Promise.resolve(true); }
  catch (e) { notice('This browser would not download the file. Use Copy as text instead.'); return Promise.resolve(false); }
}
function loadFrom(s, what) {
  try { localStorage.setItem(SAVE_KEY + '.before-load', serialize(S)); } catch (e) {}   // the game being replaced, kept aside once
  S = s; S.lastBackup = Date.now(); save(true); notice(what); location.reload();
}
function panelSave(body) {
  body.appendChild(el('p', '', 'Your game saves itself in this browser every few seconds. Browsers sometimes clear what sites store, so keep a copy of your own now and then.'));
  body.appendChild(el('p', 'pmut', S.lastBackup ? 'You last kept a copy ' + ago(S.lastBackup) + '.' : 'You haven’t kept a copy of this game yet.'));
  const row = el('div', 'prow'); body.appendChild(row);
  const out = el('textarea', 'ptext hidden'); out.readOnly = true; out.setAttribute('aria-label', 'Your save, as text');
  row.appendChild(pbtn('Download a copy', () => downloadSave().then(ok => { if (ok) { notice('Copy downloaded.'); if (panelKind === 'save') openPanel('save'); } }), 'primary'));
  row.appendChild(pbtn('Copy as text', () => { out.value = exportText(); out.classList.remove('hidden'); out.focus(); out.select(); let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {} if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(() => notice('Save copied. Paste it somewhere safe.'), () => {});
    if (ok) notice('Save copied. Paste it somewhere safe.'); markBackup(); }));
  body.appendChild(out);

  body.appendChild(el('h3', '', 'Load a save'));
  body.appendChild(el('p', 'pmut', 'From a file you downloaded, or text you copied. It replaces the game you have now.'));
  const inp = el('textarea', 'ptext'); inp.placeholder = 'Paste save text here'; inp.setAttribute('aria-label', 'Save text to load');
  const file = el('input'); file.type = 'file'; file.accept = '.txt,text/plain'; file.className = 'hidden';
  file.addEventListener('change', () => { const f = file.files && file.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { inp.value = String(r.result || '').trim(); check(); }; r.readAsText(f); });
  const msg = el('p', 'pmut');
  let parsed = null; const check = () => { parsed = null; const t = inp.value.trim(); if (!t) { msg.textContent = ''; go.disabled = true; return; }
    try { parsed = importText(t); const w = parsed.w; msg.textContent = 'A good save: ' + (w && w.m ? (w.m.restored || 0) + ' places called back' : w ? (w.pop || 0) + ' settlers' : 'the very beginning') + (parsed.meta && parsed.meta.run > 1 ? ', run ' + parsed.meta.run : '') + '.'; go.disabled = false; }
    catch (e) { msg.textContent = 'That isn’t a save this game can read. Check that you copied all of it.'; go.disabled = true; } };
  inp.addEventListener('input', check);
  const go = armBtn('Load this save', 'Click again: this replaces your game', () => { if (parsed) loadFrom(parsed, 'Save loaded.'); });
  go.disabled = true;
  const r2 = el('div', 'prow'); r2.append(pbtn('Choose a file', () => file.click()), go);
  body.append(inp, file, msg, r2);

  let good = null; try { good = JSON.parse(localStorage.getItem(GOOD_KEY) || 'null'); } catch (e) {}
  if (good && good.raw) { body.appendChild(el('h3', '', 'The automatic copy'));
    body.appendChild(el('p', 'pmut', 'The game also keeps one copy of a save that loaded cleanly, from ' + new Date(good.at).toLocaleString() + '. Go back to it only if something went wrong.'));
    const r3 = el('div', 'prow'); r3.appendChild(armBtn('Go back to it', 'Click again: this replaces your game', () => { try { loadFrom(deserialize(good.raw), 'Automatic copy loaded.'); } catch (e) { notice('The automatic copy could not be read.'); } })); body.appendChild(r3); }

  const st = el('p', 'pmut'); body.appendChild(st);
  try { if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(ok => {
    st.textContent = ok ? 'This browser has agreed to keep the game’s storage.' : 'This browser may clear the game’s storage if it runs short of space. Keeping a copy is the safe way.';
    if (!ok && navigator.storage.persist) { const b = pbtn('Ask the browser to keep it', () => navigator.storage.persist().then(y => { notice(y ? 'The browser will keep the game’s storage.' : 'The browser said no. Keep a copy now and then.'); openPanel('save'); })); b.classList.add('slim'); st.after(b); } }); } catch (e) {}
}

/* ---- settings ---- */
function panelSettings(body) {
  const choice = (label, key, opts, help) => { const f = el('fieldset', 'pset'); f.appendChild(el('legend', '', label));
    opts.forEach(([v, t]) => { const l = el('label', 'popt'), r = el('input'); r.type = 'radio'; r.name = 'o-' + key; r.checked = opt(key) === v || (v === 'os' && opt(key) == null);
      r.addEventListener('change', () => setOpt(key, v === 'os' ? null : v)); l.append(r, ' ' + t); f.appendChild(l); });
    if (help) f.appendChild(el('p', 'pmut', help)); body.appendChild(f); };
  choice('Large numbers', 'num', [['short', 'Short: 340k, 1.2m, 12.6b, 4.1t'], ['full', 'In full: 1,234,567,890'], ['sci', 'Scientific: 1.23e9']]);
  choice('Motion', 'calm', [['os', 'As this device is set'], [true, 'Reduce motion'], [false, 'Full motion']], 'Reduce motion stills the glows, pulses and drifting motes.');
  choice('Before a rebirth', 'confirmRebirth', [[true, 'Show what it brings, and ask first'], [false, 'Go straight to choosing gifts']]);
  if (GAME.countUrl && !GAME.test) choice('Anonymous counts', 'counts', [[true, 'Send them'], [false, 'Don’t send them']], ABOUT.privacyCounts);
  const f = el('fieldset', 'pset'); f.appendChild(el('legend', '', 'Saves')); const r = el('div', 'prow'); r.appendChild(pbtn('Open the save tools', () => openPanel('save'))); f.appendChild(r); body.appendChild(f);
  // the rebirth branch (Considering, owner 2026-10-18): go back to the moment before the last rebirth and choose again
  { let back = null; try { back = MC.D.rb.on ? localStorage.getItem(SAVE_KEY + '.back') : null; } catch (e) {}
    if (back) { const g = el('fieldset', 'pset'); g.appendChild(el('legend', '', 'Your last rebirth'));
      g.appendChild(el('p', 'pmut', 'Go back to the moment before your last rebirth, with the same heartstones, and choose your gifts again. Everything since then is lost.'));
      const gr = el('div', 'prow'); g.appendChild(gr);
      gr.appendChild(armBtn('Go back to the last rebirth', 'Click again: everything since is lost', () => { try { localStorage.setItem(SAVE_KEY + '.before-back', serialize(S)); localStorage.setItem(SAVE_KEY, back); } catch (e) {} TAB.owner = false; location.reload(); }));
      body.appendChild(g); } }
  const z = el('fieldset', 'pset danger'); z.appendChild(el('legend', '', 'Start over'));
  z.appendChild(el('p', 'pmut', 'Erases this game: every run, heartstone and gift. The game downloads a copy first, so you can come back to it.'));
  const zr = el('div', 'prow'); z.appendChild(zr);
  const step2 = armBtn('Erase this game', 'Click again to erase everything', () => { try { localStorage.setItem(SAVE_KEY + '.before-reset', serialize(S)); localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '.back'); } catch (e) {}
    const keep = { opt: S.opt }; S = Object.assign(fresh(), keep); save(true); location.reload(); }, 'bad');
  step2.disabled = true;
  zr.append(pbtn('Download a copy first', () => downloadSave().then(() => { step2.disabled = false; })), step2);
  body.appendChild(z);
}

/* ---- What do I do? (r1d, owner): light guidance, a section for each part of the game reached, the newest on top ---- */
const GUIDE = [['g.h.reb', 'g.reb', 3], ['g.h.map', 'g.map', 5], ['g.h.vil', 'g.vil', 4], ['g.h.pro', 'g.pro', 1]];
function guideReached() {   // 0 prologue, 1 the village, 2 the map (run 1), 3 runs 2 and on
  const m = S.meta || {}; if ((m.run || 1) > 1) return 3; if (S.w && S.w.m) return 2; return S.flags && S.flags.stood ? 1 : 0;
}
function panelGuide(body) {
  const got = guideReached();
  GUIDE.slice(GUIDE.length - 1 - got).forEach(([h, pre, n]) => { body.appendChild(el('h3', '', tx(h))); const ul = el('ul', 'pguide');
    for (let i = 1; i <= n; i++) ul.appendChild(el('li', '', tx(pre + '.' + i))); body.appendChild(ul); });
}

/* ---- changelog and About ---- */
function panelChanges(body) {
  for (const c of CHANGELOG) { const s = el('section', 'pchg'); s.appendChild(el('h3', '', [c.version, c.title, c.date].filter(Boolean).join(' · ')));
    if (c.internal && GAME.test) s.appendChild(el('p', 'pmut', 'Covers ' + c.internal + '.'));   // internal names show in the test build only
    for (const [h, items] of c.sections) { s.appendChild(el('h4', '', h)); const ul = el('ul'); items.forEach(t => ul.appendChild(el('li', '', t))); s.appendChild(ul); }
    body.appendChild(s); }
}
function panelAbout(body) {
  body.appendChild(el('p', 'plead', ABOUT.lead));
  if (ABOUT.inspirations) { body.appendChild(el('h3', '', 'Inspirations')); body.appendChild(el('p', '', ABOUT.inspirations)); }
  const dl = el('dl', 'away-list'); ABOUT.credits.forEach(([a, b]) => { dl.append(el('dt', '', a), el('dd', '', b)); }); body.appendChild(dl);
  body.appendChild(el('h3', '', 'Licences'));
  ABOUT.licences.forEach((t, i) => { const p = el('p', 'pmut', t); if (i === 0 && GAME.links.source) { const a = el('a', '', 'Read the code'); a.href = GAME.links.source; a.target = '_blank'; a.rel = 'noopener'; p.append(' ', a, '.'); } body.appendChild(p); });
  body.appendChild(el('h3', '', 'Privacy'));
  body.appendChild(el('p', 'pmut', ABOUT.privacy + (GAME.countUrl && !GAME.test ? ' ' + ABOUT.privacyCounts : '')));
  body.appendChild(el('p', 'pmut', 'Version ' + GAME.version + (GAME.test ? ' (test build ' + GAME.internal + ')' : '') + '.'));
}

/* ---- footer ---- */
function renderSaveDot() {
  const since = S.lastBackup || (S.stats && S.stats.startedAt) || Date.now(), due = !!S.flags.stood && Date.now() - since > DAY;
  $('f-save').classList.toggle('bdot', due); $('f-save').title = due ? 'You haven’t kept a copy of your game for over a day. Open Save to download one.' : '';
}
function linkBtn(id, url, name) { const a = $(id);
  if (url) { a.href = url; a.classList.remove('hidden'); }
  else if (GAME.test) { a.removeAttribute('href'); a.setAttribute('role', 'button'); a.tabIndex = 0; a.onclick = () => notice('The ' + name + ' link isn’t set yet (GAME.links in src/config.js).'); }
  else a.classList.add('hidden'); }
$('f-ver').textContent = GAME.version + (GAME.test ? ' test · ' + GAME.internal : '');
linkBtn('f-feedback', GAME.links.feedback, 'feedback'); linkBtn('f-discord', GAME.links.discord, 'Discord');
$('f-save').addEventListener('click', () => openPanel('save'));
$('f-settings').addEventListener('click', () => openPanel('settings'));
$('f-changes').addEventListener('click', () => openPanel('changes'));
$('f-about').addEventListener('click', () => openPanel('about'));
$('f-guide').addEventListener('click', () => openPanel('guide'));
$('panel-x').addEventListener('click', closePanel);
$('panel').addEventListener('click', e => { if (e.target === $('panel')) closePanel(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelKind) closePanel(); });

/* ---- one tab at a time ---- */
function tabLose() { if (!TAB.owner && !$('tabwall').classList.contains('hidden')) return; TAB.owner = false;
  try { $('away').classList.add('hidden'); closePanel(); } catch (e) {} $('tabwall').classList.remove('hidden'); $('tabwall-go').focus(); }
$('tabwall-go').addEventListener('click', () => { try { sessionStorage.setItem('flicker-take', '1'); } catch (e) {} TAB.id = 'x'; tabWrite(); location.reload(); });
if (!TAB.owner) tabLose();
setInterval(() => { if (!TAB.owner) return; if (tabOther()) tabLose(); else tabWrite(); }, 1200);
window.addEventListener('storage', e => { if (e.key === TAB.key && TAB.owner && tabOther()) tabLose(); });
window.addEventListener('pagehide', () => { if (TAB.owner) { save(true); tabWrite(0); } });

/* ---- versions: an update notice after loading a newer build, and a reload notice when one is out ---- */
{ const build = GAME.version + (GAME.test ? '/' + GAME.internal : '');
  if (S.lastBuild && S.lastBuild !== build) { $('newver-t').textContent = 'Updated to ' + GAME.version + (GAME.test ? ' (' + GAME.internal + ')' : '') + '.';
    $('newver-go').textContent = 'See what changed'; $('newver-go').onclick = () => { $('newver').classList.add('hidden'); openPanel('changes'); }; $('newver').classList.remove('hidden');
    setTimeout(() => $('newver').classList.add('hidden'), 20000); }
  S.lastBuild = build; }
function checkVersion() {
  if (!/^https?:$/.test(location.protocol) || /claude\.ai|claudeusercontent/.test(location.hostname)) return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => {
    if (!j || !j.version || (j.version === GAME.version && (!GAME.test || j.internal === GAME.internal))) return;
    $('newver-t').textContent = 'A new version (' + j.version + ') is out.'; $('newver-go').textContent = 'Reload to play it';
    $('newver-go').onclick = () => { save(true); location.reload(); }; $('newver').classList.remove('hidden'); }).catch(() => {});
}
setTimeout(checkVersion, 60000); setInterval(checkVersion, 15 * 60000);

/* ---- anonymous milestone counts (owner, 2026-10-17): five points, once per game, sent to the owner's Google Sheet
   (tools/counter/Code.gs). Each note says which point, hours played, days since the game began, the run and the version;
   nothing identifies the player. Only the public build sends, only from a real web address, and only if the setting allows. */
function countMile(k) {
  const name = ({ prologue: 'prologue', stood: 'village', map: 'map', run2: 'rebirth1', demoEnd: 'end' })[k]; if (!name) return;
  if (GAME.test || GAME.branch || !GAME.countUrl || opt('counts') === false) return;   // a design branch never counts
  if (!(location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) || /claude\.ai|claudeusercontent/.test(location.hostname)) return;
  S.counted = S.counted || {}; if (S.counted[name]) return; S.counted[name] = 1;
  const born = S.born || (S.stats && S.stats.startedAt) || Date.now();
  const body = JSON.stringify({ m: name, play: Math.round((S.playTime || 0) / 36) / 100, days: Math.round((Date.now() - born) / 864000) / 100, run: (S.meta && S.meta.run) || 1, v: GAME.version });
  try { if (navigator.sendBeacon && navigator.sendBeacon(GAME.countUrl, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
  try { fetch(GAME.countUrl, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body }); } catch (e) {}
}
if (!S.born) S.born = (S.stats && S.stats.startedAt) || Date.now();   // when this game began; a rebirth keeps it
if (!S.flags.stood && !(S.meta && S.meta.run > 1)) countMile('prologue');

/* ---- once the player stands, ask the browser to keep the game's storage (a calm moment for any prompt) ---- */
setInterval(() => { renderSaveDot();
  if (S.flags.stood && !S.persistAsked && TAB.owner) { S.persistAsked = true; try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {} } }, 60000);
applyOpts(); renderSaveDot();
if (LOAD_NOTE) setTimeout(() => notice(LOAD_NOTE), 300);
