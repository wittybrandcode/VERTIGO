---
name: vertigo-ae-reference
description: Battle-tested After Effects ExtendScript facts for VERTIGO — verified matchNames, call arities, and expression-vs-scripting traps. Load before writing or debugging ANY .jsx.
version: 1.0.0
---

# vertigo-ae-reference — AE Facts (paid for in production bugs)

Each entry: WRONG (what broke us) → RIGHT (verified). Error signature included
so log lines can be matched directly. General AE skills do NOT contain these.

## 1. MatchNames (verified against Adobe scripting guide + runtime)

- `Camera Options` is a SIBLING of Transform on cameras, never a child.
  Err: `missing camera options ('ADBE Camera Options Group')`.
- ❌ `"ADBE Zoom"` / `"ADBE Focus Distance"` → ✅ `"ADBE Camera Zoom"` /
  `"ADBE Camera Focus Distance"` (under `ADBE Camera Options Group`).
- ✅ Transform children: `ADBE Position/Anchor Point/Scale/Orientation`,
  `ADBE Rotate X|Y`, `ADBE Rotation` (Z), `ADBE Opacity`, `ADBE Interest` (POI).
- ✅ Effects: `ADBE Effect Parade` + `ADBE Slider Control` + `ADBE Slider Control-0001`.
- ✅ Shapes: `ADBE Root Vectors Group` (+ deep-search, never assume nesting).
- Cameras have NO `threeDLayer` property. Nulls need `threeDLayer = true`.
- `comp.layers.byName()` returns null when missing (documented safe).
  `comp.layer()` may throw — never rely on it.

## 2. Call arities (scripting ≠ expressions)

- `valueAtTime(t)` in SCRIPTING requires 2 params → always `valueAtTime(t, true)`.
  Err: `Unable to call "valueAtTime" because the call requires 2 parameters`.
- `setTemporalEaseAtKey` wants SINGLE-element arrays (one ease fits all dims).
  Err: `... parameter 2. Value array does not have 1 elements`.
- `new KeyframeEase(speed, influence)` — e.g. `(0, 60)` smooth, `(60, 20)` snappy.
- `addKey(t)` → index; `setValueAtKey(i, v)`; `removeKey(1)`; `numKeys`.
- `selectedKeys()` returns selected key indices; guard with
  `propertyType === PropertyType.PROPERTY` + `canVaryOverTime`.

## 3. Scripting vs expressions (different languages!)

- `Layer.toWorld()` does NOT exist in scripting (expressions only).
  World position in script = manual parent-chain walk (or restructure).
- Numbers injected into expression strings: negatives create `--`
  (parsed as decrement!). Always wrap: `[d-(-2357)]`, never `[d--2357]`.
  Err: `SyntaxError: Unexpected number` at line 1.
- `layer.property(name)` returns null on no-match (does NOT throw) →
  always null-check or use the named-throw helper pattern.
- Reading `.expression` is safe-ish (empty string when none); wrap in try.
- `comp.layers.addNull()` duration is optional; `addCamera(name, [x, y])` fine.
- `AutoOrientType.CAMERA_OR_POINT_OF_INTEREST` ⇔ two-node camera.

## 4. Property access helper pattern (mandatory in VERTIGO)

```jsx
// try matchName, fall back to display name, else throw NAMED error
function vrtProp(group, matchName, displayName, ctx) { /* … */ }
```

Never chain `a.property("ADBE …").property("…")` raw — one null poisons the chain
into `TypeError: null is not an object` with no location.

## Evolution (append-only)

1. New fact = row: wrong → right + error signature + date.
2. Never delete corrected facts; strike through superseded ones.
3. Bump `version:` (patch per fact batch).

## Changelog

- v1.0.0 (2026-09-22): initial extraction from production debugging history.
