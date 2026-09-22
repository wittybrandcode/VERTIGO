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

  function refreshRail(silent) {
    window.VRT.callJSX('vrtRailGet', [], function (r) {
      if (!r.ok) { if (!silent) { window.VRT.status('! ' + r.err, 'err'); } return; }
      try { window.vrtSnapRail = { x: r.x, y: r.y, z: r.z, width: r.width, prog: r.prog, height: r.height, tiltx: r.tiltx, tiltz: r.tiltz, orbit: r.orbit }; } catch (e) {}
      setRailPair('rail-width', r.width); setRailPair('rail-prog', r.prog); setRailPair('rail-height', r.height); setRailPair('rail-tiltx', r.tiltx); setRailPair('rail-tiltz', r.tiltz); setRailPair('rail-orbit', r.orbit);
      setRailPair('rail-x', r.x); setRailPair('rail-y', r.y); setRailPair('rail-z', r.z);
      if (!silent) { window.VRT.status('✓ rail', 'ok'); }
    });
  }

  function railInit($) {
    [['rail-width', 'width'], ['rail-prog', 'prog'], ['rail-height', 'height'], ['rail-tiltx', 'tiltx'], ['rail-tiltz', 'tiltz'], ['rail-orbit', 'orbit'], ['rail-x', 'x'], ['rail-y', 'y'], ['rail-z', 'z']].forEach(function (pair) {
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
