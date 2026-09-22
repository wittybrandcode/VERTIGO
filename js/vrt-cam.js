/* VERTIGO vrt-cam.js — camera section: angle toolkit, field pairs, read/write,
 * sliders wiring, Build/Link/Read buttons. Depends on vrt-bridge.js. */

(function () {
  'use strict';

  /* Angle props (orient/rotx/y/z) accept AE revolutions notation: 1x45 = 405. */
  var ANGLES = ['orient', 'rotx', 'roty', 'rotz'];
  function isAngleProp(prop) { return ANGLES.indexOf(prop) >= 0; }
  function parseAngle(str) {
    var s = String(str);
    if (/[xX]/.test(s)) {
      var m = s.match(/^\s*([+-]?\d+(?:\.\d+)?)[xX]([+-]?\d+(?:\.\d+)?)\s*$/);
      if (!m) { return { ok: false, v: 0 }; }
      return { ok: true, v: parseFloat(m[1]) * 360 + parseFloat(m[2]) };
    }
    var v = parseFloat(s);
    if (!(v > 0 || v < 0 || v === 0)) { return { ok: false, v: 0 }; }
    return { ok: true, v: v };
  }
  /* Two-box angle model (like AE timeline): x-box = full turns, field = degrees. */
  function splitAngle(total) {
    var n = parseFloat(total);
    if (!(n > 0 || n < 0 || n === 0)) { return null; }
    var t = Math.trunc(n / 360);
    var r = Math.round((n - t * 360) * 100) / 100;
    return { rev: t, deg: r };
  }
  function writeAngleBoxes(prop, i, total) {
    var sp = splitAngle(total);
    if (!sp) { return; }
    var xb = document.getElementById(prop + i + 'x');
    var nb = document.getElementById(prop + i);
    if (xb) { xb.value = sp.rev; }
    if (nb) { nb.value = sp.deg; }
  }
  function angleTotal(prop, i) {
    var xb = document.getElementById(prop + i + 'x');
    var nb = document.getElementById(prop + i);
    var rev = xb ? (parseInt(xb.value, 10) || 0) : 0;
    var ds = nb ? nb.value : '0';
    if (/[xX]/.test(ds)) { return parseAngle(ds); }
    var d = parseFloat(ds);
    if (!(d > 0 || d < 0 || d === 0)) { return { ok: false, v: 0 }; }
    return { ok: true, v: rev * 360 + d };
  }
  function fieldVal(prop, i) {
    if (!isAngleProp(prop)) {
      var el = document.getElementById(prop + i);
      return { ok: true, v: el ? el.value : '0' };
    }
    return angleTotal(prop, i);
  }
  /* One field pair per property component: range #{prop}{i}r + number #{prop}{i}. */
  function setPair(prop, i, v) {
    var r = document.getElementById(prop + i + 'r');
    if (r) { r.value = v; }
    if (!isAngleProp(prop)) {
      var n = document.getElementById(prop + i);
      if (n) { n.value = v; }
      return;
    }
    writeAngleBoxes(prop, i, v);
  }

  function disableProp(prop, on) {
    document.querySelectorAll('[data-prop="' + prop + '"]').forEach(function (el) {
      el.disabled = !!on;
    });
  }

  /* Populate every row from a vrtCamGet response. null = unsupported here. */
  function applyGet(r) {
    var nm = document.getElementById('cam-name');
    if (nm) { nm.textContent = r.name || '—'; }
    var v = r.v || {};
    try { window.vrtSnapCam = JSON.parse(JSON.stringify(v)); } catch (e) {}
    Object.keys(v).forEach(function (k) {
      var val = v[k];
      if (k === 'dof') {
        var c = document.getElementById('dof0');
        if (c) { c.checked = (val === 1 || val === '1'); }
        return;
      }
      if (val === null || val === undefined) { disableProp(k, true); return; }
      disableProp(k, false);
      var arr = (val instanceof Array) ? val : [val];
      for (var i = 0; i < arr.length; i++) { setPair(k, i, arr[i]); }
    });
  }

  function refresh(silent) {
    if (!silent) { window.VRT.status('…', 'working'); }
    window.VRT.callJSX('vrtCamGet', [], function (r) {
      if (!r.ok) {
        var nm = document.getElementById('cam-name');
        if (nm) { nm.textContent = '—'; }
        if (!silent) { window.VRT.status('! ' + r.err, 'err'); }
        return;
      }
      applyGet(r);
      if (!silent) { window.VRT.status('✓ ' + (r.name || 'camera'), 'ok'); }
    });
  }

  function sendProp(prop, dims, quiet) {
    var p0 = fieldVal(prop, 0), p1 = fieldVal(prop, 1), p2 = fieldVal(prop, 2);
    if (!p0.ok || (dims > 1 && !p1.ok) || (dims > 2 && !p2.ok)) {
      if (!quiet) { window.VRT.status('! bad angle (e.g. 1x45)', 'err'); }
      return;
    }
    var args = [prop, String(p0.v), String(p1.v), String(p2.v)].slice(0, dims + 1);
    if (!quiet) { window.VRT.status('…', 'working'); }
    window.VRT.callJSX('vrtCamSet', args, function (r) {
      if (!quiet) { window.VRT.status(r.ok ? '✓ ' + prop : ('! ' + r.err), r.ok ? 'ok' : 'err'); }
    });
  }

  function camInit($) {
    /* Every slider + field writes straight back (paired sync + live throttle). */
    document.querySelectorAll('input[data-prop]').forEach(function (el) {
      var prop = el.getAttribute('data-prop');
      var dims = parseInt(el.getAttribute('data-dims'), 10) || 1;
      if (el.type === 'checkbox') {
        el.addEventListener('change', function () {
          window.VRT.status('…', 'working');
          window.VRT.callJSX('vrtCamSet', [prop, el.checked ? '1' : '0'], function (r) {
            window.VRT.status(r.ok ? '✓ ' + prop : ('! ' + r.err), r.ok ? 'ok' : 'err');
          });
        });
        return;
      }
      el.addEventListener('input', function () {
        var peer = document.getElementById(
          el.type === 'range' ? prop + el.getAttribute('data-i') : prop + el.getAttribute('data-i') + 'r');
        /* x-notation (1x45) lives in the text field only — sliders can't hold it */
        if (peer && (el.type === 'range' || /[xX]/.test(el.value) === false)) { peer.value = el.value; }
        if (!window.VRT.guard()) { return; }
        sendProp(prop, dims, true);
      });
      el.addEventListener('change', function () {
        if (el.type !== 'range' && isAngleProp(prop)) {
          var t = angleTotal(prop, el.getAttribute('data-i'));
          if (!t.ok) { window.VRT.status('! bad angle (e.g. 1x45)', 'err'); return; }
          writeAngleBoxes(prop, el.getAttribute('data-i'), t.v);
        }
        sendProp(prop, dims, false);
      });
    });
    document.querySelectorAll('.xbox').forEach(function (xb) {
      xb.addEventListener('change', function () {
        var m = xb.id.match(/^([a-zA-Z]+)(\d+)x$/);
        if (!m) { return; }
        var sib = document.getElementById(m[1] + m[2]);
        var dims = sib ? (parseInt(sib.getAttribute('data-dims'), 10) || 1) : 1;
        var t = angleTotal(m[1], m[2]);
        if (!t.ok) { window.VRT.status('! bad angle', 'err'); return; }
        writeAngleBoxes(m[1], m[2], t.v);
        var p0 = angleTotal(m[1], '0'), p1 = angleTotal(m[1], '1'), p2 = angleTotal(m[1], '2');
        var args = [m[1], String(p0.v), String(p1.v), String(p2.v)].slice(0, dims + 1);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtCamSet', args, function (r) {
          window.VRT.status(r.ok ? '✓ ' + m[1] : ('! ' + r.err), r.ok ? 'ok' : 'err');
        });
      });
    });

    [['btn-cam-build', 'vrtCamEnsure'], ['btn-cam-link', 'vrtCamLink']].forEach(function (pair) {
      var b = $(pair[0]);
      if (!b) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      b.addEventListener('click', function () {
        window.VRT.busy(b, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX(pair[1], [], function (r) {
          window.VRT.busy(b, false);
          if (r.ok) { refresh(true); if (window.VRT.trackRefresh) { window.VRT.trackRefresh(); } }
          window.VRT.status(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    var refBtn = $('btn-cam-refresh');
    if (refBtn) {
      refBtn.addEventListener('click', function () { refresh(false); });
    }
    refresh(true);
  }

  window.VRT = window.VRT || {};
  window.VRT.camInit = camInit;
  window.VRT.camRefresh = refresh;
  window.VRT.setPair = setPair;
})();
