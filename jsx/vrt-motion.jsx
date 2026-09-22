/* VERTIGO vrt-motion.jsx — procedural motion engine (time-driven, zero keyframes).
 *
 * LIBRARY PATTERN (every present and future motion follows it — no exceptions):
 * 1. Params live as VRT * sliders on the rail (visible + readable + resettable).
 * 2. VRT T0 is the ONE shared clock. Only Start writes it. Nobody else touches it.
 * 3. Start writes T0 = now (smooth launch from the current pose, never a jump).
 * 4. Stop bakes the instantaneous value into the static base and zeroes speed.
 * 5. Running state is DERIVED (speed != 0), never stored — nothing to desync.
 * 6. Motions combine by ADDITION inside one expression (orbit + bob + …).
 * Depends on vrt-core.jsx only. ES3 only. */

function vrtMotionSlider(rail, name) {
    var fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "effects on rail");
    var i;
    for (i = 1; i <= fx.numProperties; i++) {
        var e = fx.property(i);
        if (e.name === name) { return vrtProp(e, "ADBE Slider Control-0001", "Slider", "motion slider"); }
    }
    return null;
}

/* Read the whole motion chain and report the broken link (for the panel log). */
function vrtRailDiag() {
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp"); }
        var out = [];
        var rail = vrtRailLayer(comp);
        out[out.length] = "rail:" + (rail === null ? "MISSING" : rail.name);
        if (rail !== null) {
            var names = ["VRT Width", "VRT Prog", "VRT Height", "VRT Orbit", "VRT T0", "VRT T1"];
            var fx = null;
            try { fx = vrtProp(rail, "ADBE Effect Parade", "Effects", "fx"); } catch (eF) { fx = null; }
            var i, j;
            for (i = 0; i < names.length; i++) {
                var has = false, val = "?";
                if (fx !== null) {
                    for (j = 1; j <= fx.numProperties; j++) {
                        var e = fx.property(j);
                        if (e.name === names[i]) {
                            has = true;
                            try { val = vrtProp(e, "ADBE Slider Control-0001", "Slider", "s").value; } catch (eV) {}
                            break;
                        }
                    }
                }
                out[out.length] = names[i] + ":" + (has ? val : "MISSING");
            }
            var zt = "none";
            try {
                var zPr = vrtProp(vrtTrans(rail, "rail"), "ADBE Rotate Z", "Rotation", "spin");
                var zEx2 = "";
                try { zEx2 = zPr.expression; } catch (eZ2) { zEx2 = ""; }
                if (zEx2.indexOf("VRT TiltZ") >= 0) { zt = "turntable"; }
                else if (zEx2 !== "") { zt = "custom"; }
            } catch (eZT) {}
            var zer = "";
            try {
                var zPe = vrtProp(vrtTrans(rail, "rail"), "ADBE Rotate Z", "Rotation", "spin");
                try { zer = zPe.expressionError; } catch (eZE) { zer = ""; }
            } catch (eZF) {}
            out[out.length] = "railZ:" + zt + (zer !== "" ? " ERR:" + zer : "");
            var ph = "still";
            try {
                var qT0 = vrtMotionSlider(rail, "VRT T0");
                var qT1 = vrtMotionSlider(rail, "VRT T1");
                var qSp = vrtMotionSlider(rail, "VRT Orbit");
                if (qT0 !== null && qT1 !== null && qSp !== null) {
                    var vT0 = qT0.value, vT1 = qT1.value, vSp = qSp.value;
                    if (!(vSp > 0 || vSp < 0)) { ph = "still"; }
                    else if (comp.time < vT0) { ph = "pending"; }
                    else if (vT1 > 0 && vT1 > vT0 && comp.time > vT1) { ph = "ended"; }
                    else { ph = "running"; }
                }
            } catch (ePH) {}
            out[out.length] = "phase:" + ph;
        }
        var cam = vrtFindCam(comp);
        out[out.length] = "cam:" + (cam === null ? "NONE" : cam.name);
        if (cam !== null) {
            var cp = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "pos");
            var ex = "";
            try { ex = cp.expression; } catch (eX) { ex = ""; }
            var tag = "none";
            if (ex.indexOf("toWorld([r,0,0])") >= 0) { tag = "current"; }
            else if (ex.indexOf("VRT_Rail") >= 0) { tag = "OLD-TEMPLATE"; }
            else if (ex !== "") { tag = "custom"; }
            var cer = "";
            try { cer = cp.expressionError; } catch (eCE) { cer = ""; }
            out[out.length] = "posExpr:" + tag + (cer !== "" ? " ERR:" + cer : "");
            out[out.length] = "keys:" + cp.numKeys;
            out[out.length] = "time:" + comp.time;
        }
        return vrtResp(true, out.join(" | "), "");
    } catch (e) { return vrtResp(false, "", "diag: " + e.toString()); }
}

/* First motion: infinite orbit. Angle = base + speed*(time - T0). */
function vrtMotionOrbitStart() {
    app.beginUndoGroup("VERTIGO: Run");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        /* Zero speed = designed stillness, not a bug — refuse loudly instead. */
        var spdChk = vrtMotionSlider(rail, "VRT Orbit");
        var spdV = 0;
        if (spdChk !== null) { try { spdV = spdChk.value; } catch (eSV) { spdV = 0; } }
        if (!(spdV > 0 || spdV < 0)) { return vrtResp(false, "", "set Orbit speed first (e.g. 30)"); }
        /* Self-heal: ensure motion sliders (old rails lack them). */
        vrtAddSlider(rail, "VRT Orbit", 0);
        vrtAddSlider(rail, "VRT T0", 0);
        vrtAddSlider(rail, "VRT TiltZ", 0);
        vrtAddSlider(rail, "VRT T1", 0);
        /* Turntable drive lives on rail Z: static tilt + prog phase + live speed. */
        var zP = vrtProp(vrtTrans(rail, "rail"), "ADBE Rotate Z", "Rotation", "spin");
        var zEx = "";
        try { zEx = zP.expression; } catch (eZX) { zEx = ""; }
        if (zEx === "") {
            if (zP.numKeys > 0) { return vrtResp(false, "", "rail Z has keyframes - remove first"); }
            zP.expression = vrtTurntableExpr();
        } else if (zEx.indexOf("VRT TiltZ") < 0) {
            return vrtResp(false, "", "rail Z has custom expression - clear it first");
        }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var camPos = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "position");
        if (camPos.numKeys > 0) { return vrtResp(false, "", "camera position has keyframes - remove first"); }
        var ex = "";
        try { ex = camPos.expression; } catch (eX) { ex = ""; }
        if (ex !== "" && ex.indexOf("VRT_Rail") < 0) { return vrtResp(false, "", "camera Position has custom expression - clear it first"); }
        camPos.expression = vrtRailCamExpr();
        var t0b = vrtMotionSlider(rail, "VRT T0");
        var t1b = vrtMotionSlider(rail, "VRT T1");
        t0b.setValue(comp.time);
        if (t1b !== null) {
            var t1v = 0;
            try { t1v = t1b.value; } catch (eT) { t1v = 0; }
            if (t1v > 0 && t1v <= comp.time) { t1b.setValue(0); }
        }
        return vrtResp(true, "running — Stop to freeze", "");
    } catch (e) { return vrtResp(false, "", "run: " + e.toString()); }
    finally { app.endUndoGroup(); }
}

function vrtMotionOrbitStop() {
    app.beginUndoGroup("VERTIGO: Stop");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        vrtAddSlider(rail, "VRT Orbit", 0);
        vrtAddSlider(rail, "VRT T0", 0);
        vrtAddSlider(rail, "VRT TiltZ", 0);
        vrtAddSlider(rail, "VRT T1", 0);
        var progP = vrtMotionSlider(rail, "VRT Prog");
        var spdP = vrtMotionSlider(rail, "VRT Orbit");
        var t0P = vrtMotionSlider(rail, "VRT T0");
        var tiltP = vrtMotionSlider(rail, "VRT TiltZ");
        var t1P = vrtMotionSlider(rail, "VRT T1");
        if (progP === null || spdP === null || t0P === null || tiltP === null || t1P === null) { return vrtResp(false, "", "rebuild rail"); }
        var te = comp.time;
        if (t1P.value > 0 && t1P.value > t0P.value && comp.time > t1P.value) { te = t1P.value; }
        var cur = tiltP.value + progP.value / 100 * 360 + spdP.value * 360 * (te - t0P.value);
        var norm = ((cur % 360) + 360) % 360;
        progP.setValue(norm / 360 * 100);
        spdP.setValue(0);
        return vrtResp(true, "frozen", "");
    } catch (e) { return vrtResp(false, "", "stop: " + e.toString()); }
    finally { app.endUndoGroup(); }
}
