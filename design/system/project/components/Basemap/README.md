The basemap flavor: fourteen colours that style land, water, roads, boundaries and labels, in a default and a muted emphasis for each theme.

**You provide:** a container with a size and the class `cw-map` (add `cw-map--muted` for the muted emphasis), and the map library. Take the colours from the generated config, never by hand:

- Mapbox Standard: `dist/mapbox-standard.json`, one entry per theme and emphasis. Pass it as `config: { basemap }`.
- Protomaps with MapLibre: `dist/protomaps-flavors.json`. Pass the entry to `layers("protomaps", flavor, { lang })`.

**Choose the emphasis by what leads.** Default when the map is the content: finding a place, reading a neighbourhood. Muted whenever you draw data, routes or more than a handful of markers. The muted map also turns point-of-interest labels off.

- Put fills and lines under the labels (Mapbox slot `middle`). Put markers and the selection outline above them (`top`).
- Switch the flavor with the theme. A light interface over a dark map, or the reverse, fails the contrast the system was checked for.
- Do not restyle single layers in an app. If a colour is wrong, change the token so every app gets it.
- Keep the provider's logo and attribution visible. Lift them above a sheet; never cover them permanently.
