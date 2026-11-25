# Review checklist (static web map, no build step)

A violation of any item is a blocking finding.

- Coordinates: Leaflet takes `[lat, lng]`; GeoJSON, MapLibre and Mapbox GL take `[lng, lat]`. Any conversion happens at a named boundary, never inline.
- Distances are computed geodesically, never by subtracting or averaging raw degrees.
- A missing or unparsable coordinate drops the record. It never becomes 0.
- Data placed in an HTML string is escaped. Text given to `setAttribute()` or `textContent` is plain text and is not escaped a second time.
- `response.ok` is checked before `response.json()`.
- Colours come from the design tokens (`var(--cw-...)`), not hand-written values.
- New UI text exists in every supported language and renders correctly right-to-left.
- Generated data files are changed by their generator, never by hand.
- If a service worker caches files, its cache version changes when a cached file changes, and every precached path exists and works under the site's deploy path.
- No new dependency and no build tool unless the design names it.
