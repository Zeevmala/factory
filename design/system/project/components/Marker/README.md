A point on the map: a person, a place, a cluster, or a plain data dot.

**You provide:** the position (from the map library), the colour as `--cw-marker-color`, and for a person or place one to two characters of text. Give every marker an `aria-label` that says what it is.

- Default marker: a ring in the data colour around a neutral disc. The initial is text on the disc, so it stays readable whatever the colour.
- `cw-marker--dot`: a 14px filled dot for dense data. No text.
- `cw-marker--cluster`: a count. Use `--cw-data-cat-other` unless every member shares one category.
- `cw-marker--selected`: adds the selection ring. One selected marker at a time.

**Do:** take colours from `--cw-data-cat-1` to `-6` in order. Cluster when markers overlap. Keep the casing: it is what separates a marker from water, parks and roads.

**Don't:** use colour as the only difference between people; the initial is the second cue. Don't put a seventh category on the map: group the rest as `--cw-data-cat-other`. Don't style the element the map library positions; wrap the marker in it.
