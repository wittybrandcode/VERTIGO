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
            var names = ["VRT Width", "VRT Prog", "VRT Height", "VRT Orbit", "VRT T0", "VRT T1", "VRT Mode", "VRT WAmt", "VRT W0", "VRT W1", "VRT WDir", "VRT WMode", "VRT WShape", "VRT OSpd", "VRT OT0", "VRT OT1", "VRT OMode"];
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
                if (zEx2.indexOf("VRT T1") >= 0) { zt = "turntable"; }
                else if (zEx2 !== "") { zt = "OLD-TEMPLATE"; }
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
            var tw = "still", wEff = "?";
            try {
                var qW = vrtMotionSlider(rail, "VRT Width");
                var qA = vrtMotionSlider(rail, "VRT WAmt");
                var qS0 = vrtMotionSlider(rail, "VRT W0");
                var qS1 = vrtMotionSlider(rail, "VRT W1");
                var qD = vrtMotionSlider(rail, "VRT WDir");
                var qM = vrtMotionSlider(rail, "VRT WMode");
                var qSH = vrtMotionSlider(rail, "VRT WShape");
                if (qW !== null && qA !== null && qS0 !== null && qS1 !== null && qD !== null && qM !== null && qSH !== null) {
                    var vW = qW.value, vA = qA.value, vS0 = qS0.value, vS1 = qS1.value, vM = qM.value, vSH = qSH.value;
                    var vSg = (qD.value >= 0) ? 1 : -1;
                    var vDt = 0;
                    if (!(vA > 0 || vA < 0)) { tw = "still"; }
                    else if (comp.time < vS0) { tw = "pending"; }
                    else if (vM > 0.5 && vS1 > 0 && vS1 > vS0 && comp.time > vS1) { vDt = vSg * vA; tw = "ended"; }
                    else {
                        tw = "running";
                        if (vSH > 0.5) {
                            if (vM > 0.5) { if (vS1 > 0 && vS1 > vS0) { var vFr = (Math.min(comp.time, vS1) - vS0) / (vS1 - vS0); var vPh2 = vFr * 2; vDt = vSg * vA * ((vPh2 < 1) ? vPh2 : 2 - vPh2); } }
                            else { var vPh = (comp.time - vS0) % 2; vDt = vSg * vA * ((vPh < 1) ? vPh : 2 - vPh); }
                        } else {
                            if (vM > 0.5) { if (vS1 > 0 && vS1 > vS0) { vDt = vSg * vA * (Math.min(comp.time, vS1) - vS0) / (vS1 - vS0); } }
                            else { vDt = vSg * vA * (comp.time - vS0); }
                        }
                    }
                    wEff = Math.round((vW + vDt) * 10) / 10;
                }
            } catch (eTW) {}
            out[out.length] = "travel:" + tw + " wEff:" + wEff;
            var spn = "still";
            try {
                var qO = vrtMotionSlider(rail, "VRT OSpd");
                var qO0 = vrtMotionSlider(rail, "VRT OT0");
                var qO1 = vrtMotionSlider(rail, "VRT OT1");
                var qOM = vrtMotionSlider(rail, "VRT OMode");
                if (qO !== null && qO0 !== null && qO1 !== null && qOM !== null) {
                    var vO = qO.value, vO0 = qO0.value, vO1 = qO1.value, vOM = qOM.value;
                    if (!(vO > 0 || vO < 0)) { spn = "still"; }
                    else if (comp.time < vO0) { spn = "pending"; }
                    else if (vOM > 0.5 && vO1 > 0 && vO1 > vO0 && comp.time > vO1) { spn = "ended"; }
                    else { spn = "running"; }
                }
            } catch (eSP) {}
            out[out.length] = "spin:" + spn;
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
        if (!(spdV > 0 || spdV < 0)) { var amtChk0 = vrtMotionSlider(rail, "VRT WAmt"); var amtV0 = 0; if (amtChk0 !== null) { try { amtV0 = amtChk0.value; } catch (eAV0) { amtV0 = 0; } } var ospChk0 = vrtMotionSlider(rail, "VRT OSpd"); var ospV0 = 0; if (ospChk0 !== null) { try { ospV0 = ospChk0.value; } catch (eOV0) { ospV0 = 0; } } if (!(amtV0 > 0 || amtV0 < 0) && !(ospV0 > 0 || ospV0 < 0)) { return vrtResp(false, "", "set Orbit, Travel or Spin first"); } }
        /* Self-heal: ensure motion sliders (old rails lack them). */
        vrtAddSlider(rail, "VRT Orbit", 0);
        vrtAddSlider(rail, "VRT T0", 0);
        vrtAddSlider(rail, "VRT TiltZ", 0);
        vrtAddSlider(rail, "VRT T1", 0);
        vrtAddSlider(rail, "VRT Mode", 0);
        vrtAddSlider(rail, "VRT OSpd", 0);
        vrtAddSlider(rail, "VRT OT0", 0);
        vrtAddSlider(rail, "VRT OT1", 0);
        vrtAddSlider(rail, "VRT OMode", 0);
        vrtTravelEnsure(rail);
        var amtChk = vrtMotionSlider(rail, "VRT WAmt");
        var amtV = 0;
        if (amtChk !== null) { try { amtV = amtChk.value; } catch (eAV) { amtV = 0; } }
        var amtOn = (amtV > 0 || amtV < 0);
        var spdOn = (spdV > 0 || spdV < 0);
        var ospChk = vrtMotionSlider(rail, "VRT OSpd");
        var ospV = 0;
        if (ospChk !== null) { try { ospV = ospChk.value; } catch (eOV) { ospV = 0; } }
        var spinOn = (ospV > 0 || ospV < 0);
        /* Turntable drive lives on rail Z: static tilt + prog phase + live speed. */
        var zP = vrtProp(vrtTrans(rail, "rail"), "ADBE Rotate Z", "Rotation", "spin");
        var zEx = "";
        try { zEx = zP.expression; } catch (eZX) { zEx = ""; }
        if (zEx === "") {
            if (zP.numKeys > 0) { return vrtResp(false, "", "rail Z has keyframes - remove first"); }
            zP.expression = vrtTurntableExpr();
        } else if (zEx.indexOf("VRT T1") < 0 || zEx.indexOf("VRT Mode") < 0) {
            if (zEx.indexOf("VRT TiltZ") >= 0) { zP.expression = vrtTurntableExpr(); }
            else { return vrtResp(false, "", "rail Z has custom expression - clear it first"); }
        }
        var cam = vrtFindCam(comp);
        if (cam === null) { return vrtResp(false, "", "no camera - press Build"); }
        var camPos = vrtProp(vrtTrans(cam, "camera"), "ADBE Position", "Position", "position");
        if (camPos.numKeys > 0) { return vrtResp(false, "", "camera position has keyframes - remove first"); }
        var ex = "";
        try { ex = camPos.expression; } catch (eX) { ex = ""; }
        if (ex !== "" && ex.indexOf("VRT_Rail") < 0) { return vrtResp(false, "", "camera Position has custom expression - clear it first"); }
        camPos.expression = vrtRailCamExpr();
        if (spinOn) {
            var oriP = vrtProp(vrtTrans(cam, "camera"), "ADBE Orientation", "Orientation", "orientation");
            if (oriP.numKeys > 0) { return vrtResp(false, "", "camera orientation has keyframes - remove first"); }
            var oEx = "";
            try { oEx = oriP.expression; } catch (eOX) { oEx = ""; }
            if (oEx === "") { oriP.expression = vrtCamSpinExpr(); }
            else if (oEx.indexOf("VRT OSpd") < 0) { return vrtResp(false, "", "camera Orientation has custom expression - clear it first"); }
        }
        var t0b = vrtMotionSlider(rail, "VRT T0");
        var t1b = vrtMotionSlider(rail, "VRT T1");
        var modeP = vrtMotionSlider(rail, "VRT Mode");
        var modeV = 0;
        if (modeP !== null) { try { modeV = modeP.value; } catch (eMV) { modeV = 0; } }
        var w0b = vrtMotionSlider(rail, "VRT W0");
        var w1b = vrtMotionSlider(rail, "VRT W1");
        var wmP = vrtMotionSlider(rail, "VRT WMode");
        var wmV = 0;
        if (wmP !== null) { try { wmV = wmP.value; } catch (eWV) { wmV = 0; } }
        var ot0b = vrtMotionSlider(rail, "VRT OT0");
        var ot1b = vrtMotionSlider(rail, "VRT OT1");
        var omP = vrtMotionSlider(rail, "VRT OMode");
        var omV = 0;
        if (omP !== null) { try { omV = omP.value; } catch (eOM) { omV = 0; } }
        /* Respect a scheduled future start; only past/empty T0 becomes now. */
        var keepT0 = false;
        try { if (t0b.value > comp.time) { keepT0 = true; } } catch (eT0) {}
        if (!keepT0 && t0b !== null && spdOn) { t0b.setValue(comp.time); }
        if (!(modeV > 0.5) && t1b !== null) {
            var t1v = 0;
            try { t1v = t1b.value; } catch (eT) { t1v = 0; }
            if (t1v > 0 && t1v <= comp.time) { t1b.setValue(0); }
        }
        if (modeV > 0.5) {
            var effT0 = comp.time;
            try { if (keepT0) { effT0 = t0b.value; } } catch (eET) {}
            var endV = 0;
            if (t1b !== null) { try { endV = t1b.value; } catch (eEV) { endV = 0; } }
            if (!(endV > 0 && endV > effT0)) { return vrtResp(false, "", "count mode needs End after Start"); }
        }
        var keepW0 = false;
        if (amtOn && w0b !== null) {
            try { if (w0b.value > comp.time) { keepW0 = true; } } catch (eW0) {}
            if (!keepW0) { w0b.setValue(comp.time); }
            if (wmV > 0.5 && w1b !== null) {
                var effS0 = comp.time;
                try { if (keepW0) { effS0 = w0b.value; } } catch (eES) {}
                var wEnd = 0;
                try { wEnd = w1b.value; } catch (eWE) { wEnd = 0; }
                if (!(wEnd > 0 && wEnd > effS0)) { return vrtResp(false, "", "travel span needs End after Start"); }
            }
        }
        if (keepT0) { return vrtResp(true, "scheduled — starts at T0", ""); }
        if (keepW0) { return vrtResp(true, "scheduled — travel starts at W0", ""); }
        var keepOT0 = false;
        if (spinOn && ot0b !== null) {
            try { if (ot0b.value > comp.time) { keepOT0 = true; } } catch (eO0) {}
            if (!keepOT0) { ot0b.setValue(comp.time); }
            if (omV > 0.5 && ot1b !== null) {
                var effO0 = comp.time;
                try { if (keepOT0) { effO0 = ot0b.value; } } catch (eEO) {}
                var oEnd = 0;
                try { oEnd = ot1b.value; } catch (eOE) { oEnd = 0; }
                if (!(oEnd > 0 && oEnd > effO0)) { return vrtResp(false, "", "spin count needs End after Start"); }
            }
        }
        if (keepOT0) { return vrtResp(true, "scheduled — spin starts at OT0", ""); }
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
        vrtAddSlider(rail, "VRT Mode", 0);
        vrtAddSlider(rail, "VRT OSpd", 0);
        vrtAddSlider(rail, "VRT OT0", 0);
        vrtAddSlider(rail, "VRT OT1", 0);
        vrtAddSlider(rail, "VRT OMode", 0);
        vrtTravelEnsure(rail);
        var progP = vrtMotionSlider(rail, "VRT Prog");
        var spdP = vrtMotionSlider(rail, "VRT Orbit");
        var t0P = vrtMotionSlider(rail, "VRT T0");
        var tiltP = vrtMotionSlider(rail, "VRT TiltZ");
        var t1P = vrtMotionSlider(rail, "VRT T1");
        var widthP = vrtMotionSlider(rail, "VRT Width");
        var wamtP = vrtMotionSlider(rail, "VRT WAmt");
        var w0P = vrtMotionSlider(rail, "VRT W0");
        var w1P = vrtMotionSlider(rail, "VRT W1");
        var wdirP = vrtMotionSlider(rail, "VRT WDir");
        var wmodeP = vrtMotionSlider(rail, "VRT WMode");
        var wshpP = vrtMotionSlider(rail, "VRT WShape");
        var ospP = vrtMotionSlider(rail, "VRT OSpd");
        var ot0P = vrtMotionSlider(rail, "VRT OT0");
        var ot1P = vrtMotionSlider(rail, "VRT OT1");
        var omodeP = vrtMotionSlider(rail, "VRT OMode");
        if (progP === null || spdP === null || t0P === null || tiltP === null || t1P === null || widthP === null || wamtP === null || w0P === null || w1P === null || wdirP === null || wmodeP === null || wshpP === null || ospP === null || ot0P === null || ot1P === null || omodeP === null) { return vrtResp(false, "", "rebuild rail"); }
        var amtW = 0;
        try { amtW = wamtP.value; } catch (eAW) { amtW = 0; }
        var amtWOn = (amtW > 0 || amtW < 0);
        var ospW = 0;
        try { ospW = ospP.value; } catch (eOW) { ospW = 0; }
        var spinWOn = (ospW > 0 || ospW < 0);
        if (comp.time <= t0P.value && !amtWOn && !spinWOn) {
            spdP.setValue(0);
            return vrtResp(true, "stopped before start", "");
        }
        var te = comp.time;
        if (t1P.value > 0 && t1P.value > t0P.value && comp.time > t1P.value) { te = t1P.value; }
        var cur = tiltP.value + progP.value / 100 * 360 + spdP.value * 360 * (te - t0P.value);
        var norm = ((cur % 360) + 360) % 360;
        progP.setValue(norm / 360 * 100);
        if (amtWOn) {
            var wsgW = 1;
            try { if (wdirP.value < 0) { wsgW = -1; } } catch (eWD) {}
            var s0W = 0, s1W = 0, wmW = 0, shpW = 1, baseW = 0;
            try { s0W = w0P.value; } catch (eS0) {}
            try { s1W = w1P.value; } catch (eS1) {}
            try { wmW = wmodeP.value; } catch (eWM) {}
            try { shpW = wshpP.value; } catch (eSH) {}
            try { baseW = widthP.value; } catch (eBW) {}
            var wdtW = 0;
            if (comp.time >= s0W) {
                if (shpW > 0.5) {
                    if (wmW > 0.5) {
                        if (s1W > 0 && s1W > s0W) { var wfrW = (Math.min(comp.time, s1W) - s0W) / (s1W - s0W); var wphW2 = wfrW * 2; wdtW = wsgW * amtW * ((wphW2 < 1) ? wphW2 : 2 - wphW2); }
                    } else {
                        var phW = (comp.time - s0W) % 2;
                        var legW = (phW < 1) ? phW : 2 - phW;
                        wdtW = wsgW * amtW * legW;
                    }
                } else {
                    if (wmW > 0.5) {
                        if (s1W > 0 && s1W > s0W) { wdtW = wsgW * amtW * (Math.min(comp.time, s1W) - s0W) / (s1W - s0W); }
                    } else {
                        wdtW = wsgW * amtW * (comp.time - s0W);
                    }
                }
            }
            widthP.setValue(baseW + wdtW);
            wamtP.setValue(0);
        }
        if (spinWOn) {
            var camS = vrtFindCam(comp);
            if (camS === null) { return vrtResp(false, "", "no camera - press Build"); }
            var oriS = vrtProp(vrtTrans(camS, "camera"), "ADBE Orientation", "Orientation", "orientation");
            var soT0 = 0, soT1 = 0, soMd = 0;
            try { soT0 = ot0P.value; } catch (eSO0) {}
            try { soT1 = ot1P.value; } catch (eSO1) {}
            try { soMd = omodeP.value; } catch (eSOM) {}
            var sFr = 0;
            if (comp.time >= soT0) {
                var sTe = comp.time;
                if (soMd > 0.5) {
                    if (soT1 > 0 && soT1 > soT0) { sTe = Math.min(comp.time, soT1); sFr = (sTe - soT0) / (soT1 - soT0); }
                } else { sFr = sTe - soT0; }
            }
            var ovS = oriS.value;
            oriS.setValue([ovS[0], ovS[1], ovS[2] + ospW * 360 * sFr]);
            ospP.setValue(0);
        }
        spdP.setValue(0);
        return vrtResp(true, "frozen", "");
    } catch (e) { return vrtResp(false, "", "stop: " + e.toString()); }
    finally { app.endUndoGroup(); }
}
