The key to what is drawn on the map: a list of categories or a colour ramp with its scale.

**You provide:** a title that names the variable and its unit ("Shoreline change, m per year"), then either a list of swatch and label pairs or a ramp with tick values.

- Categories: `ul.cw-legend__list`, each swatch coloured with `--cw-swatch`. List them in the order the colours were assigned. End with "Other" when `--cw-data-cat-other` is on the map.
- Sequential ramp: one `span` per class, coloured from `dist/ramps.json` for that class count (or `--cw-data-seq-hydro-1` to `-7` for seven). Low on the left. The tokens run light to dark on the light theme and dark to light on the dark theme, so low always sits nearest the basemap.
- Diverging ramp: `--cw-data-div-earth-1` to `-7` (or `geyser`). Label the midpoint; it must be a meaningful value, usually zero.
- Scale: print the minimum, every break and the maximum, so each number sits on the boundary between two classes.
- No data: a list entry with `span.cw-legend__swatch.cw-legend__swatch--missing` (hollow, dashed), whenever a feature on the map has no value.
- Numbers use the mono face with tabular figures. Use a real minus sign (−), not a hyphen.

**Do:** show a legend whenever colour carries data. Keep it on the map, in a corner the sheet does not cover.

**Don't:** list categories that are not on the map. Don't use a diverging ramp for data with no midpoint, or a sequential one for categories.
