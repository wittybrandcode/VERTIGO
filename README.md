# VERTIGO — Direct Camera Remote for After Effects

```
██    ██ ███████ ██████  ████████ ██  ██████   ██████
██    ██ ██      ██   ██    ██    ██ ██       ██    ██
██    ██ █████   ██████     ██    ██ ██   ███ ██    ██
 ██  ██  ██      ██   ██    ██    ██ ██    ██ ██    ██
  ████   ███████ ██   ██    ██    ██  ██████   ██████
```

Sliders + fields for **every** camera property, live tracking, and a 3D orbit rail.
No rigs, no keyframes generated — direct control with full undo.

## Install

1. Copy this folder to `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\VERTIGO`
2. Enable unsigned extensions: registry `HKCU\Software\Adobe\CSXS.12` → `PlayerDebugMode` = `1`
3. Restart After Effects → Window > Extensions > VERTIGO

## Use

1. Open a composition → press **Build** (links selected camera, or creates `VRT_Cam`)
2. Drag any slider or type a value — the camera follows live (one undo step each)
3. **Read** reloads values · **Link** switches camera · **↺** resets to snapshot
4. **Track** a selected layer (look + focus follow) · **Rail** builds a 2500 Ø orbit circle (Width/Prog/Height/Tilt/XYZ + Floor/Wall/Side planes + Look/Focus)
5. Angles accept revolutions: `1x45` = 405° · red log line? open `</> Log` → **Copy**

## Layout

```
CSXS/manifest.xml   extension manifest (CEP 6.0)
index.html          panel UI (vanilla, no build step)
js/                 CSInterface.js (vendor) + main.js (bridge)
jsx/hostscript.jsx  ExtendScript ES3 — the whole AE side
icons/              spiral mark, normal/hover/dark
```

## Develop

- Serve over localhost for browser QA, never `file://`
- ExtendScript is **ES3 only** (no let/const/arrow/map/JSON)
- Methodology: BUILD → LINK → READ → write · last click wins, always reported
