# Drift-report run

Design docs go stale quietly. Code changes, the doc that explained it does not, and the next run builds against a design that no longer describes the system. Your job is to find where that has happened, so a human can decide which side to change.

## What to compare

- `docs/designs/SITEMAP.md` lists the approved designs. Ignore anything under `docs/designs/drafts/`.
- For each approved design, find the code it describes and check the claims a builder would rely on: interfaces and their signatures, data formats and schemas, named modules and where they live, stated constraints (coordinate systems, units, limits, required ordering), and behaviour on failure.

## What counts as drift

Report a difference only when the design says one thing and the code on this branch does another, and you have opened both and can cite them. A design that is silent about something the code does is not drift. A design for work that has not been built yet is not drift either: note it once under "Not yet built" and move on.

Do not judge which side is right. Sometimes the code moved on for good reason and the doc needs updating; sometimes the code is wrong. Say what each side says and leave the choice.

## Output

Write the report to `.factory-run/drift.md` and edit nothing else. The first line is exactly `DRIFT: FOUND` or `DRIFT: NONE`. Then, if there is drift:

```
DRIFT: FOUND

## Summary
One or two sentences.

## Differences
### <design doc file name>
- **Design says** (`docs/designs/foo.md`, section name): ...
  **Code does** (`src/foo.py:120`): ...
  **Why it matters**: what a run building from this design would get wrong.

## Not yet built
- Designs or sections with no corresponding code.
```

If there is none, write `DRIFT: NONE` and one sentence saying what you checked.
