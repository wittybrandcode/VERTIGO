/* VERTIGO vrt-track.jsx — OWNS the two tracking expressions (look-at + focus).
 * Writes nothing else. Depends only on vrt-core.jsx. ES3 only. */

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
        vrtUnlocked(cam, "camera");
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
        vrtUnlocked(cam, "camera");
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
