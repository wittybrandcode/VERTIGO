# VERTIGO — Direct Camera Remote for After Effects

A CEP panel that turns After Effects' camera into a directly controllable instrument:
sliders + fields for **every** camera property, live tracking, and a 3D orbit rail.

![status](https://img.shields.io/badge/status-core%20v1-lightgrey)

## Install (dev)

1. Copy this folder to `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\VERTIGO`
2. Enable unsigned extensions: registry `HKCU\Software\Adobe\CSXS.12` → `PlayerDebugMode` = `1`
3. Restart After Effects → Window > Extensions > VERTIGO

## Use

See **[docs/USER-GUIDE.md](docs/USER-GUIDE.md)** (short, Arabic).

Methodology in one line: **Build** prepares → **Link** switches → **Read** loads → rows write back.

## Docs

- `docs/PLAN.md` — core architecture, frozen API, strict rules
- `docs/ROADMAP.md` — phases and ship checklist
- `docs/DESIGN.md` — Industrial Slate design tokens
- `docs/USER-GUIDE.md` — usage

## Develop

- Panel: `index.html` + `js/main.js` (vanilla, no build step)
- AE side: `jsx/hostscript.jsx` (**ES3 only** — see PLAN §4)
- Serve over localhost for browser QA, never `file://`
