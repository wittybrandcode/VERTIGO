/* VERTIGO vrt-reset.js — snapshot resets: ↺ per row + ↺ per group.
 * Snapshots are captured by cam/rail refreshes; this module only consumes them.
 * Depends on vrt-bridge.js. */

(function () {
  'use strict';

  var RAIL_BASE = { 'rail-width': 'width', 'rail-prog': 'prog', 'rail-height': 'height', 'rail-tiltx': 'tiltx', 'rail-tiltz': 'tiltz', 'rail-x': 'x', 'rail-y': 'y', 'rail-z': 'z' };

  /* One row may hold several properties (XYZ merged) — reset them all. */
  function resetRow(row, cb) {
    function done(ok) { if (cb) { cb(ok); } }
    var jobs = [];
    var seen = {};
    row.querySelectorAll('input[data-prop]').forEach(function (el) {
      var prop = el.getAttribute('data-prop');
      if (seen['c' + prop]) { return; }
      seen['c' + prop] = 1;
      jobs.push({ kind: 'cam', prop: prop, dims: parseInt(el.getAttribute('data-dims'), 10) || 1 });
    });
    row.querySelectorAll('input[id]').forEach(function (el) {
      var base = el.id;
      if (!RAIL_BASE[base] && RAIL_BASE[base.replace(/r$/, '')]) { base = base.replace(/r$/, ''); }
      if (!RAIL_BASE[base] || seen['r' + base]) { return; }
      seen['r' + base] = 1;
      jobs.push({ kind: 'rail', param: RAIL_BASE[base], base: base });
    });
    if (!jobs.length) { done(false); return; }
    var j, missing = false;
    for (j = 0; j < jobs.length; j++) {
      var sv = (jobs[j].kind === 'cam') ? (window.vrtSnapCam || {})[jobs[j].prop] : (window.vrtSnapRail || {})[jobs[j].param];
      if (sv === null || sv === undefined) { missing = true; break; }
    }
    if (missing) { window.VRT.status('! no snapshot', 'err'); done(false); return; }
    window.VRT.status('…', 'working');
    var pending = jobs.length, bad = 0;
    function oneDone(ok) {
      if (!ok) { bad++; }
      pending--;
      if (pending === 0) { window.VRT.status(bad ? '! reset failed' : '✓ reset', bad ? 'err' : 'ok'); done(bad === 0); }
    }
    jobs.forEach(function (jb) {
      if (jb.kind === 'cam') {
        var arr = (window.vrtSnapCam || {})[jb.prop];
        arr = (arr instanceof Array) ? arr : [arr];
        if (jb.prop === 'dof') {
          var c = document.getElementById('dof0');
          var dv = '0';
          if (c) { c.checked = (arr[0] === 1 || arr[0] === '1'); dv = c.checked ? '1' : '0'; }
          window.VRT.callJSX('vrtCamSet', ['dof', dv], function (r) { oneDone(r.ok); });
          return;
        } else {
        for (var i = 0; i < arr.length; i++) { window.VRT.setPair(jb.prop, i, arr[i]); }
        }
        var sargs = [jb.prop];
        for (var k = 0; k < jb.dims; k++) { sargs.push(String(arr[k] !== undefined ? arr[k] : 0)); }
        window.VRT.callJSX('vrtCamSet', sargs, function (r) { oneDone(r.ok); });
      } else {
        var sval = (window.vrtSnapRail || {})[jb.param];
        var rr = document.getElementById(jb.base + 'r');
        var nn = document.getElementById(jb.base);
        if (rr) { rr.value = sval; }
        if (nn) { nn.value = sval; }
        window.VRT.callJSX('vrtRailSet', [jb.param, String(sval)], function (r) { oneDone(r.ok); });
      }
    });
  }

  function resetInit() {
    document.querySelectorAll('.row.prow').forEach(function (row) {
      if (!row.querySelector('input') || row.querySelector('.rst')) { return; }
      var b = document.createElement('button');
      b.className = 'ibtn rst';
      b.title = 'Reset to snapshot';
      b.setAttribute('aria-label', 'Reset to snapshot');
      b.innerHTML = '<span class="g">↺</span>';
      b.addEventListener('click', function () { resetRow(row); });
      row.appendChild(b);
    });
    document.querySelectorAll('details.camgroup summary .grst').forEach(function (gb) {
      gb.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var rows = gb.closest('details').querySelectorAll('.row.prow');
        if (!rows.length) { return; }
        window.VRT.status('…', 'working');
        var pending = rows.length, bad = 0;
        rows.forEach(function (row) {
          resetRow(row, function (ok) {
            if (!ok) { bad++; }
            pending--;
            if (pending === 0) { window.VRT.status(bad ? '! ' + bad + ' failed' : '✓ group reset', bad ? 'err' : 'ok'); }
          });
        });
      });
    });
  }

  window.VRT = window.VRT || {};
  window.VRT.resetInit = resetInit;
  window.VRT.resetRow = resetRow;
})();
