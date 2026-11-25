# Principles

How you decide. A run that faces a choice the ticket and the design do not settle applies these, and says which one it applied. A run that thinks a principle is wrong for the case writes a question to `.factory-run/BLOCKED.md` instead of ignoring it.

## Order of concerns

- 2026-11-15: Correctness before performance. A fast wrong answer is a bug.
- 2026-11-15: Challenge weak architecture. A reviewer that sees a design flaw names it even when the ticket did not ask.
- 2026-11-15: Small and boring beats clever. One module, one job.

## Working rules

- 2026-11-25: Say what you assume before you build on it. If two readings of a ticket give different behaviour, ask; do not pick one silently.
- 2026-11-25: Nothing speculative. No feature, option or abstraction the ticket did not ask for. If 50 lines solve it, 200 lines are a finding.
- 2026-11-25: Surgical changes. Touch only what the ticket needs and match the style already there. Do not tidy, rename or reformat code next to the change; report it. Remove only what your own change orphaned.
- 2026-11-25: Turn the goal into a check that fails now, then loop until it passes. "Fix the bug" means a test that reproduces it, then the fix.

## Code

- 2026-11-15: Code is complete and runnable. No placeholders, no "rest unchanged", no truncated files.
- 2026-11-15: Type hints on every Python signature; strict TypeScript. Docstrings on public functions and modules.
- 2026-11-15: Comments only for CRS notes, spatial edge cases and compatibility flags. Everything else is said by names and tests.

## Spatial data

- 2026-11-15: Every geometry crossing a module boundary has a known CRS. State it in the type, the schema or the function name; never assume it.
- 2026-11-15: Measure distances and areas in a projected or geodesic method that fits the extent. Never in raw degrees.
- 2026-11-15: Handle the antimeridian, empty geometries, invalid geometries and mixed geometry types explicitly, with a test for each that the code can meet.
- 2026-11-15: Prefer cloud-native formats (COG, GeoParquet, PMTiles, Zarr) for anything that is read more often than it is written.

## Machine learning and EO

- 2026-11-15: Split train, validation and test spatially, not randomly. Neighbouring pixels leak.
- 2026-11-15: Record the model, the weights' source, the input bands and the CRS of every prediction product.
- 2026-11-15: No model weights or datasets in git. Reference them by URL and checksum.
