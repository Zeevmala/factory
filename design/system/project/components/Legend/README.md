The key to what is drawn on the map: a list of categories or a colour ramp with its scale.

**You provide:** a title that names the variable and its unit ("Shoreline change, m per year"), then either a list of swatch and label pairs or a ramp with tick values.

- Categories: `ul.cw-legend__list`, each swatch coloured with `--cw-swatch`. List them in the order the colours were assigned. End with "Other" when `--cw-data-cat-other` is on the map.
- Sequential ramp: seven `span` steps from `--cw-data-seq-hydro-1` to `-7` (or `emrld`). Low on the left.
- Diverging ramp: `--cw-data-div-earth-1` to `-7` (or `geyser`). Label the midpoint; it must be a meaningful value, usually zero.
- Numbers use the mono face with tabular figures. Use a real minus sign (−), not a hyphen.

**Do:** show a legend whenever colour carries data. Keep it on the map, in a corner the sheet does not cover.

**Don't:** list categories that are not on the map. Don't use a diverging ramp for data with no midpoint, or a sequential one for categories.
