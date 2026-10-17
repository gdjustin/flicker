
// A bot that plays the village like a competent active player. Shared by Node runs and the Village Lab page.
// Its rules are simple on purpose: what matters is whether the village paces well for someone sensible.
var VBOT = (function () {
  'use strict';
  function make(VC, opt) {
    opt = Object.assign({ clicksPerSec: 1, clickUntilPop: 8, keeperShare: 0.22, haulShare: 0.45, storyShare: 0.14, decideEvery: 2, jobsEvery: 15, maxT: 4 * 3600, feasts: true, horizon: 300 }, opt || {});
    return opt;
  }

  function run(VC, opt, onEvent) {
    opt = make(VC, opt);
    var s = VC.fresh(), D = VC.D, log = [], reassign = 0, lastJobs = '', dt = 1;
    if (opt.pv) s.pv = opt.pv;   // Light Lab v1: memory and family perks in the village
    if (opt.startRes) for (var r0 in opt.startRes) s.res[r0] = Math.max(s.res[r0] || 0, opt.startRes[r0]);   // Light Lab v2: 40 stone and wood
    if (s.pv && s.pv.startPop) { var p0 = s.pv.startPop; s.pop = Math.min(D.maxSettlers, p0); s.doorPop = s.pop; s.pvExtra = Math.max(0, p0 - s.pop); s.lastArrive = 0;   // Light Lab v3: Open doors
      (s.pv.doorCards || []).forEach(function (c) { s.cards[c] = true; }); s.res.food = Math.max(s.res.food, 10 * s.pop); }
    var marks = {}, lightAt = {}, gaps = [], samples = [], nextSample = 0, arrive = [], projT = {}, cardT = {}, idleRuns = [], lastBuy = 0, longestIdle = 0, idleSince = 0;
    function note(kind, a, b) { log.push([s.t, kind, a, b]); if (onEvent) onEvent(s, kind, a, b); }
    // income a second for each raw resource right now (jobs, minus burning and eating)
    function net(r) { var bd = VC.burnDemand(s); return VC.jobMake(s, r) - (bd[r] || 0) - (r === 'food' ? s.pop * D.eat : 0); }
    function sumCost(c) { var t = 0; for (var k in c) t += c[k]; return t; }

    // the next things the player is saving for, as a resource mix
    function shopping() {
      var want = { wood: 0, stones: 0, fiber: 0, food: 0 };
      VC.CARDS.forEach(function (c) { if (VC.cardAvail(s, c)) for (var k in c.cost) if (want[k] != null) want[k] += c.cost[k] * 2; });
      VC.LADDERS.forEach(function (l) {
        if (!VC.ladderOpen(s, l) || VC.ladderMaxed(s, l) || l.group === 'snails') return;
        var c = VC.ladderCost(s, l); for (var k in c) if (want[k] != null) want[k] += c[k];
      });
      var need = VC.projNeeds(s); if (need) for (var k in need) if (want[k] != null) want[k] += need[k] * 2;
      return want;
    }

    function assignJobs() {
      var P = s.pop; if (!P) return;
      var j = {}; VC.JOBS.forEach(function (x) { j[x.id] = 0; });
      var left = P;
      function put(id, n) { if (!VC.jobOpen(s, id)) return; n = Math.max(0, Math.min(left, Math.round(n))); j[id] += n; left -= n; }
      if (VC.jobOpen(s, 'forager')) {
        var per = D.job.forager.food * VC.jobMult(s, 'forager');
        var f = Math.ceil(P * D.eat * 1.15 / per);
        if (s.res.food < VC.cap(s, 'food') * 0.25) f += 1;
        put('forager', Math.max(1, f));
      }
      if (VC.jobOpen(s, 'storyteller')) put('storyteller', Math.max(1, P * opt.storyShare));
      // haulers while a project is open, from a working core
      var core = Math.max(2, Math.ceil(P * 0.35)), spare = Math.max(0, left - core);
      // a settler is waiting for room and a shelter is open: pause hauling until it's built
      var waitingRoom = s.pop < 25 && s.pop >= VC.room(s) && s.pct >= D.settlerPct[s.pop] && VC.ladderOpen(s, VC.LAD.shelter) && !VC.ladderMaxed(s, VC.LAD.shelter);
      if (waitingRoom) spare = Math.floor(spare / 3);
      if (s.proj && VC.jobOpen(s, 'hauler') && spare > 0 && !opt.noHaul) {   // noHaul: a test player who never hauls (v1r soft-lock checks)
        // enough haulers to carry about `haulShare` of what the producers make
        var rawNow = VC.jobMake(s, 'wood') + VC.jobMake(s, 'stones') + VC.jobMake(s, 'fiber'), per = VC.haulRate(s) / Math.max(1, s.jobs.hauler || 0) || D.haul;
        if (!(s.jobs.hauler > 0)) per = D.haul * (1 + 0.2 * (s.lv.frames || 0)) * (s.cards.pathlore ? 1.5 : 1);
        put('hauler', Math.min(spare, Math.max(1, Math.ceil(rawNow * opt.haulShare / per))));
      }
      if (VC.jobOpen(s, 'firekeeper') && P >= 5) put('firekeeper', Math.min(Math.max(0, left - 3), Math.round(P * opt.keeperShare)));
      // producers: each goes where it best closes the biggest relative shortfall, per second, in what's needed
      // (what's wanted spread over `horizon` seconds, plus what burning uses)
      var want = shopping(), prod = ['gatherer', 'woodcutter', 'twiner'].filter(function (id) { return VC.jobOpen(s, id); });
      if (!prod.length) { put('forager', left); }
      var burn = { wood: j.firekeeper * VC.keeperWood(s) + VC.burnersOn(s, 'firepit') * D.firepitWood, stones: VC.burnersOn(s, 'limekiln') * D.kilnStone, fiber: VC.burnersOn(s, 'rushlight') * D.rushFiber };
      var target = {}, inc = { wood: 0, stones: 0, fiber: 0 };
      ['wood', 'stones', 'fiber'].forEach(function (k) { target[k] = (want[k] || 0) / opt.horizon + burn[k] + 0.02; });
      var canMake = { wood: prod.length > 0, stones: prod.indexOf('gatherer') >= 0, fiber: prod.indexOf('twiner') >= 0 };
      while (left > 0 && prod.length) {
        var kStar = null, lo = Infinity;
        ['wood', 'stones', 'fiber'].forEach(function (k) { if (!canMake[k]) return; var f = inc[k] / target[k]; if (f < lo) { lo = f; kStar = k; } });
        var best = null, bg = -1;
        prod.forEach(function (id) { var g = (D.job[id][kStar] || 0) * VC.jobMult(s, id); if (g > bg) { bg = g; best = id; } });
        j[best]++; left--; var o2 = D.job[best], m2 = VC.jobMult(s, best); for (var k2 in o2) inc[k2] += o2[k2] * m2;
      }
      // never burn wood the village doesn't make
      while (j.firekeeper > 0 && inc.wood < burn.wood * 1.2) { j.firekeeper--; burn.wood -= VC.keeperWood(s); var to = VC.jobOpen(s, 'woodcutter') ? 'woodcutter' : 'gatherer'; j[to]++; var o3 = D.job[to]; for (var k3 in o3) inc[k3] += o3[k3] * VC.jobMult(s, to); }
      var sig = JSON.stringify(j);
      if (sig !== lastJobs) { if (lastJobs) reassign++; lastJobs = sig; }
      for (var id in j) s.jobs[id] = 0;
      for (var id2 in j) if (j[id2]) VC.setJob(s, id2, j[id2]);
    }

    function cardMatsReserve() {
      // hold back materials for the cheapest card we can't buy yet
      var r = {}; var best = null, bc = Infinity;
      VC.CARDS.forEach(function (c) { if (!VC.cardAvail(s, c) || VC.canPay(s, c.cost)) return; var t = sumCost(c.cost); if (t < bc) { bc = t; best = c; } });
      if (best) for (var k in best.cost) r[k] = best.cost[k];
      // ideas: keep enough for the cheapest visible card
      var ic = Infinity; VC.CARDS.forEach(function (c) { if (VC.cardAvail(s, c) && c.cost.ideas && c.cost.ideas < ic) ic = c.cost.ideas; });
      if (ic < Infinity) r.ideas = Math.max(r.ideas || 0, ic * 2);
      return r;
    }
    function afterLeaves(c, reserve) { for (var k in c) if (s.res[k] - c[k] < (reserve[k] || 0) * 0.5) return false; return true; }

    function decide() {
      var bought = 0;
      // 1. cards, cheapest first
      VC.CARDS.filter(function (c) { return VC.cardAvail(s, c) && VC.canPay(s, c.cost); })
        .sort(function (a, b) { return sumCost(a.cost) - sumCost(b.cost); })
        .forEach(function (c) { if (VC.buyCard(s, c.id)) { bought++; note('card', c.id); } });
      // 2. ladders by cost in seconds of income
      var reserve = cardMatsReserve(), roomFull = s.pop >= VC.room(s) - 1;
      var cands = VC.LADDERS.filter(function (l) { return VC.ladderOpen(s, l) && !VC.ladderMaxed(s, l); }).map(function (l) {
        var c = VC.ladderCost(s, l), secs = 0;
        for (var k in c) { var inc = Math.max(0.02, k === 'ideas' ? 0.1 : k === 'snails' ? 0.001 : net(k)); secs = Math.max(secs, c[k] / inc); }
        var pri = secs;
        if (l.storage) { var full = (l.storage === 'raw' ? ['wood', 'stones', 'fiber'] : [l.storage]).some(function (r) { return s.res[r] >= VC.cap(s, r) * 0.85; }); if (!full) pri = Infinity; else pri *= 0.3; }
        if (l.group === 'tools') pri *= 0.5;   // tools pay for themselves
        if (l.group === 'light') {
          // value light by how much one more level adds, relative to the light now
          var now = VC.lightRate(s) || 0.01, keep = s.lv[l.id] || 0, keepOn = s.on[l.id];
          s.lv[l.id] = keep + 1; if (l.burns && keepOn != null) s.on[l.id] = keepOn + 1;
          var gain = Math.max(0, VC.lightRate(s) - now); s.lv[l.id] = keep; if (keepOn != null) s.on[l.id] = keepOn;
          pri = secs / Math.max(0.02, (gain / now) * 20);
        }
        if (l.id === 'shelter') pri = roomFull ? 0 : Infinity;
        if (l.burns && s.res[l.burns] < VC.cap(s, l.burns) * 0.7) pri = Infinity;   // build a burner only when its fuel piles up
        return { l: l, c: c, pri: pri };
      }).filter(function (x) { return x.pri < Infinity; }).sort(function (a, b) { return a.pri - b.pri; });
      for (var i = 0; i < cands.length && bought < 6; i++) {
        var x = cands[i]; if (!VC.canPay(s, x.c)) { if (x.pri === 0) for (var rk in x.c) reserve[rk] = Math.max(reserve[rk] || 0, x.c[rk] * 2); continue; }
        if (!l_isStorage(x.l) && !afterLeaves(x.c, reserve)) continue;
        if (VC.buyLevel(s, x.l.id)) { bought++; note('level', x.l.id); if (x.l.id === 'shelter') nextJobs = s.t; x.c = VC.ladderCost(s, x.l); i--; }
      }
      // burners: light them while their fuel piles up, bank them when it runs low (owner's intended play)
      ['firepit', 'limekiln', 'rushlight'].forEach(function (id) {
        var l = VC.LAD[id], n = s.lv[id] || 0; if (!n) return;
        var f = s.res[l.burns] / VC.cap(s, l.burns), on = VC.burnersOn(s, id);
        if (f >= 0.7 && on < n) s.on[id] = on + 1; else if (f < 0.25 && on > 0) s.on[id] = on - 1;
      });
      // 3. feasts
      if (opt.feasts && VC.D && s.cards.feasting && !s.feast && s.res.food >= VC.feastCost(s) && s.res.food >= VC.cap(s, 'food') * 0.7) { if (VC.feast(s)) note('feast'); }
      return bought;
    }
    function l_isStorage(l) { return !!l.storage; }

    function clicks() {
      if (s.pop >= opt.clickUntilPop) return;
      var n = opt.clicksPerSec;
      for (var i = 0; i < n; i++) {
        // stoke when wood is plentiful, else gather what's shortest
        var stokeW = s.cards.bellows ? D.bellowsWood : D.stokeWood;
        if (s.cards.stoking && s.res.wood >= stokeW && s.res.wood >= VC.cap(s, 'wood') * 0.9) { VC.stoke(s); continue; }
        var want = shopping(), pick = 'wood', bw = -1;
        ['wood', 'stones', 'fiber'].forEach(function (r) { if (r === 'stones' && !s.cards.lookcloser) return; if (r === 'fiber' && !s.cards.grasswork) return; var gap = (want[r] || 1) - s.res[r]; if (gap > bw) { bw = gap; pick = r; } });
        VC.gather(s, pick);
      }
    }

    var nextDecide = 0, nextJobs = 0;
    while (s.t < opt.maxT) {
      clicks();
      if (s.t >= nextDecide) {
        var b = decide(); nextDecide = s.t + opt.decideEvery;
        if (b) { var gap = s.t - lastBuy; if (gap > longestIdle && s.pop > 0) longestIdle = gap; if (gap > 120 && s.pop > 0) gaps.push([lastBuy, gap]); lastBuy = s.t; }
      }
      if (s.t >= nextJobs) { assignJobs(); nextJobs = s.t + opt.jobsEvery; }
      if (s.t >= nextSample) {
        var parts = {}; VC.lightParts(s).forEach(function (p) { parts[p[0]] = p[1]; });
        samples.push({ t: s.t, pct: s.pct, pop: s.pop, room: VC.room(s), light: VC.lightRate(s), parts: parts, jobs: Object.assign({}, s.jobs),
          res: { wood: s.res.wood, stones: s.res.stones, fiber: s.res.fiber, food: s.res.food, ideas: s.res.ideas }, proj: s.proj ? s.proj.id : null, feast: s.feast > 0 });
        nextSample = s.t + 60;
      }
      if (opt.instantProj && s.proj) { var st0 = VC.PROJ[s.proj.id].stages[s.proj.stage]; s.proj.got = Object.assign({}, st0.cost); }   // stand-in: The village remembered
      var ev = VC.tick(s, dt);
      ev.forEach(function (e) {
        if (e[0] === 'arrive') { arrive.push(s.t); nextJobs = s.t; }
        if (e[0] === 'built') { projT[e[1]] = s.t; nextJobs = s.t; note('built', e[1]); }
        if (e[0] === 'stage') note('stage', e[1], e[2]);
      });
      [5, 10, 25, 50, 75, 90, 100].forEach(function (p) { if (marks[p] == null && s.pct >= p) { marks[p] = s.t; lightAt[p] = VC.lightRate(s) / (s.feast > 0 ? 1 + D.feast.boost : 1); } });
      if (s.proj && projT['start:' + s.proj.id] == null) projT['start:' + s.proj.id] = s.t;
      if (s.pct >= 100 && s.done.beacon) break;
      if (opt.stopPct != null && s.pct >= opt.stopPct) break;
    }
    // buys per 5 minutes after the first settler
    var t0 = arrive[0] || 0, bins = [];
    s.stats.buys.forEach(function (b) { if (b[0] < t0) return; var i = Math.floor((b[0] - t0) / 300); bins[i] = (bins[i] || 0) + 1; });
    for (var i2 = 0; i2 < bins.length; i2++) bins[i2] = bins[i2] || 0;
    return { s: s, samples: samples, marks: marks, lightAt: lightAt, gaps: gaps, arrive: arrive, projT: projT, bins: bins, reassign: reassign, longestIdle: longestIdle, log: log,
      end: s.t, light: VC.lightRate(s), parts: VC.lightParts(s) };
  }
  return { run: run };
})();
if (typeof module !== 'undefined') module.exports = VBOT;

