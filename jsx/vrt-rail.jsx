/* VERTIGO vrt-rail.jsx — OWNS the VRT_Rail shape layer + orbit expression.
 * Never writes camera props except the orbit Position expression. ES3 only. */

/* F2 rail: a 3D circle shape (VRT_Rail) the camera orbits via one expression.
   Width slider drives BOTH the visible ellipse and the orbit math (one source).
   Progress 0-100 = one full turn. Height = camera float above the plane. */
/* Ellipse Size is expression-driven (Width + travel delta), never static.
   Refuses a custom Size expression instead of silently overwriting it. */
function vrtRailSizeExpr(rail) {
    var root = vrtProp(rail, "ADBE Root Vectors Group", "Contents", "shape contents");
    var sz = vrtFindMatch(root, "ADBE Vector Ellipse Size", "Size");
    if (sz === null) { throw new Error("missing ellipse size"); }
    var ex = "";
    try { ex = sz.expression; } catch (e0) { ex = ""; }
    if (ex.indexOf("VRT WAmt") < 0) {
        if (ex !== "") { throw new Error("ellipse Size has custom expression - clear it first"); }
        sz.expression = vrtTravelSizeExpr();
    }
    return true;
}

/* Travel rig + live Size expr. Fresh WShape follows old WMode (Span=Ramp, Rate=Wave). */
function vrtTravelEnsure(rail) {
    var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects on rail");
    var i, e, hadShape = false, mdv = 0;
    for (i = 1; i <= fx.numProperties; i++) {
        e = null;
        try { e = fx.property(i); } catch (e0) { e = null; }
        if (e === null || e === undefined) { continue; }
        if (e.name === "VRT WShape") { hadShape = true; }
        if (e.name === "VRT WMode") { try { mdv = vrtProp(e, "ADBE Slider Control-0001", "Slider", "s").value; } catch (eM) {} }
    }
    vrtAddSlider(rail, "VRT W0", 0);
    vrtAddSlider(rail, "VRT W1", 0);
    vrtAddSlider(rail, "VRT WAmt", 0);
    vrtAddSlider(rail, "VRT WDir", 1);
    vrtAddSlider(rail, "VRT WMode", 0);
    vrtAddSlider(rail, "VRT WShape", 1);
    if (!hadShape) {
        var n = fx.numProperties, j, q;
        for (j = 1; j <= n; j++) {
            q = null;
            try { q = fx.property(j); } catch (e1) { q = null; }
            if (q !== null && q !== undefined && q.name === "VRT WShape") {
                vrtProp(q, "ADBE Slider Control-0001", "Slider", "s").setValue((mdv > 0.5) ? 0 : 1);
                break;
            }
        }
    }
    vrtRailSizeExpr(rail);
}

/* Snapshot an existing rail so rebuild preserves everything:
   position, orientation, tilts, and every VRT * slider by name.
   New sliders absent in old rails simply keep their fresh defaults. */
function vrtRailSnapshot(rail) {
    var t = vrtTrans(rail, "rail");
    var snap = { pos: vrtProp(t, "ADBE Position", "Position", "position").value.slice(), orient: vrtProp(t, "ADBE Orientation", "Orientation", "orientation").value.slice(), sliders: {} };
    try { snap.rotx = vrtProp(t, "ADBE Rotate X", "X Rotation", "tilt").value; } catch (e0) {}
    try { snap.rotz = vrtProp(t, "ADBE Rotate Z", "Rotation", "tilt").value; } catch (e1) {}
    try {
        var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects");
        var i;
        for (i = 1; i <= fx.numProperties; i++) {
            var e = fx.property(i);
            if (e.name.indexOf("VRT ") === 0) {
                snap.sliders[e.name] = vrtProp(e, "ADBE Slider Control-0001", "Slider", "slider").value;
            }
        }
    } catch (e2) {}
    return snap;
}

function vrtRailRestore(rail, snap) {
    if (snap === null || snap === undefined) { return; }
    var t = vrtTrans(rail, "rail");
    vrtProp(t, "ADBE Position", "Position", "position").setValue([snap.pos[0], snap.pos[1], snap.pos[2]]);
    vrtProp(t, "ADBE Orientation", "Orientation", "orientation").setValue([snap.orient[0], snap.orient[1], snap.orient[2]]);
    if (snap.rotx !== undefined) { try { vrtProp(t, "ADBE Rotate X", "X Rotation", "tilt").setValue(snap.rotx); } catch (e0) {} }
    if (snap.rotz !== undefined) { try { vrtProp(t, "ADBE Rotate Z", "Rotation", "tilt").setValue(snap.rotz); } catch (e1) {} }
    var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects");
    var i;
    for (i = 1; i <= fx.numProperties; i++) {
        var e = fx.property(i);
        if (snap.sliders[e.name] !== undefined) {
            vrtProp(e, "ADBE Slider Control-0001", "Slider", "slider").setValue(snap.sliders[e.name]);
        }
    }
}

function vrtRailBuild() {
    app.beginUndoGroup("VERTIGO: Rail");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        vrtUnlocked(cam, "camera");
        var old = vrtRailLayer(comp);
        var keep = null;
        if (old !== null) {
            try { keep = vrtRailSnapshot(old); } catch (eK) { keep = null; }
            old.remove();
        }
        var rail = comp.layers.addShape();
        rail.name = "VRT_Rail";
        rail.threeDLayer = true;
        rail.guideLayer = true;
        vrtProp(vrtTrans(rail, "rail"), "ADBE Position", "Position", "position on rail").setValue([comp.width / 2, comp.height / 2, 0]);
        var root = vrtProp(rail, "ADBE Root Vectors Group", "Contents", "shape contents");
        root.addProperty("ADBE Vector Shape - Ellipse");
        var tiltInit = 0;
        if (keep !== null && keep.rotz !== undefined) { tiltInit = keep.rotz; }
        vrtAddSlider(rail, "VRT Width", 2500);
        vrtAddSlider(rail, "VRT Prog", 0);
        vrtAddSlider(rail, "VRT Height", 0);
        vrtAddSlider(rail, "VRT Orbit", 0);
        vrtAddSlider(rail, "VRT T0", 0);
        vrtAddSlider(rail, "VRT T1", 0);
        vrtAddSlider(rail, "VRT Mode", 0);
        vrtAddSlider(rail, "VRT TiltZ", tiltInit);
        vrtRailRestore(rail, keep);
        vrtProp(vrtTrans(rail, "rail"), "ADBE Rotate Z", "Rotation", "spin").expression = vrtTurntableExpr();
        vrtTravelEnsure(rail);
        if (keep === null) {
            /* Default mood (fresh rails only): flat orbit floor, start-point tuned. */
            vrtProp(vrtTrans(rail, "rail"), "ADBE Orientation", "Orientation", "orientation on rail").setValue([270, 0, 90]);
        }
        var wNow = 2500;
        if (keep !== null && keep.sliders && keep.sliders["VRT Width"] !== undefined) { wNow = keep.sliders["VRT Width"]; }
        var camPos = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "position on camera");
        if (camPos.numKeys > 0) { return vrtResp(false, "", "camera position has keyframes - remove first"); }
        camPos.expression = vrtRailCamExpr();
        return vrtResp(true, "rail built (" + Math.round(wNow) + ")", "");
    } catch (e) { return vrtResp(false, "", "rail: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

function vrtRailSet(param, valueS) {
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        vrtUnlocked(rail, "rail");
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
        if (param === "tiltx") {
            var rt = vrtTrans(rail, "rail");
            vrtProp(rt, "ADBE Rotate X", "X Rotation", "tilt X").setValue(v);
            return vrtResp(true, "live", "");
        }
        var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects on rail");
        var i, found = null;
        for (i = 1; i <= fx.numProperties; i++) {
            var e = fx.property(i);
            if ((param === "width" && e.name === "VRT Width") || (param === "prog" && e.name === "VRT Prog") || (param === "height" && e.name === "VRT Height") || (param === "tiltz" && e.name === "VRT TiltZ") || (param === "orbit" && e.name === "VRT Orbit") || (param === "t0" && e.name === "VRT T0") || (param === "t1" && e.name === "VRT T1") || (param === "mode" && e.name === "VRT Mode") || (param === "wamt" && e.name === "VRT WAmt") || (param === "w0" && e.name === "VRT W0") || (param === "w1" && e.name === "VRT W1") || (param === "wdir" && e.name === "VRT WDir") || (param === "wmode" && e.name === "VRT WMode") || (param === "wshape" && e.name === "VRT WShape") || (param === "ospd" && e.name === "VRT OSpd") || (param === "ot0" && e.name === "VRT OT0") || (param === "ot1" && e.name === "VRT OT1") || (param === "omode" && e.name === "VRT OMode")) { found = e; break; }
        }
        if (found === null) { return vrtResp(false, "", "rebuild rail"); }
        if (param === "width") {
            if (v < 100) { v = 100; }
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
        var want = [["width", "VRT Width"], ["prog", "VRT Prog"], ["height", "VRT Height"], ["orbit", "VRT Orbit"], ["tiltz", "VRT TiltZ"], ["t0", "VRT T0"], ["t1", "VRT T1"], ["mode", "VRT Mode"], ["wamt", "VRT WAmt"], ["w0", "VRT W0"], ["w1", "VRT W1"], ["wdir", "VRT WDir"], ["wmode", "VRT WMode"], ["wshape", "VRT WShape"], ["ospd", "VRT OSpd"], ["ot0", "VRT OT0"], ["ot1", "VRT OT1"], ["omode", "VRT OMode"]];
        var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects on rail");
        var got = {};
        var i, j;
        for (i = 1; i <= fx.numProperties; i++) {
            var e = fx.property(i);
            for (j = 0; j < want.length; j++) {
                if (e.name === want[j][1]) { got[want[j][0]] = vrtProp(e, "ADBE Slider Control-0001", "Slider", "rail slider").value; }
            }
        }
        if (got.width === undefined || got.prog === undefined || got.height === undefined || got.orbit === undefined || got.tiltz === undefined || got.t0 === undefined || got.t1 === undefined || got.mode === undefined || got.wamt === undefined || got.w0 === undefined || got.w1 === undefined || got.wdir === undefined || got.wmode === undefined || got.wshape === undefined || got.ospd === undefined || got.ot0 === undefined || got.ot1 === undefined || got.omode === undefined) { return vrtResp(false, "", "rebuild rail"); }
        var rt = vrtTrans(rail, "rail");
        var txv = vrtProp(rt, "ADBE Rotate X", "X Rotation", "tilt X").value;
        return '{"ok":true,"x":' + rp[0] + ',"y":' + rp[1] + ',"z":' + rp[2] +
            ',"width":' + got.width + ',"prog":' + got.prog + ',"height":' + got.height + ',"tiltx":' + txv + ',"tiltz":' + got.tiltz + ',"orbit":' + got.orbit + ',"t0":' + got.t0 + ',"t1":' + got.t1 + ',"mode":' + got.mode + ',"wamt":' + got.wamt + ',"w0":' + got.w0 + ',"w1":' + got.w1 + ',"wdir":' + got.wdir + ',"wmode":' + got.wmode + ',"wshape":' + got.wshape + ',"ospd":' + got.ospd + ',"ot0":' + got.ot0 + ',"ot1":' + got.ot1 + ',"omode":' + got.omode + '}';
    } catch (e) { return vrtResp(false, "", "rail: " + e.toString()); }
}

function vrtRailClear() {
    app.beginUndoGroup("VERTIGO: Rail Clear");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        vrtUnlocked(cam, "camera");
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
        vrtUnlocked(cam, "camera");
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
        vrtUnlocked(rail, "rail");
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
        vrtUnlocked(cam, "camera");
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
