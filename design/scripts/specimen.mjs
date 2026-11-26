/**
 * Builds the specimen page: one static HTML file that shows the whole system in
 * both themes, with the numbers the tests check printed beside the colours.
 * It is the page a person looks at before approving a token change, because
 * a passing contrast ratio does not show that a map looks right.
 *
 * Every figure on the page is computed here from the tokens with the same
 * functions the tests use, so the page cannot disagree with the checks.
 */

import { DEFICIENCIES, contrast, over, simulate, worstCaseDeltaE } from "../lib/color.mjs";
import { classOf, naturalBreaks, numeric } from "../lib/classify.mjs";
import { CLASS_COUNTS, RAMPS, resample } from "../lib/ramps.mjs";
import { THEMES, alphaOf, hexOf } from "../lib/tokens.mjs";

/** @typedef {import("../lib/tokens.mjs").TokenMap} TokenMap */

const STEPS = [1, 2, 3, 4, 5, 6, 7];
const CATEGORIES = [1, 2, 3, 4, 5, 6];
/** @type {Record<import("../lib/color.mjs").Deficiency, string>} */
const VISION_NAMES = { protan: "Protanopia", deutan: "Deuteranopia", tritan: "Tritanopia" };

/**
 * Escape text for HTML.
 * @param {string | number} text
 * @returns {string}
 */
const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The seven anchors of a ramp in one theme, low to high.
 * @param {TokenMap} tokens
 * @param {string} kind `seq` or `div`
 * @param {string} name
 * @returns {string[]}
 */
export function rampOf(tokens, kind, name) {
  return STEPS.map((n) => hexOf(tokens, `data.${kind}.${name}.${n}`));
}

/**
 * Sample districts for the choropleth demo: a grid over the land of the sample
 * basemap (480 x 300 units), each with a value. Deterministic.
 * @returns {{ x: number, y: number, size: number, seq: number | null, div: number }[]}
 */
function districts() {
  const cells = [];
  const size = 46;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const x = 172 + col * (size + 4);
      const y = 22 + row * (size + 6);
      // A skewed surface peaking in the north-east, as counts and densities usually are.
      const d = Math.hypot(col - 4.5, row - 1.5);
      const seq = Math.round(900 * Math.exp(-d * 0.75) + 12 * ((col * 7 + row * 3) % 5));
      // A signed gradient from south-west (loss) to north-east (gain).
      const div = Math.round(((col - 2.5) * 0.42 - (row - 2) * 0.36 + (((col * 5 + row * 11) % 4) - 1.5) * 0.08) * 100) / 100;
      // One district has no data, to show that missing is not zero.
      cells.push({ x, y, size, seq: col === 1 && row === 3 ? null : seq, div });
    }
  }
  return cells;
}

/**
 * An SVG overlay in the sample basemap's coordinate space, drawn with the area rule:
 * translucent fill, opaque outline in the same colour.
 * A cell with no colour has no data: it is drawn hollow with a dashed outline.
 * @param {{ x: number, y: number, size: number, color: string | null }[]} cells
 * @returns {string}
 */
function overlay(cells) {
  const rects = cells
    .map((c) => {
      const style =
        c.color === null
          ? "fill:none;stroke:var(--cw-data-cat-other);stroke-width:var(--cw-stroke-area-outline);stroke-dasharray:3 3"
          : `fill:${c.color};fill-opacity:var(--cw-opacity-fill-area);stroke:${c.color};stroke-width:var(--cw-stroke-area-outline)`;
      return `<rect x="${c.x}" y="${c.y}" width="${c.size}" height="${c.size}" rx="3" style="${style}"/>`;
    })
    .join("");
  return `<svg class="overlay" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${rects}</svg>`;
}

/**
 * A legend with a classed ramp and its break values.
 * @param {string} title
 * @param {string[]} colors
 * @param {string[]} ticks
 * @param {string} [other] label for the missing-data swatch
 * @returns {string}
 */
function rampLegend(title, colors, ticks, other) {
  const missing = other
    ? `<ul class="cw-legend__list"><li class="cw-legend__item"><span class="cw-legend__swatch cw-legend__swatch--missing"></span>${esc(other)}</li></ul>`
    : "";
  return `<div class="cw-legend legend">
      <p class="cw-legend__title">${esc(title)}</p>
      <div class="cw-legend__ramp">${colors.map((c) => `<span style="background:${c}"></span>`).join("")}</div>
      <div class="cw-legend__scale">${ticks.map((t) => `<span><bdi>${esc(t)}</bdi></span>`).join("")}</div>
      ${missing}
    </div>`;
}

/**
 * The two choropleth demos for one theme.
 * @param {TokenMap} tokens
 * @returns {string}
 */
function choropleths(tokens) {
  const cells = districts();
  const seqColors = resample("seq", rampOf(tokens, "seq", "emrld"), 5);
  const seqValues = numeric(cells.map((c) => c.seq));
  const seqBreaks = naturalBreaks(seqValues, 5);
  const seqCells = cells.map((c) => ({ ...c, color: c.seq === null ? null : seqColors[classOf(c.seq, seqBreaks)] }));

  const divColors = rampOf(tokens, "div", "earth");
  const divBreaks = [-1.25, -0.75, -0.25, 0.25, 0.75, 1.25];
  const divCells = cells.map((c) => ({ ...c, color: divColors[classOf(c.div, divBreaks)] }));

  const map = (/** @type {string} */ content, /** @type {string} */ caption) =>
    `<figure class="map-figure"><div class="cw-map cw-map--muted demo-map" data-minimap="muted">${content}</div><figcaption class="cw-small">${caption}</figcaption></figure>`;
  return `<div class="pair">
    ${map(
      overlay(seqCells) + rampLegend("Visits per km²", seqColors, [seqValues[0], ...seqBreaks, seqValues.at(-1)].map(String), "No data"),
      "Sequential, five classes, natural breaks. The lowest class sits closest to the basemap. The district with no data is hollow and dashed: a different form, because grey reads as a class to colour-blind readers.",
    )}
    ${map(
      overlay(divCells) + rampLegend("Shoreline change, m per year", divColors, ["−1.5", "0", "+1.5"]),
      "Diverging, seven classes around zero. The midpoint recedes; loss and gain are equally loud.",
    )}
  </div>`;
}

/**
 * The categorical palette as seen with normal vision and under each simulated deficiency.
 * @param {TokenMap} tokens
 * @returns {string}
 */
function categories(tokens) {
  const colors = CATEGORIES.map((n) => hexOf(tokens, `data.cat.${n}`));
  const other = hexOf(tokens, "data.cat.other");
  let closest = { value: Infinity, vision: "normal", a: 0, b: 0 };
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const worst = worstCaseDeltaE(colors[i], colors[j]);
      if (worst.value < closest.value) closest = { ...worst, a: i + 1, b: j + 1 };
    }
  }
  const row = (/** @type {string} */ label, /** @type {(hex: string) => string} */ view) =>
    `<tr><th scope="row" class="cw-label">${label}</th>${[...colors, other].map((c) => `<td><span class="dot" style="background:${view(c)}"></span></td>`).join("")}</tr>`;
  return `<div class="scroll"><table class="swatches">
      <thead><tr><td></td>${CATEGORIES.map((n) => `<th scope="col" class="cw-data">${n}</th>`).join("")}<th scope="col" class="cw-label">other</th></tr></thead>
      <tbody>
        ${row("Normal vision", (c) => c)}
        ${DEFICIENCIES.map((d) => row(`${VISION_NAMES[d]}, simulated`, (c) => simulate(c, d))).join("\n        ")}
      </tbody>
    </table></div>
    <p class="cw-small note">Closest pair: ${closest.a} and ${closest.b}, <span class="cw-data">${closest.value.toFixed(3)}</span> apart in OKLab under ${closest.vision} vision. The check requires 0.080.</p>`;
}

/**
 * Every ramp of one theme at every class count.
 * @param {TokenMap} tokens
 * @returns {string}
 */
function ramps(tokens) {
  const blocks = [];
  for (const [kind, names] of Object.entries(RAMPS)) {
    for (const name of names) {
      const anchors = rampOf(tokens, kind, name);
      const rows = [...CLASS_COUNTS]
        .reverse()
        .map(
          (n) =>
            `<div class="ramp-row"><span class="cw-data">${n}</span><div class="ramp">${resample(kind, anchors, n)
              .map((c) => `<span style="background:${c}"></span>`)
              .join("")}</div></div>`,
        )
        .join("");
      blocks.push(
        `<div class="ramp-block"><p class="cw-label">${kind === "seq" ? "Sequential" : "Diverging"} · ${esc(name)}</p>${rows}<p class="cw-small note">${kind === "seq" ? "low → high" : "below ← midpoint → above"}</p></div>`,
      );
    }
  }
  return `<div class="ramps">${blocks.join("")}</div>`;
}

/**
 * The pairings a person most often asks about, with their measured ratios.
 * @param {TokenMap} tokens
 * @returns {string}
 */
function pairings(tokens) {
  const hex = (/** @type {string} */ key) => hexOf(tokens, key);
  const overlayOn = (/** @type {string} */ ground) => over(hex("color.overlay"), alphaOf(tokens, "color.overlay"), ground);
  /** @type {[string, string, string, number][]} */
  const rows = [
    ["Text on the page", hex("color.text.default"), hex("color.surface.0"), 4.5],
    ["Muted text on a card", hex("color.text.muted"), hex("color.surface.1"), 4.5],
    ["Text on a control over water", hex("color.text.default"), overlayOn(hex("map.default.water")), 4.5],
    ["Text on a control over a motorway", hex("color.text.default"), overlayOn(hex("map.default.road-motorway")), 4.5],
    ["Place label on land", hex("map.default.label"), hex("map.default.land"), 4.5],
    ["Place label on land, muted map", hex("map.muted.label"), hex("map.muted.land"), 4.5],
    ["Water label on water", hex("map.default.label-water"), hex("map.default.water"), 4.5],
    ["Route on land, muted map", hex("data.route"), hex("map.muted.land"), 3],
    ["Selection on greenspace", hex("data.selection"), hex("map.default.greenspace"), 3],
    ...CATEGORIES.map((n) => /** @type {[string, string, string, number]} */ ([`Category ${n} on land, muted map`, hex(`data.cat.${n}`), hex("map.muted.land"), 3])),
  ];
  const body = rows
    .map(([label, fg, bg, min]) => {
      const ratio = contrast(fg, bg);
      return `<tr><td><span class="chip" style="background:${bg};color:${fg}">Aa</span></td><td>${esc(label)}</td><td class="cw-data">${ratio.toFixed(2)}:1</td><td class="cw-data">${min}:1</td><td>${ratio >= min ? "passes" : "fails"}</td></tr>`;
    })
    .join("\n        ");
  return `<div class="scroll"><table class="pairings">
      <thead><tr><th></th><th scope="col">Pairing</th><th scope="col">Measured</th><th scope="col">Needs</th><th scope="col">Result</th></tr></thead>
      <tbody>
        ${body}
      </tbody>
    </table></div>`;
}

/**
 * One theme's band of the page.
 * @param {string} theme
 * @param {TokenMap} tokens
 * @returns {string}
 */
function band(theme, tokens) {
  return `<section class="band" data-theme="${theme}" aria-labelledby="h-${theme}">
  <div class="wrap">
    <h2 class="cw-title-1" id="h-${theme}">${theme[0].toUpperCase()}${theme.slice(1)} theme</h2>

    <h3 class="cw-overline">Basemap</h3>
    <div class="pair">
      <figure class="map-figure"><div class="cw-map demo-map" data-minimap="default"></div><figcaption class="cw-small">Default emphasis. The map is the content.</figcaption></figure>
      <figure class="map-figure"><div class="cw-map cw-map--muted demo-map" data-minimap="muted" data-labels></div><figcaption class="cw-small">Muted emphasis. Data, routes or many markers go on top.</figcaption></figure>
    </div>

    <h3 class="cw-overline">Data on the map</h3>
    ${choropleths(tokens)}

    <h3 class="cw-overline">Categories</h3>
    ${categories(tokens)}

    <h3 class="cw-overline">Ramps, three to seven classes</h3>
    ${ramps(tokens)}

    <h3 class="cw-overline">Measured pairings</h3>
    ${pairings(tokens)}
  </div>
</section>`;
}

/**
 * The specimen page.
 * @param {Record<string, TokenMap>} themes tokens per theme
 * @param {string} banner the generated-file notice
 * @returns {string}
 */
export function specimen(themes, banner) {
  return `<!doctype html>
<!-- ${banner} -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cartowolf specimen</title>
<meta name="description" content="Cartowolf: tokens, basemap flavors and data colour for map applications, shown in both themes with the measured contrast and colour-blind separation of every pairing.">
<link rel="stylesheet" href="../dist/fonts.css">
<link rel="stylesheet" href="../dist/tokens.css">
<link rel="stylesheet" href="../system/project/components/bundle.css">
<style>
  body { margin: 0; background: var(--cw-surface-0); color: var(--cw-text); font-family: var(--cw-font-sans); }
  .wrap { max-inline-size: 1080px; margin-inline: auto; padding-block: var(--cw-space-6); padding-inline: var(--cw-space-4); }
  .intro p { max-inline-size: 65ch; margin-block: var(--cw-space-3) 0; color: var(--cw-text-muted); }
  .intro h1 { margin: 0; }
  .band { background: var(--cw-surface-0); color: var(--cw-text); border-block-start: var(--cw-stroke-hairline) solid var(--cw-border); }
  .band h2 { margin: 0; }
  .band h3 { margin-block: var(--cw-space-6) var(--cw-space-3); color: var(--cw-text-muted); }
  .pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--cw-space-4); }
  .map-figure { margin: 0; min-inline-size: 0; }
  .map-figure figcaption { margin-block-start: var(--cw-space-2); color: var(--cw-text-muted); }
  .demo-map { block-size: 300px; }
  .overlay { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; display: block; }
  .legend { position: absolute; inset-block-end: var(--cw-space-3); inset-inline-start: var(--cw-space-3); inline-size: 212px; min-inline-size: 0; padding: var(--cw-space-2); }
  .legend .cw-legend__scale { font-size: 11px; }
  .scroll { overflow-x: auto; }
  .swatches, .pairings { border-collapse: collapse; }
  .swatches th, .swatches td { padding: var(--cw-space-1) var(--cw-space-3); text-align: center; }
  .swatches th[scope="row"] { text-align: start; padding-inline-start: 0; font-weight: var(--cw-font-weight-medium); }
  .dot { display: inline-block; inline-size: 22px; block-size: 22px; border-radius: var(--cw-radius-pill); box-shadow: 0 0 0 var(--cw-stroke-casing) var(--cw-data-casing), var(--cw-shadow-1); vertical-align: middle; }
  .note { margin-block: var(--cw-space-2) 0; color: var(--cw-text-muted); }
  .ramps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--cw-space-5); }
  .ramp-block p { margin-block: 0 var(--cw-space-2); }
  .ramp-row { display: flex; align-items: center; gap: var(--cw-space-2); margin-block-end: var(--cw-space-1); color: var(--cw-text-muted); }
  .ramp { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; flex: 1; block-size: 18px; overflow: hidden; border-radius: var(--cw-radius-sm); background: var(--cw-map-muted-land); }
  .pairings { inline-size: 100%; max-inline-size: 720px; font-size: 15px; }
  .pairings th, .pairings td { padding: var(--cw-space-1) var(--cw-space-2); text-align: start; border-block-end: var(--cw-stroke-hairline) solid var(--cw-border); }
  .pairings th { color: var(--cw-text-muted); font-weight: var(--cw-font-weight-medium); }
  .chip { display: inline-grid; place-items: center; inline-size: 36px; block-size: 24px; border-radius: var(--cw-radius-sm); font-weight: var(--cw-font-weight-semibold); font-size: 13px; }
</style>
</head>
<body>
<header class="wrap intro">
  <h1 class="cw-display">Cartowolf</h1>
  <p class="cw-body">One system for map applications: an interface layer, a basemap layer and a data layer, checked against each other. Every colour below is a token; every number is measured from the tokens by the same code the tests run.</p>
</header>
${THEMES.map((theme) => band(theme, themes[theme])).join("\n")}
<script src="../system/project/components/bundle.js"></script>
<script>
  document.querySelectorAll("[data-minimap]").forEach(function (node) {
    var labels = node.dataset.minimap === "default" || node.hasAttribute("data-labels");
    Cartowolf.miniMap(node, { emphasis: node.dataset.minimap, labels: labels && !node.querySelector(".overlay") });
  });
</script>
</body>
</html>
`;
}
