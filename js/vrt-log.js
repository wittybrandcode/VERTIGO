/* VERTIGO vrt-log.js — debug drawer: store + render + copy.
 * Registers window.VRT.log. Needs vrt-bridge.js loaded (uses nothing from it). */

(function () {
  'use strict';

  var logEl = null;

  /* Every bridge call + response, newest first. window.vrtDebug for Chrome inspect. */
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

  function logInit($) {
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
        function done(ok) {
          if (window.VRT) { window.VRT.status(ok ? '✓ log copied' : '! copy failed', ok ? 'ok' : 'err'); }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
        } else { fallbackCopy(text, done); }
      });
    }
  }

  window.VRT = window.VRT || {};
  window.VRT.log = vrtLog;
  window.VRT.logInit = logInit;
})();
