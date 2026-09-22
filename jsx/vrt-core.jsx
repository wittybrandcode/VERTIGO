/* VERTIGO vrt-core.jsx — shared helpers ONLY. No AE mutations here.
 * Part of the VERTIGO library (loaded by vrt.jsx).
 * WARNING: ExtendScript ES3 ONLY. Never use let/const, arrow functions,
 * Array.map/filter/forEach, JSON.parse/stringify, template literals,
 * nor run a modern formatter or TS language server over this file. */

function vrtResp(ok, msg, err) {
    var s = '{"ok":' + (ok ? 'true' : 'false');
    if (ok) {
        s += ',"msg":"' + msg + '"';
    } else {
        s += ',"err":"' + err + '"';
    }
    return s + '}';
}

function vrtGetComp() {
    if (!(app.project && app.project.activeItem instanceof CompItem)) {
        return null;
    }
    return app.project.activeItem;
}

function vrtEsc(s) {
    var t = String(s);
    var out = "";
    var i;
    for (i = 0; i < t.length; i++) {
        var c = t.charAt(i);
        if (c === "\\") { out += "\\\\"; }
        else if (c === '"') { out += '\\"'; }
        else { out += c; }
    }
    return out;
}

/* Safe property lookup: matchName first, display name fallback.
   Throws a NAMED error (never a bare null-deref). */
function vrtProp(group, matchName, displayName, ctx) {
    var p = null;
    try { p = group.property(matchName); } catch (e1) { p = null; }
    if ((p === null || p === undefined) && displayName) {
        try { p = group.property(displayName); } catch (e2) { p = null; }
    }
    if (p === null || p === undefined) { throw new Error("missing " + ctx + " ('" + matchName + "')"); }
    return p;
}

function vrtTrans(layer, ctx) {
    return vrtProp(layer, "ADBE Transform Group", "Transform", "transform on " + ctx);
}

function vrtNum(s) {
    var v = parseFloat(s);
    if (!(v > 0 || v < 0)) { v = 0; }
    return v;
}

/* Depth-first search for a property by matchName (display-name fallback).
   Shape internals vary by version — never assume group nesting or indices. */
function vrtFindMatch(group, matchName, displayName) {
    var found = null;
    try {
        var n = group.numProperties;
        var i;
        for (i = 1; i <= n; i++) {
            var p = null;
            try { p = group.property(i); } catch (e0) { p = null; }
            if (p === null || p === undefined) { continue; }
            var mn = "";
            try { mn = p.matchName; } catch (e1) { mn = ""; }
            if (mn === matchName) { return p; }
            var nm = "";
            try { nm = p.name; } catch (e2) { nm = ""; }
            if (displayName && nm === displayName && found === null) { found = p; }
            var kids = 0;
            try { kids = p.numProperties; } catch (e3) { kids = 0; }
            if (kids > 0) {
                var sub = vrtFindMatch(p, matchName, displayName);
                if (sub !== null) { return sub; }
            }
        }
    } catch (e4) {}
    return found;
}

/* Frozen API version. Panel checks it on open; mismatch = stale files. */
function vrtApiVersion() {
    return '{"ok":true,"api":1}';
}

/* Locked layers fail writes with generic errors — name it instead. */
function vrtUnlocked(layer, ctx) {
    var locked = false;
    try { locked = layer.locked; } catch (e) { locked = false; }
    if (locked) { throw new Error(ctx + " is locked - unlock the layer first"); }
}

/* Add a named slider if missing, else return existing value handle.
   Generic like vrtFindCam: rail + motion modules use it. */
function vrtAddSlider(layer, name, val) {
    var fx = vrtProp(layer, "ADBE Effect Parade", "Effects", "effects");
    var i;
    for (i = 1; i <= fx.numProperties; i++) {
        var e = fx.property(i);
        if (e.name === name) { return vrtProp(e, "ADBE Slider Control-0001", "Slider", "slider"); }
    }
    var ctl = fx.addProperty("ADBE Slider Control");
    ctl.name = name;
    var sp = vrtProp(ctl, "ADBE Slider Control-0001", "Slider", "slider");
    sp.setValue(val);
    return sp;
}

/* Shared expression templates (single source: build + self-heal + diag agree). */
function vrtTurntableExpr() {
    return 'var tilt = effect("VRT TiltZ")("ADBE Slider Control-0001");' +
        'var prog = effect("VRT Prog")("ADBE Slider Control-0001");' +
        'var trn = effect("VRT Orbit")("ADBE Slider Control-0001");' +
        'var t0 = effect("VRT T0")("ADBE Slider Control-0001");' +
        'var t1 = effect("VRT T1")("ADBE Slider Control-0001");' +
        'var te = (t1 > 0 && t1 > t0) ? t1 : 1000000;' +
        'var tt = Math.min(Math.max(time, t0), te);' +
        'tilt + prog/100*360 + trn*360*(tt - t0);';
}

function vrtRailCamExpr() {
    return 'var rail = thisComp.layer("VRT_Rail");' +
        'var w = rail.effect("VRT Width")("ADBE Slider Control-0001");' +
        'var h = rail.effect("VRT Height")("ADBE Slider Control-0001");' +
        'var r = w/2;' +
        'var pt = rail.toWorld([r,0,0]);' +
        '[pt[0], pt[1]+h, pt[2]];';
}

/* Rail shape by fixed name. Shared like vrtFindCam: rail + motion modules use it. */
function vrtRailLayer(comp) {
    var L = null;
    try { L = comp.layers.byName("VRT_Rail"); } catch (e) { L = null; }
    if (L === null || L === undefined) { return null; }
    return L;
}

/* Linked camera: selected camera first, else VRT_Cam, else none. No stored state.
   Lives in core: camera, track and rail modules all resolve through it. */
function vrtFindCam(comp) {
    var sel = comp.selectedLayers;
    var i;
    for (i = 0; i < sel.length; i++) {
        if (sel[i].matchName === "ADBE Camera Layer") { return sel[i]; }
    }
    var c = null;
    try { c = comp.layers.byName("VRT_Cam"); } catch (e) { c = null; }
    if (c !== null && c !== undefined && c.matchName === "ADBE Camera Layer") { return c; }
    return null;
}
