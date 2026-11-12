# Review checklist (web map app)

A violation of any item is a blocking finding.

- Coordinates: every array is `[lng, lat]` for Mapbox GL and GeoJSON. Any `[lat, lng]` must be converted at a named boundary.
- Distances and midpoints are computed geodesically (for example with Turf), never by averaging raw degrees.
- No Mapbox token, Firebase config secret or service account in source or tests. Public tokens come from environment variables.
- A change to Firestore or Realtime Database rules comes with a rules test that proves both the allowed and the denied case.
- User-supplied text shown on the map or in a popup is escaped. No `innerHTML` or `setHTML` with unescaped input.
- New UI text exists in every supported language and renders correctly right-to-left.
- A new dependency is justified in the commit message and does not duplicate one already installed.
