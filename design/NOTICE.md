# Third-party material

| What | Where | Licence |
| --- | --- | --- |
| IBM Plex Sans, Sans Hebrew, Sans Condensed, Mono (font files from Fontsource 5.3.0) | `system/project/fonts/` | SIL Open Font License 1.1, see `licenses/IBM-Plex-OFL-1.1.txt` |
| CARTOColors Emrld, Geyser and Earth palettes | `tokens/core.tokens.json`, `data.seq.emrld`, `data.div.geyser`, `data.div.earth` | CC BY 4.0, © CARTO |
| Colour-vision-deficiency matrices | `lib/color.mjs` | Machado, Oliveira and Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency", 2009 |
| OKLab colour space | `lib/color.mjs` | Björn Ottosson, 2020, public domain / MIT |
| Reference values for the simulation test | `test/fixtures/cvd-reference.json` | Generated with DaltonLens-Python |
| Flavor key list | `test/fixtures/protomaps-flavor-keys.json` | From protomaps/basemaps (BSD-3-Clause), commit 42ffaaa |

Ideas, not material, were taken from: Esri Calcite (two token tiers), Mapbox Standard and Protomaps (the basemap as one configurable flavor), Apple's Human Interface Guidelines for maps (default and muted emphasis, overlay levels), Google's map palette work (measuring common colour pairings), and Ordnance Survey's GeoDataViz principles.
