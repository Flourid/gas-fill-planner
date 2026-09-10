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
  /* When a recipient carries no target, half of its working range is used. */
  var DEFAULT_TARGET_FRACTION = 0.5;
  /* Bottles a cascade fill may draw on: one for the bulk, one for the top-up. */
  var MAX_DONORS_PER_FILL = 2;
  /* Slack on the maximum-pressure rule: rounding when a limit is typed in
     another unit (300 bar as whole psi comes back as 299.99 bar) plus ordinary
     gauge tolerance.  At 1% a 300 bar bottle may be filled from a donor
     reading up to 303 bar without being flagged. */
  var MAX_PRESSURE_SLACK = 0.01;
  var MAX_EVENTS = 400;

  var VOLUME_UNITS = {
    L:   { label: 'L',   toLitre: 1 },
    cm3: { label: 'cc',  toLitre: 0.001 },
    in3: { label: 'ci',  toLitre: 0.016387064 },
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

  /* Is this donor pressure above a recipient's maximum working pressure? */
  function exceedsMax(donorPressureBar, maxBar) {
    return donorPressureBar > maxBar * (1 + MAX_PRESSURE_SLACK) + EPS;
  }

  /* Can this donor push gas into this recipient at all? */
  function donorUsable(donor, recip, allowUnsafe) {
    if (donor.volumeL <= 0) return false;
    if (donor.pressureBar <= recip.pressureBar + MIN_USEFUL_GAIN_BAR) return false;
    if (exceedsMax(donor.pressureBar, recip.maxBar) && !allowUnsafe) return false;
    return true;
  }

  /* Pressure the recipient would settle at if this donor were connected now. */
  function predict(donor, recip) {
    return equalise(donor.volumeL, donor.pressureBar, recip.volumeL,
                    recip.pressureBar, recip.maxBar).recipP;
  }

  /* Connect a donor, move the gas, and record what happened. */
  function applyTransfer(donor, recip) {
    var donorFrom = donor.pressureBar;
    var recipFrom = recip.pressureBar;
    var r = equalise(donor.volumeL, donorFrom, recip.volumeL, recipFrom, recip.maxBar);

    donor.pressureBar = r.donorP;
    recip.pressureBar = r.recipP;

    return {
      donorId: donor.id,
      donorName: donor.name,
      donorFrom: donorFrom,
      donorTo: r.donorP,
      recipFrom: recipFrom,
      recipTo: r.recipP,
      deliveredFreeAirL: freeAirLitres(recip.volumeL, r.recipP) - freeAirLitres(recip.volumeL, recipFrom),
      capped: r.capped,
      unsafe: exceedsMax(donorFrom, recip.maxBar)
    };
  }

  /* Lowest- or highest-pressure bottle that can still push gas in. */
  function pickUsable(donors, recip, allowUnsafe, wantLowest) {
    var best = null;
    for (var i = 0; i < donors.length; i++) {
      var d = donors[i];
      if (!donorUsable(d, recip, allowUnsafe)) continue;
      if (predict(d, recip) - recip.pressureBar < MIN_USEFUL_GAIN_BAR) continue;
      if (best === null) { best = d; continue; }
      if (wantLowest ? d.pressureBar < best.pressureBar : d.pressureBar > best.pressureBar) best = d;
    }
    return best;
  }

  /**
   * Cascade filling, two bottles at most: the lowest usable donor carries the
   * bulk of the charge, then the fullest bottle tops the recipient up as close
   * to its maximum as equalising allows.  Spending the cheap gas first is what
   * keeps the high-pressure bottle useful for later fills.
   */
  function fillCascade(donors, recip, allowUnsafe) {
    var startP = recip.pressureBar;
    var transfers = [];

    while (transfers.length < MAX_DONORS_PER_FILL &&
           recip.pressureBar < recip.maxBar - MIN_USEFUL_GAIN_BAR) {
      /* Bulk from the lowest bottle, top-up from the fullest one. */
      var wantLowest = transfers.length === 0;
      var donor = pickUsable(donors, recip, allowUnsafe, wantLowest);
      if (!donor) break;
      transfers.push(applyTransfer(donor, recip));
    }

    return { startP: startP, endP: recip.pressureBar, transfers: transfers };
  }

  /* Would this donor, on its own, bring the recipient to its target? */
  function reachesTarget(donor, recip, allowUnsafe) {
    if (!donorUsable(donor, recip, allowUnsafe)) return false;
    return predict(donor, recip) >= recip.targetBar - EPS;
  }

  /**
   * Sequential filling: one donor per fill, never combined.  A single bottle
   * stays on the station and is drained fill after fill for as long as it can
   * still reach the target on its own.  When it cannot, it is set aside with
   * whatever is left in it and the fullest bottle that can reach the target
   * takes over.
   *
   * When no donor can reach the target alone, the bottle that gets closest is
   * connected anyway, so the plan ends by showing how far the bank still got.
   *
   * ctx.activeDonorId is the bottle currently on the station; it is shared
   * across recipients, as one filling station would be.
   */
  function fillSequential(donors, recip, allowUnsafe, ctx) {
    var startP = recip.pressureBar;
    var donor = null;

    /* Keep using the bottle already on the station while it still delivers. */
    for (var i = 0; i < donors.length; i++) {
      if (donors[i].id === ctx.activeDonorId && reachesTarget(donors[i], recip, allowUnsafe)) {
        donor = donors[i];
        break;
      }
    }

    if (!donor) {
      /* Swap in the fullest bottle that reaches the target by itself. */
      for (var j = 0; j < donors.length; j++) {
        var d = donors[j];
        if (!reachesTarget(d, recip, allowUnsafe)) continue;
        if (donor === null || d.pressureBar > donor.pressureBar) donor = d;
      }
      /* Nothing reaches the target: connect whatever gets closest, once. */
      if (!donor) {
        var bestP = -Infinity;
        for (var k = 0; k < donors.length; k++) {
          var c = donors[k];
          if (!donorUsable(c, recip, allowUnsafe)) continue;
          var p = predict(c, recip);
          if (p - recip.pressureBar < MIN_USEFUL_GAIN_BAR) continue;
          if (p > bestP) { donor = c; bestP = p; }
        }
      }
      if (donor) ctx.activeDonorId = donor.id;
    }

    var transfers = donor ? [applyTransfer(donor, recip)] : [];
    return { startP: startP, endP: recip.pressureBar, transfers: transfers };
  }

  function fillOnce(donors, recip, method, allowUnsafe, ctx) {
    return method === 'dumb'
      ? fillSequential(donors, recip, allowUnsafe, ctx)
      : fillCascade(donors, recip, allowUnsafe);
  }

  /**
   * Resolve a recipient's target pressure: the pressure a fill has to reach to
   * count as delivered.  Missing targets fall back to the middle of the working
   * range; a target at or below the minimum would make the campaign endless and
   * one above the maximum unreachable, so it is clamped into a usable band.
   */
  function targetFor(r) {
    var t = (typeof r.targetBar === 'number' && isFinite(r.targetBar))
      ? r.targetBar
      : r.minBar + DEFAULT_TARGET_FRACTION * (r.maxBar - r.minBar);
    var floor = r.minBar + MIN_USEFUL_GAIN_BAR;
    if (r.maxBar <= floor) return r.maxBar;
    return Math.min(Math.max(t, floor), r.maxBar);
  }

  /**
   * Run a full filling campaign.
   *
   * config = {
   *   donors:     [{ id, name, volumeL, pressureBar }],
   *   recipients: [{ id, name, volumeL, pressureBar, maxBar, minBar, targetBar }],
   *   method:     'smart' (cascade, at most two donors per fill)
   *               | 'dumb' (sequential, one donor per fill),
   *   allowUnsafe: boolean
   * }
   *
   * Recipients are filled in turn.  A fill that reaches the recipient's target
   * pressure is counted, and the bottle is then assumed to go into service,
   * come back at its minimum pressure and queue for a refill.  The first fill
   * that falls short of the target is still reported, but ends that bottle's
   * campaign: every later attempt would deliver even less.
   *
   * The target is what makes the fill count well defined.  Without it, topping
   * a bottle up from its minimum by a hair would count as a fill and the
   * campaign would never end.  It is therefore forced above the minimum, and
   * capped at the maximum working pressure.
   */
  function simulate(config) {
    var donors = config.donors.map(function (d) {
      return { id: d.id, name: d.name, volumeL: d.volumeL, pressureBar: d.pressureBar,
               startBar: d.pressureBar };
    });
    var recips = config.recipients.map(function (r) {
      return { id: r.id, name: r.name, volumeL: r.volumeL, pressureBar: r.pressureBar,
               startBar: r.pressureBar, maxBar: r.maxBar, minBar: r.minBar,
               targetBar: targetFor(r),
               active: r.volumeL > 0 && r.maxBar > r.minBar, fills: 0, full: 0 };
    });

    var method = config.method === 'dumb' ? 'dumb' : 'smart';
    var allowUnsafe = !!config.allowUnsafe;
    var events = [];
    /* The bottle currently on the filling station, for sequential filling. */
    var ctx = { activeDonorId: null };
    var bankStart = donors.reduce(function (s, d) { return s + content(d.volumeL, d.startBar); }, 0);

    var anyActive = true;
    while (anyActive && events.length < MAX_EVENTS) {
      anyActive = false;
      for (var i = 0; i < recips.length; i++) {
        var r = recips[i];
        if (!r.active) continue;

        var res = fillOnce(donors, r, method, allowUnsafe, ctx);
        if (res.transfers.length === 0) { r.active = false; continue; }

        var target = r.targetBar;
        var full = res.endP >= r.maxBar - Math.max(MIN_USEFUL_GAIN_BAR, 0.005 * r.maxBar);
        /* A bottle that is effectively at its maximum always counts, even if
           the target was set to the maximum itself, which equalising can only
           approach asymptotically. */
        var usable = full || res.endP >= target - EPS;

        events.push({
          index: events.length + 1,
          recipientId: r.id,
          recipientName: r.name,
          startP: res.startP,
          endP: res.endP,
          status: full ? 'full' : (usable ? 'usable' : 'short'),
          target: target,
          /* Air the bottle can actually spend before it is due for a refill. */
          usableFreeAirL: freeAirLitres(r.volumeL, res.endP) - freeAirLitres(r.volumeL, r.minBar),
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
    /* Counted fills carry the quality figures: a plan with many weak fills is
       not better than one with fewer strong ones. */
    var counted = events.filter(function (e) { return e.status !== 'short'; });
    var usableAir = counted.reduce(function (s, e) { return s + Math.max(0, e.usableFreeAirL); }, 0);
    var avgFill = counted.length
      ? counted.reduce(function (s, e) { return s + e.endP; }, 0) / counted.length
      : 0;

    return {
      method: method,
      events: events,
      donors: donors,
      recipients: recips,
      usableFills: events.filter(function (e) { return e.status !== 'short'; }).length,
      fullFills: events.filter(function (e) { return e.status === 'full'; }).length,
      shortFills: events.filter(function (e) { return e.status === 'short'; }).length,
      transferCount: events.reduce(function (s, e) { return s + e.transfers.length; }, 0),
      unsafeTransfers: events.reduce(function (s, e) {
        return s + e.transfers.filter(function (t) { return t.unsafe; }).length; }, 0),
      deliveredFreeAirL: delivered,
      usableFreeAirL: usableAir,
      avgFillPressureBar: avgFill,
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
    equalise: equalise, simulate: simulate, targetFor: targetFor, exceedsMax: exceedsMax,
    DEFAULT_TARGET_FRACTION: DEFAULT_TARGET_FRACTION,
    MAX_DONORS_PER_FILL: MAX_DONORS_PER_FILL
  };

  global.GasFill = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
