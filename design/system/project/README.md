Cartowolf is the design system for map applications: an interface layer, a basemap layer and a data layer that are checked against each other, so text stays readable on the map and data stays readable on the basemap, in light and dark, for colour-blind readers too.

Every rule below names the token to use. If a rule and a token disagree, the token is right and the rule is a bug: report it.

## The three layers

1. **Basemap** recedes. Its colours are the `--cw-map-*` tokens, in a default and a muted emphasis.
2. **Data** leads. Its colours are the `--cw-data-*` tokens. They are tuned per theme to stand off the basemap.
3. **Interface** frames. Surfaces, text and controls use the semantic tokens (`--cw-surface-*`, `--cw-text`, `--cw-accent`).

Never borrow across layers. A basemap colour is not a button colour; a data colour is not a status colour.

## Colour

- Page background is `--cw-surface-0`. Cards, sheets and place cards are `--cw-surface-1`. Inset areas and hover fills are `--cw-surface-2`.
- Text is `--cw-text`; secondary text is `--cw-text-muted`. Both hold 4.5:1 on all three surfaces and on `--cw-overlay` over any basemap colour.
- One accent: `--cw-accent` for the primary button and selected controls, with `--cw-text-on-accent` on it. Links and accent-coloured text use `--cw-accent-text`, not `--cw-accent`.
- Status is `--cw-danger`, `--cw-warning`, `--cw-success`, each with `-on`, `-subtle` and `-text`. Success is teal, not green, so it stays apart from danger for red-green colour-blind readers. Every status also carries a word or an icon.
- Borders: `--cw-border` is decorative. Anything a person must find by its outline (an input, a control) uses `--cw-border-strong`.
- Focus: 2px solid `--cw-focus`, 2px offset, on every interactive element. Do not remove it.
- Do not write a hex, rgb or hsl value in an app. If the colour you need is missing, add a token.

## Basemap

- Two emphases. **Default** when the map is the content. **Muted** whenever data, routes or many markers are drawn on it.
- Generate the map style from the tokens: `dist/mapbox-standard.json` for Mapbox Standard, `dist/protomaps-flavors.json` for Protomaps with MapLibre. Do not hand-pick layer colours.
- The flavor follows the theme. Dark interface, dark map.
- Labels are `--cw-map-label` with a 1.5px halo in `--cw-map-label-halo`. Water labels are `--cw-map-label-water`, italic in Latin script. Hebrew has no italic: Hebrew water labels differ by colour only.
- Show less as you zoom out. Large areas at every zoom; streets, buildings and points of interest only when zoomed in.
- Keep the map provider's logo and attribution visible at all times.

## Data on the map

- **Categories:** `--cw-data-cat-1` to `-6`, used in order. Six is the limit; everything else is `--cw-data-cat-other`. Every pair of the six stays distinct under protan, deutan and tritan simulation.
- **Amounts:** a sequential ramp, `--cw-data-seq-hydro-1` to `-7` (single hue) or `--cw-data-seq-emrld-1` to `-7` (wider range). Light is low.
- **Change around a midpoint:** a diverging ramp, `--cw-data-div-earth-1` to `-7` or `--cw-data-div-geyser-1` to `-7`. The middle step is the midpoint; name its value in the legend.
- Seven classes at most. Classed colours read better than a continuous gradient; use one only for rasters.
- **Casing:** every marker and data line has an outline in `--cw-data-casing`, `--cw-stroke-casing` wide. It is what separates data from whatever basemap colour lies beneath.
- **Areas:** fill at `--cw-opacity-fill-area` with an opaque outline in the same colour, so the basemap reads through.
- **Routes:** `--cw-data-route`, `--cw-stroke-route` wide, over `--cw-data-route-casing`, `--cw-stroke-route-casing` wide.
- **Selection:** an outline in `--cw-data-selection`, drawn above labels. One selection at a time.
- Colour is never the only cue. People carry an initial, categories a legend, states a word.
- Stacking order, bottom to top: basemap fills, data areas, roads, data lines, labels, markers, selection.

## Type

- Interface text is IBM Plex Sans, with IBM Plex Sans Hebrew next in the stack so mixed strings fall through to it. Use the classes: `cw-display`, `cw-title-1`, `cw-title-2`, `cw-body`, `cw-body-strong`, `cw-small`.
- Dense labels (legends, callouts, chips) are IBM Plex Sans Condensed: `cw-label`, and `cw-overline` for uppercase group headings.
- Hebrew has no capitals. Set Hebrew group headings in `cw-label`, never `cw-overline`.
- Coordinates, distances, durations and codes are IBM Plex Mono: `cw-data`, tabular figures.
- Wrap every number with a unit in `<bdi>`. Inside right-to-left text, "40.6 km" otherwise renders as "km 40.6".
- Running text is at most 65 characters wide.

## Writing

- Sentence case everywhere. No capitals for emphasis.
- Buttons say what happens: "Navigate", "Share link", "Leave session".
- Distances in km with one decimal below 100 ("6.2 km"), whole numbers above. Durations in minutes below an hour ("14 min").
- Coordinates as decimal degrees, four decimals, latitude first, with hemisphere letters: `32.0853° N 34.7818° E`. In code and GeoJSON the order is longitude, latitude.
- Use a real minus sign (−) for negative numbers and an en dash (–) in ranges and paired place names.
- No emoji.

## Layout, shape and depth

- Spacing is the 4px scale, `--cw-space-1` (4px) to `--cw-space-8` (64px). Card padding is `--cw-space-4`; the gap between groups is `--cw-space-5`.
- Radii: `--cw-radius-md` for buttons, inputs and map controls; `--cw-radius-lg` for cards and sheets; `--cw-radius-pill` for badges and markers; `--cw-radius-sm` for legend swatches.
- Depth: `--cw-shadow-1` for map controls, `--cw-shadow-2` for place cards, `--cw-shadow-3` for sheets and modals. Nothing else casts a shadow.
- Controls are `--cw-size-control` (36px) with a pointer and `--cw-size-target` (44px) on touch.
- Use logical properties (`inline-start`, `block-end`) so every layout mirrors in right-to-left.
- Everything over the map sits on `--cw-overlay` (controls, legends) or `--cw-surface-1` (cards, sheets). Tell the map how much of it they cover, so fitting the camera frames what is visible.

## Motion

- Hover and press: 120ms. Sheets and popovers: 200ms. Transitions tied to the camera: 320ms. One easing, `cubic-bezier(0.2, 0, 0, 1)`.
- A pulse means something is live. Static things do not pulse.
- Honour `prefers-reduced-motion`: no camera animation, no transitions.

## Icons and marks

- There is no logo. Set the name in `cw-display`.
- No icon set ships with the system. Draw icons as inline SVG in a 20px box: strokes only, 1.75px, round caps and joins, `currentColor`. Give every icon button an `aria-label`.

## Attribution

The `emrld`, `geyser` and `earth` ramps are CARTOColors, licensed CC BY 4.0: credit CARTO where a map using them is published. IBM Plex is licensed under the SIL Open Font License 1.1.
