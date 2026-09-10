/*
 * Gas Fill Planner — calculation core.
 *
 * Physics: compressed air treated as an ideal gas at constant temperature
 * (Boyle's law).  The gas content of a bottle is proportional to
 * volume x absolute pressure, so connecting two bottles equalises to the
 * volume-weighted mean pressure:
 *
 *     P_eq = (V_d * P_d + V_r * P_r) / (V_d + V_r)
 *
 * Note that the atmospheric offset between gauge and absolute pressure
 * cancels out in that expression, so gauge readings can be used directly.
 * Absolute pressure is only used where free-air volume is reported.
 *
 * No dependencies; usable as a plain <script> or via require() for tests.
 */
(function (global) {
  'use strict';

  var ATM_BAR = 1.01325;
  var EPS = 1e-9;
  /* A transfer must move at least this much pressure to be worth listing. */
  var MIN_USEFUL_GAIN_BAR = 0.05;
  /* Default share of the working range (min -> max) a fill must reach to count. */
  var DEFAULT_USEFUL_FRACTION = 0.5;
  var MAX_EVENTS = 400;

  var VOLUME_UNITS = {
    L:   { label: 'L',   toLitre: 1 },
    cm3: { label: 'cm³', toLitre: 0.001 },
    in3: { label: 'in³', toLitre: 0.016387064 },
    ft3: { label: 'ft³', toLitre: 28.316846592 }
  };

  var PRESSURE_UNITS = {
    bar: { label: 'bar', toBar: 1 },
    psi: { label: 'psi', toBar: 1 / 14.503773800722 },
    MPa: { label: 'MPa', toBar: 10 }
  };

  function toLitre(value, unit) { return value * VOLUME_UNITS[unit].toLitre; }
  function fromLitre(litre, unit) { return litre / VOLUME_UNITS[unit].toLitre; }
  function toBar(value, unit) { return value * PRESSURE_UNITS[unit].toBar; }
  function fromBar(bar, unit) { return bar / PRESSURE_UNITS[unit].toBar; }

  /* Free air at atmospheric pressure held by a bottle, in litres. */
  function freeAirLitres(volumeLitre, gaugeBar) {
    return volumeLitre * (gaugeBar + ATM_BAR) / ATM_BAR;
  }

  /* Gas content in bar-litres (absolute), the conserved quantity. */
  function content(volumeLitre, gaugeBar) {
    return volumeLitre * (gaugeBar + ATM_BAR);
  }

  /**
   * Equalise one donor into one recipient.
   * capBar limits the recipient (its maximum working pressure); when the
   * equalisation pressure would exceed it, the transfer is stopped early and
   * the remaining gas stays in the donor.
   */
  function equalise(donorVol, donorP, recipVol, recipP, capBar) {
    var total = donorVol * donorP + recipVol * recipP;
    var pEq = total / (donorVol + recipVol);
    if (capBar != null && pEq > capBar) {
      return {
        donorP: (total - recipVol * capBar) / donorVol,
        recipP: capBar,
        capped: true
      };
    }
    return { donorP: pEq, recipP: pEq, capped: false };
  }

  /**
   * Pick the next donor to connect.
   *  - "smart": lowest usable pressure first, so high-pressure gas is saved
   *    for the final top-up (cascade filling).
   *  - "dumb":  highest pressure first, each donor equalised until spent.
   */
  function pickDonor(donors, recip, method, allowUnsafe) {
    var best = null;
    for (var i = 0; i < donors.length; i++) {
      var d = donors[i];
      if (d.volumeL <= 0) continue;
      if (d.pressureBar <= recip.pressureBar + MIN_USEFUL_GAIN_BAR) continue;
      var unsafe = d.pressureBar > recip.maxBar + EPS;
      if (unsafe && !allowUnsafe) continue;
      if (best === null) { best = d; continue; }
      best = (method === 'dumb')
        ? (d.pressureBar > best.pressureBar ? d : best)
        : (d.pressureBar < best.pressureBar ? d : best);
    }
    return best;
  }

  /* Fill one recipient as far as the donor bank allows. */
  function fillOnce(donors, recip, method, allowUnsafe) {
    var startP = recip.pressureBar;
    var transfers = [];
    var guard = 0;

    while (recip.pressureBar < recip.maxBar - MIN_USEFUL_GAIN_BAR && guard++ < 200) {
      var donor = pickDonor(donors, recip, method, allowUnsafe);
      if (!donor) break;

      var donorFrom = donor.pressureBar;
      var recipFrom = recip.pressureBar;
      var r = equalise(donor.volumeL, donorFrom, recip.volumeL, recipFrom, recip.maxBar);
      if (r.recipP - recipFrom < MIN_USEFUL_GAIN_BAR) break;

      donor.pressureBar = r.donorP;
      recip.pressureBar = r.recipP;

      transfers.push({
        donorId: donor.id,
        donorName: donor.name,
        donorFrom: donorFrom,
        donorTo: r.donorP,
        recipFrom: recipFrom,
        recipTo: r.recipP,
        deliveredFreeAirL: freeAirLitres(recip.volumeL, r.recipP) - freeAirLitres(recip.volumeL, recipFrom),
        capped: r.capped,
        unsafe: donorFrom > recip.maxBar + EPS
      });
    }

    return { startP: startP, endP: recip.pressureBar, transfers: transfers };
  }

  /**
   * Run a full filling campaign.
   *
   * config = {
   *   donors:     [{ id, name, volumeL, pressureBar }],
   *   recipients: [{ id, name, volumeL, pressureBar, maxBar, minBar }],
   *   method:     'smart' | 'dumb',
   *   allowUnsafe: boolean
   * }
   *
   *   usefulFraction: 0..1 — share of the working range (min -> max) a fill
   *                   must reach to count as delivered (default 0.5).
   *
   * Recipients are filled in turn.  A fill that reaches the useful threshold
   * is counted, and the bottle is then assumed to go into service, come back
   * at its minimum pressure and queue for a refill.  The first fill that falls
   * short of the threshold is still reported, but ends that bottle's campaign:
   * every later attempt would deliver even less.
   *
   * The threshold is what makes the fill count well defined.  Without it,
   * topping a bottle from its minimum by a hair would count as a fill and the
   * campaign would never end.
   */
  function simulate(config) {
    var donors = config.donors.map(function (d) {
      return { id: d.id, name: d.name, volumeL: d.volumeL, pressureBar: d.pressureBar,
               startBar: d.pressureBar };
    });
    var recips = config.recipients.map(function (r) {
      return { id: r.id, name: r.name, volumeL: r.volumeL, pressureBar: r.pressureBar,
               startBar: r.pressureBar, maxBar: r.maxBar, minBar: r.minBar,
               active: r.volumeL > 0 && r.maxBar > r.minBar, fills: 0, full: 0 };
    });

    var method = config.method === 'dumb' ? 'dumb' : 'smart';
    var allowUnsafe = !!config.allowUnsafe;
    var usefulFraction = typeof config.usefulFraction === 'number'
      ? Math.max(0.01, Math.min(1, config.usefulFraction))
      : DEFAULT_USEFUL_FRACTION;
    var events = [];
    var bankStart = donors.reduce(function (s, d) { return s + content(d.volumeL, d.startBar); }, 0);

    var anyActive = true;
    while (anyActive && events.length < MAX_EVENTS) {
      anyActive = false;
      for (var i = 0; i < recips.length; i++) {
        var r = recips[i];
        if (!r.active) continue;

        var res = fillOnce(donors, r, method, allowUnsafe);
        if (res.transfers.length === 0) { r.active = false; continue; }

        var target = r.minBar + usefulFraction * (r.maxBar - r.minBar);
        var usable = res.endP >= target - EPS;
        var full = res.endP >= r.maxBar - Math.max(MIN_USEFUL_GAIN_BAR, 0.005 * r.maxBar);

        events.push({
          index: events.length + 1,
          recipientId: r.id,
          recipientName: r.name,
          startP: res.startP,
          endP: res.endP,
          status: full ? 'full' : (usable ? 'usable' : 'short'),
          target: target,
          transfers: res.transfers,
          unsafe: res.transfers.some(function (t) { return t.unsafe; })
        });

        if (usable) {
          r.fills++;
          if (full) r.full++;
          /* Bottle goes into service and comes back at its minimum pressure. */
          r.pressureBar = r.minBar;
          anyActive = true;
        } else {
          /* Short of the useful threshold — the bank is spent for this bottle. */
          r.active = false;
        }
      }
    }

    var bankEnd = donors.reduce(function (s, d) { return s + content(d.volumeL, d.pressureBar); }, 0);
    var delivered = events.reduce(function (s, e) {
      return s + e.transfers.reduce(function (t, x) { return t + x.deliveredFreeAirL; }, 0);
    }, 0);

    return {
      method: method,
      events: events,
      donors: donors,
      recipients: recips,
      usefulFraction: usefulFraction,
      usableFills: events.filter(function (e) { return e.status !== 'short'; }).length,
      fullFills: events.filter(function (e) { return e.status === 'full'; }).length,
      shortFills: events.filter(function (e) { return e.status === 'short'; }).length,
      transferCount: events.reduce(function (s, e) { return s + e.transfers.length; }, 0),
      unsafeTransfers: events.reduce(function (s, e) {
        return s + e.transfers.filter(function (t) { return t.unsafe; }).length; }, 0),
      deliveredFreeAirL: delivered,
      bankUsedFraction: bankStart > 0 ? (bankStart - bankEnd) / bankStart : 0,
      truncated: events.length >= MAX_EVENTS
    };
  }

  var api = {
    ATM_BAR: ATM_BAR,
    VOLUME_UNITS: VOLUME_UNITS,
    PRESSURE_UNITS: PRESSURE_UNITS,
    toLitre: toLitre, fromLitre: fromLitre, toBar: toBar, fromBar: fromBar,
    freeAirLitres: freeAirLitres, content: content,
    equalise: equalise, simulate: simulate,
    DEFAULT_USEFUL_FRACTION: DEFAULT_USEFUL_FRACTION
  };

  global.GasFill = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
