/* Run with: node test/calc.test.js */
var assert = require('assert');
var G = require('../assets/calc.js');

var pass = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}
function near(a, b, tol) { assert.ok(Math.abs(a - b) < (tol || 1e-6), a + ' !~ ' + b); }

console.log('unit conversion');
test('volume units round-trip', function () {
  near(G.toLitre(1, 'in3'), 0.016387064);
  near(G.toLitre(1000, 'cm3'), 1);
  near(G.fromLitre(G.toLitre(13.5, 'ft3'), 'ft3'), 13.5);
});
test('pressure units', function () {
  near(G.toBar(3000, 'psi'), 206.842718, 1e-4);
  near(G.toBar(30, 'MPa'), 300);
  near(G.fromBar(G.toBar(232, 'psi'), 'psi'), 232, 1e-9);
});

console.log('equalisation');
test('volume-weighted mean', function () {
  var r = G.equalise(50, 300, 12, 50, 300);
  near(r.recipP, 15600 / 62, 1e-9);
  assert.strictEqual(r.capped, false);
});
test('content is conserved', function () {
  var before = G.content(50, 300) + G.content(12, 50);
  var r = G.equalise(50, 300, 12, 50, 300);
  near(G.content(50, r.donorP) + G.content(12, r.recipP), before, 1e-6);
});
test('cap stops the recipient at its maximum and leaves the rest in the donor', function () {
  var r = G.equalise(50, 300, 12, 50, 200);
  near(r.recipP, 200);
  near(r.donorP, (50 * 300 + 12 * 50 - 12 * 200) / 50);
  assert.strictEqual(r.capped, true);
  var before = G.content(50, 300) + G.content(12, 50);
  near(G.content(50, r.donorP) + G.content(12, r.recipP), before, 1e-6);
});

console.log('campaign');
var bank = [
  { id: 'd1', name: 'A', volumeL: 50, pressureBar: 232 },
  { id: 'd2', name: 'B', volumeL: 50, pressureBar: 150 },
  { id: 'd3', name: 'C', volumeL: 50, pressureBar: 90 }
];
var tank = [{ id: 'r1', name: 'T', volumeL: 12, pressureBar: 50, maxBar: 232, minBar: 50,
              targetBar: 141 }];
function fresh(x) { return JSON.parse(JSON.stringify(x)); }
function withTarget(t) {
  var r = fresh(tank); r[0].targetBar = t; return r;
}

test('smart cascade yields at least as many fills as sequential', function () {
  var smart = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: 'smart' });
  var dumb = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: 'dumb' });
  assert.ok(smart.usableFills >= dumb.usableFills,
    'smart ' + smart.usableFills + ' < dumb ' + dumb.usableFills);
  /* And every counted fill sits at a higher pressure than the sequential one. */
  var n = Math.min(smart.events.length, dumb.events.length);
  for (var i = 0; i < n; i++) {
    assert.ok(smart.events[i].endP >= dumb.events[i].endP - 1e-9,
      'fill ' + (i + 1) + ': smart ' + smart.events[i].endP + ' < dumb ' + dumb.events[i].endP);
  }
  console.log('       smart=' + smart.usableFills + ' fills, dumb=' + dumb.usableFills + ' fills');
});
test('smart draws on several donors per fill, dumb on exactly one', function () {
  var smart = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: 'smart' });
  var dumb = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: 'dumb' });
  assert.ok(smart.events.some(function (e) { return e.transfers.length > 1; }),
    'the cascade should combine donors');
  dumb.events.forEach(function (e) {
    assert.strictEqual(e.transfers.length, 1, 'sequential filling must use one donor per fill');
  });
});
test('dumb stays on one donor until it falls short, then swaps to the next', function () {
  var res = G.simulate({ donors: fresh(bank), recipients: withTarget(100), method: 'dumb' });
  var counted = res.events.filter(function (e) { return e.status !== 'short'; });
  assert.ok(counted.length > 3, 'need a few fills to see the hand-over');

  /* Compress the donor sequence into runs; a donor set aside must not come back. */
  var runs = [];
  counted.forEach(function (e) {
    var id = e.transfers[0].donorId;
    if (runs[runs.length - 1] !== id) runs.push(id);
  });
  assert.ok(runs.length > 1, 'expected a hand-over to a second donor, got ' + JSON.stringify(runs));
  assert.strictEqual(runs.length, new Set(runs).size,
    'a donor was picked up again after being set aside: ' + JSON.stringify(runs));

  /* Every counted fill from a donor still on the station reached the target. */
  counted.forEach(function (e) { assert.ok(e.endP >= 100 - 1e-9); });
});
test('dumb sets a donor aside with gas still in it', function () {
  var res = G.simulate({ donors: fresh(bank), recipients: withTarget(180), method: 'dumb' });
  var used = {};
  res.events.forEach(function (e) { used[e.transfers[0].donorId] = true; });
  var untouched = res.donors.filter(function (d) { return !used[d.id]; });
  assert.ok(untouched.length > 0, 'a target no single donor can reach should leave donors unused');
  untouched.forEach(function (d) { near(d.pressureBar, d.startBar); });
  /* And the drained one keeps the gas it could not deliver on its own. */
  var drained = res.donors.filter(function (d) { return used[d.id]; })[0];
  assert.ok(drained.pressureBar > 100, 'set-aside donor should retain gas: ' + drained.pressureBar);
});
test('smart starts with the lowest usable donor, dumb with the fullest', function () {
  var smart = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: 'smart' });
  var dumb = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: 'dumb' });
  assert.strictEqual(smart.events[0].transfers[0].donorId, 'd3');
  assert.strictEqual(dumb.events[0].transfers[0].donorId, 'd1');
});
test('every transfer conserves gas and never exceeds the maximum', function () {
  ['smart', 'dumb'].forEach(function (method) {
    var res = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: method });
    res.events.forEach(function (ev) {
      ev.transfers.forEach(function (t) {
        assert.ok(t.recipTo <= 232 + 1e-9, method + ' went over maximum: ' + t.recipTo);
        assert.ok(t.recipTo > t.recipFrom && t.donorTo <= t.donorFrom + 1e-9);
        near(G.content(50, t.donorFrom) + G.content(12, t.recipFrom),
             G.content(50, t.donorTo) + G.content(12, t.recipTo), 1e-6);
      });
    });
  });
});
test('a donor above the maximum is held back unless unsafe filling is allowed', function () {
  var hot = [{ id: 'h', name: 'Hot', volumeL: 50, pressureBar: 300 }];
  var low = [{ id: 'r', name: 'Low', volumeL: 10, pressureBar: 50, maxBar: 200, minBar: 50,
               targetBar: 150 }];
  var safe = G.simulate({ donors: fresh(hot), recipients: fresh(low), method: 'smart' });
  assert.strictEqual(safe.events.length, 0);
  var unsafe = G.simulate({ donors: fresh(hot), recipients: fresh(low), method: 'smart', allowUnsafe: true });
  assert.ok(unsafe.usableFills > 0);
  assert.ok(unsafe.unsafeTransfers > 0);
  unsafe.events.forEach(function (e) {
    e.transfers.forEach(function (t) { assert.ok(t.recipTo <= 200 + 1e-9); });
  });
});
test('recipients are cycled and each fill returns them to the minimum', function () {
  var two = [
    { id: 'a', name: 'A', volumeL: 10, pressureBar: 50, maxBar: 200, minBar: 50, targetBar: 125 },
    { id: 'b', name: 'B', volumeL: 10, pressureBar: 50, maxBar: 200, minBar: 50, targetBar: 125 }
  ];
  var res = G.simulate({ donors: fresh(bank), recipients: two, method: 'smart' });
  assert.strictEqual(res.events[0].recipientId, 'a');
  assert.strictEqual(res.events[1].recipientId, 'b');
  res.events.slice(2).forEach(function (e) { near(e.startP, 50, 1e-6); });
});
test('the campaign ends short of the target and stays bounded', function () {
  var res = G.simulate({ donors: fresh(bank), recipients: fresh(tank), method: 'smart' });
  var last = res.events[res.events.length - 1];
  assert.strictEqual(last.status, 'short');
  assert.strictEqual(res.shortFills, 1);
  assert.ok(res.events.length < 20 && !res.truncated);
  /* Counted fills deliver monotonically less as the bank depletes. */
  var counted = res.events.filter(function (e) { return e.status !== 'short'; });
  for (var i = 1; i < counted.length; i++) {
    assert.ok(counted[i].endP <= counted[i - 1].endP + 1e-9, 'fill pressures should not rise');
  }
});
test('a higher fill target yields fewer counted fills', function () {
  var loose = G.simulate({ donors: fresh(bank), recipients: withTarget(95), method: 'smart' });
  var strict = G.simulate({ donors: fresh(bank), recipients: withTarget(190), method: 'smart' });
  assert.ok(loose.usableFills > strict.usableFills,
    'target 95 gave ' + loose.usableFills + ', target 190 gave ' + strict.usableFills);
  loose.events.filter(function (e) { return e.status !== 'short'; }).forEach(function (e) {
    assert.ok(e.endP >= 95 - 1e-9, 'counted fill below its target: ' + e.endP);
  });
});
test('each recipient uses its own target', function () {
  var two = [
    { id: 'a', name: 'A', volumeL: 8, pressureBar: 50, maxBar: 200, minBar: 50, targetBar: 80 },
    { id: 'b', name: 'B', volumeL: 8, pressureBar: 50, maxBar: 200, minBar: 50, targetBar: 170 }
  ];
  var res = G.simulate({ donors: fresh(bank), recipients: two, method: 'smart' });
  var byId = {};
  res.recipients.forEach(function (r) { byId[r.id] = r; });
  near(byId.a.targetBar, 80);
  near(byId.b.targetBar, 170);
  /* The lenient bottle keeps being refilled long after the strict one stops. */
  assert.ok(byId.a.fills > byId.b.fills, 'A ' + byId.a.fills + ' should beat B ' + byId.b.fills);
  res.events.filter(function (e) { return e.status !== 'short'; }).forEach(function (e) {
    assert.ok(e.endP >= byId[e.recipientId].targetBar - 1e-9);
  });
});
test('a missing target falls back to the middle of the working range', function () {
  var r = fresh(tank); delete r[0].targetBar;
  var res = G.simulate({ donors: fresh(bank), recipients: r, method: 'smart' });
  near(res.recipients[0].targetBar, 141);
});
test('a target at or below the minimum is lifted above it so the plan terminates', function () {
  var res = G.simulate({ donors: fresh(bank), recipients: withTarget(20), method: 'smart' });
  assert.ok(res.recipients[0].targetBar > 50, 'target should be lifted above the minimum');
  assert.ok(res.events.length > 0 && !res.truncated, 'plan should still be finite');
});
test('a target above the maximum is capped at the maximum', function () {
  var res = G.simulate({ donors: fresh(bank), recipients: withTarget(400), method: 'smart' });
  near(res.recipients[0].targetBar, 232);
});
test('reaching the maximum counts even when the target is the maximum itself', function () {
  /* Equalising only approaches the maximum asymptotically, so a huge donor is
     used here to land within the tolerance. */
  var big = [{ id: 'big', name: 'Big', volumeL: 5000, pressureBar: 232 }];
  var res = G.simulate({ donors: big, recipients: withTarget(232), method: 'smart' });
  assert.ok(res.usableFills > 0, 'a bottle filled to its maximum should count');
  assert.strictEqual(res.events[0].status, 'full');
});
test('an empty bank produces no plan instead of looping', function () {
  var res = G.simulate({ donors: [], recipients: fresh(tank), method: 'smart' });
  assert.strictEqual(res.events.length, 0);
  assert.strictEqual(res.truncated, false);
});
test('free air uses absolute pressure', function () {
  near(G.freeAirLitres(10, 0), 10, 1e-9);
  near(G.freeAirLitres(10, G.ATM_BAR), 20, 1e-9);
});

console.log('\n' + pass + ' checks passed' + (process.exitCode ? ' (with failures)' : ''));
