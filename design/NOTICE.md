# Third-party material

Cartowolf itself is MIT licensed, see [`../LICENSE`](../LICENSE). The material below keeps its own licence.

| What | Where | Licence |
| --- | --- | --- |
| IBM Plex Sans, Sans Hebrew, Sans Condensed, Mono (font files from Fontsource 5.3.0) | `system/project/fonts/` | SIL Open Font License 1.1, see `licenses/IBM-Plex-OFL-1.1.txt` |
| CARTOColors Emrld, Geyser and Earth palettes | `tokens/core.tokens.json`, `ramp.seq.emrld`, `ramp.div.geyser`, `ramp.div.earth` | CC BY 4.0, © CARTO |
| Dark-midpoint adaptations of Geyser and Earth (end hues kept, lightness and chroma redrawn) | `tokens/core.tokens.json`, `ramp.div.geyser-night`, `ramp.div.earth-night` | Adapted from CARTOColors, CC BY 4.0, © CARTO; changes are ours |
| Natural-breaks classification | `lib/classify.mjs` | Our implementation of the method in Fisher, "On Grouping for Maximum Homogeneity", 1958, and Jenks, 1967 |
| Colour-vision-deficiency matrices | `lib/color.mjs` | Machado, Oliveira and Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency", 2009 |
| OKLab colour space | `lib/color.mjs` | Björn Ottosson, 2020, public domain / MIT |
| Reference values for the simulation test | `test/fixtures/cvd-reference.json` | Generated with DaltonLens-Python |
| Flavor key list | `test/fixtures/protomaps-flavor-keys.json` | From protomaps/basemaps (BSD-3-Clause), commit 42ffaaa |

Ideas, not material, were taken from: Esri Calcite (two token tiers), Mapbox Standard and Protomaps (the basemap as one configurable flavor), Apple's Human Interface Guidelines for maps (default and muted emphasis, overlay levels), Google's map palette work (measuring common colour pairings), and Ordnance Survey's GeoDataViz principles.
