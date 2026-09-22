---
name: vertigo-contracts
description: Frozen contracts enforcement for the VERTIGO After Effects extension — API freeze, module ownership, UI patterns, status vocabulary. Load before ANY VERTIGO implementation or review task.
version: 1.0.0
---

# vertigo-contracts — VERTIGO Frozen Contracts

You are working on VERTIGO, a CEP camera-remote panel for After Effects.
These contracts are FROZEN. You may ADD new ones (see Evolution) but never
change or remove an existing rule without a major version bump + documented reason.

## 1. Frozen API (panel ↔ JSX: `fn("a","b")` → JSON string)

```
vrtPing | vrtApiVersion(=1) | vrtCamEnsure/Link/Get/Set | vrtTrackSet/Clear/Status
vrtRailBuild/Set/Get/Clear/Look/Focus/Plane
```

- Signatures never change. New functions only get appended.
- Every function returns `'{"ok":...}'` and never throws outward.
- Panel checks `vrtApiVersion` on open; mismatch = stale files, warn loudly.

## 2. Ownership (who writes what)

| Owner (JSX module) | Owns (layers / expressions) | Never touches |
|---|---|---|
| vrt-camera | linked camera props, VRT_Cam | rail shape, tracking exprs |
| vrt-track | 2 tracking expressions (POI + focus) | camera direct props, rail |
| vrt-rail | VRT_Rail shape + orbit/look/focus-rail exprs | camera direct props |

Panel is the ONLY writer. Modules never call each other (shared helpers live in vrt-core only).

## 3. UI contract

- One row = word + slider + field + ↺ (merged XYZ/trios allowed, same pattern).
- Every primary button carries a word under its icon.
- Status vocabulary only: `✓ …` / `! …` / `… working` / `No rig — press Build`.
- Bridge log lines: `fn(args)` → `fn -> ok/msg|err` (newest first, cap 80).
- Snapshots update on every successful read; resets restore snapshots, never defaults.

## 4. Coexistence rules

- Last click wins AND announces: `(replaced …)` suffix in the message.
- Writing to an expression-driven property is REFUSED with a message, never silent.
- Build refuses cameras with custom Position expressions.
- Locked layers are refused by name (`… is locked - unlock …`).

## 5. Version freeze

Product version stays `v1.0` until the owner declares stability. Manifest 6.0 / CSXS 6.0 never raised without a tested reason.

## Evolution (how this skill grows — append-only)

1. Add new rules as numbered items under the right section with date: `- [2026-..-..] rule… (why)`.
2. Removed/superseded rules are STRUCK THROUGH, never deleted, with replacement pointer.
3. Bump `version:` (patch = clarifications, minor = new rules).
4. Changelog at file end: `## Changelog — v1.1.0 (date): …`.

## Changelog

- v1.0.0 (2026-09-22): initial extraction from PLAN.md + coexistence guide.
