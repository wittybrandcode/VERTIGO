/* VERTIGO js/main.js — F0 foundation: direct camera remote control.
 * Methodology: BUILD/LINK selects ONE camera, READ loads it, every
 * slider+field WRITES straight back. Vanilla, no Node, no framework.
 * Exposes window.vrtBridgeInit($) consumed by index.html. */

(function () {
  'use strict';

  var isCEP = (typeof window.__adobe_cep__ !== 'undefined') &&
              (typeof CSInterface !== 'undefined');
  var cs = isCEP ? new CSInterface() : null;

  function setStatus(msg, kind) {
    var bar = document.querySelector('footer');
    var el = document.getElementById('vrt-status');
    if (bar) { bar.setAttribute('data-kind', kind || 'ready'); }
    if (el) { el.textContent = msg; }
  }

  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /* Debug log: every bridge call + response, newest first. window.vrtDebug for Chrome inspect. */
  var logEl = null;
  function vrtLog(kind, msg) {
    try {
      window.vrtDebug = window.vrtDebug || [];
      var stamp = new Date().toISOString().substr(11, 8);
      window.vrtDebug.push({ t: stamp, kind: kind, msg: String(msg).slice(0, 300) });
      if (window.vrtDebug.length > 80) { window.vrtDebug.shift(); }
      logEl = logEl || document.getElementById('vrt-log');
      if (!logEl) { return; }
      var li = document.createElement('li');
      li.className = 'lg-' + kind;
      li.textContent = stamp + ' ' + msg;
      li.title = String(msg);
      logEl.insertBefore(li, logEl.firstChild);
      while (logEl.children.length > 50) { logEl.removeChild(logEl.lastChild); }
    } catch (e) {}
  }

  /* Clipboard fallback for older Chromium/CEP builds. */
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      done(!!ok);
    } catch (e) { done(false); }
  }

  /* fn("a","b",...) -> cb({ok,msg,err}) */
  function callJSX(fn, args, cb) {
    vrtLog('call', fn + '(' + args.join(', ') + ')');
    if (!isCEP) {
      var mock = { ok: false, err: 'preview — runs inside After Effects only' };
      vrtLog('err', fn + ' -> ' + mock.err);
      cb(mock);
      return;
    }
    var expr = fn + '(' + args.map(function (a) { return '"' + esc(a) + '"'; }).join(',') + ')';
    try {
      cs.evalScript(expr, function (res) {
        var r;
        try { r = JSON.parse(res); }
        catch (e) { r = { ok: false, err: 'bad response: ' + String(res).slice(0, 120) }; }
        vrtLog(r.ok ? 'ok' : 'err', fn + ' -> ' + (r.ok ? (r.msg || 'done') : r.err));
        cb(r);
      });
    } catch (e) {
      var r2 = { ok: false, err: String(e) };
      vrtLog('err', fn + ' -> ' + r2.err);
      cb(r2);
    }
  }

  function busy(btn, on) {
    if (btn) { btn.disabled = !!on; }
  }

  var lastLiveSent = 0;
  function liveGuard() {
    var now = Date.now();
    if (now - lastLiveSent < 120) { return false; }
    lastLiveSent = now;
    return true;
  }

  /* One field pair per property component: range #{prop}{i}r + number #{prop}{i}. */
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

  window.vrtBridgeInit = function ($) {
    setStatus(isCEP ? 'ready' : 'preview — runs inside After Effects only', isCEP ? 'ready' : 'err');
    vrtLog(isCEP ? 'ok' : 'err', isCEP ? 'CEP bridge ready' : 'preview mode (no CEP)');

    var dbgBtn = document.getElementById('btn-debug');
    var dbgSec = document.getElementById('sec-debug');
    if (dbgBtn && dbgSec) {
      dbgBtn.addEventListener('click', function () {
        dbgSec.hidden = !dbgSec.hidden;
      });
    }
    var clrBtn = document.getElementById('btn-log-clear');
    if (clrBtn) {
      clrBtn.addEventListener('click', function () {
        window.vrtDebug = [];
        var ol = document.getElementById('vrt-log');
        if (ol) { ol.innerHTML = ''; }
      });
    }
    var copyBtn = document.getElementById('btn-log-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var lines = (window.vrtDebug || []).map(function (e) { return e.t + ' [' + e.kind + '] ' + e.msg; });
        var text = 'VERTIGO log\n' + lines.join('\n');
        function done(ok) { setStatus(ok ? '✓ log copied' : '! copy failed', ok ? 'ok' : 'err'); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
        } else { fallbackCopy(text, done); }
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
      if (!silent) { setStatus('…', 'working'); }
      callJSX('vrtCamGet', [], function (r) {
        if (!r.ok) {
          var nm = document.getElementById('cam-name');
          if (nm) { nm.textContent = '—'; }
          if (!silent) { setStatus('! ' + r.err, 'err'); }
          return;
        }
        applyGet(r);
        if (!silent) { setStatus('✓ ' + (r.name || 'camera'), 'ok'); }
      });
    }

    function sendProp(prop, dims, quiet) {
      var p0 = fieldVal(prop, 0), p1 = fieldVal(prop, 1), p2 = fieldVal(prop, 2);
      if (!p0.ok || (dims > 1 && !p1.ok) || (dims > 2 && !p2.ok)) {
        if (!quiet) { setStatus('! bad angle (e.g. 1x45)', 'err'); }
        return;
      }
      var args = [prop, String(p0.v), String(p1.v), String(p2.v)].slice(0, dims + 1);
      if (!quiet) { setStatus('…', 'working'); }
      callJSX('vrtCamSet', args, function (r) {
        if (!quiet) { setStatus(r.ok ? '✓ ' + prop : ('! ' + r.err), r.ok ? 'ok' : 'err'); }
      });
    }

    /* Every slider + field writes straight back (paired sync + live throttle). */
    document.querySelectorAll('input[data-prop]').forEach(function (el) {
      var prop = el.getAttribute('data-prop');
      var dims = parseInt(el.getAttribute('data-dims'), 10) || 1;
      if (el.type === 'checkbox') {
        el.addEventListener('change', function () {
          setStatus('…', 'working');
          callJSX('vrtCamSet', [prop, el.checked ? '1' : '0'], function (r) {
            setStatus(r.ok ? '✓ ' + prop : ('! ' + r.err), r.ok ? 'ok' : 'err');
          });
        });
        return;
      }
      el.addEventListener('input', function () {
        var peer = document.getElementById(
          el.type === 'range' ? prop + el.getAttribute('data-i') : prop + el.getAttribute('data-i') + 'r');
        /* x-notation (1x45) lives in the text field only — sliders can't hold it */
        if (peer && (el.type === 'range' || /[xX]/.test(el.value) === false)) { peer.value = el.value; }
        if (!liveGuard()) { return; }
        sendProp(prop, dims, true);
      });
      el.addEventListener('change', function () {
        if (el.type !== 'range' && isAngleProp(prop)) {
          var t = angleTotal(prop, el.getAttribute('data-i'));
          if (!t.ok) { setStatus('! bad angle (e.g. 1x45)', 'err'); return; }
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
        if (!t.ok) { setStatus('! bad angle', 'err'); return; }
        writeAngleBoxes(m[1], m[2], t.v);
        var p0 = angleTotal(m[1], '0'), p1 = angleTotal(m[1], '1'), p2 = angleTotal(m[1], '2');
        var args = [m[1], String(p0.v), String(p1.v), String(p2.v)].slice(0, dims + 1);
        setStatus('…', 'working');
        callJSX('vrtCamSet', args, function (r) {
          setStatus(r.ok ? '✓ ' + m[1] : ('! ' + r.err), r.ok ? 'ok' : 'err');
        });
      });
    });

    [['btn-cam-build', 'vrtCamEnsure'], ['btn-cam-link', 'vrtCamLink']].forEach(function (pair) {
      var b = $(pair[0]);
      if (!b) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      b.addEventListener('click', function () {
        busy(b, true);
        setStatus('…', 'working');
        callJSX(pair[1], [], function (r) {
          busy(b, false);
          if (r.ok) { refresh(true); refreshTrack(); }
          setStatus(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    var refBtn = $('btn-cam-refresh');
    if (refBtn) {
      refBtn.addEventListener('click', function () { refresh(false); });
    }
    /* F2 rail: Width + Progress live sliders + Build/Clear. */
    [['rail-width', 'width'], ['rail-prog', 'prog'], ['rail-height', 'height'], ['rail-tiltx', 'tiltx'], ['rail-tiltz', 'tiltz'], ['rail-x', 'x'], ['rail-y', 'y'], ['rail-z', 'z']].forEach(function (pair) {
      var rid = document.getElementById(pair[0] + 'r');
      var nid = document.getElementById(pair[0]);
      function sendRail(quiet) {
        if (!quiet) { setStatus('…', 'working'); }
        callJSX('vrtRailSet', [pair[1], nid ? nid.value : '0'], function (r) {
          if (!quiet) { setStatus(r.ok ? '✓ rail' : ('! ' + r.err), r.ok ? 'ok' : 'err'); }
        });
      }
      if (rid) {
        rid.addEventListener('input', function () {
          if (nid) { nid.value = rid.value; }
          if (!liveGuard()) { return; }
          sendRail(true);
        });
        rid.addEventListener('change', function () { sendRail(false); });
      }
      if (nid) {
        nid.addEventListener('input', function () {
          if (rid) { rid.value = nid.value; }
          if (!liveGuard()) { return; }
          sendRail(true);
        });
        nid.addEventListener('change', function () { sendRail(false); });
      }
    });
    function setRailPair(base, v) {
      var r = document.getElementById(base + 'r');
      var n = document.getElementById(base);
      if (r) { r.value = v; }
      if (n) { n.value = v; }
    }
    function refreshRail(silent) {
      callJSX('vrtRailGet', [], function (r) {
        if (!r.ok) { if (!silent) { setStatus('! ' + r.err, 'err'); } return; }
        try { window.vrtSnapRail = { x: r.x, y: r.y, z: r.z, width: r.width, prog: r.prog, height: r.height, tiltx: r.tiltx, tiltz: r.tiltz }; } catch (e) {}
        setRailPair('rail-width', r.width); setRailPair('rail-prog', r.prog); setRailPair('rail-height', r.height); setRailPair('rail-tiltx', r.tiltx); setRailPair('rail-tiltz', r.tiltz);
        setRailPair('rail-x', r.x); setRailPair('rail-y', r.y); setRailPair('rail-z', r.z);
        if (!silent) { setStatus('✓ rail', 'ok'); }
      });
    }
    var railBuildBtn = $('btn-rail-build');
    if (railBuildBtn) {
      railBuildBtn.addEventListener('click', function () {
        busy(railBuildBtn, true);
        setStatus('…', 'working');
        callJSX('vrtRailBuild', [], function (r) {
          busy(railBuildBtn, false);
          if (r.ok) { refreshRail(true); }
          setStatus(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    }
    [['btn-plane-floor', 'floor'], ['btn-plane-wall', 'wall'], ['btn-plane-side', 'side']].forEach(function (pair) {
      var pb = $(pair[0]);
      if (!pb) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      pb.addEventListener('click', function () {
        busy(pb, true);
        setStatus('…', 'working');
        callJSX('vrtRailPlane', [pair[1]], function (r) {
          busy(pb, false);
          setStatus(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    [['btn-rail-clear', 'vrtRailClear'], ['btn-rail-look', 'vrtRailLook'], ['btn-rail-focus', 'vrtRailFocus']].forEach(function (pair) {
      var b = $(pair[0]);
      if (!b) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      b.addEventListener('click', function () {
        busy(b, true);
        setStatus('…', 'working');
        callJSX(pair[1], [], function (r) {
          busy(b, false);
          setStatus(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });

    function refreshTrack() {
      callJSX('vrtTrackStatus', [], function (r) {
        var nm = document.getElementById('track-name');
        if (!nm) { return; }
        if (r.ok && r.tracked) { nm.textContent = '◎ ' + (r.target || '?'); }
        else { nm.textContent = '—'; }
      });
    }
    [['btn-track-set', 'vrtTrackSet'], ['btn-track-clear', 'vrtTrackClear']].forEach(function (pair) {
      var b = $(pair[0]);
      if (!b) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      b.addEventListener('click', function () {
        busy(b, true);
        setStatus('…', 'working');
        callJSX(pair[1], [], function (r) {
          busy(b, false);
          if (r.ok) { refreshTrack(); }
          setStatus(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    /* F3: ↺ on every slider row restores the snapshot baseline. */
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
      if (missing) { setStatus('! no snapshot', 'err'); done(false); return; }
      setStatus('…', 'working');
      var pending = jobs.length, bad = 0;
      function oneDone(ok) {
        if (!ok) { bad++; }
        pending--;
        if (pending === 0) { setStatus(bad ? '! reset failed' : '✓ reset', bad ? 'err' : 'ok'); done(bad === 0); }
      }
      jobs.forEach(function (jb) {
        if (jb.kind === 'cam') {
          var arr = (window.vrtSnapCam || {})[jb.prop];
          arr = (arr instanceof Array) ? arr : [arr];
          if (jb.prop === 'dof') {
            var c = document.getElementById('dof0');
            var dv = '0';
            if (c) { c.checked = (arr[0] === 1 || arr[0] === '1'); dv = c.checked ? '1' : '0'; }
            callJSX('vrtCamSet', ['dof', dv], function (r) { oneDone(r.ok); });
            return;
          } else {
            for (var i = 0; i < arr.length; i++) { setPair(jb.prop, i, arr[i]); }
          }
          var sargs = [jb.prop];
          for (var k = 0; k < jb.dims; k++) { sargs.push(String(arr[k] !== undefined ? arr[k] : 0)); }
          callJSX('vrtCamSet', sargs, function (r) { oneDone(r.ok); });
        } else {
          var sval = (window.vrtSnapRail || {})[jb.param];
          var rr = document.getElementById(jb.base + 'r');
          var nn = document.getElementById(jb.base);
          if (rr) { rr.value = sval; }
          if (nn) { nn.value = sval; }
          callJSX('vrtRailSet', [jb.param, String(sval)], function (r) { oneDone(r.ok); });
        }
      });
    }
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
        setStatus('…', 'working');
        var pending = rows.length, bad = 0;
        rows.forEach(function (row) {
          resetRow(row, function (ok) {
            if (!ok) { bad++; }
            pending--;
            if (pending === 0) { setStatus(bad ? '! ' + bad + ' failed' : '✓ group reset', bad ? 'err' : 'ok'); }
          });
        });
      });
    });
    refresh(true);
    refreshTrack();
    refreshRail(true);
  };
})();
