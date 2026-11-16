# Stack

Default technology choices. They settle a choice the design leaves open; they are not a ban list.

## Scope

- 2026-11-16: These defaults bind **new services and new dependency choices**. Existing code keeps the stack it has: a project built on something else (a client-side PWA on Firebase, a static page) is correct as it is, and a reviewer does not flag it.
- 2026-11-16: A design doc may choose differently. It says why, and the project records it in `docs/brain/DECISIONS.md`. Departing from a default without that record is a review finding.
- 2026-11-16: Draft. The backend defaults below were proposed, not yet confirmed by the owner. Until this line is replaced by a dated confirmation, a run that must pick a backend platform asks in `BLOCKED.md` instead of assuming.

## Backend services (new)

- 2026-11-16: Python 3.12 or later, fully typed. Containerised with an explicit Dockerfile; stateless, so any instance can serve any request and nothing is kept on local disk between requests.
- 2026-11-16: Serverless containers on GCP (Cloud Run) with PostgreSQL + PostGIS (Cloud SQL); pgvector when embeddings are stored. Deployment and infrastructure config is committed next to the code, never set by hand in a console.
- 2026-11-16: Size database connections for serverless: a pooler or a small bounded pool per instance, because instance count times pool size must stay under the database's connection limit.
- 2026-11-16: Errors are explicit. No bare `except`, no swallowed exception, no silent fallback to a default value; a failure is raised, logged with context, or returned as a typed error.

## Async and CPU-bound work

- 2026-11-16: Use async for I/O: HTTP calls, database queries, object storage. Do not wrap CPU-bound geometry or raster work (Shapely, GEOS, GDAL, rasterio, numpy) in `async def` and call it concurrent: it blocks the event loop. Run it in a process pool or a batch job, and keep request handlers thin.
- 2026-11-16: Long raster or model jobs do not run inside a request. Use a job runner (Cloud Run jobs or a queue), and make the job safe to retry.

## Spatial

- 2026-11-16: Vectorised geometry operations (Shapely 2 array functions, GeoPandas) instead of Python loops over features, once correctness is tested. The CRS and validity rules in `PRINCIPLES.md` come first.
- 2026-11-16: Formats by job: COG for rasters, GeoParquet for analytical vector data, FlatGeobuf for streamable vector features with a spatial index, PMTiles for map tile delivery. PMTiles is a delivery format, not an analysis format.

## Frontend and static projects

- 2026-11-16: No default imposed. Follow the project's existing stack and its `CLAUDE.md`.
