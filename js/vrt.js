/* VERTIGO vrt.js — SOLE ENTRY. Wires modules, no logic of its own.
 * Load order (index.html) is the contract: CSInterface, bridge, log,
 * cam, track, rail, reset, then this file. */

(function () {
  'use strict';

  window.VRT = window.VRT || {};
  var live = !!window.VRT.isCEP;
  window.VRT.status(live ? 'ready' : 'preview — runs inside After Effects only', live ? 'ready' : 'err');
  window.VRT.log(live ? 'ok' : 'err', live ? 'CEP bridge ready' : 'preview mode (no CEP)');
  window.VRT.logInit();
  window.VRT.camInit(function (id) { return document.getElementById(id); });
  window.VRT.trackInit(function (id) { return document.getElementById(id); });
  window.VRT.railInit(function (id) { return document.getElementById(id); });
  window.VRT.resetInit();
  /* Frozen API handshake (live AE only): panel v1 expects JSX api 1. */
  if (live) {
    window.VRT.callJSX('vrtApiVersion', [], function (r) {
      if (!r.ok || r.api !== 1) {
        window.VRT.status('! panel/jsx mismatch — reopen panel', 'err');
        window.VRT.log('err', 'API mismatch: expected 1');
      }
    });
  }
})();
