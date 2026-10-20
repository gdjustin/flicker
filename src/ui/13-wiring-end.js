/* ---------- Wiring ---------- */
$('b-gather').addEventListener('click', doGather);
$('b-drift').addEventListener('click', doDrift);
$('b-cohere').addEventListener('click', doCohere);
$('w-name-btn').addEventListener('click', wName);
$('w-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') wName(); });
$('away-ok').addEventListener('click', closeAway);
$('moment-ok').addEventListener('click', () => { const k = $('moment').dataset.kind; $('moment').classList.add('hidden'); $('moment').dataset.kind = ''; const no = $('moment-no'); if (no) no.classList.add('hidden');
  if (k === 'map') startMap(); if (k === 'scatter') openPerks(); if (k === 'whole') showCombatMoment(); if (k === 'relics') { S.view = 'relics'; hideTip(); renderWorld(); } });
$('away').addEventListener('click', e => { if (e.target === $('away')) closeAway(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('away').classList.contains('hidden')) closeAway(); if (!$('moment').classList.contains('hidden')) $('moment').classList.add('hidden'); } });
document.addEventListener('animationend', e => { if (e.animationName === 'reveal' && e.target.classList) e.target.classList.remove('reveal'); });
$('fs-feast').addEventListener('click', wFeast);
$('dr-toggle').addEventListener('click', () => { const w = W(); if (!w) return; w.drawer = w.drawer === 'closed' ? 'open' : 'closed'; renderWorld(); });
/*@if-test*/
function renderDebug() { $('f-dbg').classList.toggle('hidden', !S.debug); $('f-debug').textContent = S.debug ? 'Hide playtest tools' : 'Playtest tools'; }
let milesOpen = false;
$('f-debug').addEventListener('click', () => { S.debug = !S.debug; renderDebug(); if (!S.debug && milesOpen) { $('io').classList.add('hidden'); milesOpen = false; } if (S.w) renderWorld(); save(true); });
renderDebug();
// skip ahead runs the village forward as if that much time passed while playing
function skipAhead(sec) { if (!S.w) return; runHelp('skipped ' + (sec >= 86400 ? '1 day' : (sec / 3600) + ' h')); const stp = S.w.m ? 5 : 1; for (let t = 0; t < sec; t += stp) { worldTick(stp); S.playTime = (S.playTime || 0) + stp; if (t % 60 < stp) checkMiles(); }
  sys('Playtest: skipped ahead ' + (sec >= 86400 ? '1 day' : (sec / 3600) + (sec === 3600 ? ' hour' : ' hours')) + '.'); renderWorld(); save(true); }
$('f-skip1').addEventListener('click', () => skipAhead(3600));
$('f-skip8').addEventListener('click', () => skipAhead(8 * 3600));
$('f-skip24').addEventListener('click', () => skipAhead(86400));
$('f-miles').addEventListener('click', () => {
  checkMiles(); show($('io')); milesOpen = true;
  $('io-text').value = 'Milestones (play time counts time away, up to the time-away limit)\n' + milesText(); $('io-text').select();
  notice('Milestones so far. Copy them into a message to share.');
});
// playtest tool: the Village Lab's bot plays a fresh village up to a point, and you take over from there
const botArm = {};
function botPlay(pct, btn) {
  if (!botArm[pct]) { botArm[pct] = true; const was = btn.textContent; btn.textContent = 'Click again: this replaces your village'; setTimeout(() => { botArm[pct] = false; btn.textContent = was; }, 4000); return; }
  const r = VBOT.run(VC, { stopPct: pct >= 100 ? null : pct });
  const s = r.s; s.stats = { buys: [], made: {} };
  const w = Object.assign(freshWorld(), s, { looks: WORLD.looks.length, haulFrom: {}, leftStack: [] });
  ['wood', 'stones', 'fiber', 'food', 'ideas'].forEach(k => { w.seen[k] = true; }); if (s.cards.snails) w.seen.snails = true;
  ['ideasMsg', 'stoked', 'quietMind', 'askName'].forEach(k => { w.flags[k] = true; }); if (w.pct >= 25) w.flags.snailSeen = true;
  if (w.pct >= 100 && w.done.beacon) w.flags.end = true;
  S.flags.stood = true; S.w = w; S.playTime = (S.playTime || 0) + s.t;
  S.log = []; sys('Playtest: the lab’s bot played a fresh village for ' + Math.round(s.t / 60) + ' minutes, to ' + Math.floor(w.pct) + '% lit. It’s yours from here.');
  try { $('moment').classList.add('hidden'); hideTip(); } catch (e) {}
  resetWorldDom(); enterWorld(); renderPhaseBtn(); save(true);
}
[25, 50, 75, 100].forEach(p => $('f-bot' + p).addEventListener('click', e => botPlay(p, e.currentTarget)));
$('f-prest40').addEventListener('click', e => skipToScatter(e.currentTarget));
$('f-prest40').classList.toggle('hidden', !!MC.D.rb.on);
$('f-rbnext').addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = 'Click again: the bot plays this run'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Play to the next rebirth'; }, 4000); return; }
  delete b.dataset.arm; b.textContent = 'playing\u2026'; b.disabled = true; setTimeout(() => { try { botToRebirth(); } finally { b.disabled = false; b.textContent = 'Play to the next rebirth'; } }, 30); });
$('f-rbwhole').addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = 'Click again: about a minute of bot play'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Play every run to the last rebirth'; }, 4000); return; }
  delete b.dataset.arm; b.textContent = 'Play every run to the last rebirth'; botToWhole(b); });
$('f-merch').addEventListener('click', callMerchant);
function renderSpeed() { document.querySelectorAll('footer .speed button').forEach(b => b.classList.toggle('on', Number(b.dataset.speed) === (S.speed || 1))); }
document.querySelectorAll('footer .speed button').forEach(b => b.addEventListener('click', () => { S.speed = Number(b.dataset.speed); renderSpeed(); save(true); }));
renderSpeed();
function renderPhaseBtn() { $('f-phase').classList.toggle('hidden', !S.flags.stood); $('f-skipvillage').classList.toggle('hidden', !!S.flags.stood); }
let villageArmed = false;
$('f-skipvillage').addEventListener('click', () => { if (S.flags.stood) return;
  if (!villageArmed) { villageArmed = true; $('f-skipvillage').textContent = 'Click again: this skips the prologue'; setTimeout(() => { villageArmed = false; $('f-skipvillage').textContent = 'Skip to the village'; }, 4000); return; }
  villageArmed = false; $('f-skipvillage').textContent = 'Skip to the village'; S.flags.stood = true; enterWorld(); renderPhaseBtn(); save(true); });
let phaseArmed = false;
$('f-phase').addEventListener('click', () => { if (!phaseArmed) { phaseArmed = true; $('f-phase').textContent = 'Click again to restart this phase'; setTimeout(() => { phaseArmed = false; $('f-phase').textContent = 'Restart this phase'; }, 4000); return; }
  phaseArmed = false; $('f-phase').textContent = 'Restart this phase'; restartPhase(); });
renderPhaseBtn(); setInterval(renderPhaseBtn, 1000);
if (/[?&]bot\b/.test(location.search)) {
  window.__T = { S: () => S, VC, VBOT, worldTick, look: wLook, gather: wGather, stoke: wStoke, card: wCard, level: wLevel, job: wJob, feast: wFeast, burn: wBurn, pause: wPause,
    stand: () => { S.flags.stood = true; enterWorld(); }, render: () => render(), serialize: () => serialize(S), botPlay: p => { botArm[p] = true; botPlay(p, $('f-bot' + p)); },
    advance: (sec) => { for (let t = 0; t < sec; t++) { worldTick(1); S.playTime = (S.playTime || 0) + 1; } },
    MC, skipToMap: () => skipToMap(), botMap: n => botMap(n), mTarget: k => mTarget(k), mRelic: k => mRelic(k), mAnchor: k => mAnchor(k), mFinish: () => mFinish(), mCard: id => mCard(id), mLevel: id => mLevel(id), askScatter: () => askScatter(), openPerks: () => openPerks(), beginRun: () => beginRun(), commitScatter: () => commitScatter(), botToRebirth: () => botToRebirth(), botToWhole: () => botToWhole($('f-rbwhole')), callMerchant: () => callMerchant(), openMerchant: () => openMerchant(), mMaster: k => mMaster(k), mMasterRegion: r => mMasterRegion(r), MV, adv: (sec) => { for (let t = 0; t < sec; t += 5) worldTick(5); },
    x: src => eval(src) };   // v1g: playtest probes run inside the page (only with ?bot)
}

/*@end-test*/
$('tab-village').addEventListener('click', () => { S.view = 'village'; hideTip(); renderWorld(); });
$('tab-map').addEventListener('click', () => { S.view = 'map'; MV.lastMap = 0; hideTip(); renderWorld(); });
$('tab-relics').addEventListener('click', () => { S.view = 'relics'; hideTip(); renderWorld(); });
$('w-scatter').addEventListener('click', askScatter);
$('w-merch').addEventListener('click', openMerchant);   // the rebirth branch
$('m-grid').addEventListener('click', () => { MV.lastMap = 0; });
/*@if-test*/
$('f-skipmap').addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = 'Click again: the lab bot plays the village to its end'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Skip to the map phase'; }, 4000); return; }
  delete b.dataset.arm; b.textContent = 'Skip to the map phase'; skipToMap(); });
[10, 20, 40].forEach(n => $('f-map' + n).addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.arm) { b.dataset.arm = '1'; const was = b.textContent; b.dataset.was = was; b.textContent = 'Click again: this replaces this run'; setTimeout(() => { delete b.dataset.arm; b.textContent = b.dataset.was; }, 4000); return; }
  delete b.dataset.arm; b.textContent = b.dataset.was; b.disabled = true; b.textContent = 'playing\u2026'; setTimeout(() => { try { botMap(n); } finally { b.disabled = false; b.textContent = b.dataset.was; } }, 30); }));
/*@end-test*/
// a card whose description is cut off shows it whole on hover (disabled buttons too, so this follows the pointer)
{ let tipBtn = null; document.addEventListener('mousemove', e => { const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest ? el.closest('button.act') : null;
  if (b === tipBtn) return; if (tipBtn) { hideTip(); tipBtn = null; } if (!b) return; const bd = b.querySelector('small.bd'); if (!bd || bd.scrollHeight <= bd.clientHeight + 1) return;
  const lines = [bd.textContent]; b.querySelectorAll('small.bc, small.bn').forEach(x => lines.push({ cls: 'tipx', t: x.textContent })); const bt = b.querySelector('.bt');
  showTextTip(b, bt ? bt.lastChild.textContent || bt.textContent : '', lines); tipBtn = b; }, { passive: true }); }
if (S.inPerks) { MV.prest = null; if (S.w && S.w.m && S.w.m.whole && MC.merchantHere(S.w)) openMerchant(); else if (S.w && S.w.m && S.w.m.whole) { S.inPerks = false; } else renderPerks(); }
buildParts(); renderLog(); render();

})();
