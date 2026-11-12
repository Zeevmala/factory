# Review checklist (geospatial Python, GeoAI)

A violation of any item is a blocking finding.

## Spatial correctness
- Every dataset entering a function has a known CRS. No `set_crs` to silence a warning, and no reprojection whose source CRS is assumed.
- Lengths, areas and buffers are computed in a projected CRS suited to the extent (EPSG:2039 for Israel), never in EPSG:4326 degrees.
- Axis order is explicit wherever coordinates cross a library boundary (pyproj `always_xy=True`, PostGIS, GeoJSON).
- Geometries are validated before overlay or area operations, and the repair path is deliberate.
- Raster reads respect nodata and masks. Resampling method matches the data: nearest for classes, never bilinear.
- Row-by-row Python loops over geometries are replaced by vectorised or database-side operations where the data is not tiny.

## Model and evaluation
- Train, validation and test splits are spatially blocked, and temporally separated where the task is change over time. A random split of neighbouring pixels or tiles leaks.
- Statistics used for normalisation come from the training split only.
- Seeds are fixed and recorded. A reported metric names its dataset, split and sample count.
- No model weights, embeddings or imagery are committed. Data is referenced by path or URI.

## Database and LLM boundary
- SQL is parameterised. No string-built SQL from user or model output.
- Any SQL written by a model runs under a read-only role with a statement timeout and a row limit.
- Text retrieved from documents or the database is passed to the model as data and cannot change which tools it may call.
- Hebrew and English paths are both covered by a test when a change touches text handling.
