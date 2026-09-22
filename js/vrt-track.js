/* VERTIGO vrt-track.js — target strip: refresh + Track/Untrack buttons.
 * Depends on vrt-bridge.js. Exposes refresh for the camera build flow. */

(function () {
  'use strict';

  function refreshTrack() {
    window.VRT.callJSX('vrtTrackStatus', [], function (r) {
      var nm = document.getElementById('track-name');
      if (!nm) { return; }
      if (r.ok && r.tracked) { nm.textContent = '◎ ' + (r.target || '?'); }
      else { nm.textContent = '—'; }
    });
  }

  function trackInit($) {
    [['btn-track-set', 'vrtTrackSet'], ['btn-track-clear', 'vrtTrackClear']].forEach(function (pair) {
      var b = $(pair[0]);
      if (!b) { if (window.console) { console.warn('VERTIGO: missing #' + pair[0]); } return; }
      b.addEventListener('click', function () {
        window.VRT.busy(b, true);
        window.VRT.status('…', 'working');
        window.VRT.callJSX(pair[1], [], function (r) {
          window.VRT.busy(b, false);
          if (r.ok) { refreshTrack(); }
          window.VRT.status(r.ok ? ('✓ ' + (r.msg || 'done')) : ('! ' + (r.err || 'error')), r.ok ? 'ok' : 'err');
        });
      });
    });
    refreshTrack();
  }

  window.VRT = window.VRT || {};
  window.VRT.trackInit = trackInit;
  window.VRT.trackRefresh = refreshTrack;
})();
