# Stack

Default technology choices. They settle a choice the design leaves open; they are not a ban list.

## Scope

- 2026-11-16: These defaults bind **new services and new dependency choices**. Existing code keeps the stack it has: a project built on something else (a client-side PWA on Firebase, a static page) is correct as it is, and a reviewer does not flag it.
- 2026-11-16: A design doc may choose differently. It says why, and the project records it in `docs/brain/DECISIONS.md`. Departing from a default without that record is a review finding.
- 2026-11-16: GitHub is the platform, static-first (see Platform below). GCP is ruled out. A run that needs a server, a database or large storage asks in `BLOCKED.md` which add-on to use, unless the design doc names it.

## Platform

- 2026-11-16: Design for no server first. Frontends, static sites and map apps deploy to GitHub Pages.
- 2026-11-16: Static geodata is served as files the browser reads directly with range requests: PMTiles for tiles, COG for rasters, GeoParquet or FlatGeobuf for vectors. Within GitHub Pages' size limits only; check them in the design.
- 2026-11-16: Batch and scheduled work (EO processing, data refreshes) runs in GitHub Actions: it runs, writes its outputs, and exits. Outputs above the Pages limits go to object storage, not to git.
- 2026-11-16: Container images, when a service needs one, are published to GitHub's container registry (ghcr.io).
- 2026-11-16: GitHub cannot host a long-running API, a database, or large files. When a design needs one, it adds one add-on per need and records the choice and the reason in the project's `docs/brain/DECISIONS.md`: a managed PostgreSQL with PostGIS (and pgvector when needed), a small container host for the API, S3-compatible object storage for large files. Candidates are compared on current pricing and limits at that time; none is pre-chosen here.
- 2026-11-16: Secrets (API keys, model keys) never ship to the browser. A feature that needs one needs a server-side add-on, or an Actions job that runs ahead of time.

## Backend services (new)

- 2026-11-16: Python 3.12 or later, fully typed. Containerised with an explicit Dockerfile; stateless, so any instance can serve any request and nothing is kept on local disk between requests.
- 2026-11-16: PostgreSQL + PostGIS for spatial data; pgvector when embeddings are stored. Deployment and infrastructure config is committed next to the code, never set by hand in a console.
- 2026-11-16: Nothing provider-specific in application code. Storage, queues and secrets sit behind a small interface or standard protocol (S3-compatible object storage, plain PostgreSQL), so the host can change without a rewrite.
- 2026-11-16: Bound database connections: a pooler or a small fixed pool per instance, because instance count times pool size must stay under the database's connection limit.
- 2026-11-16: Errors are explicit. No bare `except`, no swallowed exception, no silent fallback to a default value; a failure is raised, logged with context, or returned as a typed error.

## Async and CPU-bound work

- 2026-11-16: Use async for I/O: HTTP calls, database queries, object storage. Do not wrap CPU-bound geometry or raster work (Shapely, GEOS, GDAL, rasterio, numpy) in `async def` and call it concurrent: it blocks the event loop. Run it in a process pool or a batch job, and keep request handlers thin.
- 2026-11-16: Long raster or model jobs do not run inside a request. Use a job runner or a queue, and make the job safe to retry.

## Spatial

- 2026-11-16: Vectorised geometry operations (Shapely 2 array functions, GeoPandas) instead of Python loops over features, once correctness is tested. The CRS and validity rules in `PRINCIPLES.md` come first.
- 2026-11-16: Formats by job: COG for rasters, GeoParquet for analytical vector data, FlatGeobuf for streamable vector features with a spatial index, PMTiles for map tile delivery. PMTiles is a delivery format, not an analysis format.

## Frontend and static projects

- 2026-11-16: No default imposed. Follow the project's existing stack and its `CLAUDE.md`.
