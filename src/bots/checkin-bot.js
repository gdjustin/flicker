
// Check-in bot for map phase 1. It plays the village with the village bot, then the map: one long first session
// at the reveal, then short check-ins with nights between. Time away counts only up to the time-away limit,
// as in the game. Shared by Node runs and the Map Lab page. Its rules are simple on purpose: a sensible player.
var MBOT = function (MC, VBOT) {
  'use strict';
  var VC = MC.VC;
  var PRESETS = {
    checkin: { firstSession: 2, checkins: [7.5, 12.5, 17.5, 22.5], sessionMin: 10, label: 'Check-in: 2 h at the reveal, then 4 check-ins a day' },
    keen: { firstSession: 3, checkins: [7, 9.5, 12, 14.5, 17, 19.5, 22], sessionMin: 15, label: 'Keen: 3 h at the reveal, then 7 check-ins a day' },
    light: { firstSession: 1, checkins: [8, 18, 22.5], sessionMin: 8, label: 'Light: 1 h at the reveal, then 3 check-ins a day' }
  };
  var VILLAGE = { clicksPerSec: 2, clickUntilPop: 99, decideEvery: 2, jobsEvery: 15, feasts: true };
  var TAIL = ['hearth', 'songs', 'brazier', 'lamp', 'keepcraft', 'shrine'];

  function run(opt, onSample) {
    var D0 = MC.D;
    opt = Object.assign({ preset: 'checkin', days: 9, revealHour: 18, burnPlay: 'income', burnShare: 0.6, econ: 'full', smeltMax: 0.35, keeperShare: 0.22, storyShare: 0.14, smeltShare: 0.12, glowShare: 0.06, haulShare: 0.45,
      dtActive: 10, dtAway: 60, horizonH: 2, ampSpot: 'auto', minGain: 0.01, pick: 'cheapest', needK: 4, needH: 48 }, PRESETS[opt && opt.preset || 'checkin'], opt || {});
    var pr = opt.prestige, pv = MC.villagePrestige(pr), vkept = !!(pr && pr.perks && pr.perks.villageComplete);
    // the rebirth branch: with The village stands, the run wakes at the map with the village as it stood when the map last opened
    var vskip = !!(pr && pr.villageSnap && MC.prPerks(pr).villageSkip);
    var vr = vskip ? { s: JSON.parse(JSON.stringify(pr.villageSnap)) } : VBOT.run(VC, Object.assign({}, VILLAGE, { pv: pv, instantProj: vkept, startRes: pr ? D0.villageStart : null }));   // v1r: the opening stores come from run 2 on
    if (vskip) { vr.s.pv = pv; vr.s.t = 60; vr.s.stats = { buys: [], made: {} }; if (MC.villageStand) MC.villageStand(vr.s); }   // r1c: at least the floor of the village built
    var villageSnap = JSON.parse(JSON.stringify(vr.s));   // what the next run's village would be
    var s = MC.init(vr.s, opt.prestige), T0 = s.t, D = MC.D;
    var snap = {}; TAIL.forEach(function (id) { snap[id] = s.lv[id] || 0; });
    var handLight = MC.lightRate(s) / (s.feast > 0 ? 1 + VC.feastSpec(s).boost : 1);
    var small = [], samples = [], sessions = [], marks = {}, lastJobs = '', jobChanges = 0, cardT = {}, projT = {}, tileT = [];
    var hr = function () { return (s.t - T0) / 3600; };

    // ------------------------------------------------ helpers
    function net(r) {
      var bd = MC.burnDemand(s), make = r === 'copper' ? MC.copperMake(s) : MC.jobMake(s, r) + (r === 'ideas' ? VC.D.fireIdeas : 0);
      var use = (bd[r] || 0) + (r === 'food' ? s.pop * MC.eatRate(s) : 0);
      return Math.max(make * 0.15, make - use);
    }
    function hoursFor(c) { var h = 0; for (var k in c) { var have = s.res[k] || 0, need = Math.max(0, c[k] - have); h = Math.max(h, need / Math.max(1e-6, net(k) * 3600)); } return h; }
    function costHours(c) { var h = 0; for (var k in c) h = Math.max(h, c[k] / Math.max(1e-6, net(k) * 3600)); return h; }
    function lightNoFeast() { return MC.lightRate(s) / (s.feast > 0 ? 1 + VC.feastSpec(s).boost : 1); }
    function tailLight() {
      var keep = {}; TAIL.forEach(function (id) { keep[id] = s.lv[id] || 0; s.lv[id] = snap[id]; });
      var without = lightNoFeast(); TAIL.forEach(function (id) { s.lv[id] = keep[id]; });
      return Math.max(0, lightNoFeast() - without);
    }
    function trial(fn) {
      var keepCu = s.m.cuOn;   // light gain of a change, measured by making it and undoing it
      var before = lightNoFeast(), save = JSON.stringify({ lv: s.lv, on: s.on, m: { lv: s.m.lv, tier: s.m.tier } });
      fn(); var after = lightNoFeast(); var o = JSON.parse(save);
      s.lv = o.lv; s.on = o.on; s.m.lv = o.m.lv; s.m.tier = o.m.tier; s.m.cuOn = keepCu;
      return Math.max(0, after - before) / Math.max(1e-6, before);
    }

    // ------------------------------------------------ jobs (as the village bot, plus smelters and scholars)
    function shopping() {
      var want = { wood: 0, stones: 0, fiber: 0, food: 0, copper: 0 };
      function add(c, w) { for (var k in c) if (want[k] != null) want[k] += c[k] * (w || 1); }
      ladders().forEach(function (x) { add(x.c, 1); });
      var nd = MC.projNeeds(s); if (nd) add(nd, 1);
      if (opt.econ === 'full' && waiting()) add(MC.levelCost(s, 'house'), 3);
      return want;
    }
    function assignJobs() {
      var P = s.pop, j = {}, left = P; if (!P) return;
      ['forager', 'gatherer', 'woodcutter', 'twiner', 'storyteller', 'firekeeper', 'hauler', 'smelter', 'glowcrafter'].forEach(function (id) { j[id] = 0; });
      function put(id, n) { if (!MC.jobOpen(s, id)) return; n = Math.max(0, Math.min(left, Math.round(n))); j[id] += n; left -= n; }
      var per = VC.D.job.forager.food * VC.jobMult(s, 'forager') * MC.toolMult(s, 'forager') * MC.tileMult(s, 'food') * MC.rawPerk(s, 'food');
      var f = Math.ceil(P * MC.eatRate(s) * 1.1 / per); if (s.res.food < MC.cap(s, 'food') * 0.3) f += 1;
      put('forager', Math.max(1, f));
      put('storyteller', Math.max(1, P * opt.storyShare));
      if (MC.jobOpen(s, 'smelter')) put('smelter', opt.econ === 'full' ? smeltWant(P) : Math.max(1, P * opt.smeltShare));
      var core = Math.max(3, Math.ceil(P * 0.3)), spare = Math.max(0, left - core);
      if (s.m.proj && !s.m.awaitClick && spare > 0) {
        var raw = MC.jobMake(s, 'wood') + MC.jobMake(s, 'stones') + MC.jobMake(s, 'fiber'), ph = MC.haulRate(s) / Math.max(1, s.jobs.hauler || 0) || VC.D.haul;
        if (!(s.jobs.hauler > 0)) ph = VC.D.haul * (1 + 0.2 * (s.lv.frames || 0)) * (s.cards.pathlore ? 1.5 : 1) * (1 + MC.boostOf(s, 'haul'));
        put('hauler', Math.min(spare, Math.max(1, Math.ceil(raw * opt.haulShare / ph))));
      }
      if (MC.jobOpen(s, 'glowcrafter')) put('glowcrafter', Math.max(1, P * opt.glowShare));
      // labour leak (lab option keeperFlex): when wood sits near full, a sensible player turns spare hands into firekeepers; when it runs low, back again
      if (opt.keeperFlex) { var wf = s.res.wood / MC.cap(s, 'wood'); s.m.botFlex = Math.max(0, Math.min(Math.round(P * opt.keeperFlex), (s.m.botFlex || 0) + (wf > 0.75 ? 1 : wf < 0.3 ? -1 : 0))); }
      put('firekeeper', Math.min(Math.max(0, left - 4), Math.round(P * opt.keeperShare) + (opt.keeperFlex ? s.m.botFlex || 0 : 0)));
      if (opt.keeperHeavy) { var keepRaw = Math.max(2, Math.ceil(left * (1 - opt.keeperHeavy))); put('firekeeper', Math.max(0, left - keepRaw)); }
      var want = shopping(), prod = ['gatherer', 'woodcutter', 'twiner'].filter(function (id) { return MC.jobOpen(s, id); });
      var tm = MC.tendMult(s);
      var sf = MC.smeltFuel(s), burn = { wood: j.firekeeper * VC.keeperWood(s) * tm.wood + (j.smelter - (s.jobs.smelter || 0)) * D.smeltWood * sf + MC.burnDemand(s).wood - (s.jobs.firekeeper || 0) * VC.keeperWood(s) * tm.wood,
        stones: MC.burnDemand(s).stones + (j.smelter - (s.jobs.smelter || 0)) * D.smeltStone * sf, fiber: MC.burnDemand(s).fiber };
      var target = {}, inc = { wood: 0, stones: 0, fiber: 0 }, H = opt.horizonH * 3600;
      ['wood', 'stones', 'fiber'].forEach(function (k) { target[k] = (want[k] || 0) / H + Math.max(0, burn[k]) + 0.05; });
      var canMake = { wood: prod.length > 0, stones: prod.indexOf('gatherer') >= 0, fiber: prod.indexOf('twiner') >= 0 };
      function out(id, k) { return (VC.D.job[id][k] || 0) * VC.jobMult(s, id) * MC.toolMult(s, id) * MC.tileMult(s, k) * MC.rawPerk(s, k); }
      while (left > 0 && prod.length) {
        // labour leak (lab option): once every raw store gets what the shopping list wants, spare settlers tend fires instead
        if (opt.spareToLight && ['wood', 'stones', 'fiber'].every(function (k) { return !canMake[k] || inc[k] >= target[k] * opt.spareToLight; })) { j.firekeeper += left; left = 0; break; }
        var kStar = null, lo = Infinity;
        ['wood', 'stones', 'fiber'].forEach(function (k) { if (!canMake[k]) return; var f2 = inc[k] / target[k]; if (f2 < lo) { lo = f2; kStar = k; } });
        var best = null, bg = -1; prod.forEach(function (id) { var g = out(id, kStar); if (g > bg) { bg = g; best = id; } });
        j[best]++; left--; ['wood', 'stones', 'fiber'].forEach(function (k) { inc[k] += out(best, k); });
      }
      // labour leak (lab option leak: 'keeper' | 'smelt' | 'story' | 'mix', 2026-10-13): a player who spends a boost on hands.
      // Keep raw, food and hauling at what they were without the boost, and move the settlers that frees into a light job.
      if (opt.leak) {
        var moved = 0, MAIN = { woodcutter: 'wood', gatherer: 'stones', twiner: 'fiber' };
        // the extra a boost makes, in settlers of the job that makes that resource best; those settlers leave raw work
        Object.keys(MAIN).forEach(function (id) { var k0 = MAIN[id], b = MC.boostOf(s, k0); if (!(b > 0) || !j[id] || !MC.jobOpen(s, id)) return;
          var made = 0; prod.forEach(function (p2) { made += j[p2] * out(p2, k0); });
          var m = Math.min(j[id] - 1, Math.round(made * b / (1 + b) / out(id, k0))); if (m <= 0) return;
          j[id] -= m; moved += m; ['wood', 'stones', 'fiber'].forEach(function (k) { inc[k] -= m * out(id, k); }); });
        var bf = MC.boostOf(s, 'food'); if (bf > 0 && j.forager > 1) { var rp = MC.rawPerk(s, 'food'), per0 = per / rp * (rp - bf), f0 = Math.ceil(P * MC.eatRate(s) * 1.1 / per0) + (s.res.food < MC.cap(s, 'food') * 0.3 ? 1 : 0);
          var mf = Math.max(0, f0 - j.forager); var mp = Math.min(mf, j.woodcutter + j.gatherer + j.twiner);
          // the boost already freed foragers into raw work; take that many back out of raw work into light
          for (var q = 0; q < mp; q++) { var from = j.woodcutter > 1 ? 'woodcutter' : j.gatherer > 1 ? 'gatherer' : 'twiner'; if (j[from] <= 0) break; j[from]--; moved++; ['wood', 'stones', 'fiber'].forEach(function (k) { inc[k] -= out(from, k); }); } }
        var bh = MC.boostOf(s, 'haul'); if (bh > 0 && j.hauler > 1) { var mh = Math.min(j.hauler - 1, Math.round(j.hauler * bh / (1 + bh))); j.hauler -= mh; moved += mh; }
        var shares = { firekeeper: opt.keeperShare, smelter: MC.jobOpen(s, 'smelter') ? opt.smeltShare : 0, storyteller: opt.storyShare }, acc = {};
        for (var q2 = 0; q2 < moved; q2++) {
          var to2 = opt.leak === 'keeper' ? 'firekeeper' : opt.leak === 'story' ? 'storyteller' : opt.leak === 'smelt' ? (MC.jobOpen(s, 'smelter') ? 'smelter' : 'firekeeper') : null;
          if (!to2) { var bestS = null, lowS = Infinity; for (var sid in shares) { if (!shares[sid]) continue; var r2 = (acc[sid] || 0) / shares[sid]; if (r2 < lowS) { lowS = r2; bestS = sid; } } to2 = bestS; acc[to2] = (acc[to2] || 0) + 1; }
          // 'fuel' (2026-10-13): as 'mix', but a sensible player: a fire or a smelter only while raw still covers what they burn; else a scholar
          if (opt.leak === 'fuel') {
            var kw = VC.keeperWood(s) * tm.wood, smw = D.smeltWood * sf, sms = D.smeltStone * sf;
            var back = opt.econ === 'full' ? rawBack() : 'storyteller';
            if (to2 === 'firekeeper' && inc.wood < (Math.max(0, burn.wood) + kw) * 1.15) to2 = back;
            if (to2 === 'smelter' && (inc.wood < (Math.max(0, burn.wood) + smw) * 1.15 || inc.stones < (Math.max(0, burn.stones) + sms) * 1.15)) to2 = back;
            if (MAIN[to2]) { var kk = MAIN[to2]; ['wood', 'stones', 'fiber'].forEach(function (k) { inc[k] += out(to2, k); }); }
            if (to2 === 'firekeeper') burn.wood += kw; if (to2 === 'smelter') { burn.wood += smw; burn.stones += sms; }
          }
          j[to2]++;
        }
        s.m.leakMoved = moved;
      }
      // Light Lab v1: free firekeepers (keeperFuelMap 0). A sensible player keeps the shopping list funded first: while any raw falls short
      // of what the next buys want, a keeper goes back to the producer that closes the biggest gap (never below a tenth of settlers on the fires)
      if (!D.keeperFuelMap && !opt.keeperHeavy) { var floorK = Math.round(P * (opt.keeperFloor != null ? opt.keeperFloor : 0.1)), gT = 0;
        while (j.firekeeper > floorK && gT++ < 200) { var kS = null, loS = 1; ['wood', 'stones', 'fiber'].forEach(function (k) { if (!canMake[k]) return; var f3 = inc[k] / target[k]; if (f3 < loS) { loS = f3; kS = k; } });
          if (!kS || loS >= (opt.rawFirst != null ? opt.rawFirst : 0.9)) break; var bP = null, bG = -1; prod.forEach(function (id) { var g = out(id, kS); if (g > bG) { bG = g; bP = id; } });
          j.firekeeper--; j[bP]++; ['wood', 'stones', 'fiber'].forEach(function (k) { inc[k] += out(bP, k); }); } }
      while (j.firekeeper > 0 && inc.wood < Math.max(0, burn.wood) * 1.15) { j.firekeeper--; burn.wood -= VC.keeperWood(s) * tm.wood; var to = MC.jobOpen(s, 'woodcutter') ? 'woodcutter' : 'gatherer'; j[to]++; inc.wood += out(to, 'wood'); }
      var sig = JSON.stringify(j); if (sig !== lastJobs) { if (lastJobs) jobChanges++; lastJobs = sig; }
      for (var id in j) s.jobs[id] = 0;
      for (var id2 in j) if (j[id2]) MC.setJob(s, id2, j[id2]);
    }

    // ------------------------------------------------ what's on sale, valued
    function ladders() {
      var out = [];
      VC.LADDERS.forEach(function (l) { if (l.group === 'snails' && l.id !== 'shrine') return; if (MC.levelOpen(s, l.id) && !MC.levelMaxed(s, l.id)) out.push({ id: l.id, c: MC.levelCost(s, l.id), kind: 'v' }); });
      MC.ML.forEach(function (l) { if (MC.levelOpen(s, l.id) && !MC.levelMaxed(s, l.id)) out.push({ id: l.id, c: MC.levelCost(s, l.id), kind: 'm' }); });
      ['clamp', 'ctend'].forEach(function (id) { if (MC.tierUpAvail(s, id)) out.push({ id: id, c: MC.tierUpCost(s, id), kind: 'tier' }); });
      // tile relics: the cheapest few on offer (each tile's own)
      if (D.relicMode === 'tile') MC.relicsOpen(s).map(function (k) { return { id: 'relic', key: k, c: MC.relicCost(s, k), kind: 'relic' }; }).sort(function (a, b2) { return a.c.copper - b2.c.copper; }).slice(0, 4).forEach(function (x) { out.push(x); });
      return out;
    }
    // all-in probes (owner's hard rule, 2026-10-15): opt.tilt leans the bot hard into one line ({ lamps: 3 }, by spending sink); it still buys the basics
    function value(x) { var v = value0(x); if (v && opt.tilt && x.kind !== 'relic') v *= opt.tilt[MC.sinkOf(x.id)] || 1; return v; }
    function value0(x) {
      var id = x.id, L = VC.LAD[id];
      if (x.kind === 'relic') { var t = MC.MAP.tiles[MC.MAP.idx[x.key]];
        if (D.relic.kind === 'light' || t.land === 'mountain' && D.relic.kind === 'raw' && D.relic.mountLight > 0) { var w = MC.focusMode() && (s.m.anchors || []).some(function (a) { return a.key === x.key && a.lit; }) ? 1 + MC.anchorFocus(s) : 1; return (D.relic.kind === 'light' ? D.relic.light : D.relic.mountLight) * w / MC.relicMult(s); }
        if (D.relic.kind === 'land') { var LR = D.landRelic, E = LR.effect[t.land], nL = (s.m.relicLand || {})[t.land] || 0, gain = (nL ? LR.each : (LR.firstOf[t.land] != null ? LR.firstOf[t.land] : LR.first)) * MC.landScale(t.land);
          return LR.light / MC.relicMult(s) + (LR.botEq[E] || 0) * gain / (1 + MC.boostOf(s, E)); }
        var r = MC.RELIC_RAW[t.land], base = MC.rawPerk(s, r); return 0.5 * D.relic.raw / base; }
      // a new tier dips at first; value it by its average level, the way a player reads "this line goes much higher"
      if (x.kind === 'tier') { var Lv = MC.levelMax(s, id); return trial(function () { s.m.tier[id] = MC.mtier(s, id) + 1; s.m.lv[id] = Lv; }) / Lv; }
      if (L && L.storage) return null;
      if (id === 'books' || id === 'house' || id === 'shelter') return null;
      if (id === 'longsong') return trial(function () { s.m.lv.longsong = (s.m.lv.longsong || 0) + 1; });
      if (opt.keeperHeavy && id === 'ctend') return 2 * trial(function () { s.m.lv.ctend = (s.m.lv.ctend || 0) + 1; });
      if (L && L.burns) { if (opt.burnPlay === 'store' ? s.res[L.burns] < MC.cap(s, L.burns) * 0.7 : burnFit(id) <= MC.VC.burnersOn(s, id) && s.res[L.burns] < MC.cap(s, L.burns) * 0.7) return 0; return trial(function () { s.lv[id] = (s.lv[id] || 0) + 1; s.on[id] = (s.on[id] == null ? s.lv[id] : s.on[id] + 1); }); }
      if (id === 'cuburner') { if (opt.burnPlay === 'store' ? s.res.copper < cuReserve() + 3000 : cuFit() <= (s.m.lv.cuburner || 0) && s.res.copper < cuReserve() + 3000) return 0; return trial(function () { s.m.lv.cuburner = (s.m.lv.cuburner || 0) + 1; s.m.cuOn = s.m.lv.cuburner; }); }
      if (opt.econ === 'full' && id === 'keepcraft') return trial(function () { s.lv[id] = (s.lv[id] || 0) + 1; }) + gateV(id);
      if ((L && L.group === 'tools') || MC.MLAD[id] && MC.MLAD[id].tool) return 0.25 * (L ? VC.D.toolStep : D.tool.a) / 2;
      if (id === 'frames') return 0.03;
      if (L) return trial(function () { s.lv[id] = (s.lv[id] || 0) + 1; }) + gateV(id);
      if (MC.MLAD[id] && MC.MLAD[id].burner && D.burnEff.rebuild) return trial(function () { s.m.lv[id] = MC.rebuildTo(s.m.lv[id] || 0); });   // a whole rebuild
      return trial(function () { s.m.lv[id] = (s.m.lv[id] || 0) + 1; });
    }
    // copper kept back for the best copper buys before any is burned: about 3 hours of copper income
    function cuReserve() { return Math.min(MC.cap(s, 'copper') * 0.6, Math.max(1500, MC.copperMake(s) * 3600 * 3)); }
    // v1n: burners played as a player does (owner's playtest, 2026-10-15): keep as many lit as the fuel's income can feed, with a share kept back
    // for buying; light them all while the store is near full. opt.burnPlay 'store' is the old bot (lit only while the store sits above 60%).
    var BURN = { firepit: ['wood', 'firepitWood'], limekiln: ['stones', 'kilnStone'], rushlight: ['fiber', 'rushFiber'] };
    function fuelPer(id) { return VC.D[BURN[id][1]] * MC.effMult(s, id).fuel; }
    function netEx(r, id) { var bd = MC.burnDemand(s)[r] || 0, mine = MC.VC.burnersOn(s, id) * fuelPer(id); return MC.jobMake(s, r) - (bd - mine); }
    function burnFit(id) { var r = BURN[id][0]; return Math.max(0, Math.floor(netEx(r, id) * opt.burnShare / Math.max(1e-9, fuelPer(id)))); }
    function cuFit() { var per = D.cuburner.use * MC.effMult(s, 'cuburner').fuel; return Math.max(0, Math.floor(MC.copperMake(s) * opt.burnShare / Math.max(1e-9, per))); }
    // v1n econ 'full' (owner's playtest, 2026-10-15): the bot left settlers waiting, starved stone and never reached the copper economy.
    // A sensible player houses everyone who arrives, smelts the copper the next buys want, keeps spare hands in raw work when fires can't be
    // fed, and climbs a ladder to its top when the top opens something new (lamps open copper lamps, tending opens fire-tending, braziers open copper braziers).
    function waiting() { return s.m.pending > 0 && s.pop >= MC.room(s) && MC.levelOpen(s, 'house'); }
    function smeltWant(P) { var per = D.smeltCopper * MC.smeltMult(s) * (1 + MC.boostOf(s, 'copper')), want = 0;
      ladders().forEach(function (x) { if (x.c.copper && x.kind !== 'relic') want += x.c.copper; });
      var cuUse = (s.m.lv.cuburner || 0) * D.cuburner.use * MC.effMult(s, 'cuburner').fuel / Math.max(0.05, opt.burnShare);
      var full = s.m.cards.cubins ? s.res.copper > MC.cap(s, 'copper') * 0.9 : false;
      var n = Math.ceil((want / (opt.horizonH * 3600 * 4) + cuUse) / Math.max(1e-9, per)); if (full) n = Math.min(n, s.jobs.smelter || 1);
      return Math.max(1, Math.round(P * opt.smeltShare), Math.min(Math.round(P * opt.smeltMax), n)); }
    function rawBack() { var lo = Infinity, k0 = 'stones', W = shopping(); ['wood', 'stones', 'fiber'].forEach(function (k) { var f = (s.res[k] + 1) / ((W[k] || 0) + 1); if (f < lo) { lo = f; k0 = k; } });
      return k0 === 'wood' ? (MC.jobOpen(s, 'woodcutter') ? 'woodcutter' : 'gatherer') : k0 === 'fiber' && MC.jobOpen(s, 'twiner') ? 'twiner' : 'gatherer'; }
    var GATE = { lamp: 'clamps', keepcraft: 'ctend', brazier: 'cbraziers' };
    function gateV(id) { if (opt.econ !== 'full' || !GATE[id] || s.m.cards[GATE[id]] || !s.m.copperFound) return 0; var L = VC.LAD[id], left = Math.max(1, L.max - (s.lv[id] || 0)); return 0.15 / left; }
    function isTool(id) { return (VC.LAD[id] && VC.LAD[id].group === 'tools') || (MC.MLAD[id] && MC.MLAD[id].tool); }
    function buyX(x) {
      if (x.kind === 'relic') return MC.buyRelic(s, x.key);
      if (x.kind === 'tier') return MC.tierUp(s, x.id);
      return MC.buyLevel(s, x.id);
    }

    // ------------------------------------------------ amplifier placement: the restored frontier tile whose cone covers the most cheap dark
    // r1f: from run 2 your own towers open before the old one is mended (owner). A sensible player builds them to push past the old
    // frontier, not while catching up over remembered land (lab: towers planned at place 10 slowed run 2's catch-up from 0.42 to 0.79 days)
    function towersNow() { var run = s.m.run || 1; if (run <= 1 || s.m.done.repair || !MC.D.rb.on) return true; var prev = MC.rbAt(run - 1); return !prev || s.m.restored >= prev; }
    function planAmp() {
      var best = null, bs = -1;
      Object.keys(s.m.tiles).map(function (k) { return MC.MAP.tiles[MC.MAP.idx[k]]; }).forEach(function (t) {
        if (s.m.amps.some(function (a) { return a.x === t.x && a.y === t.y; })) return;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var a = { x: t.x, y: t.y, dir: d }, sc = 0;
          MC.coneTiles(a, s).forEach(function (k) { var i = MC.MAP.idx[k]; if (i == null || s.m.tiles[k]) return; var tt = MC.MAP.tiles[i]; if (MC.ampMult(s, k) > 1) return; sc += 1 / MC.tileCost(tt, s); });
          if (sc > bs) { bs = sc; best = a; }
        });
      });
      if (best) MC.planAmp(s, best.x, best.y, best.dir);
    }

    // ------------------------------------------------ picking places by what you're short of (lab option pick: 'need', 2026-10-13)
    // Shortage: for the few best buys on sale and the build underway, which store holds each back the longest. Each place is then
    // scored by its time to call back, shortened by what its relic would give the stores you're short of (and a region it would finish).
    function shortage() {
      var w = { wood: 0, stones: 0, fiber: 0, food: 0, copper: 0, ideas: 0 }, tot = 0;
      function bind(c, wt) { var bk = null, bh = -1; for (var k in c) { if (w[k] == null) continue; var hh = Math.max(0, c[k] - (s.res[k] || 0)) / Math.max(1e-6, net(k) * 3600); if (hh > bh) { bh = hh; bk = k; } } if (bk && bh > 0.05) { w[bk] += wt; tot += wt; } }
      ladders().map(function (x) { var v = value(x); return v ? { x: x, sc: v / Math.max(0.02, costHours(x.c)) } : null; }).filter(Boolean)
        .sort(function (a, b) { return b.sc - a.sc; }).slice(0, 6).forEach(function (y, i) { bind(y.x.c, 1 / (1 + i)); });
      var nd = MC.projNeeds(s); if (nd) bind(nd, 1.5);
      if (MC.hungry(s) < 1 || s.res.food < MC.cap(s, 'food') * 0.15) { w.food += 1; tot += 1; }
      for (var k in w) w[k] = tot ? w[k] / tot : 0;
      w.haul = nd ? 0.6 : 0; w.smeltFuel = s.jobs.smelter ? 0.5 * (w.wood + w.stones) : 0;
      return w;
    }
    function needScore(t, sh, plan) {
      var amp = MC.ampMult(s, t.key), L = Math.max(1e-9, MC.lightRate(s)), hours = Math.max(1, MC.tileCost(t, s) - (s.m.got[t.key] || 0)) / amp / L / 3600, v = 0;
      if (D.relicMode === 'tile' && D.relic.kind === 'land') {
        var LR = D.landRelic, E = LR.effect[t.land], nL = MC.landCount(s, t.land) + (plan[t.land] || 0);
        var gain = (nL ? LR.each : (LR.firstOf[t.land] != null ? LR.firstOf[t.land] : LR.first)) * MC.landScale(t.land);
        v += (LR.botEq[E] || 0) * gain * (0.5 + 2.5 * (sh[E] || 0)) / (1 + MC.boostOf(s, E));   // a light-equivalent share, weighted by need
      }
      var rg = MC.REGIONS[t.region]; if (rg && rg.tiles.every(function (k) { return k === t.key || s.m.tiles[k]; })) v += (D.regionX - 1) / MC.regionMult(s);
      return hours - opt.needH * v;   // hours spent now, less the hours the reward saves over the next needH hours
    }
    function pickTarget() {
      if (opt.pick !== 'need') return MC.cheapestTarget(s);
      var sh = shortage(), best = null, bs = Infinity;
      MC.nearTiles(s).forEach(function (t) { if (!MC.reachable(s, t)) return; var sc = needScore(t, sh, {}); if (sc < bs) { bs = sc; best = t.key; } });
      // lab: how often what you're short of beats the cheapest place, and how much dearer the pick is
      var ch = MC.cheapestTarget(s), ps = s.m.pickStats = s.m.pickStats || { n: 0, off: 0, prem: 0 };
      if (best && ch) { ps.n++; if (best !== ch) { ps.off++; var tb = MC.MAP.tiles[MC.MAP.idx[best]], tc = MC.MAP.tiles[MC.MAP.idx[ch]]; ps.prem += Math.log(MC.tileCost(tb, s) / MC.ampMult(s, best) / (MC.tileCost(tc, s) / MC.ampMult(s, ch))); } }
      return best;
    }
    function lineupNeed() {
      var max = MC.lineupMax(s), sh = shortage(), plan = {}, guard = 0;
      (s.m.lineup || []).forEach(function (k) { var t = MC.MAP.tiles[MC.MAP.idx[k]]; plan[t.land] = (plan[t.land] || 0) + 1; });
      if (s.m.target) { var tt = MC.MAP.tiles[MC.MAP.idx[s.m.target]]; plan[tt.land] = (plan[tt.land] || 0) + 1; }
      while ((s.m.lineup || []).length < max && guard++ < 20) {
        var best = null, bs = Infinity;
        MC.nearTiles(s).forEach(function (t) { if (!MC.lineupOk(s, t.key)) return; var sc = needScore(t, sh, plan); if (sc < bs) { bs = sc; best = t; } });
        if (!best) break; s.m.lineup.push(best.key); plan[best.land] = (plan[best.land] || 0) + 1;
      }
    }

    // ------------------------------------------------ the rebirth branch: mastery and the merchant (2026-10-18)
    // Mastery: a tier is worth it when the frontier time it saves over the next mastH hours beats the time it takes now.
    // opt.mastery 0 switches mastery off (a lab replay); opt.mastAll masters everything it can first (an all-in probe).
    function masteryPick() {
      if (!MC.masteryOn || !MC.masteryOn(s) || opt.mastery === 0) return null;
      // a sensible player masters the tier that adds the most mastery for its light, while it costs less than mastGate x the next new place
      var L = Math.max(1e-9, MC.lightRate(s)), best = null, bs = 0, fr = Infinity;
      MC.nearTiles(s).forEach(function (t) { if (MC.reachable(s, t)) fr = Math.min(fr, (MC.tileCost(t, s) - (s.m.got[t.key] || 0)) / (L * MC.ampMult(s, t.key) * MC.masteryMult(s))); });
      var gate = (opt.mastGate != null ? opt.mastGate : 0.25) * fr;   // lab 2026-10-18: a quarter of the next new place beat a whole one (+166 places in 20 days against +156) and the all-in master-everything probe (+159)
      Object.keys(s.m.tiles).forEach(function (key) {
        if (!MC.canMaster(s, key)) return; var t = MC.MAP.tiles[MC.MAP.idx[key]];
        var tau = Math.max(0, MC.mNeed(s, key) - MC.mClears(s, key)) * MC.mClearCost(t) / (L * MC.ampMult(s, key));
        if (!opt.mastAll && tau > gate) return;   // dearer than it's worth next to new land
        var sc = MC.mPointsOf(t) / Math.max(1, tau);   // mastery gained for each second of light
        if (sc > bs) { bs = sc; best = key; }
      });
      return best;
    }
    function merchantVisit() {
      if (!MC.merchantArrive) return; MC.merchantArrive(s, s.t); if (!MC.merchantHere(s)) return;
      var guard = 0, bought = 0;
      while (guard++ < 400) {   // the cheapest next rank first, power perks only
        var free = (s.m.memHS || 0) - MC.perkSpentOf(s.m.perks), best = null, bc = Infinity;
        Object.keys(D.perks).forEach(function (id) { var p = D.perks[id]; if (p.kind === 'comfort' || (p.role === 'unlock' && !(D.unlock[p.sys] && D.unlock[p.sys].perk))) return;
          var n = MC.perk(s, id); if (n >= MC.perkMax(id)) return; var c = MC.perkCost(id, n); if (c <= free && c < bc) { bc = c; best = id; } });
        if (!best || !MC.buyPerkNow(s, best, free)) break; bought++;
      }
      s.m.merchBought = (s.m.merchBought || 0) + bought; MC.merchantLeave(s, s.t);
    }

    // ------------------------------------------------ one decision pass during a session
    function decide() {
      var n = 0;
      if (MC.clickFinish(s)) n++;
      // target: the copper tile first, then the cheapest light-for-light (or, with pick 'need', what you're short of)
      var copperTile = MC.MAP.tiles.find(function (t) { return t.tag === 'copper'; });
      if (MC.masteryOn && MC.masteryOn(s) && s.m.target && s.m.tiles[s.m.target] && MC.mTier(s, s.m.target) <= (s.m.botMast || 0)) { /* mastering: keep at it until its next tier */ }
      else { var mp = masteryPick();
        if (mp) { if (mp !== s.m.target && MC.masterPlace(s, mp)) n++; s.m.botMast = MC.mTier(s, mp); }
        else { var want = (!s.m.tiles[copperTile.key] && MC.reachable(s, copperTile)) ? copperTile.key : pickTarget();
          if (want && want !== s.m.target) { MC.setTarget(s, want); n++; } } }
      merchantVisit();
      if (opt.pick === 'need') lineupNeed(); else if (MC.lineupAuto) MC.lineupAuto(s);   // plan ahead for time away
      // cards: village leftovers and phase-1 research, cheapest first
      VC.CARDS.filter(function (c) { return VC.cardAvail(s, c) && VC.canPay(s, c.cost); }).forEach(function (c) { if (VC.buyCard(s, c.id)) n++; });
      MC.CARDS.filter(function (c) { return MC.cardAvail(s, c); }).sort(function (a, b) { return MC.cardCost(s, a).ideas - MC.cardCost(s, b).ideas; }).forEach(function (c) {
        if (!VC.canPay(s, MC.cardCost(s, c))) return;
        if (MC.buyCard(s, c.id)) { n++; cardT[c.id] = hr(); var pd = c.project && MC.projDef(s, c.project); if (pd && pd.kind === 'small') MC.prioritize(s, c.project); }
      });
      if (MC.repairAmp && MC.repairAmp(s)) { n++; MC.prioritize(s, 'repair'); }
      if (MC.CARD.amps && s.m.cards.amps && towersNow()) while (s.m.amps.filter(function (a) { return !a.story; }).length < MC.ampMaxOf(s) && s.m.restored >= 10) { var k0 = s.m.amps.length; planAmp(); if (s.m.amps.length === k0) break; n++; }
      // relics
      if (D.relicMode !== 'tile') MC.relicsOpen(s).forEach(function (land) { if (MC.buyRelic(s, land)) n++; });
      // research storage: when the next research item won't fit
      var nextR = Infinity; MC.CARDS.forEach(function (c) { var ci = MC.cardCost(s, c).ideas; if (MC.cardAvail(s, c) && ci < nextR) nextR = ci; });
      if (MC.levelOpen(s, 'longsong') && !MC.levelMaxed(s, 'longsong')) nextR = Math.min(nextR, MC.levelCost(s, 'longsong').ideas);
      var g0 = 0; while (nextR < Infinity && nextR > MC.cap(s, 'ideas') * 0.95 && g0++ < 10) { if (MC.levelOpen(s, 'books') && MC.buyLevel(s, 'books')) n++; else if (MC.levelOpen(s, 'tally') && MC.buyLevel(s, 'tally')) n++; else break; }
      // v1n econ 'full': settlers waiting come first, before raw goes into storage or anything else
      if (opt.econ === 'full') { var gH = 0; while (waiting() && gH++ < 6) { if (MC.buyLevel(s, 'house')) n++; else break; } }
      // raw storage: when a wanted price won't fit, or a store is nearly full
      var all = ladders(), nd = MC.projNeeds(s);
      // size storage for the few things worth buying next (best value per hour), not for every price on the list
      var ranked = all.map(function (x) { var v = value(x); return v ? { x: x, sc: v / Math.max(0.02, costHours(x.c)) } : null; }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 3);
      ['wood', 'stones', 'fiber', 'copper'].forEach(function (r) {
      if (r === 'copper' && !s.m.cards.cubins) return;
        var big = 0; ranked.forEach(function (y) { if (y.x.c[r] > big && costHours(y.x.c) < 12) big = y.x.c[r]; });
        if (opt.econ === 'full' && s.m.pending > 0 && MC.levelOpen(s, 'house')) { var hn = Math.min(4, Math.ceil(s.m.pending / D.houseRoom)), hl = s.m.lv.house || 0, hs = 0; for (var q = 0; q < hn; q++) hs += Math.ceil((D.houseCost[r] || 0) * Math.pow(D.houseGrowth, hl + q)); big = Math.max(big, hs); }
        var g = 0; while ((big > MC.cap(s, r) * 0.95 || s.res[r] > MC.cap(s, r) * 0.9) && g++ < 6) { if (MC.buyLevel(s, 'stockpile')) n++; else break; }
      });
      if (s.res.food > MC.cap(s, 'food') * 0.9 && MC.buyLevel(s, 'cache')) n++;
      // project switching: when settlers wait for room, the hall goes to the front
      if (s.m.pending > 0 && s.m.queue.indexOf('hall') >= 0 && MC.prioritize(s, 'hall')) n++;
      // housing: when settlers are waiting
      var g1 = 0; while (s.m.pending > 0 && s.pop >= MC.room(s) && g1++ < 4) { if (MC.levelOpen(s, 'house') && MC.buyLevel(s, 'house')) n++; else if (MC.buyLevel(s, 'shelter')) n++; else break; }
      // light and tools, best value per hour of income first, saving up for a clearly better buy
      var cands = all.map(function (x) { var v = value(x); return v == null ? null : { x: x, v: v, h: costHours(x.c) }; }).filter(function (y) { return y && y.v > 0; });
      cands.forEach(function (y) { y.score = y.v / Math.max(0.02, y.h); });
      cands.sort(function (a, b) { return b.score - a.score; });
      if (opt.onCands) opt.onCands(s, cands, hr());
      var reserve = {}, top = cands[0];
      if (top && !VC.canPay(s, top.x.c) && hoursFor(top.x.c) < 3) reserve = top.x.c;
      if (opt.econ === 'full' && waiting()) reserve = MC.levelCost(s, 'house');
      cands.forEach(function (y) {
        if (n > 40) return;
        var g = 0;
        while (g++ < 10 && VC.canPay(s, y.x.c)) {
          var ok = true; for (var k in y.x.c) if (reserve[k] && s.res[k] - y.x.c[k] < reserve[k] * 0.8 && y !== top) ok = false;
          if (!ok || !buyX(y.x)) break; n++; if (y.v < opt.minGain && !isTool(y.x.id)) small.push(s.t); if (y.x.kind === 'relic') break; y.x.c = y.x.kind === 'tier' ? (MC.tierUpAvail(s, y.x.id) ? MC.tierUpCost(s, y.x.id) : { never: 1 }) : MC.levelCost(s, y.x.id);
          if (MC.levelMaxed(s, y.x.id) && y.x.kind !== 'tier') break;
        }
      });
      // Light Anchors: plan one at a time, on the darkest restored tile whose land has a relic free to set in it
      if (s.m.cards.anchors) {
        var open = (s.m.anchors || []).filter(function (a) { return !a.lit; }).length;
        if (open === 0) {
          var best = null, bc = -1;
          Object.keys(s.m.tiles).forEach(function (k) {
            var t = MC.MAP.tiles[MC.MAP.idx[k]]; if ((s.m.anchors || []).some(function (a) { return a.key === k; })) return;
            if (D.anchor.needRelic && !MC.relicFreeKey(s, k)) return;
            var c = MC.focusMode() ? 1 / (t.dstep + 0.01 * MC.tileCost(t) / 1e9) : MC.tileCost(t); if (c > bc) { bc = c; best = k; }
          });
          if (best && MC.planAnchor(s, best)) n++;
        }
      }
      // the Light Academy: open while research isn't what the next buy is waiting on
      if (s.m.cards.academy) {
        var fullR = s.res.ideas >= MC.cap(s, 'ideas') * 0.8, wantR = MC.CARDS.some(function (c) { return MC.cardAvail(s, c) && MC.cardCost(s, c).ideas > s.res.ideas; });
        var was = !!s.m.academyOn; var keep = Math.min(1, D.perks.quietHalls.f * MC.perk(s, 'quietHalls'));
        s.m.academyOn = fullR || !wantR || keep >= 0.6 ? true : (s.res.ideas < MC.cap(s, 'ideas') * 0.3 ? false : was);
        if (was !== s.m.academyOn) n++;
      }
      // copper burners: lit while copper sits above what the next copper buys need
      if ((s.m.lv.cuburner || 0) > 0) {
        var cuN = s.m.lv.cuburner, burnH = cuN * D.cuburner.use * 3600;
        if (opt.burnPlay === 'store') s.m.cuOn = s.res.copper > cuReserve() + burnH * 2 ? cuN : (s.res.copper < cuReserve() * 0.5 ? 0 : (s.m.cuOn || 0));
        else s.m.cuOn = s.res.copper > cuReserve() + burnH * 2 ? cuN : Math.min(cuN, cuFit());
      }
      // burners: light while their fuel piles up, bank when it runs low
      ['firepit', 'limekiln', 'rushlight'].forEach(function (id) {
        var l = VC.LAD[id], nn = s.lv[id] || 0; if (!nn) return;
        var f = s.res[l.burns] / MC.cap(s, l.burns), on = MC.VC.burnersOn(s, id);
        if (opt.burnPlay === 'store') { if (f >= 0.6 && on < nn) s.on[id] = Math.min(nn, on + 2); else if (f < 0.2 && on > 0) s.on[id] = on - 1; }
        else s.on[id] = f >= 0.6 ? nn : f < 0.1 ? Math.min(nn, Math.max(0, burnFit(id) - 1)) : Math.min(nn, burnFit(id));
      });
      if (s.cards.feasting && !s.feast && s.res.food >= VC.feastCost(s) && s.res.food >= MC.cap(s, 'food') * 0.6) { if (VC.feast(s)) n++; }
      return n;
    }
    function leave() {
      // before leaving: bank burners whose fuel won't last (overflow does this by itself once researched)
      if (!(D.overflowOn && s.m.cards.overflow)) ['firepit', 'limekiln', 'rushlight'].forEach(function (id) {
        var l = VC.LAD[id], nn = s.lv[id] || 0; if (!nn) return;
        if (opt.burnPlay === 'store') { if (s.res[l.burns] < MC.cap(s, l.burns) * 0.85) s.on[id] = 0; }
        else s.on[id] = Math.min(nn, burnFit(id));   // what the income feeds stays lit overnight
      });
      if (opt.burnPlay !== 'store' && (s.m.lv.cuburner || 0) > 0) s.m.cuOn = Math.min(s.m.lv.cuburner, cuFit());
      MC.autoStore(s);
    }

    // ------------------------------------------------ the clock
    var sess = [[0, opt.firstSession]];
    for (var d = 0; d <= opt.days; d++) opt.checkins.forEach(function (h) {
      var a = d * 24 + h - opt.revealHour; if (a > opt.firstSession + 0.1 && a < opt.days * 24) sess.push([a, a + opt.sessionMin / 60]);
    });
    sess.sort(function (a, b) { return a[0] - b[0]; });
    var nextSample = 0;
    function sample(away) {
      var parts = {}; MC.lightParts(s).forEach(function (p) { parts[p[0]] = p[1] / (s.feast > 0 ? 1 + VC.feastSpec(s).boost : 1); });
      var L = lightNoFeast(), rawPerH = (MC.jobMake(s, 'wood') + MC.jobMake(s, 'stones') + MC.jobMake(s, 'fiber')) * 3600;
      var burnerL = (parts.firepits || 0) + (parts.kilns || 0) + (parts.rushlights || 0);
      var fr = Infinity; MC.nearTiles(s).forEach(function (t) { if (MC.reachable(s, t)) fr = Math.min(fr, MC.tileCost(t, s)); });
      var o = { h: hr(), tiles: s.m.restored, frontier: fr, light: L, tail: tailLight(), parts: parts, pop: s.pop, room: MC.room(s), pending: s.m.pending,
        res: { wood: s.res.wood, stones: s.res.stones, fiber: s.res.fiber, food: s.res.food, ideas: s.res.ideas, copper: s.res.copper },
        cap: { wood: MC.cap(s, 'wood'), stones: MC.cap(s, 'stones'), ideas: MC.cap(s, 'ideas') }, copperPerH: MC.copperMake(s) * 3600, copperMade: s.m.made.copper,
        rawPerH: rawPerH, burnerL: burnerL, hs: MC.heartstones(s),
        vMult: VC.lightMult(s) / (s.feast > 0 ? 1 + VC.feastSpec(s).boost : 1), beaconM: 1 + D.beaconStep * MC.beaconLv(s), songM: 1 + D.longSong * MC.mlv(s, 'longsong'), relicM: MC.relicMult(s),
        ampM: s.m.target ? MC.ampMult(s, s.m.target) : 1, directM: MC.directMult(s), regionM: MC.regionMult(s), memM: MC.memMult(s), hearthM: 1 + D.chearth.a * MC.mlv(s, 'chearth'), cuIdleH: s.res.copper / Math.max(1, MC.copperMake(s) * 3600), jobs: Object.assign({}, s.jobs), away: !!away, mult: VC.lightMult(s) * MC.phaseMult(s), proj: s.m.proj ? s.m.proj.id : null, awayH: s.m.away, lv: Object.assign({}, s.lv), mlv: Object.assign({}, s.m.lv), on: Object.assign({}, s.on), cuOn: s.m.cuOn || 0, cards: Object.keys(s.m.cards).join(' ') };
      samples.push(o); if (onSample) onSample(o);
    }
    function runFor(hours, away) {
      var end = s.t + hours * 3600, dt = away ? opt.dtAway : opt.dtActive, lastJob = -1e9;
      while (s.t < end - 1e-6) {
        var step = Math.min(dt, end - s.t);
        if (!away) { decide(); if (s.t - lastJob >= 60) { assignJobs(); lastJob = s.t; }
          // r1h (lab option, off by default): a present player fires the light burst whenever it is ready, keeping food for the settlers and wood for building
          if (opt.bursts && s.m.target && MC.burstReady(s)) { var bc = MC.burstCost(s); if (s.res.food >= bc.food + MC.cap(s, 'food') * 0.3 && s.res.wood >= bc.wood + MC.cap(s, 'wood') * 0.3) MC.burst(s); } }
        var ev = MC.tick(s, step, away);
        ev.forEach(function (e) {
          if (e[0] === 'restored') { tileT.push([hr(), e[1]]); if (!away && !s.m.target) MC.setTarget(s, pickTarget()); }
          if (e[0] === 'built') projT[e[1]] = hr();
          if (e[0] === 'arrive' && !away) lastJob = -1e9;
        });
        if (hr() >= nextSample) { sample(away); nextSample = hr() + 0.5; }
        [10, 20, 30, 35, 40].forEach(function (k) { if (marks[k] == null && s.m.restored >= k) marks[k] = hr(); });
        if (opt.stopTiles && s.m.restored >= opt.stopTiles) { marks.stop = hr(); return true; }
      }
    }
    for (var i = 0; i < sess.length; i++) {
      var a = sess[i][0], b = sess[i][1];
      if (hr() < a) {   // away until this session: only the time-away limit counts
        var gap = a - hr(), counted = Math.min(gap, s.m.away);
        leave(); if (runFor(counted, true)) break;
        if (gap > counted) { s.t += (gap - counted) * 3600; s.m.lost = (s.m.lost || 0) + (gap - counted); }
      }
      var before = s.stats.buys.length, jc = jobChanges, tilesBefore = s.m.restored, t0 = s.t, sm0 = small.length;
      var stop = runFor(b - Math.max(a, hr()), false);
      var buys = s.stats.buys.slice(before).filter(function (x) { return x[0] >= t0; });
      sessions.push({ start: a, end: b, buys: buys.length, small: small.length - sm0, cards: buys.filter(function (x) { return x[1] === 'mcard'; }).length,
        jobs: jobChanges - jc, tiles: s.m.restored, light: lightNoFeast(), what: buys.map(function (x) { return x[2]; }) });
      if (stop) break;
      if (opt.stopFn && opt.stopFn(s, tileT, hr())) { marks.stop = hr(); break; }
    }
    return { s: s, samples: samples, sessions: sessions, marks: marks, cardT: cardT, projT: projT, tileT: tileT, handLight: handLight, villageMin: T0 / 60, snap: snap, opt: opt, villageSnap: villageSnap };
  }
  return { run: run, PRESETS: PRESETS };
};
if (typeof module !== 'undefined') module.exports = MBOT;

