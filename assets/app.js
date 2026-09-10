/* Gas Fill Planner — UI layer.  Pure DOM, no dependencies. */
(function () {
  'use strict';

  var G = window.GasFill;
  var STORE_KEY = 'gasfill.state.v1';
  var VOL_DECIMALS = { L: 1, cm3: 0, in3: 0, ft3: 2 };
  var PRESS_DECIMALS = { bar: 1, psi: 0, MPa: 2 };
  var uid = 0;
  function nextId(prefix) { return prefix + (++uid); }

  /* ------------------------------------------------------------------ state */

  /* Half of the working range — the fallback when no target is given. */
  function midTarget(min, max) {
    return Math.round((min + G.DEFAULT_TARGET_FRACTION * (max - min)) * 10) / 10;
  }

  function defaultState() {
    return {
      method: 'smart',
      allowUnsafe: false,
      donors: [
        { id: 'd1', name: 'Bank A', volume: 6, volumeUnit: 'L', pressure: 300, pressureUnit: 'bar' },
        { id: 'd2', name: 'Bank B', volume: 6, volumeUnit: 'L', pressure: 300, pressureUnit: 'bar' },
        { id: 'd3', name: 'Bank C', volume: 6, volumeUnit: 'L', pressure: 300, pressureUnit: 'bar' }
      ],
      recipients: [
        { id: 'r1', name: 'Tank 1', volume: 68, volumeUnit: 'in3', pressure: 50, pressureUnit: 'bar',
          max: 300, min: 50, target: 200 }
      ]
    };
  }

  var state = loadState();

  function loadState() {
    var fromHash = null;
    if (location.hash.length > 1) {
      try { fromHash = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1))))); }
      catch (e) { fromHash = null; }
    }
    var raw = fromHash;
    if (!raw) {
      try { raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { raw = null; }
    }
    return sanitise(raw) || defaultState();
  }

  function sanitise(raw) {
    if (!raw || !Array.isArray(raw.donors) || !Array.isArray(raw.recipients)) return null;
    var vol = function (u) { return G.VOLUME_UNITS[u] ? u : 'L'; };
    var pre = function (u) { return G.PRESSURE_UNITS[u] ? u : 'bar'; };
    var num = function (v, d) { v = parseFloat(v); return isFinite(v) ? v : d; };
    return {
      method: raw.method === 'dumb' ? 'dumb' : 'smart',
      allowUnsafe: !!raw.allowUnsafe,
      donors: raw.donors.map(function (d, i) {
        return { id: d.id || nextId('d'), name: String(d.name || 'Donor ' + (i + 1)).slice(0, 24),
                 volume: num(d.volume, 6), volumeUnit: vol(d.volumeUnit),
                 pressure: num(d.pressure, 300), pressureUnit: pre(d.pressureUnit) };
      }),
      recipients: raw.recipients.map(function (r, i) {
        var mx = num(r.max, 300), mn = num(r.min, 50);
        return { id: r.id || nextId('r'), name: String(r.name || 'Tank ' + (i + 1)).slice(0, 24),
                 volume: num(r.volume, 68), volumeUnit: vol(r.volumeUnit),
                 pressure: num(r.pressure, 50), pressureUnit: pre(r.pressureUnit),
                 max: mx, min: mn,
                 /* setups saved before targets were per bottle carry none */
                 target: num(r.target, midTarget(mn, mx)) };
      })
    };
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  /* ------------------------------------------------------------ formatting */

  function fmtP(bar, unit) {
    var v = G.fromBar(bar, unit);
    return v.toFixed(PRESS_DECIMALS[unit]) + ' ' + G.PRESSURE_UNITS[unit].label;
  }
  function fmtPNum(bar, unit) {
    return G.fromBar(bar, unit).toFixed(PRESS_DECIMALS[unit]);
  }
  function fmtV(litre, unit) {
    var v = G.fromLitre(litre, unit);
    return v.toFixed(VOL_DECIMALS[unit]) + ' ' + G.VOLUME_UNITS[unit].label;
  }
  /* The unit shared by every recipient, or null when they disagree. */
  function sharedRecipientUnit(key) {
    var u = null;
    for (var i = 0; i < state.recipients.length; i++) {
      var v = state.recipients[i][key];
      if (u === null) u = v;
      else if (u !== v) return null;
    }
    return u;
  }
  function statPressureUnit() { return sharedRecipientUnit('pressureUnit') || 'bar'; }
  /* Free air reads better in ft³ for bottles measured in in³ or ft³. */
  function airUnit() {
    var vu = sharedRecipientUnit('volumeUnit');
    return (vu === 'in3' || vu === 'ft3') ? 'ft3' : 'L';
  }
  function fmtAir(litres) {
    return Math.round(G.fromLitre(litres, airUnit())).toLocaleString();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function volL(b) { return G.toLitre(b.volume, b.volumeUnit); }
  function pBar(b) { return G.toBar(b.pressure, b.pressureUnit); }
  function maxBar(r) { return G.toBar(r.max, r.pressureUnit); }
  function minBar(r) { return G.toBar(r.min, r.pressureUnit); }
  function targetBar(r) { return G.toBar(r.target, r.pressureUnit); }

  /* -------------------------------------------------------- bottle graphic */

  /* frac 0..1 fill height; ticks are optional fractions to mark min / max. */
  function bottleSVG(opts) {
    var w = opts.w || 44, h = opts.h || 112;
    var frac = Math.max(0, Math.min(1.06, opts.frac || 0));
    var neckW = Math.max(7, w * 0.2), neckH = h * 0.075;
    var bodyTop = neckH + h * 0.045;
    var bodyH = h - bodyTop;
    var rx = w * 0.36;
    var clipId = 'clip' + (++uid);
    var fillH = bodyH * Math.min(frac, 1);
    var tone = opts.tone ? ' ' + opts.tone : '';

    var ticks = '';
    (opts.ticks || []).forEach(function (t) {
      var y = bodyTop + bodyH * (1 - Math.max(0, Math.min(1, t.frac)));
      ticks += '<line class="tick ' + (t.kind || '') + '" x1="1" x2="' + (w - 1) + '" y1="' +
               y.toFixed(2) + '" y2="' + y.toFixed(2) + '"></line>';
    });

    return '<svg class="bottle" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h +
      '" role="img" aria-label="' + esc(opts.label || '') + '">' +
      '<defs><clipPath id="' + clipId + '"><rect x="1" y="' + bodyTop + '" width="' + (w - 2) +
        '" height="' + (bodyH - 1) + '" rx="' + rx + '"></rect></clipPath></defs>' +
      '<rect class="valve" x="' + ((w - neckW) / 2).toFixed(2) + '" y="0" width="' + neckW.toFixed(2) +
        '" height="' + (neckH + 3).toFixed(2) + '" rx="2"></rect>' +
      '<rect class="shell" x="1" y="' + bodyTop + '" width="' + (w - 2) + '" height="' + (bodyH - 1) +
        '" rx="' + rx + '"></rect>' +
      '<g clip-path="url(#' + clipId + ')">' +
        '<rect class="level' + tone + '" x="1" y="' + (bodyTop + bodyH - 1 - fillH).toFixed(2) +
        '" width="' + (w - 2) + '" height="' + fillH.toFixed(2) + '"></rect>' + ticks +
      '</g></svg>';
  }

  function donorScaleBar() {
    var m = 1;
    state.donors.forEach(function (d) { m = Math.max(m, pBar(d)); });
    state.recipients.forEach(function (r) { m = Math.max(m, maxBar(r)); });
    return m;
  }

  /* ------------------------------------------------------------ row editor */

  function unitSelect(kind, value) {
    var units = kind === 'volume' ? G.VOLUME_UNITS : G.PRESSURE_UNITS;
    var out = '<select data-unit="' + kind + '">';
    Object.keys(units).forEach(function (k) {
      out += '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + units[k].label + '</option>';
    });
    return out + '</select>';
  }

  function numField(label, key, value, unitKind, unitValue, title) {
    return '<label class="field"' + (title ? ' title="' + esc(title) + '"' : '') +
      '><span>' + label + '</span><div class="combo">' +
      '<input type="number" step="any" min="0" data-key="' + key + '" value="' + value + '">' +
      (unitKind ? unitSelect(unitKind, unitValue) : '') + '</div></label>';
  }

  /* Changing a unit re-expresses the same physical bottle, it does not
     re-interpret the number the user typed. */
  function roundTo(v, decimals) {
    var f = Math.pow(10, decimals);
    return Math.round(v * f) / f;
  }
  function setField(row, key, value) {
    var el = row.querySelector('input[data-key="' + key + '"]');
    if (el) el.value = value;
  }

  function buildRow(model, kind) {
    var row = document.createElement('div');
    row.className = 'brow';
    row.dataset.kind = kind;
    var fields =
      '<label class="field brow-name"><span>Name</span><input type="text" data-key="name" value="' +
        esc(model.name) + '" maxlength="24"></label>' +
      numField('Volume', 'volume', model.volume, 'volume', model.volumeUnit) +
      numField('Pressure', 'pressure', model.pressure, 'pressure', model.pressureUnit);
    if (kind === 'recipient') {
      fields += numField('Max pressure', 'max', model.max, null, null,
                  'Highest working pressure. Transfers stop here and no donor above it is connected ' +
                  'unless unsafe filling is allowed.') +
                numField('Min pressure', 'min', model.min, null, null,
                  'The bottle comes back for a refill at this pressure.') +
                numField('Fill target', 'target', model.target, null, null,
                  'A fill counts once it reaches this pressure. The bottle then goes into service and ' +
                  'returns at its minimum for the next fill.');
    }
    row.innerHTML =
      '<div class="brow-viz"></div>' +
      '<div class="brow-fields">' + fields + '</div>' +
      '<button class="brow-del" type="button" title="Remove" aria-label="Remove bottle">&times;</button>';
    row._model = model;

    row.addEventListener('input', function (ev) {
      var t = ev.target, key = t.dataset.key, unit = t.dataset.unit;
      if (key) {
        model[key] = t.type === 'number' ? (parseFloat(t.value) || 0) : t.value;
      } else if (unit === 'volume') {
        var litres = volL(model);
        model.volumeUnit = t.value;
        model.volume = roundTo(G.fromLitre(litres, t.value), VOL_DECIMALS[t.value]);
        setField(row, 'volume', model.volume);
      } else if (unit === 'pressure') {
        var keys = ['pressure', 'max', 'min', 'target'];
        var bars = keys.map(function (k) {
          return model[k] == null ? null : G.toBar(model[k], model.pressureUnit);
        });
        model.pressureUnit = t.value;
        keys.forEach(function (k, i) {
          if (bars[i] == null) return;
          model[k] = roundTo(G.fromBar(bars[i], t.value), PRESS_DECIMALS[t.value]);
          setField(row, k, model[k]);
        });
      }
      refresh();
    });
    row.querySelector('.brow-del').addEventListener('click', function () {
      var list = kind === 'donor' ? state.donors : state.recipients;
      var i = list.indexOf(model);
      if (i >= 0) list.splice(i, 1);
      renderLists();
      refresh();
    });
    return row;
  }

  function renderLists() {
    ['donor', 'recipient'].forEach(function (kind) {
      var host = document.getElementById(kind === 'donor' ? 'donorList' : 'recipList');
      var list = kind === 'donor' ? state.donors : state.recipients;
      host.textContent = '';
      if (!list.length) {
        var p = document.createElement('p');
        p.className = 'empty';
        p.textContent = 'No ' + kind + ' bottles — add one to start.';
        host.appendChild(p);
        return;
      }
      list.forEach(function (m) { host.appendChild(buildRow(m, kind)); });
    });
  }

  function updateRowGraphics() {
    var scale = donorScaleBar();
    document.querySelectorAll('.brow').forEach(function (row) {
      var m = row._model, kind = row.dataset.kind, viz = row.querySelector('.brow-viz');
      var p = pBar(m), invalid = false, frac, ticks = [], tone = '';
      if (kind === 'donor') {
        frac = p / scale;
        invalid = volL(m) <= 0;
      } else {
        var mx = maxBar(m), mn = minBar(m);
        frac = mx > 0 ? p / mx : 0;
        ticks = [{ frac: mn / (mx || 1), kind: 'min' },
                 { frac: targetBar(m) / (mx || 1), kind: 'target' }];
        if (p > mx * 1.0001) tone = 'dangerlevel';
        else if (p < mn) tone = 'warnlevel';
        invalid = volL(m) <= 0 || mx <= mn;
      }
      row.classList.toggle('is-invalid', invalid);
      viz.innerHTML = bottleSVG({ w: 44, h: 106, frac: frac, ticks: ticks, tone: tone,
        label: m.name + ' at ' + fmtP(p, m.pressureUnit) }) +
        '<div class="bottle-cap">' + fmtPNum(p, m.pressureUnit) + '</div>';
    });
  }

  /* ------------------------------------------------------------ simulation */

  function buildConfig(method) {
    return {
      method: method || state.method,
      allowUnsafe: state.allowUnsafe,
      donors: state.donors.filter(function (d) { return volL(d) > 0; }).map(function (d) {
        return { id: d.id, name: d.name, volumeL: volL(d), pressureBar: pBar(d) };
      }),
      recipients: state.recipients.filter(function (r) {
        return volL(r) > 0 && maxBar(r) > minBar(r);
      }).map(function (r) {
        return { id: r.id, name: r.name, volumeL: volL(r), pressureBar: pBar(r),
                 maxBar: maxBar(r), minBar: minBar(r), targetBar: targetBar(r) };
      })
    };
  }

  function modelById(id) {
    var all = state.donors.concat(state.recipients);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function validate() {
    var issues = [];
    state.recipients.forEach(function (r) {
      if (volL(r) <= 0) issues.push(['error', esc(r.name) + ': volume must be greater than zero.']);
      if (maxBar(r) <= minBar(r)) {
        issues.push(['error', esc(r.name) + ': maximum pressure must be above the minimum pressure.']);
      }
      if (targetBar(r) <= minBar(r) + 1e-9) {
        issues.push(['error', esc(r.name) + ': the fill target must be above the minimum pressure, ' +
          'otherwise a bottle would count as filled the moment it is topped up at all.']);
      } else if (targetBar(r) > maxBar(r) + 1e-9) {
        issues.push(['warn', esc(r.name) + ': the fill target sits above the maximum working pressure — ' +
          fmtP(maxBar(r), r.pressureUnit) + ' is used instead.']);
      }
      if (G.exceedsMax(pBar(r), maxBar(r))) {
        issues.push(['warn', esc(r.name) + ' already sits above its maximum working pressure (' +
          fmtP(pBar(r), r.pressureUnit) + ' > ' + fmtP(maxBar(r), r.pressureUnit) + ') — it cannot be filled.']);
      }
    });
    state.donors.forEach(function (d) {
      if (volL(d) <= 0) issues.push(['error', esc(d.name) + ': volume must be greater than zero.']);
    });
    if (!state.allowUnsafe) {
      var blocked = state.donors.filter(function (d) {
        return state.recipients.some(function (r) { return G.exceedsMax(pBar(d), maxBar(r)); });
      });
      if (blocked.length) {
        var names = blocked.map(function (d) { return esc(d.name); });
        issues.push(['warn', names.join(', ') + (names.length === 1 ? ' exceeds' : ' exceed') +
          ' a recipient maximum working pressure and ' + (names.length === 1 ? 'is' : 'are') +
          ' held back. Enable “Allow unsafe filling” to use ' +
          (names.length === 1 ? 'it' : 'them') + ' anyway.']);
      }
    }
    return issues;
  }

  /* ----------------------------------------------------------- plan render */

  function statBlock(result) {
    var pu = statPressureUnit();
    var tiles = [
      ['accent', result.usableFills, result.usableFills === 1 ? 'Fill delivered' : 'Fills delivered'],
      ['accent', result.usableFills ? fmtPNum(result.avgFillPressureBar, pu) : '—',
        'Average after fill (' + G.PRESSURE_UNITS[pu].label + ')'],
      ['', fmtAir(result.usableFreeAirL), 'Usable air delivered (' + G.VOLUME_UNITS[airUnit()].label + ')'],
      ['', result.transferCount, 'Transfers'],
      ['', Math.round(result.bankUsedFraction * 100) + '%', 'Donor bank used']
    ];
    var html = tiles.map(function (t) {
      return '<div class="stat ' + t[0] + '"><div class="stat-v">' + t[1] + '</div><div class="stat-l">' +
        t[2] + '</div></div>';
    }).join('');
    if (result.recipients.length > 1) {
      var perRecipient = result.recipients.map(function (r) {
        return esc(r.name) + ' ' + r.fills + '×';
      }).join(' · ');
      html += '<div class="stat"><div class="stat-v" style="font-size:.95rem">' + perRecipient +
        '</div><div class="stat-l">Per bottle</div></div>';
    }
    return html;
  }

  /**
   * Smart and dumb side by side.  Fill count alone is misleading — sequential
   * filling often shows more, weaker fills — so the table carries the pressure
   * each fill reaches and the air that is actually usable afterwards.
   */
  function comparisonHTML(smart, dumb) {
    var pu = statPressureUnit();
    var au = G.VOLUME_UNITS[airUnit()].label;
    var rows = [['smart', 'Cascade', smart], ['dumb', 'Sequential', dumb]].map(function (row) {
      var r = row[2];
      return '<tr' + (state.method === row[0] ? ' class="is-active"' : '') + '>' +
        '<th scope="row">' + row[1] +
          (state.method === row[0] ? ' <span class="cmp-now">in use</span>' : '') + '</th>' +
        '<td>' + r.usableFills + '</td>' +
        '<td>' + (r.usableFills ? fmtPNum(r.avgFillPressureBar, pu) : '—') + '</td>' +
        '<td>' + fmtAir(r.usableFreeAirL) + '</td>' +
        '<td>' + Math.round(r.bankUsedFraction * 100) + '%</td></tr>';
    }).join('');

    return '<table class="cmp"><thead><tr><th scope="col">Method</th>' +
      '<th scope="col">Fills</th>' +
      '<th scope="col">Avg. after fill (' + G.PRESSURE_UNITS[pu].label + ')</th>' +
      '<th scope="col">Usable air (' + au + ')</th>' +
      '<th scope="col">Bank used</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="cmp-note">' + verdict(smart, dumb) + '</p>';
  }

  function verdict(smart, dumb) {
    if (!smart.usableFills && !dumb.usableFills) {
      return 'Neither method can bring a bottle to its target from this bank.';
    }
    var pu = statPressureUnit();
    var au = G.VOLUME_UNITS[airUnit()].label;
    var airGain = dumb.usableFreeAirL > 0
      ? (smart.usableFreeAirL / dumb.usableFreeAirL - 1) * 100 : null;
    var pressureGain = smart.avgFillPressureBar - dumb.avgFillPressureBar;

    if (smart.usableFreeAirL <= dumb.usableFreeAirL + 1e-6 && pressureGain <= 1e-9) {
      return 'Both methods get the same out of this bank — with one donor, or donors at equal ' +
        'pressure, there is nothing to cascade.';
    }

    var text;
    if (airGain !== null && airGain >= 0.5) {
      text = 'Cascade filling gets <b>' + airGain.toFixed(0) + '% more usable air</b> out of the same bank';
    } else if (smart.usableFreeAirL > dumb.usableFreeAirL) {
      text = 'Cascade filling gets <b>' + fmtAir(smart.usableFreeAirL - dumb.usableFreeAirL) + ' ' + au +
        ' more usable air</b> out of the same bank';
    } else {
      text = 'Cascade filling gets the same air out of this bank';
    }
    if (pressureGain > 0 && smart.usableFills && dumb.usableFills) {
      /* A pressure difference converts like a pressure: the units are pure
         scale factors once both sides are gauge readings. */
      text += ', with every fill ending <b>' + fmtP(pressureGain, pu) + '</b> higher on average';
    }
    text += '.';

    if (dumb.usableFills > smart.usableFills) {
      text += ' Sequential filling shows ' + (dumb.usableFills - smart.usableFills) +
        ' more fills, but they are weaker ones: a bottle handed back at ' +
        fmtP(dumb.avgFillPressureBar, pu) + ' holds less than one at ' +
        fmtP(smart.avgFillPressureBar, pu) + '.';
    } else if (smart.usableFills > dumb.usableFills) {
      text += ' It also manages ' + (smart.usableFills - dumb.usableFills) + ' more fills.';
    }
    return text;
  }

  function legHTML(model, from, to, cls) {
    var u = model ? model.pressureUnit : 'bar';
    return '<span class="leg ' + cls + '"><span class="who">' + esc(model ? model.name : '?') +
      '</span><span class="num">' + fmtPNum(from, u) + ' <span class="after">&rarr; ' +
      fmtPNum(to, u) + '</span> ' + G.PRESSURE_UNITS[u].label + '</span></span>';
  }

  function fillHTML(ev) {
    var r = modelById(ev.recipientId);
    var u = r ? r.pressureUnit : 'bar';
    var mx = r ? maxBar(r) : ev.endP;
    var tagClass = ev.status === 'full' ? 'full' : (ev.status === 'usable' ? 'usable' : 'short');
    var tagText = ev.status === 'full' ? 'at maximum'
      : (ev.status === 'usable' ? 'counted' : 'short of target');

    var steps = ev.transfers.map(function (t, i) {
      var d = modelById(t.donorId);
      return '<li class="step">' +
        '<span class="step-n">' + (i + 1) + '</span>' +
        legHTML(d, t.donorFrom, t.donorTo, 'drop') +
        '<span class="step-arrow">&rarr;</span>' +
        legHTML(r, t.recipFrom, t.recipTo, 'gain') +
        '<span>' + (t.unsafe ? '<span class="tag danger" title="Donor pressure exceeds this bottle’s maximum">unsafe</span> ' : '') +
          (t.capped ? '<span class="tag">stop at max</span>' : '') + '</span>' +
        '</li>';
    }).join('');

    return '<li class="fill ' + (ev.unsafe ? 'unsafe ' : '') + (ev.status === 'short' ? 'short' : '') + '">' +
      '<div class="fill-head">' +
        '<span class="fill-no">Fill ' + ev.index + '</span>' +
        '<span class="fill-title">' + esc(ev.recipientName) + ' <span class="to">' +
          fmtPNum(ev.startP, u) + ' &rarr; ' + fmtP(ev.endP, u) + '</span></span>' +
        '<span class="fill-bar" title="' + fmtP(ev.startP, u) + ' &rarr; ' + fmtP(ev.endP, u) +
          ', target ' + fmtP(ev.target, u) + ', maximum ' + fmtP(mx, u) + '">' +
          '<i style="width:' + (100 * Math.min(1, ev.startP / mx)).toFixed(1) + '%"></i>' +
          '<b style="width:' + (100 * Math.min(1, ev.endP / mx)).toFixed(1) + '%"></b>' +
          '<u style="left:' + (100 * Math.min(1, ev.target / mx)).toFixed(1) + '%"></u></span>' +
        '<span class="tag ' + tagClass + '">' + tagText + '</span>' +
        (ev.unsafe ? '<span class="tag danger">unsafe transfer</span>' : '') +
      '</div>' +
      '<ol class="steps">' + steps + '</ol></li>';
  }

  function renderPlan() {
    var cfg = buildConfig();
    var result = G.simulate(cfg);
    var smart = state.method === 'smart' ? result : G.simulate(buildConfig('smart'));
    var dumb = state.method === 'dumb' ? result : G.simulate(buildConfig('dumb'));

    document.getElementById('methodHint').textContent = state.method === 'smart'
      ? 'Cascade: two donors per fill — the lowest carries the bulk, the fullest tops up.'
      : 'Sequential: one donor per fill, drained until it can no longer reach the target.';

    var issues = validate();
    if (result.truncated) {
      issues.unshift(['warn', 'The plan was cut off after ' + result.events.length +
        ' fills. Raise a fill target to get a shorter, more realistic plan.']);
    }
    if (result.unsafeTransfers) {
      issues.unshift(['error', result.unsafeTransfers + ' transfer(s) connect a donor above the recipient’s ' +
        'maximum working pressure. Filling stops at the maximum, but the bottle and valve see the full donor pressure.']);
    }
    var issueHost = document.getElementById('issues');
    issueHost.innerHTML = issues.map(function (i) {
      return '<div class="issue ' + i[0] + '">' + i[1] + '</div>';
    }).join('');
    issueHost.hidden = issues.length === 0;

    document.getElementById('stats').innerHTML = statBlock(result);

    var cmp = document.getElementById('compare');
    cmp.innerHTML = (cfg.donors.length && cfg.recipients.length) ? comparisonHTML(smart, dumb) : '';

    var timeline = document.getElementById('timeline');
    if (!result.events.length) {
      timeline.innerHTML = '<li class="empty">' + (cfg.donors.length && cfg.recipients.length
        ? 'No transfer is possible — no donor is above a recipient’s current pressure (and within its maximum).'
        : 'Add at least one donor and one recipient bottle.') + '</li>';
    } else {
      var shown = result.events.slice(0, 60);
      timeline.innerHTML = shown.map(fillHTML).join('') +
        (result.events.length > shown.length
          ? '<li class="empty">' + (result.events.length - shown.length) + ' further fills not listed.</li>' : '');
    }

    var residual = document.getElementById('residual');
    var scale = donorScaleBar();
    residual.innerHTML = result.donors.length ? result.donors.map(function (d) {
      var m = modelById(d.id);
      var u = m ? m.pressureUnit : 'bar';
      return '<div class="unit"><div class="name" title="' + esc(d.name) + '">' + esc(d.name) + '</div>' +
        bottleSVG({ w: 56, h: 118, frac: d.pressureBar / scale,
          label: d.name + ' left at ' + fmtP(d.pressureBar, u) }) +
        '<div class="bottle-cap">' + fmtP(d.pressureBar, u) + '<br>' +
        'was ' + fmtPNum(d.startBar, u) + '</div></div>';
    }).join('') : '<p class="empty">No donor bottles.</p>';
  }

  function refresh() {
    updateRowGraphics();
    renderPlan();
    saveState();
    if (location.hash.length > 1) history.replaceState(null, '', location.pathname + location.search);
  }

  /* --------------------------------------------------------------- wiring */

  document.querySelectorAll('.seg-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.method = btn.dataset.method;
      document.querySelectorAll('.seg-btn').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      refresh();
    });
  });

  var unsafeChk = document.getElementById('unsafeChk');
  unsafeChk.addEventListener('change', function () {
    state.allowUnsafe = unsafeChk.checked;
    refresh();
  });

  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.add === 'donor') {
        var last = state.donors[state.donors.length - 1];
        state.donors.push({ id: nextId('d'), name: 'Bank ' +
          String.fromCharCode(65 + state.donors.length % 26),
          volume: last ? last.volume : 6, volumeUnit: last ? last.volumeUnit : 'L',
          pressure: last ? last.pressure : 300, pressureUnit: last ? last.pressureUnit : 'bar' });
      } else {
        var lr = state.recipients[state.recipients.length - 1];
        state.recipients.push({ id: nextId('r'), name: 'Tank ' + (state.recipients.length + 1),
          volume: lr ? lr.volume : 68, volumeUnit: lr ? lr.volumeUnit : 'in3',
          pressure: lr ? lr.min : 50, pressureUnit: lr ? lr.pressureUnit : 'bar',
          max: lr ? lr.max : 300, min: lr ? lr.min : 50,
          target: lr ? lr.target : midTarget(50, 300) });
      }
      renderLists();
      refresh();
    });
  });

  var themeBtn = document.getElementById('themeBtn');
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark';
    try { localStorage.setItem('gasfill.theme', t); } catch (e) { /* ignore */ }
  }
  themeBtn.addEventListener('click', function () {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('shareBtn').addEventListener('click', function (ev) {
    var payload = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    var url = location.origin + location.pathname + '#' + payload;
    var btn = ev.currentTarget;
    var done = function (ok) {
      btn.textContent = ok ? 'Copied' : 'Copy failed';
      setTimeout(function () { btn.textContent = 'Copy link'; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
    } else {
      history.replaceState(null, '', '#' + payload);
      done(false);
    }
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    state = defaultState();
    unsafeChk.checked = state.allowUnsafe;
    syncMethodButtons();
    renderLists();
    refresh();
  });

  function syncMethodButtons() {
    document.querySelectorAll('.seg-btn').forEach(function (b) {
      var on = b.dataset.method === state.method;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  /* ----------------------------------------------------------------- init */
  var savedTheme = null;
  try { savedTheme = localStorage.getItem('gasfill.theme'); } catch (e) { /* ignore */ }
  applyTheme(savedTheme === 'light' ? 'light' :
    (savedTheme === 'dark' ? 'dark'
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')));

  unsafeChk.checked = state.allowUnsafe;
  syncMethodButtons();
  renderLists();
  refresh();
})();
