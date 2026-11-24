# Adopting Cartowolf in meet-me-halfway

Measured on `main` at 815e176 with the system's own tools. This is a starting point for tickets, not a plan to run in one change.

## Where it stands

- `check-colors` finds 60 hand-written colours under `apps/web/src`: 54 in `live-midpoint.css`, 5 in `participant-config.ts`, 1 in `LiveMap.tsx`.
- The app defines 19 `--live-*` custom properties, colours only.
- The five participant colours hold at least 5:1 on the app background. Under colour-vision simulation three pairs fall below the system's gap of 0.08: green and pink (0.052, deutan), blue and purple (0.046, deutan), orange and pink (0.060, tritan). The app already puts an initial on every marker, so colour is not the only cue; the pairs are still harder to match to the list than they need to be.
- `--live-gray` (`#555`) is 2.65:1 on the background: below 3:1 for a mark and well below 4.5:1 for text.

## Mapping

| App token | Cartowolf token |
| --- | --- |
| `--live-bg` | `--cw-surface-0` |
| `--live-surface` | `--cw-overlay` over the map, `--cw-surface-1` in the sheet |
| `--live-glass`, `--live-border` | `--cw-surface-2`, `--cw-border` |
| `--live-text`, `--live-text-muted` | `--cw-text`, `--cw-text-muted` |
| `--live-green`, `-blue`, `-orange`, `-purple`, `-pink` | `--cw-data-cat-1` to `-5`, dark theme |
| `--live-amber`, `--live-gold` | `--cw-warning` |
| `--live-red` | `--cw-danger` |
| `--live-gray` | `--cw-data-cat-other` |
| `--live-mono` | `--cw-font-mono` |
| `--live-whatsapp` | keep, marked `cw-allow-color: WhatsApp brand green` |

## Suggested tickets, in order

1. Load `tokens.css` and `fonts.css`; alias each `--live-*` to its Cartowolf token in one place. No visual review needed beyond the palette.
2. Replace the participant palette with `--cw-data-cat-1` to `-5` and update `participant-config.ts` to read them. This changes "the creator is green": decide whether slot 0 keeps a fixed colour first.
3. Move the basemap from `dark-v11` to Mapbox Standard with `dist/mapbox-standard.json["dark-muted"]`. Check the CSP and the e2e spec's stylesheet assertion before starting; Standard loads different resources.
4. Replace the remaining literals in `live-midpoint.css` file section by file section, then add `check-colors` to `.factory/check.sh`.
