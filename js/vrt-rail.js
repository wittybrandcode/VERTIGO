/* VERTIGO vrt-rail.js — RAIL group: Width/Prog/Height/Tilt/XYZ sliders,
 * Build/Clear/Look/Focus/Plane buttons, snapshot sync. Depends on vrt-bridge.js. */

(function () {
  'use strict';

  function setRailPair(base, v) {
    var r = document.getElementById(base + 'r');
    var n = document.getElementById(base);
    if (r) { r.value = v; }
    if (n) { n.value = v; }
  }

  function syncModeWord(nxt) {
    var mw = document.getElementById('motion-mode-word');
    if (mw) { mw.textContent = nxt ? 'Count' : 'Rate'; }
    var ot = nxt ? 'Orbit turns over Start–End (0 = still)' : 'Orbit turns/sec (0 = still)';
    var orr = document.getElementById('rail-orbitr');
    var onn = document.getElementById('rail-orbit');
    if (orr) { orr.title = ot; }
    if (onn) { onn.title = ot; }
  }

  function syncTravelWords(dir, mode, shape) {
    var dw = document.getElementById('travel-dir-word');
    if (dw) { dw.textContent = (dir >= 0) ? 'Grow' : 'Shrink'; }
    var mw = document.getElementById('travel-mode-word');
    if (mw) { mw.textContent = mode ? 'Span' : 'Rate'; }
    var sw = document.getElementById('travel-shape-word');
    if (sw) { sw.textContent = shape ? 'Wave' : 'Ramp'; }
    var ot = mode ? 'Travel amount px over Start–End (0 = still)' : 'Travel amount px per wobble (0 = still)';
    var tr = document.getElementById('rail-wamtr');
    var tn = document.getElementById('rail-wamt');
    if (tr) { tr.title = ot; }
    if (tn) { tn.title = ot; }
  }

  function syncSpinWord(mode) {
    var mw = document.getElementById('spin-mode-word');
    if (mw) { mw.textContent = mode ? 'Count' : 'Rate'; }
    var ot = mode ? 'Spin turns over Start–End (0 = still)' : 'Spin turns/sec (0 = still)';
    var sr = document.getElementById('rail-ospdr');
    var sn = document.getElementById('rail-ospd');
    if (sr) { sr.title = ot; }
    if (sn) { sn.title = ot; }
  }

  function refreshRail(silent) {
    window.VRT.callJSX('vrtRailGet', [], function (r) {
      if (!r.ok) { if (!silent) { window.VRT.status('! ' + r.err, 'err'); } return; }
      try { window.vrtSnapRail = { x: r.x, y: r.y, z: r.z, width: r.width, prog: r.prog, height: r.height, tiltx: r.tiltx, tiltz: r.tiltz, orbit: r.orbit, t0: r.t0, t1: r.t1, mode: r.mode, wamt: r.wamt, w0: r.w0, w1: r.w1, wdir: r.wdir, wmode: r.wmode, wshape: r.wshape, ospd: r.ospd, ot0: r.ot0, ot1: r.ot1, omode: r.omode }; } catch (e) {}
      try { window.vrtMotionMode = (r.mode > 0.5) ? 1 : 0; } catch (eM) {}
      syncModeWord(window.vrtMotionMode ? 1 : 0);
      try { window.vrtTravelDir = (r.wdir < 0) ? -1 : 1; } catch (eD) {}
      try { window.vrtTravelMode = (r.wmode > 0.5) ? 1 : 0; } catch (eTM) {}
      try { window.vrtTravelShape = (r.wshape > 0.5) ? 1 : 0; } catch (eTS) {}
      syncTravelWords((window.vrtTravelDir === -1) ? -1 : 1, window.vrtTravelMode ? 1 : 0, (window.vrtTravelShape === 0) ? 0 : 1);
      setRailPair('rail-width', r.width); setRailPair('rail-prog', r.prog); setRailPair('rail-height', r.height); setRailPair('rail-tiltx', r.tiltx); setRailPair('rail-tiltz', r.tiltz); setRailPair('rail-orbit', r.orbit);
      setRailPair('rail-x', r.x); setRailPair('rail-y', r.y); setRailPair('rail-z', r.z);
      setRailPair('rail-t0', r.t0); setRailPair('rail-t1', r.t1);
      setRailPair('rail-wamt', r.wamt); setRailPair('rail-w0', r.w0); setRailPair('rail-w1', r.w1);
      setRailPair('rail-ospd', r.ospd); setRailPair('rail-ot0', r.ot0); setRailPair('rail-ot1', r.ot1);
      try { window.vrtSpinMode = (r.omode > 0.5) ? 1 : 0; } catch (eSM) {}
      syncSpinWord(window.vrtSpinMode ? 1 : 0);
      if (!silent) { window.VRT.status('✓ rail', 'ok'); }
    });
  }

  function railInit($) {
    [['rail-width', 'width'], ['rail-prog', 'prog'], ['rail-height', 'height'], ['rail-tiltx', 'tiltx'], ['rail-tiltz', 'tiltz'], ['rail-orbit', 'orbit'], ['rail-t0', 't0'], ['rail-t1', 't1'], ['rail-wamt', 'wamt'], ['rail-w0', 'w0'], ['rail-w1', 'w1'], ['rail-ospd', 'ospd'], ['rail-ot0', 'ot0'], ['rail-ot1', 'ot1'], ['rail-x', 'x'], ['rail-y', 'y'], ['rail-z', 'z']].forEach(function (pair) {
      var rid = document.getElementById(pair[0] + 'r');
      var nid = document.getElementById(pair[0]);
      function sendRail(quiet) {
        if (!quiet) { window.VRT.status('…', 'working'); }
        window.VRT.callJSX('vrtRailSet', [pair[1], nid ? nid.value : '0'], function (r) {
          if (!quiet) { window.VRT.status(r.ok ? '✓ rail' : ('! ' + r.err), r.ok ? 'ok' : 'err'); }
        });
      }
      if (rid) {
        rid.addEventListener('input', function () {
          if (nid) { nid.value = rid.value; }
          if (!window.VRT.guard()) { return; }
          sendRail(true);
        });
        rid.addEventListener('change', function () { sendRail(false); });
      }
      if (nid) {
        nid.addEventListener('input', function () {
          if (rid) { rid.value = nid.value; }
          if (!window.VRT.guard()) { return; }
          sendRail(true);
        });
        nid.addEventListener('change', function () { sendRail(false); });
      }
    });
    var railBuildBtn = $('btn-rail-build');
    if (railBuildBtn) {
      railBuildBtn.addEventListener('click', function () {
        window.VRT.busy(railBuildBtn, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtRailBuild', [], function (r) {
          window.VRT.busy(railBuildBtn, false);
          if (r.ok) { refreshRail(true); }
          window.VRT.status(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    }
    [['btn-plane-floor', 'floor'], ['btn-plane-wall', 'wall'], ['btn-plane-side', 'side']].forEach(function (pair) {
      var pb = $(pair[0]);
      if (!pb) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      pb.addEventListener('click', function () {
        window.VRT.busy(pb, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtRailPlane', [pair[1]], function (r) {
          window.VRT.busy(pb, false);
          window.VRT.status(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    [['btn-motion-run', 'vrtMotionOrbitStart'], ['btn-motion-stop', 'vrtMotionOrbitStop']].forEach(function (pair) {
      var mb = $(pair[0]);
      if (!mb) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      mb.addEventListener('click', function () {
        window.VRT.busy(mb, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX(pair[1], [], function (r) {
          window.VRT.busy(mb, false);
          if (r.ok) { refreshRail(true); }
          window.VRT.status(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    var modeBtn = $('btn-motion-mode');
    if (modeBtn) {
      modeBtn.addEventListener('click', function () {
        var nxt = window.vrtMotionMode ? 0 : 1;
        window.VRT.busy(modeBtn, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtRailSet', ['mode', String(nxt)], function (r) {
          window.VRT.busy(modeBtn, false);
          if (r.ok) {
            window.vrtMotionMode = nxt;
            try { if (window.vrtSnapRail) { window.vrtSnapRail.mode = nxt; } } catch (eS) {}
            syncModeWord(nxt);
          }
          window.VRT.status(r.ok ? ('✓ ' + (nxt ? 'Count' : 'Rate')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    }
    var dirBtn = $('btn-travel-dir');
    if (dirBtn) {
      dirBtn.addEventListener('click', function () {
        var nxtD = (window.vrtTravelDir === -1) ? 1 : -1;
        window.VRT.busy(dirBtn, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtRailSet', ['wdir', String(nxtD)], function (r) {
          window.VRT.busy(dirBtn, false);
          if (r.ok) {
            window.vrtTravelDir = nxtD;
            try { if (window.vrtSnapRail) { window.vrtSnapRail.wdir = nxtD; } } catch (eS) {}
            syncTravelWords(nxtD, window.vrtTravelMode ? 1 : 0, (window.vrtTravelShape === 0) ? 0 : 1);
          }
          window.VRT.status(r.ok ? ('✓ ' + (nxtD >= 0 ? 'Grow' : 'Shrink')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    }
    var tmodeBtn = $('btn-travel-mode');
    if (tmodeBtn) {
      tmodeBtn.addEventListener('click', function () {
        var nxtT = window.vrtTravelMode ? 0 : 1;
        window.VRT.busy(tmodeBtn, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtRailSet', ['wmode', String(nxtT)], function (r) {
          window.VRT.busy(tmodeBtn, false);
          if (r.ok) {
            window.vrtTravelMode = nxtT;
            try { if (window.vrtSnapRail) { window.vrtSnapRail.wmode = nxtT; } } catch (eS2) {}
            syncTravelWords((window.vrtTravelDir === -1) ? -1 : 1, nxtT, (window.vrtTravelShape === 0) ? 0 : 1);
          }
          window.VRT.status(r.ok ? ('✓ ' + (nxtT ? 'Span' : 'Rate')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    }
    var shapeBtn = $('btn-travel-shape');
    if (shapeBtn) {
      shapeBtn.addEventListener('click', function () {
        var curS = (window.vrtTravelShape === 0) ? 0 : 1;
        var nxtS = curS ? 0 : 1;
        window.VRT.busy(shapeBtn, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtRailSet', ['wshape', String(nxtS)], function (r) {
          window.VRT.busy(shapeBtn, false);
          if (r.ok) {
            window.vrtTravelShape = nxtS;
            try { if (window.vrtSnapRail) { window.vrtSnapRail.wshape = nxtS; } } catch (eS3) {}
            syncTravelWords((window.vrtTravelDir === -1) ? -1 : 1, window.vrtTravelMode ? 1 : 0, nxtS);
          }
          window.VRT.status(r.ok ? ('✓ ' + (nxtS ? 'Wave' : 'Ramp')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    }
    var spinBtn = $('btn-spin-mode');
    if (spinBtn) {
      spinBtn.addEventListener('click', function () {
        var nxtO = window.vrtSpinMode ? 0 : 1;
        window.VRT.busy(spinBtn, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX('vrtRailSet', ['omode', String(nxtO)], function (r) {
          window.VRT.busy(spinBtn, false);
          if (r.ok) {
            window.vrtSpinMode = nxtO;
            try { if (window.vrtSnapRail) { window.vrtSnapRail.omode = nxtO; } } catch (eS4) {}
            syncSpinWord(nxtO);
          }
          window.VRT.status(r.ok ? ('✓ ' + (nxtO ? 'Count' : 'Rate')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    }
    [['btn-rail-clear', 'vrtRailClear'], ['btn-rail-look', 'vrtRailLook'], ['btn-rail-focus', 'vrtRailFocus'], ['btn-rail-diag', 'vrtRailDiag']].forEach(function (pair) {
      var b = $(pair[0]);
      if (!b) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      b.addEventListener('click', function () {
        window.VRT.busy(b, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX(pair[1], [], function (r) {
          window.VRT.busy(b, false);
          window.VRT.status(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    refreshRail(true);
  }

  window.VRT = window.VRT || {};
  window.VRT.railInit = railInit;
  window.VRT.railRefresh = refreshRail;
})();
