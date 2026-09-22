/* VERTIGO vrt-camera.jsx — OWNS the linked camera (Ensure/Link/Get/Set).
 * Never writes rail/shape layers. Depends only on vrt-core.jsx. ES3 only. */

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

/* Smart ensure: selected camera -> link it, else VRT_Cam -> use it, else create it. */
function vrtCamEnsure() {
    app.beginUndoGroup("VERTIGO: Camera");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var cam = vrtFindCam(comp);
        if (cam !== null) {
            vrtUnlocked(cam, "camera");
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
                vrtUnlocked(sel[i], "camera");
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
        vrtUnlocked(cam, "camera");
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
