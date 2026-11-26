# Cartowolf design system

One visual and cartographic system for every map app the factory builds: interface tokens, basemap flavors, data palettes, and the checks that keep them legible together.

The rules for using it are in [`system/project/README.md`](system/project/README.md). That file is the brand book: unattended runs and reviewers read it, and the design-system page in Claude shows it. This file is for people changing the system.

## Layout

```
tokens/     source of truth, W3C Design Tokens format (2025.10)
  core.tokens.json          raw scales: colour ramps, spacing, radius, type, data ramps
  theme.light.tokens.json   semantic colours, basemap flavor, categorical palette
  theme.dark.tokens.json    the same keys for dark
lib/        no dependencies; the last four are pure functions that also run in a browser
  tokens.mjs, adapters.mjs  token loader, Mapbox Standard and Protomaps adapters
  color.mjs                 contrast, OKLab, colour-vision simulation
  ramps.mjs                 cut a ramp to 3-7 classes, or read it as continuous stops
  classify.mjs              class breaks: equal interval, quantile, natural breaks
  maplibre.mjs              the data-layer rules as MapLibre / Mapbox GL layers and expressions
scripts/    build.mjs, specimen.mjs, check-colors.mjs
test/       the checks
dist/       generated: what apps consume
docs/       generated: index.html, the specimen page
system/     generated tokens + hand-written brand book, components and fonts,
            in the layout the Claude design-system page reads
```

Open `docs/index.html` in a browser to see the whole system in both themes, with the measured contrast and colour-blind separation printed beside the colours. Look at it before approving a token change.

## Use it in a project

1. Copy `dist/tokens.css`, `dist/fonts.css`, `system/project/fonts/` and `system/project/components/bundle.css` into the app. Fix the font path in `fonts.css` if the folder moves. For data on the map, also copy `dist/tokens.json`, `dist/ramps.json` and `lib/color.mjs`, `lib/ramps.mjs`, `lib/classify.mjs`, `lib/maplibre.mjs`.
2. Load `fonts.css`, `tokens.css`, then `bundle.css`. Set `data-theme="light"` or `"dark"` on the root to force a theme; with neither, it follows the device.
3. Style the map from the generated config:

   ```js
   // Mapbox Standard
   import config from "./design/mapbox-standard.json";
   new mapboxgl.Map({ style: "mapbox://styles/mapbox/standard", config: { basemap: config["dark-muted"] } });

   // Protomaps + MapLibre
   import { layers } from "@protomaps/basemaps";
   import flavors from "./design/protomaps-flavors.json";
   const style = { version: 8, sources: { protomaps: { type: "vector", url: "pmtiles://..." } }, layers: layers("protomaps", flavors["light-default"], { lang: "he" }) };
   ```

4. Draw data with the layer recipes, so casing, opacity, class colours and missing values follow the brand book without anyone remembering it:

   ```js
   import tokens from "./design/tokens.json" with { type: "json" };
   import ramps from "./design/ramps.json" with { type: "json" };
   import { naturalBreaks } from "./design/classify.mjs";
   import { resample } from "./design/ramps.mjs";
   import { choroplethLayers } from "./design/maplibre.mjs";

   const theme = "dark";
   const breaks = naturalBreaks(features.map((f) => f.properties.density), 5);   // fewer distinct values give fewer breaks
   const colors = resample("seq", ramps[theme].seq.emrld.classes[7], breaks.length + 1);
   for (const layer of choroplethLayers({ id: "density", source: "districts" }, { property: "density", breaks, colors }, tokens[theme])) {
     map.addLayer(layer, firstLabelLayerId);                            // data goes under the labels
   }
   ```

   Features with no value are drawn hollow and dashed, never as the lowest class. `maplibre.mjs` also has `lineLayers`, `pointLayers`, `routeLayers`, `selectionLayers`, and `matchExpression` for categories (it refuses a seventh). Rebuild the layers when the theme changes: a map style cannot read CSS variables.

5. Add the colour lint to the project's gate (`.factory/check.sh`):

   ```bash
   node design/check-colors.mjs src
   ```

   It fails on any hex, `rgb()` or `hsl()` written by hand. A literal that must stay (a third-party brand colour) carries `cw-allow-color: <reason>` on its line.

Everything is prefixed `cw-` (custom properties, classes), so it can sit beside an app's existing styles while the app migrates.

## Change it

```bash
node design/scripts/build.mjs          # regenerate dist/, docs/ and system/project/tokens.json
node --test design/test/*.test.mjs     # run every check
```

Edit a colour by changing its `hex` in `tokens/`, then run `node design/scripts/build.mjs --fix-components` to refresh the numeric components. Commit the regenerated files with the change; the tests fail if they are stale.

## What the checks hold

- **Pairings** (`test/contrast.test.mjs`): every colour pair the system relies on, in both themes and both basemap emphases. Text 4.5:1, meaningful marks 3:1. This includes text on the translucent overlay over every basemap colour, labels on land and water, and each data colour on the map.
- **Palettes** (`test/palettes.test.mjs`): the six categories stay apart under protan, deutan and tritan simulation; success and danger do not depend on red versus green; the muted basemap is measurably less colourful. Every ramp is checked in both themes at every class count from three to seven: a sequential ramp stands further off the land at each step, so low values recede into the map whichever theme it is; a diverging ramp recedes at the midpoint and stands off at both ends; neighbouring classes and the two arms stay apart under simulation.
- **Classification** (`test/classify.test.mjs`): missing values are never counted as zeros, natural breaks match an exhaustive search on a small set, tied data never produces an empty class, and a value at a break falls in the class above, as a `step` expression puts it.
- **Layer recipes** (`test/maplibre.test.mjs`): fills carry the area opacity under an opaque outline, lines and points carry the casing, a choropleth draws features with no value hollow and dashed, and a seventh category is refused.
- **Consistency** (`test/system.test.mjs`): generated files are current, components and the specimen use only tokens that exist and no hand-written colours, `ramps.json` agrees with the tokens, the Protomaps adapter fills every key its `Flavor` type requires, and the colour-vision simulation matches a reference implementation.

The contrast checks are WCAG 2 ratios. They show that a pair is legible, not that a design is good: a new screen still needs a look.

## Measured limits

- Geyser's inner pair (steps 3 and 5) is 0.039 apart in OKLab under protan simulation, just over the 0.035 the checks require. Where a reader must tell "just below" from "just above" the midpoint, use Earth (0.056), or the dark theme's ramps (0.087 and 0.111), which were drawn with that pair in mind.
- The "other" grey is 0.010 from a teal ramp step under protan simulation in the dark theme. Grey cannot mark missing data in a classed map; the recipes use a hollow, dashed form instead.
- Layers and expressions from `maplibre.mjs` were validated once against `@maplibre/maplibre-gl-style-spec` 26.11.0 (0 errors, both themes). That package is not a dependency, so the validation does not run in CI.
- No check here renders a real map. The Mapbox Standard adapter sets land, water, greenspace, land-use and road colours; labels, boundaries, buildings and rail keep Mapbox's own colours, so the label contrast checks describe the tokens, not what Mapbox draws.

## Not here yet

- A complete basemap style with zoom-dependent line widths and a label hierarchy. The flavor is fourteen colours; the Protomaps and Mapbox styles it is applied to bring their own widths, zoom rules and type.
- An icon set. Icons are drawn inline per the brand book.
- More palettes: a third sequential ramp, a cyclic ramp for aspect and direction, hypsometric tints, a bivariate grid, a land-cover legend.
- Hillshade and raster styling beyond the continuous stops in `ramps.json`.
- A Tailwind preset. Reference the custom properties from the app's Tailwind config.
- Screenshots in the factory's pull requests, which is how a reviewer would see a map.
- A published package. `package.json` is marked private until the repository has a licence.
