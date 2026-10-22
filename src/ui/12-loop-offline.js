/* ---------- Loop and offline progress ---------- */
let S = loadSaved() || fresh();
// v1m: copper hearth levels bought before it was removed are refunded (their light no longer counts)
try { const w0 = S.w; if (w0 && w0.m && !MC.D.chearth.on && (w0.m.lv.chearth || 0) > 0) { const n0 = w0.m.lv.chearth; let cu = 0, st = 0;
  for (let i = 0; i < n0; i++) { const g = MC.D.chearth.g, m = Math.pow(g, i); cu += Math.ceil(MC.D.chearth.cost.copper * m); st += Math.ceil(MC.D.chearth.cost.stones * m); }
  w0.m.lv.chearth = 0; w0.res.copper = (w0.res.copper || 0) + cu; w0.res.stones = (w0.res.stones || 0) + st; w0.m.refundHearth = [n0, cu, st]; } } catch (e) {}
// r1f: saves from before village research was recorded: the village learned so far this run counts as learned before
try { const m0 = S.meta; if (m0 && (m0.run || 1) > 1 && !m0.vcards && S.w && S.w.cards) m0.vcards = Object.keys(S.w.cards); } catch (e) {}
// v1r: a tower whose build finished before the fix lights now
try { if (S.w && S.w.m) MC.repairAmps(S.w); } catch (e) {}
// v1h: a save from before the copper store keeps its copper: Lined stockpiles comes free if more than the chest holds
try { if (S.w && S.w.m && S.w.m.copperFound && !S.w.m.cards.cubins && (S.w.res.copper || 0) > MC.D.cuBase) S.w.m.cards.cubins = true; } catch (e) {}
const awayCap = () => (S.w && S.w.m ? MC.awayHours(S.w) * 3600 : CONTENT.offlineCapSeconds);
function applyElapsed(seconds, announce) {
  if (seconds <= 0) return;
  const capped = Math.min(seconds, awayCap());
  if (S.flags.stood) {
    if (!S.w) return;
    const snap = announce && seconds > 60 ? awaySnap() : null;
    const step = capped > 3600 ? 5 : 1; let left = capped;
    while (left > 0) { const st = Math.min(step, left); worldTick(st, true); left -= st; }
    if (announce) S.playTime = (S.playTime || 0) + capped;
    if (snap) { const rep = awayReport(snap, seconds, capped); sys(rep.logLine); if (seconds >= 300) showAway(rep); }
    return;
  }
  if (S.drift === 0) return;
  const gained = rate() * capped; gainMotes(gained);
  if (announce && capped > 30) say(seeing() ? tx('p.msg.away', { n: fmt(D(gained)) }) : tx('p.msg.awayVague'));
  if (announce && seconds > capped + 60) sys(tx('p.msg.awaycap', { h: awayDur(capped) }));
}
function awayDur(sec) {
  sec = Math.round(sec); const d = sec > 86400 + 59 ? Math.floor(sec / 86400) : 0, h = Math.floor((sec - d * 86400) / 3600), m = Math.floor(sec % 3600 / 60), parts = [];
  if (d) parts.push(tx(d === 1 ? 'a.day' : 'a.days', { n: d })); if (h) parts.push(tx(h === 1 ? 'a.hour' : 'a.hours', { n: h })); if (m && !d) parts.push(tx(m === 1 ? 'a.min' : 'a.mins', { n: m }));
  return parts.length ? parts.join(' ') : tx('a.mins', { n: 1 });
}
function affordableNow() {
  const w = W(), out = {};
  for (const c of VC.CARDS) if (w.cards[c.id] == null && VC.gateOk(w, c.at) && VC.canPay(w, VC.cardCost(w, c))) out['c:' + c.id] = c.name;
  for (const l of VC.LADDERS) if (VC.ladderOpen(w, l) && !VC.ladderMaxed(w, l) && VC.canPay(w, VC.ladderCost(w, l))) out['l:' + l.id] = l.name;
  return out;
}
function awaySnap() { if (inMap()) return mapAwaySnap(); const w = W(); return { res: Object.assign({}, w.res), pop: w.pop, pct: w.pct, afford: affordableNow(), done: Object.keys(w.done) }; }
function awayReport(a, seconds, capped) {
  if (inMap()) return mapAwayReport(a, seconds, capped);
  const w = W(), rows = [], rep = { title: tx('a.title'), rows, res: [], fresh: [] };
  rep.time = seconds > capped + 60 ? tx('a.time.capped', { away: awayDur(seconds), kept: awayDur(capped) }) : tx('a.time.full', { away: awayDur(seconds) });
  rep.logLine = seconds > capped + 60 ? tx('a.log.capped', { away: awayDur(seconds), kept: awayDur(capped) }) : tx('a.log.full', { away: awayDur(seconds) });
  if (w.pop !== a.pop) rows.push([tx('a.row.settlers'), tx('a.settlers', { n: w.pop - a.pop, pop: w.pop })]);
  const nb = Object.keys(w.done).filter(k => !a.done.includes(k)); if (nb.length) rows.push([tx('vw.a.built'), nb.map(k => VC.PROJ[k].name).join(', ')]);
  if (w.pct > a.pct) rows.push([tx('a.row.light'), tx('a.light.home', { pct: fmtW(w.pct, 1) })]);
  for (const r of WORLD.resOrder) { if (!w.seen[r]) continue; const d = (w.res[r] || 0) - (a.res[r] || 0); if (Math.abs(d) < 1) continue; rep.res.push({ name: resName(r), d, full: w.res[r] >= cap(r) - 0.5 }); }
  const now = affordableNow(); rep.fresh = Object.keys(now).filter(k => !a.afford[k]).map(k => now[k]);
  return rep;
}
function showAway(rep) {
  $('away-h').textContent = rep.title; $('away-time').textContent = rep.time; $('away-more').classList.toggle('hidden', !rep.more); $('away-more').textContent = rep.more || '';
  const dl = $('away-list'); dl.innerHTML = ''; rep.rows.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); });
  const rs = $('away-res'); rs.innerHTML = '';
  if (rep.res.length) { const h = document.createElement('p'); h.className = 'away-sub'; h.textContent = tx('a.res.h'); rs.appendChild(h); const ul = document.createElement('ul'); ul.className = 'away-res-list';
    rep.res.forEach(x => { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = (x.d > 0 ? '+' : '−') + fmtW(Math.abs(x.d)); li.append(x.name + ' ', b); if (x.full) { const f = document.createElement('small'); f.textContent = ' ' + tx('a.res.full'); li.appendChild(f); } ul.appendChild(li); });
    rs.appendChild(ul); }
  const nw = $('away-new'); nw.innerHTML = '';
  if (rep.fresh.length) { const h = document.createElement('p'); h.className = 'away-sub'; h.textContent = tx('a.new.h'); nw.appendChild(h); const p = document.createElement('p'); p.className = 'away-newlist'; p.textContent = rep.fresh.slice(0, 8).join(', ') + (rep.fresh.length > 8 ? ' ' + tx('a.new.more', { n: rep.fresh.length - 8 }) : ''); nw.appendChild(p); }
  $('away-ok').textContent = tx('a.ok'); $('away').classList.remove('hidden'); $('away-ok').focus();
}
function closeAway() { $('away').classList.add('hidden'); }
try { if (TAB.owner) applyElapsed((Date.now() - S.lastSeen) / 1000, true); } catch (err) { try { sys('Could not count your time away (' + err.message + '). Your save is fine.'); } catch (e2) {} }
if (S.log.length === 0) say(tx('p.msg.start'));
let last = Date.now(), lastMiles = 0;
setInterval(() => {
  const now = Date.now(); const real = (now - last) / 1000; last = now; const dt = real * (S.speed || 1);
  if (real > 5) catchUp(dt);
  else { S.playTime = (S.playTime || 0) + dt; if (!S.flags.stood) gainMotes(rate() * dt); else { let left = dt; while (left > 0) { const st = Math.min(1, left); worldTick(st); left -= st; } } }
  checkUnlocks(); render();
  if (now - lastMiles > 1000) { lastMiles = now; checkMiles(); }
}, 100);
function catchUp(sec) {
  S.playTime = (S.playTime || 0) + sec;
  if (!S.flags.stood) { if (S.drift) gainMotes(rate() * sec); return; }
  if (!S.w) return;
  const step = sec > 3600 ? 5 : 1; let left = sec, k = 0;
  while (left > 0) { const st = Math.min(step, left); worldTick(st, sec >= 60); left -= st; if (++k % 720 === 0) checkMiles(); }   // v1q: a background catch-up counts as time away (Stewards kept, overflow)
  if (sec >= 300) sys(tx('a.log.bg', { t: awayDur(sec) }));
}
setInterval(() => save(true), 10000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });

/*@if-test*/
/* ---------- Text editor ----------
   Changes are kept in this artifact's shared data (text/overrides), so everyone who plays the published page
   sees them and Claude can read them back. Only the owner and editors see the editor. */
const TEXT_LS = 'spark-text-overrides';
let textMap = {}, textDoc = null, textDirty = false, textSaving = false, textTimer = null, textMode = 'local';
function setTextMap(map, refresh) {
  textMap = Object.assign({}, map || {});
  for (const e of TEXT) e.obj[e.field] = Object.prototype.hasOwnProperty.call(textMap, e.key) ? textMap[e.key] : e.def;
  try { localStorage.setItem(TEXT_LS, JSON.stringify(textMap)); } catch (err) { /* private mode: fine */ }
  if (refresh) refreshText();
}
function refreshText() {
  document.querySelectorAll('button.act[data-t]').forEach(b => { b.dataset.t = ''; });
  render();
  if (!S.flags.stood) { const p = nextPart(); if (p) buildParts(); }
}
try { setTextMap(JSON.parse(localStorage.getItem(TEXT_LS) || '{}'), false); } catch (err) { setTextMap({}, false); }
function txStatus(msg) { $('tx-status').textContent = msg; }
function queueTextSave() {
  textDirty = true; clearTimeout(textTimer);
  textTimer = setTimeout(flushTextSave, 700);
  txStatus(textMode === 'shared' ? 'Saving\u2026' : 'Saved in this browser only.');
}
async function flushTextSave() {
  try { localStorage.setItem(TEXT_LS, JSON.stringify(textMap)); } catch (err) {}
  if (!textDoc || textSaving) { if (!textDoc) textDirty = false; return; }
  textSaving = true;
  try {
    while (textDirty) { textDirty = false; await textDoc.set({ map: Object.assign({}, textMap), updated: Date.now() }); }
    txStatus('Saved. Everyone who opens the game sees these changes.');
  } catch (err) {
    txStatus(err && err.code === 'quota_exceeded' ? 'Could not save: storage is full.' : 'Could not save just now. Your changes are kept in this browser; edit again to retry.');
  }
  textSaving = false;
}
function openEditor() { $('tx').classList.remove('hidden'); document.body.classList.add('tx-open'); renderTextList(); $('tx-search').focus(); }
function closeEditor() { $('tx').classList.add('hidden'); document.body.classList.remove('tx-open'); setPicking(false); }
let txPicked = null;
function renderTextList() {
  const q = $('tx-search').value.trim().toLowerCase(), onlyChanged = $('tx-changed').checked, box = $('tx-list');
  box.innerHTML = '';
  $('tx-all').classList.toggle('hidden', !txPicked);
  let group = null, shown = 0;
  for (const e of TEXT) {
    if (txPicked && !txPicked.includes(e.key)) continue;
    const cur = e.obj[e.field], changed = cur !== e.def;
    if (onlyChanged && !changed) continue;
    if (q && !(e.label + ' ' + cur + ' ' + e.def + ' ' + e.group).toLowerCase().includes(q)) continue;
    if (e.group !== group) { group = e.group; const h = document.createElement('h3'); h.textContent = group; box.appendChild(h); }
    box.appendChild(textItem(e)); shown++;
  }
  if (!shown) { const p = document.createElement('p'); p.className = 'tx-meta'; p.textContent = 'Nothing matches.'; box.appendChild(p); }
}
function textItem(e) {
  const d = document.createElement('div'); d.className = 'tx-item';
  const id = 'tx-' + e.key.replace(/[^\w-]/g, '_');
  const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = e.label; d.appendChild(lab);
  const ta = document.createElement('textarea'); ta.id = id; ta.value = e.obj[e.field]; ta.rows = Math.min(6, Math.max(1, Math.ceil(ta.value.length / 48)));
  d.appendChild(ta);
  const meta = document.createElement('div'); meta.className = 'tx-meta'; d.appendChild(meta);
  const holders = (e.def.match(/\{\w+\}/g) || []);
  const paint = () => {
    const v = ta.value, changed = v !== e.def; d.classList.toggle('changed', changed); meta.innerHTML = '';
    if (holders.length) {
      const missing = holders.filter(h => !v.includes(h));
      const sp = document.createElement('span'); sp.className = missing.length ? 'warn' : '';
      sp.textContent = missing.length ? 'Missing ' + missing.join(' ') + ': the game fills these in with numbers or names. ' : 'The game fills in ' + holders.join(' ') + '. ';
      meta.appendChild(sp);
    }
    if (/msg|message|messages|text\./i.test(e.key + ' ' + e.group)) meta.append('Messages already shown keep their old wording. ');
    if (changed) {
      meta.append('Original: \u201c' + e.def + '\u201d');
      const r = document.createElement('button'); r.textContent = 'Reset'; meta.appendChild(r);
      r.addEventListener('click', () => { ta.value = e.def; commit(); });
    }
  };
  const commit = () => {
    const v = ta.value;
    if (v === e.def) delete textMap[e.key]; else textMap[e.key] = v;
    e.obj[e.field] = v; paint(); refreshText(); queueTextSave();
  };
  ta.addEventListener('input', commit);
  paint();
  return d;
}
// Pick on screen: a see-through layer over the game catches the next click (disabled buttons included)
// and opens just the text under it, instead of playing.
function textKeysAt(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.id === 'tx-shield') continue;
    const tagged = el.closest('[data-tkeys]');
    if (tagged) return { el: tagged, keys: tagged.dataset.tkeys.split(' ').filter(k => TEXT_BY_KEY[k]) };
    const line = el.closest('.log p');
    if (line) {
      const t = line.textContent;
      let keys = TEXT.filter(e => e.obj[e.field] === t || e.def === t).map(e => e.key);
      if (!keys.length) keys = TEXT.filter(e => /\{\w+\}/.test(e.obj[e.field]) &&
        new RegExp('^' + e.obj[e.field].split(/\{\w+\}/).map(part => part.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('.+') + '$').test(t)).map(e => e.key);
      return { el: line, keys };
    }
    if (el.tagName === 'BODY' || el.tagName === 'HTML') break;
  }
  return null;
}
let txHl = null;
function setPicking(on) {
  $('tx-shield').classList.toggle('hidden', !on); $('tx-pick').classList.toggle('on', on);
  if (txHl) { txHl.classList.remove('tx-hl'); txHl = null; }
  txStatus(on ? 'Click any text in the game to edit it.' : '');
}
$('tx-shield').addEventListener('mousemove', ev => {
  const hit = textKeysAt(ev.clientX, ev.clientY), el = hit ? hit.el : null;
  if (el !== txHl) { if (txHl) txHl.classList.remove('tx-hl'); txHl = el; if (el) el.classList.add('tx-hl'); }
});
$('tx-shield').addEventListener('click', ev => {
  const hit = textKeysAt(ev.clientX, ev.clientY);
  setPicking(false);
  if (!hit || !hit.keys.length) { txStatus('That text isn\u2019t editable here. Try the search box.'); return; }
  txPicked = hit.keys; $('tx-search').value = ''; renderTextList(); txStatus('Showing the text you picked.');
});
$('tx-pick').addEventListener('click', () => setPicking($('tx-shield').classList.contains('hidden')));
$('tx-close').addEventListener('click', closeEditor);
$('tx-search').addEventListener('input', () => { txPicked = null; renderTextList(); });
$('tx-changed').addEventListener('change', renderTextList);
$('tx-all').addEventListener('click', () => { txPicked = null; renderTextList(); txStatus(''); });
$('tx-copy').addEventListener('click', () => {
  const out = $('tx-out'); out.classList.remove('hidden');
  out.value = JSON.stringify(textMap, null, 2); out.select();
  try { document.execCommand('copy'); } catch (err) {}
  txStatus(Object.keys(textMap).length + ' changed ' + (Object.keys(textMap).length === 1 ? 'string' : 'strings') + ' copied.');
});
$('f-text').addEventListener('click', () => { if ($('tx').classList.contains('hidden')) openEditor(); else closeEditor(); });
if (/[?&]edit\b/.test(location.search)) $('f-text').classList.remove('hidden');
(async function connectText() { try {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
  const canEdit = !!(user && await user.canEdit());
  if (canEdit) $('f-text').classList.remove('hidden');
  if (!db) return;
  textMode = 'shared';
  try { textDoc = db.doc('text/overrides'); } catch (err) { textDoc = null; return; }
  textDoc.onSnapshot(snap => {
    if (textDirty || textSaving) return;
    const d = snap.exists ? snap.data() : null;
    const map = d && d.map && typeof d.map === 'object' ? d.map : {};
    if (JSON.stringify(map) === JSON.stringify(textMap)) return;
    setTextMap(map, true);
    if (!$('tx').classList.contains('hidden') && !$('tx').contains(document.activeElement)) renderTextList();
  }, () => { /* keep the text this browser has */ });
  } catch (err) { /* no shared text here: edits stay in this browser */ }
})();
/*@end-test*/
