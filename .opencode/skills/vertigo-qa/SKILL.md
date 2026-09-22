---
name: vertigo-qa
description: QA routines for VERTIGO — localhost Playwright checks plus AE-log signature diagnosis. Load before any verification task or when a red log line arrives.
version: 1.0.0
---

# vertigo-qa — verification + log diagnosis

## 1. Browser QA routine (panel shell, no AE)

1. Serve the panel folder: `python -m http.server <FRESH-PORT>` (new port every
   round — Chrome caches aggressively; a stale port shows stale code).
2. Navigate, snapshot, click every new control, read console (gate: ZERO errors).
3. Drive representative flows via evaluate: build-click, slider input+change,
   reset with seeded snapshot, copy-log.
4. Screenshot new/changed UI to `docs/<feature>-qa.png`.
5. Kill the server afterwards. Never leave stray python servers running.

## 2. AE log diagnosis (match the red line FIRST, guess never)

| Signature | Cause | Fix family |
|---|---|---|
| `null is not an object` | raw `.property()` chain hit null | named-throw helper (vrtProp) |
| `missing X ('ADBE …')` | wrong matchName or wrong parent group | ae-reference table |
| `Unexpected number` line 1 | `--` from negative injected number | `-(n)` wrap |
| `requires 2 parameters` (valueAtTime) | missing preExpression arg | `valueAtTime(t, true)` |
| `does not have 1 elements` | multi-element ease arrays | single-element ease |
| `… is locked - unlock …` | locked layer | user unlocks, no code change |
| `no snapshot` | reset before any read | press Read/Build first |
| `rebuild rail` | old rail without current sliders | rebuild rail |
| `panel/jsx mismatch` | stale JSX vs new panel | reopen panel / restart AE |
| `driven by expression` | writing to expr-driven prop | clear the expression first |
| `(replaced …)` | last-wins overwrite, announced | by design, no fix |

## 3. SMOKE gate (`docs/SMOKE.md`)

Ten ordered steps, full log pasted back. Green = zero red lines except the
documented benign ones (`no comp`, `build rail first`).

## Evolution (append-only)

1. New signature = table row with cause + fix + date.
2. New QA steps appended with rationale.
3. Bump `version:` accordingly.

## Changelog

- v1.0.0 (2026-09-22): initial extraction from QA history.
