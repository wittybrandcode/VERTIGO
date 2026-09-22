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

/* First motion: infinite orbit. Angle = base + speed*(time - T0). */
function vrtMotionOrbitStart() {
    app.beginUndoGroup("VERTIGO: Run");
    try {
        var comp = vrtGetComp();
        if (comp === null) { return vrtResp(false, "", "no comp - open a composition first"); }
        var rail = vrtRailLayer(comp);
        if (rail === null) { return vrtResp(false, "", "build rail first"); }
        var spd = vrtMotionSlider(rail, "VRT Orbit");
        var t0 = vrtMotionSlider(rail, "VRT T0");
        if (spd === null || t0 === null) { return vrtResp(false, "", "rebuild rail"); }
        t0.setValue(comp.time);
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
