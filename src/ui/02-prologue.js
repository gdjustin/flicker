/* ---------- Rules ---------- */
const clickPower = () => (S.parts.hand ? 2 : 1) * (S.ups.grasp ? 3 : 1) * memoryMult();   // v24e: memory speeds the prologue too
const driftMult = () => (S.ups.still ? 2 : 1) * (S.ups.focus ? 2 : 1) * (S.parts.heart ? 1.5 : 1) *
  (S.ups.gravity ? 1 + 0.04 * S.formEver : 1);
const rate = () => S.drift * CONTENT.drift.prod * driftMult() * memoryMult();
const driftCost = () => D(CONTENT.drift.costBase).mul(Big.pow(CONTENT.drift.costRate, S.drift));
const cohereCost = () => D(CONTENT.cohere.costBase).mul(Big.pow(CONTENT.cohere.costRate, S.formEver));
const nextPart = () => CONTENT.parts.find(p => !S.parts[p.id]);

function gainMotes(n) { S.motes = S.motes.add(n); S.stats.motesEver = S.stats.motesEver.add(n); }
function say(text) { S.log.unshift(text); if (S.log.length > 30) S.log.length = 30; renderLog(); }
// a game-system message (something unlocked, learned or found), shown plainly rather than as story
const SYS = '\u0001';
function sys(text) { say(SYS + text); }
function once(flag, text) { if (!S.flags[flag]) { S.flags[flag] = true; if (text) say(text); return true; } return false; }

function checkUnlocks() {
  if (S.stats.motesEver.gte(5)) once('driftShown', tx('p.msg.drift'));
  if (S.drift >= 3) once('cohereShown', tx('p.msg.cohere'));
}

/* ---------- Actions ---------- */
function doGather() {
  gainMotes(D(clickPower()).add(S.ups.rhythm ? rate() : 0));
  S.stats.gathers++;
  once('firstGather', tx('p.msg.gather'));
  checkUnlocks(); render();
}
function doDrift() {
  const c = driftCost(); if (!S.motes.gte(c)) return;
  S.motes = S.motes.sub(c); S.drift++;
  once('firstDrift', tx('p.msg.firstDrift'));
  checkUnlocks(); render();
}
function doCohere() {
  const c = cohereCost(); if (!S.motes.gte(c)) return;
  S.motes = S.motes.sub(c); S.form = S.form.add(1); S.formEver++;
  once('firstForm', tx('p.msg.firstForm'));
  render();
}
function doPart(p) {
  if (S.parts[p.id] || !S.form.gte(p.cost)) return;
  S.form = S.form.sub(p.cost); S.parts[p.id] = true; say(p.msg);
  if (p.id === 'body') { S.stats.finishedAt = Date.now(); }
  buildParts(); render(); save(true);
}
function doUpgrade(u) {
  if (S.ups[u.id] || !S.motes.gte(u.cost)) return;
  S.motes = S.motes.sub(u.cost); S.ups[u.id] = true; say(u.msg);
  render();
}

/* ---------- Display helpers ---------- */
const $ = id => document.getElementById(id);
function vague(n, table) { for (const [lim, word] of table) { if (n < lim) return word; } return table[table.length - 1][1]; }
function fmt(d, places) {
  const n = d.toNumber();
  if (!isFinite(n) || n >= 1e6) return d.toString().replace(/(\.\d{2})\d*e/, '$1e');
  return n.toLocaleString('en-US', { maximumFractionDigits: places == null ? 0 : places, minimumFractionDigits: 0 });
}
const seeing = () => !!S.parts.eyes;
function motesText(d) { return seeing() ? fmt(d) + ' motes' : vague(d.toNumber(), CONTENT.vagueMotes); }
function formText(d) { return seeing() ? fmt(d) + ' form' : vague(d.toNumber(), CONTENT.vagueForm); }
function costMotes(d) { return seeing() ? tx('p.cost.see', { n: fmt(d) }) : tx('p.cost.vague', { amount: vague(d.toNumber(), CONTENT.vagueMotes) }); }
function show(el) { if (el.classList.contains('hidden')) { el.classList.remove('hidden'); el.classList.add('reveal'); } }
let noticeTimer = null;
function notice(t) { $('notice').textContent = t; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { $('notice').textContent = ''; }, 4000); }

/* ---------- Rendering ---------- */
function buildParts() {
  const box = $('parts'); box.innerHTML = '';
  const p = nextPart(); if (!p) return;
  const b = document.createElement('button'); b.className = 'act'; b.id = 'part-' + p.id;
  b.addEventListener('click', () => doPart(p));
  box.appendChild(b);
}
function buildUps() {
  const box = $('ups');
  for (const u of CONTENT.upgrades) {
    if (S.ups[u.id] || !u.needs(S) || $('up-' + u.id)) continue;
    const b = document.createElement('button'); b.className = 'act reveal'; b.id = 'up-' + u.id;
    b.addEventListener('click', () => { doUpgrade(u); b.remove(); });
    box.appendChild(b);
  }
}
function renderLog() {
  const box = $(S.flags.stood ? 'w-log' : 'log'); box.innerHTML = '';
  S.log.forEach((t, i) => {
    const p = document.createElement('p'); const isSys = t.charAt(0) === SYS; p.textContent = isSys ? t.slice(1) : t; if (isSys) p.className = 'sys';
    p.style.opacity = Math.max(0.15, 1 - i * 0.12).toFixed(2); box.appendChild(p);
  });
}
function render() {
  renderScatterBtn();   // v23b
  if (S.flags.stood) { if (!S.w || $('world').classList.contains('hidden')) enterWorld(); else renderWorld(); return; }
  $('self').textContent = CONTENT.self.find(x => x.when(S)).text;

  const m = S.motes.toNumber();
  const dots = Math.min(56, Math.floor(Math.log2(Math.max(0, m) + 1) * 4));
  $('field').textContent = '\u00b7'.repeat(dots);
  $('field').classList.toggle('beat', !!S.parts.heart);

  let have = 'You hold <b class="m">' + motesText(S.motes) + '</b>';
  if (S.flags.cohereShown) have += ' and <b class="f">' + formText(S.form) + '</b>';
  have += '.';
  if (seeing() && S.drift > 0) have += ' Motes drift in at ' + fmt(D(rate()), 1) + ' each second.';
  $('have').innerHTML = have;

  $('gather-t').textContent = tx('p.gather'); $('drift-t').textContent = tx('p.drift'); $('cohere-t').textContent = tx('p.cohere');
  $('h-parts').textContent = tx('p.h.parts'); $('h-ups').textContent = tx('p.h.ups');
  $('gather-sub').textContent = seeing() ? tx('p.gather.see', { n: fmt(D(clickPower()).add(S.ups.rhythm ? rate() : 0), 1) })
    : tx(S.parts.hand ? 'p.gather.hand' : 'p.gather.none');

  if (S.flags.driftShown) {
    show($('b-drift'));
    const c = driftCost();
    $('drift-sub').textContent = (seeing()
      ? tx('p.drift.see', { n: fmt(D(CONTENT.drift.prod * driftMult()), 2), count: S.drift })
      : tx('p.drift.none')) + ' ' + costMotes(c);
    $('b-drift').disabled = !S.motes.gte(c);
  }
  if (S.flags.cohereShown) {
    show($('b-cohere'));
    const c = cohereCost();
    $('cohere-sub').textContent = tx('p.cohere.sub') + ' ' + costMotes(c);
    $('b-cohere').disabled = !S.motes.gte(c);
    show($('s-parts'));
  }

  const p = nextPart();
  if (p && $('part-' + p.id)) {
    setBtn($('part-' + p.id), p.name, p.desc, S.form.gte(p.cost), {
      costLine: seeing() ? tx('p.costform.see', { n: p.cost }) : tx('p.costform.vague', { amount: vague(p.cost, CONTENT.vagueForm) }),
      keys: itemKeys('p.part', p, ['name', 'desc', 'msg']).concat(['p.costform.see', 'p.costform.vague']) });
  }
  if (!p && S.parts.body) renderStand();

  buildUps();
  const anyUp = $('ups').children.length > 0;
  if (anyUp) show($('s-ups'));
  for (const u of CONTENT.upgrades) {
    const b = $('up-' + u.id); if (!b) continue;
    setBtn(b, u.name, u.desc, S.motes.gte(u.cost), { costLine: costMotes(D(u.cost)), keys: itemKeys('p.up', u, ['name', 'desc', 'msg']).concat(['p.cost.see', 'p.cost.vague']) });
  }
}
function renderStand() {
  const box = $('parts');
  if ($('b-stand')) return;
  box.innerHTML = '';
  const b = document.createElement('button'); b.className = 'act primary reveal'; b.id = 'b-stand';
  b.textContent = tx('p.stand'); b.dataset.tkeys = 'p.stand';
  b.addEventListener('click', () => { S.flags.stood = true; enterWorld(); save(true); if (!(S.meta && S.meta.run > 1)) showMoment('open'); });   // v1r: run 1 only
  box.appendChild(b);
}
function renderEnd() {
  ['s-acts', 's-parts', 's-ups', 'have', 'field'].forEach(id => $(id).classList.add('hidden'));
  $('self').textContent = tx('p.stood');
  const end = $('s-end');
  if (!end.classList.contains('hidden')) return;
  const mins = Math.max(1, Math.round((S.stats.finishedAt - S.stats.startedAt) / 60000));
  const lines = [tx('p.end.1'), tx('p.end.2'), tx('p.end.3')];
  end.innerHTML = '';
  lines.forEach(t => { const p = document.createElement('p'); p.textContent = t; end.appendChild(p); });
  const note = document.createElement('p'); note.style.cssText = 'font-style:normal;font-size:0.9rem;color:var(--ash)';
  note.textContent = 'End of the prologue prototype. You became someone in about ' + mins + ' minute' + (mins === 1 ? '' : 's') +
    ' and ' + S.stats.gathers + ' gathers.';
  end.appendChild(note);
  show(end);
}

