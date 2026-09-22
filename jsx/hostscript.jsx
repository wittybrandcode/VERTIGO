/* VERTIGO jsx/hostscript.jsx — F0 foundation: direct camera remote control.
 * Methodology (explicit): BUILD creates/links ONE camera, LINK switches to the
 * selected camera, READ loads every property into the panel, sliders+fields
 * WRITE straight back. No rigs, no nulls, no expressions, no generated keys.
 * Features (shake/moves/presets) will be built on top later, one by one.
 *
 * WARNING: ExtendScript ES3 ONLY. Never use let/const, arrow functions,
 * Array.map/filter/forEach, JSON.parse/stringify, template literals,
 * nor run a modern formatter or TS language server over this file.
 *
 * API: vrtPing | vrtCamEnsure | vrtCamLink | vrtCamGet | vrtCamSet
 * Every function returns a '{"ok":...}' string and never throws outward. */

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

/* Property table. Group: T = Transform, C = Camera Options. dims 3/1, 0 = on/off. */
function vrtCamDef(key) {
    if (key === "pos") { return ["T", "ADBE Position", "Position", 3]; }
    if (key === "poi") { return ["T", "ADBE Interest", "Point of Interest", 3]; }
    if (key === "orient") { return ["T", "ADBE Orientation", "Orientation", 3]; }
    if (key === "rotx") { return ["T", "ADBE Rotate X", "X Rotation", 1]; }
    if (key === "roty") { return ["T", "ADBE Rotate Y", "Y Rotation", 1]; }
    if (key === "rotz") { return ["T", "ADBE Rotation", "Rotation", 1]; }
    if (key === "opacity") { return ["T", "ADBE Opacity", "Opacity", 1]; }
    if (key === "zoom") { return ["C", "ADBE Camera Zoom", "Zoom", 1]; }
    if (key === "dof") { return ["C", "ADBE Camera Depth of Field", "Depth of Field", 0]; }
    if (key === "focus") { return ["C", "ADBE Camera Focus Distance", "Focus Distance", 1]; }
    if (key === "aperture") { return ["C", "ADBE Camera Aperture", "Aperture", 1]; }
    if (key === "blur") { return ["C", "ADBE Camera Blur Level", "Blur Level", 1]; }
    if (key === "irisShape") { return ["C", "ADBE Camera Iris Shape", "Iris Shape", 1]; }
    if (key === "irisRot") { return ["C", "ADBE Camera Iris Rotation", "Iris Rotation", 1]; }
    if (key === "irisRound") { return ["C", "ADBE Camera Iris Roundness", "Iris Roundness", 1]; }
    if (key === "irisAspect") { return ["C", "ADBE Camera Iris Aspect Ratio", "Iris Aspect Ratio", 1]; }
    if (key === "hiGain") { return ["C", "ADBE Camera Highlight Gain", "Highlight Gain", 1]; }
    if (key === "hiThresh") { return ["C", "ADBE Camera Highlight Threshold", "Highlight Threshold", 1]; }
    if (key === "hiSat") { return ["C", "ADBE Camera Highlight Saturation", "Highlight Saturation", 1]; }
    return null;
}

var VRT_CAM_KEYS = ["pos", "poi", "orient", "rotx", "roty", "rotz", "opacity", "zoom", "dof", "focus", "aperture", "blur", "irisShape", "irisRot", "irisRound", "irisAspect", "hiGain", "hiThresh", "hiSat"];

/* Linked camera: selected camera first, else VRT_Cam, else none. No stored state. */
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

/* Clear our own old rig expressions if this camera carries any. */
function vrtCleanExpr(cam) {
    var targets = [["ADBE Position", "Position"], ["ADBE Interest", "Point of Interest"], ["ADBE Orientation", "Orientation"]];
    var i;
    for (i = 0; i < targets.length; i++) {
        try {
            var p = vrtProp(vrtTrans(cam, "camera"), targets[i][0], targets[i][1], targets[i][1]);
            var ex = "";
            try { ex = p.expression; } catch (e0) { ex = ""; }
            if (ex.indexOf("VRT_") >= 0) { p.expression = ""; }
        } catch (e1) {}
    }
}

function vrtPing() {
    return '{"ok":true,"msg":"pong"}';
}

/* F2 rail: a 3D circle shape (VRT_Rail) the camera orbits via one expression.
   Width slider drives BOTH the visible ellipse and the orbit math (one source).
   Progress 0-100 = one full turn. Height = move the shape itself. */
function vrtRailLayer(comp) {
    var L = null;
    try { L = comp.layers.byName("VRT_Rail"); } catch (e) { L = null; }
    if (L === null || L === undefined) { return null; }
    return L;
}

function vrtRailSlider(layer, name, val) {
    var fx = vrtProp(layer, "ADBE Effect Parade", "Effects", "effects on rail");
    var ctl = fx.addProperty("ADBE Slider Control");
    ctl.name = name;
    vrtProp(ctl, "ADBE Slider Control-0001", "Slider", "rail slider").setValue(val);
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

function vrtRailSize(layer, w) {
    var root = vrtProp(layer, "ADBE Root Vectors Group", "Contents", "shape contents");
    var sz = vrtFindMatch(root, "ADBE Vector Ellipse Size", "Size");
    if (sz === null) { throw new Error("missing ellipse size"); }
    sz.setValue([w, w]);
    return sz.value;
}

function vrtRailBuild() {
    app.beginUndoGroup("VERTIGO: Rail");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var old = vrtRailLayer(comp);
        if (old !== null) { old.remove(); }
        var rail = comp.layers.addShape();
        rail.name = "VRT_Rail";
        rail.threeDLayer = true;
        rail.guideLayer = true;
        vrtProp(vrtTrans(rail, "rail"), "ADBE Position", "Position", "position on rail").setValue([comp.width / 2, comp.height / 2, 0]);
        var root = vrtProp(rail, "ADBE Root Vectors Group", "Contents", "shape contents");
        root.addProperty("ADBE Vector Shape - Ellipse");
        vrtRailSlider(rail, "VRT Width", 2500);
        vrtRailSlider(rail, "VRT Prog", 0);
        vrtRailSlider(rail, "VRT Height", 0);
        /* Default mood: flat orbit floor, start-point tuned (user-verified). */
        vrtProp(vrtTrans(rail, "rail"), "ADBE Orientation", "Orientation", "orientation on rail").setValue([270, 0, 90]);
        var sz0 = vrtRailSize(rail, 2500);
        var camPos = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "position on camera");
        if (camPos.numKeys > 0) { return vrtResp(false, "", "camera position has keyframes - remove first"); }
        camPos.expression =
            'var rail = thisComp.layer("VRT_Rail");' +
            'var w = rail.effect("VRT Width")("ADBE Slider Control-0001");' +
            'var p = rail.effect("VRT Prog")("ADBE Slider Control-0001");' +
            'var h = rail.effect("VRT Height")("ADBE Slider Control-0001");' +
            'var a = p/100*2*Math.PI;' +
            'var r = w/2;' +
            'var pt = rail.toWorld([r*Math.cos(a), r*Math.sin(a), 0]);' +
            '[pt[0], pt[1]+h, pt[2]];';
        return vrtResp(true, "rail built (" + Math.round(sz0[0]) + ")", "");
    } catch (e) { return vrtResp(false, "", "rail: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

function vrtRailSet(param, valueS) {
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        var v = parseFloat(valueS);
        if (!(v > 0 || v < 0)) { v = 0; }
        if (param === "x" || param === "y" || param === "z") {
            var rp = vrtProp(vrtTrans(rail, "rail"), "ADBE Position", "Position", "position on rail");
            var rv = rp.value;
            if (param === "x") { rv[0] = v; }
            if (param === "y") { rv[1] = v; }
            if (param === "z") { rv[2] = v; }
            rp.setValue([rv[0], rv[1], rv[2]]);
            return vrtResp(true, "live", "");
        }
        if (param === "tiltx" || param === "tiltz") {
            var rt = vrtTrans(rail, "rail");
            var rp2 = (param === "tiltx") ? vrtProp(rt, "ADBE Rotate X", "X Rotation", "tilt X") : vrtProp(rt, "ADBE Rotate Z", "Rotation", "tilt Z");
            rp2.setValue(v);
            return vrtResp(true, "live", "");
        }
        var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects on rail");
        var i, found = null;
        for (i = 1; i <= fx.numProperties; i++) {
            var e = fx.property(i);
            if ((param === "width" && e.name === "VRT Width") || (param === "prog" && e.name === "VRT Prog") || (param === "height" && e.name === "VRT Height")) { found = e; break; }
        }
        if (found === null) { return vrtResp(false, "", "rebuild rail"); }
        if (param === "width") {
            if (v < 100) { v = 100; }
            vrtRailSize(rail, v);
        }
        vrtProp(found, "ADBE Slider Control-0001", "Slider", "rail slider").setValue(v);
        return vrtResp(true, "live", "");
    } catch (e) { return vrtResp(false, "", "rail: " + e.toString()); }
}

/* Full rail state for snapshots + panel sync. */
function vrtRailGet() {
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        var rp = vrtProp(vrtTrans(rail, "rail"), "ADBE Position", "Position", "position on rail").value;
        var want = [["width", "VRT Width"], ["prog", "VRT Prog"], ["height", "VRT Height"]];
        var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects on rail");
        var got = {};
        var i, j;
        for (i = 1; i <= fx.numProperties; i++) {
            var e = fx.property(i);
            for (j = 0; j < want.length; j++) {
                if (e.name === want[j][1]) { got[want[j][0]] = vrtProp(e, "ADBE Slider Control-0001", "Slider", "rail slider").value; }
            }
        }
        if (got.width === undefined || got.prog === undefined || got.height === undefined) { return vrtResp(false, "", "rebuild rail"); }
        var rt = vrtTrans(rail, "rail");
        var txv = vrtProp(rt, "ADBE Rotate X", "X Rotation", "tilt X").value;
        var tzv = vrtProp(rt, "ADBE Rotate Z", "Rotation", "tilt Z").value;
        return '{"ok":true,"x":' + rp[0] + ',"y":' + rp[1] + ',"z":' + rp[2] +
            ',"width":' + got.width + ',"prog":' + got.prog + ',"height":' + got.height + ',"tiltx":' + txv + ',"tiltz":' + tzv + '}';
    } catch (e) { return vrtResp(false, "", "rail: " + e.toString()); }
}

function vrtRailClear() {
    app.beginUndoGroup("VERTIGO: Rail Clear");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var camPos = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "position on camera");
        var ex = "";
        try { ex = camPos.expression; } catch (e0) { ex = ""; }
        if (ex.indexOf("VRT_Rail") < 0) { return vrtResp(false, "", "no rail expression on camera"); }
        camPos.expression = "";
        try {
            var fd = vrtProp(vrtProp(cam, "ADBE Camera Options Group", "Camera Options", "camera options"), "ADBE Camera Focus Distance", "Focus Distance", "focus");
            var fx = "";
            try { fx = fd.expression; } catch (e1) { fx = ""; }
            if (fx.indexOf("VRT_Rail") >= 0) { fd.expression = ""; }
        } catch (e2) {}
        try {
            var pl = vrtProp(vrtTrans(cam, "camera"), "ADBE Interest", "Point of Interest", "POI");
            var px = "";
            try { px = pl.expression; } catch (e3) { px = ""; }
            if (px.indexOf("VRT_Rail") >= 0) { pl.expression = ""; }
        } catch (e4) {}
        return vrtResp(true, "rail cleared (shape kept)", "");
    } catch (e) { return vrtResp(false, "", "rail: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

/* Toggle: POI follows the rail center live, or back to manual.
   Camera position already follows the rail, so the whole rig travels together. */
function vrtRailLook() {
    app.beginUndoGroup("VERTIGO: Rail Look");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        var poiP = vrtProp(vrtTrans(cam, "camera"), "ADBE Interest", "Point of Interest", "POI");
        var ex = "";
        try { ex = poiP.expression; } catch (e0) { ex = ""; }
        if (ex.indexOf("VRT_Rail") >= 0) {
            poiP.expression = "";
            return vrtResp(true, "look: manual", "");
        }
        poiP.expression = 'thisComp.layer("VRT_Rail").toWorld([0,0,0]);';
        if (ex.indexOf("thisComp.layer(") >= 0) { return vrtResp(true, "look: rail (replaced tracking)", ""); }
        return vrtResp(true, "look: rail", "");
    } catch (e) { return vrtResp(false, "", "look: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

/* Plane presets: the landmark buttons. They write rail Orientation;
   the orbit expression follows the layer, so the camera path tilts with it. */
function vrtRailPlane(which) {
    app.beginUndoGroup("VERTIGO: Plane");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        var o = null;
        if (which === "floor") { o = [270, 0, 90]; }
        else if (which === "wall") { o = [0, 0, 0]; }
        else if (which === "side") { o = [0, 90, 0]; }
        else { return vrtResp(false, "", "unknown plane"); }
        vrtProp(vrtTrans(rail, "rail"), "ADBE Orientation", "Orientation", "orientation on rail").setValue(o);
        return vrtResp(true, "plane: " + which, "");
    } catch (e) { return vrtResp(false, "", "plane: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

/* Toggle: focus follows rail center, or back to manual. */
function vrtRailFocus() {
    app.beginUndoGroup("VERTIGO: Rail Focus");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        var fd = vrtProp(vrtProp(cam, "ADBE Camera Options Group", "Camera Options", "camera options"), "ADBE Camera Focus Distance", "Focus Distance", "focus");
        var ex = "";
        try { ex = fd.expression; } catch (e0) { ex = ""; }
        if (ex.indexOf("VRT_Rail") >= 0) {
            fd.expression = "";
            return vrtResp(true, "focus: manual", "");
        }
        fd.expression = "length(toWorld(position),thisComp.layer(\"VRT_Rail\").toWorld([0,0,0]));";
        if (ex.indexOf("thisComp.layer(") >= 0) { return vrtResp(true, "focus: rail (replaced tracking)", ""); }
        return vrtResp(true, "focus: rail", "");
    } catch (e) { return vrtResp(false, "", "focus: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

/* F1 tracking: two isolated expressions (POI look-at + focus follow).
   Target referenced by name; rename orphans it (status shows stale + re-link). */
function vrtTrackSet() {
    app.beginUndoGroup("VERTIGO: Track");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var sel = comp.selectedLayers;
        var L = null;
        var i;
        for (i = 0; i < sel.length; i++) {
            if (sel[i].name.indexOf("VRT_") !== 0) { L = sel[i]; break; }
        }
        if (L === null) { return vrtResp(false, "", "select a subject layer first"); }
        if (L === cam || L.name === cam.name) { return vrtResp(false, "", "select a subject layer, not the camera"); }
        var q = vrtEsc(L.name);
        var wpos = 'thisComp.layer("' + q + '").toWorld(thisComp.layer("' + q + '").transform.anchorPoint)';
        var t = vrtTrans(cam, "camera");
        var poiP = vrtProp(t, "ADBE Interest", "Point of Interest", "POI");
        var poiPrev = "";
        try { poiPrev = poiP.expression; } catch (eP) { poiPrev = ""; }
        poiP.expression = wpos + ";";
        var opts = vrtProp(cam, "ADBE Camera Options Group", "Camera Options", "camera options");
        var fdP = vrtProp(opts, "ADBE Camera Focus Distance", "Focus Distance", "focus");
        var fdPrev = "";
        try { fdPrev = fdP.expression; } catch (eF) { fdPrev = ""; }
        fdP.expression = "length(toWorld(position)," + wpos + ");";
        var note = "";
        if (fdPrev.indexOf("VRT_Rail") >= 0) { note += " (replaced rail focus)"; }
        if (poiPrev.indexOf("VRT_Rail") >= 0) { note += " (replaced rail look)"; }
        return vrtResp(true, "tracking: " + q + note, "");
    } catch (e) { return vrtResp(false, "", "track: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

function vrtTrackClear() {
    app.beginUndoGroup("VERTIGO: Untrack");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var t = vrtTrans(cam, "camera");
        vrtProp(t, "ADBE Interest", "Point of Interest", "POI").expression = "";
        var opts = vrtProp(cam, "ADBE Camera Options Group", "Camera Options", "camera options");
        vrtProp(opts, "ADBE Camera Focus Distance", "Focus Distance", "focus").expression = "";
        return vrtResp(true, "tracking cleared", "");
    } catch (e) { return vrtResp(false, "", "untrack: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

function vrtTrackStatus() {
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera"); }
        var ex = "";
        try { ex = vrtProp(vrtTrans(cam, "camera"), "ADBE Interest", "Point of Interest", "POI").expression; } catch (e0) { ex = ""; }
        var m = ex.match(/thisComp\.layer\("([^"]*)"\)/);
        var tracked = (m !== null && ex.indexOf("toWorld") >= 0);
        var name = tracked ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : "";
        return '{"ok":true,"tracked":' + (tracked ? "true" : "false") + ',"target":"' + vrtEsc(name) + '"}';
    } catch (e) { return vrtResp(false, "", "status: " + e.toString()); }
}

/* Smart ensure: selected camera -> link it, else VRT_Cam -> use it, else create it. */
function vrtCamEnsure() {
    app.beginUndoGroup("VERTIGO: Camera");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam !== null) {
            vrtCleanExpr(cam);
            var chkPos = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "position");
            var chkEx = "";
            try { chkEx = chkPos.expression; } catch (eC) { chkEx = ""; }
            if (chkEx !== "") { return vrtResp(false, "", "camera Position has custom expression - clear it first"); }
            return vrtResp(true, "linked: " + vrtEsc(cam.name), "");
        }
        cam = comp.layers.addCamera("VRT_Cam", [comp.width / 2, comp.height / 2]);
        cam.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST;
        return vrtResp(true, "camera created", "");
    } catch (e) { return vrtResp(false, "", "camera: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

/* Link the selected camera only. */
function vrtCamLink() {
    app.beginUndoGroup("VERTIGO: Link");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var sel = comp.selectedLayers;
        var i;
        for (i = 0; i < sel.length; i++) {
            if (sel[i].matchName === "ADBE Camera Layer") {
                vrtCleanExpr(sel[i]);
                return vrtResp(true, "linked: " + vrtEsc(sel[i].name), "");
            }
        }
        return vrtResp(false, "", "select a camera layer first");
    } catch (e) { return vrtResp(false, "", "link: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

function vrtReadProp(cam, key) {
    var def = vrtCamDef(key);
    if (def === null) { return null; }
    var base = (def[0] === "T") ? vrtTrans(cam, "camera") : vrtProp(cam, "ADBE Camera Options Group", "Camera Options", "camera options");
    var p = vrtProp(base, def[1], def[2], key);
    var v = p.value;
    if (def[3] === 3) { return "[" + v[0] + "," + v[1] + "," + v[2] + "]"; }
    if (def[3] === 0) { return (v > 0.5) ? "1" : "0"; }
    return "" + v;
}

function vrtFrag(cam, key) {
    var s = null;
    try { s = vrtReadProp(cam, key); } catch (e) { s = null; }
    return '"' + key + '":' + (s === null ? "null" : s);
}

/* Full property dump. Unsupported properties come back null (row disabled, never fatal). */
function vrtCamGet() {
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var parts = [];
        var i;
        for (i = 0; i < VRT_CAM_KEYS.length; i++) {
            parts[parts.length] = vrtFrag(cam, VRT_CAM_KEYS[i]);
        }
        return '{"ok":true,"name":"' + vrtEsc(cam.name) + '","v":{' + parts.join(",") + "}}";
    } catch (e) { return vrtResp(false, "", "read: " + e.toString()); }
}

/* Direct write. One undo step per call. */
function vrtCamSet(prop, aS, bS, cS) {
    app.beginUndoGroup("VERTIGO: Set");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var def = vrtCamDef(prop);
        if (def === null) { return vrtResp(false, "", "unknown property: " + prop); }
        var base = (def[0] === "T") ? vrtTrans(cam, "camera") : vrtProp(cam, "ADBE Camera Options Group", "Camera Options", "camera options");
        var p = vrtProp(base, def[1], def[2], prop);
        var curEx = "";
        try { curEx = p.expression; } catch (eX) { curEx = ""; }
        if (curEx !== "") { return vrtResp(false, "", prop + " driven by expression - clear it first"); }
        if (def[3] === 3) {
            p.setValue([vrtNum(aS), vrtNum(bS), vrtNum(cS)]);
        } else if (def[3] === 0) {
            p.setValue((aS === "1" || aS === "true") ? 1 : 0);
        } else {
            p.setValue(vrtNum(aS));
        }
        return vrtResp(true, "ok", "");
    } catch (e) { return vrtResp(false, "", "set: " + e.toString()); }
    finally { app.endUndoGroup(); }
}
