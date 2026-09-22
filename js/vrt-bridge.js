/* VERTIGO vrt-bridge.js — environment + evalScript bridge + UI status helpers.
 * Exposes window.VRT. Load FIRST (before modules that call VRT.* at runtime).
 * Vanilla, no Node, no framework. */

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

  /* Safe until vrt-log.js registers (load order below is the contract). */
  function blog(kind, msg) {
    var l = window.VRT && window.VRT.log;
    if (l) { l(kind, msg); }
  }

  /* fn("a","b",...) -> cb({ok,msg,err}) */
  function callJSX(fn, args, cb) {
    blog('call', fn + '(' + args.join(', ') + ')');
    if (!isCEP) {
      var mock = { ok: false, err: 'preview — runs inside After Effects only' };
      blog('err', fn + ' -> ' + mock.err);
      cb(mock);
      return;
    }
    var expr = fn + '(' + args.map(function (a) { return '"' + esc(a) + '"'; }).join(',') + ')';
    try {
      cs.evalScript(expr, function (res) {
        var r;
        try { r = JSON.parse(res); }
        catch (e) { r = { ok: false, err: 'bad response: ' + String(res).slice(0, 120) }; }
        blog(r.ok ? 'ok' : 'err', fn + ' -> ' + (r.ok ? (r.msg || 'done') : r.err));
        cb(r);
      });
    } catch (e) {
      var r2 = { ok: false, err: String(e) };
      blog('err', fn + ' -> ' + r2.err);
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

  window.VRT = window.VRT || {};
  window.VRT.isCEP = isCEP;
  window.VRT.status = setStatus;
  window.VRT.callJSX = callJSX;
  window.VRT.busy = busy;
  window.VRT.guard = liveGuard;
})();
