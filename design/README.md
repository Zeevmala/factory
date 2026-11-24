# Cartowolf design system

One visual and cartographic system for every map app the factory builds: interface tokens, basemap flavors, data palettes, and the checks that keep them legible together.

The rules for using it are in [`system/project/README.md`](system/project/README.md). That file is the brand book: unattended runs and reviewers read it, and the design-system page in Claude shows it. This file is for people changing the system.

## Layout

```
tokens/     source of truth, W3C Design Tokens format (2025.10)
  core.tokens.json          raw scales: colour ramps, spacing, radius, type, data ramps
  theme.light.tokens.json   semantic colours, basemap flavor, categorical palette
  theme.dark.tokens.json    the same keys for dark
lib/        colour maths, token loader, map adapters (no dependencies)
scripts/    build.mjs, check-colors.mjs
test/       the checks
dist/       generated: what apps consume
system/     generated tokens + hand-written brand book, components and fonts,
            in the layout the Claude design-system page reads
```

## Use it in a project

1. Copy `dist/tokens.css`, `dist/fonts.css`, `system/project/fonts/` and `system/project/components/bundle.css` into the app. Fix the font path in `fonts.css` if the folder moves.
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

4. Add the colour lint to the project's gate (`.factory/check.sh`):

   ```bash
   node design/check-colors.mjs src
   ```

   It fails on any hex, `rgb()` or `hsl()` written by hand. A literal that must stay (a third-party brand colour) carries `cw-allow-color: <reason>` on its line.

Everything is prefixed `cw-` (custom properties, classes), so it can sit beside an app's existing styles while the app migrates.

## Change it

```bash
node design/scripts/build.mjs          # regenerate dist/ and system/project/tokens.json
node --test design/test/*.test.mjs     # run every check
```

Edit a colour by changing its `hex` in `tokens/`, then run `node design/scripts/build.mjs --fix-components` to refresh the numeric components. Commit the regenerated files with the change; the tests fail if they are stale.

## What the checks hold

- **Pairings** (`test/contrast.test.mjs`): every colour pair the system relies on, in both themes and both basemap emphases. Text 4.5:1, meaningful marks 3:1. This includes text on the translucent overlay over every basemap colour, labels on land and water, and each data colour on the map.
- **Palettes** (`test/palettes.test.mjs`): the six categories stay apart under protan, deutan and tritan simulation; success and danger do not depend on red versus green; ramps run in one direction; the muted basemap is measurably less colourful.
- **Consistency** (`test/system.test.mjs`): generated files are current, components use only tokens that exist and no hand-written colours, the Protomaps adapter fills every key its `Flavor` type requires, and the colour-vision simulation matches a reference implementation.

The contrast checks are WCAG 2 ratios. They show that a pair is legible, not that a design is good: a new screen still needs a look.

## Not here yet

- An icon set. Icons are drawn inline per the brand book.
- Continuous ramps for rasters. The ramps are seven-class.
- A Tailwind preset. Reference the custom properties from the app's Tailwind config.
- Screenshots in the factory's pull requests, which is how a reviewer would see a map.
