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

/* Current orbit expression template (single source: build + self-heal). */
function vrtRailCamExpr() {
    return 'var rail = thisComp.layer("VRT_Rail");' +
        'var w = rail.effect("VRT Width")("ADBE Slider Control-0001");' +
        'var p = rail.effect("VRT Prog")("ADBE Slider Control-0001");' +
        'var h = rail.effect("VRT Height")("ADBE Slider Control-0001");' +
        'var spd = rail.effect("VRT Orbit")("ADBE Slider Control-0001");' +
        'var t0 = rail.effect("VRT T0")("ADBE Slider Control-0001");' +
        'var a = (p/100 + spd*(time - t0)/360)*2*Math.PI;' +
        'var r = w/2;' +
        'var pt = rail.toWorld([r*Math.cos(a), r*Math.sin(a), 0]);' +
        '[pt[0], pt[1]+h, pt[2]];';
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
            var names = ["VRT Width", "VRT Prog", "VRT Height", "VRT Orbit", "VRT T0"];
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
        }
        var cam = vrtFindCam(comp);
        out[out.length] = "cam:" + (cam === null ? "NONE" : cam.name);
        if (cam !== null) {
            var cp = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "pos");
            var ex = "";
            try { ex = cp.expression; } catch (eX) { ex = ""; }
            var tag = "none";
            if (ex.indexOf("spd*(time") >= 0) { tag = "current"; }
            else if (ex.indexOf("VRT_Rail") >= 0) { tag = "OLD-TEMPLATE"; }
            else if (ex !== "") { tag = "custom"; }
            out[out.length] = "posExpr:" + tag;
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
        /* Self-heal: ensure motion sliders (old rails lack them). */
        vrtAddSlider(rail, "VRT Orbit", 0);
        vrtAddSlider(rail, "VRT T0", 0);
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var camPos = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "position");
        if (camPos.numKeys > 0) { return vrtResp(false, "", "camera position has keyframes - remove first"); }
        var ex = "";
        try { ex = camPos.expression; } catch (eX) { ex = ""; }
        if (ex !== "" && ex.indexOf("VRT_Rail") < 0) { return vrtResp(false, "", "camera Position has custom expression - clear it first"); }
        camPos.expression = vrtRailCamExpr();
        var t0b = vrtMotionSlider(rail, "VRT T0");
        t0b.setValue(comp.time);
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
        var progP = vrtMotionSlider(rail, "VRT Prog");
        var spdP = vrtMotionSlider(rail, "VRT Orbit");
        var t0P = vrtMotionSlider(rail, "VRT T0");
        if (progP === null || spdP === null || t0P === null) { return vrtResp(false, "", "rebuild rail"); }
        var cur = progP.value / 100 * 360 + spdP.value * (comp.time - t0P.value);
        var norm = ((cur % 360) + 360) % 360;
        progP.setValue(norm / 360 * 100);
        spdP.setValue(0);
        return vrtResp(true, "frozen", "");
    } catch (e) { return vrtResp(false, "", "stop: " + e.toString()); }
    finally { app.endUndoGroup(); }
}
