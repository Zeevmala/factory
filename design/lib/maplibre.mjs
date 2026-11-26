/**
 * The brand book's data-layer rules as MapLibre GL / Mapbox GL style objects:
 * colour expressions for classes, categories and continuous values, and the
 * layer pairs that give every mark its casing. Pure functions, no file access:
 * safe to import in a browser.
 *
 * `tokens` is one theme of `dist/tokens.json`, for example
 * `(await import("./dist/tokens.json", { with: { type: "json" } })).default.dark`.
 * Rebuild the layers when the theme changes; a style cannot read CSS variables.
 *
 * Coordinates are not touched here. Sources are GeoJSON or vector tiles, so
 * positions are longitude, latitude in EPSG:4326, as those formats require.
 *
 * @typedef {Record<string, string>} ThemeTokens token name without the leading dashes -> CSS value
 * @typedef {unknown[]} Expression a MapLibre style expression
 * @typedef {Record<string, unknown>} Layer a MapLibre style layer
 * @typedef {{ id: string, source: string, sourceLayer?: string, filter?: Expression }} LayerTarget
 */

/** The categorical palette has six colours; a seventh category is drawn as "other". */
export const MAX_CATEGORIES = 6;

/**
 * A token's value, or an error that names the token.
 * @param {ThemeTokens} tokens
 * @param {string} name token name without the leading dashes, e.g. `cw-data-casing`
 * @returns {string}
 */
function token(tokens, name) {
  const value = tokens[name];
  if (typeof value !== "string") throw new Error(`Unknown token --${name}. Pass one theme of dist/tokens.json.`);
  return value;
}

/**
 * A pixel or unitless token as a number.
 * @param {ThemeTokens} tokens
 * @param {string} name
 * @returns {number}
 */
function number(tokens, name) {
  const value = Number.parseFloat(token(tokens, name));
  if (!Number.isFinite(value)) throw new Error(`Token --${name} is not a number: ${tokens[name]}`);
  return value;
}

/**
 * The categorical colours of a theme, in the order they are assigned.
 * @param {ThemeTokens} tokens
 * @returns {string[]}
 */
export function categoryColors(tokens) {
  return Array.from({ length: MAX_CATEGORIES }, (_, i) => token(tokens, `cw-data-cat-${i + 1}`));
}

/**
 * Colour by class, for points and lines. Features whose property is missing or
 * not a number get the "other" colour; a missing value is never drawn as the
 * lowest class. For polygons use `choroplethLayers`, which draws missing
 * features hollow instead of grey.
 * @param {string} property feature property holding the number
 * @param {number[]} breaks interior breaks, ascending (from classify.mjs)
 * @param {string[]} colors one more colour than breaks, low to high (from dist/ramps.json)
 * @param {string} other colour for missing values: the theme's `cw-data-cat-other`
 * @returns {Expression}
 */
export function stepExpression(property, breaks, colors, other) {
  if (colors.length !== breaks.length + 1) throw new Error(`${breaks.length} breaks need ${breaks.length + 1} colours, got ${colors.length}`);
  for (let i = 0; i < breaks.length; i += 1) {
    if (!Number.isFinite(breaks[i]) || (i > 0 && breaks[i] <= breaks[i - 1])) throw new Error(`Breaks must be finite and strictly ascending: ${breaks.join(", ")}`);
  }
  const value = ["get", property];
  const classed = breaks.length === 0 ? colors[0] : ["step", value, colors[0], ...breaks.flatMap((b, i) => [b, colors[i + 1]])];
  return ["case", ["==", ["typeof", value], "number"], classed, other];
}

/**
 * Colour by category. At most six categories; every other value, and a missing
 * one, gets the "other" colour.
 * @param {string} property feature property holding the category
 * @param {(string | number)[]} categories values in the order colours are assigned
 * @param {string[]} colors the theme's categorical colours (`categoryColors`)
 * @param {string} other the theme's `cw-data-cat-other`
 * @returns {Expression}
 */
export function matchExpression(property, categories, colors, other) {
  if (categories.length === 0) throw new Error("No categories");
  if (categories.length > MAX_CATEGORIES) {
    throw new Error(`${categories.length} categories: the palette has ${MAX_CATEGORIES}. Keep the ${MAX_CATEGORIES - 1} largest and group the rest as "other".`);
  }
  if (new Set(categories).size !== categories.length) throw new Error(`Repeated category: ${categories.join(", ")}`);
  if (colors.length < categories.length) throw new Error(`${categories.length} categories need as many colours, got ${colors.length}`);
  return ["match", ["get", property], ...categories.flatMap((category, i) => [category, colors[i]]), other];
}

/**
 * Colour by a continuous value, for rasters, heatmaps and dense points where
 * classes would band. Interpolates in CIELAB so the ramp stays even between
 * stops. Missing values get the "other" colour.
 * @param {string} property feature property holding the number
 * @param {number} min value drawn in the first colour
 * @param {number} max value drawn in the last colour
 * @param {[number, string][]} stops positions in 0..1 with their colours (from dist/ramps.json)
 * @param {string} other the theme's `cw-data-cat-other`
 * @returns {Expression}
 */
export function interpolateExpression(property, min, max, stops, other) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) throw new Error(`Need min < max, got ${min} and ${max}`);
  if (stops.length < 2) throw new Error("Need at least 2 stops");
  const value = ["get", property];
  const ramp = ["interpolate-lab", ["linear"], value, ...stops.flatMap(([position, color]) => [min + (max - min) * position, color])];
  return ["case", ["==", ["typeof", value], "number"], ramp, other];
}

/**
 * Fields shared by every layer of a target.
 * @param {LayerTarget} target
 * @param {string} suffix appended to the id
 * @returns {Layer}
 */
function base(target, suffix) {
  /** @type {Layer} */
  const layer = { id: `${target.id}${suffix}`, source: target.source };
  if (target.sourceLayer) layer["source-layer"] = target.sourceLayer;
  if (target.filter) layer.filter = target.filter;
  return layer;
}

/**
 * Data polygons: a translucent fill so the basemap reads through, under an
 * opaque outline in the same colour. Returned bottom to top; add them below
 * the basemap's labels.
 * @param {LayerTarget} target
 * @param {string | Expression} color a colour or one of the expressions above
 * @param {ThemeTokens} tokens
 * @returns {Layer[]}
 */
export function areaLayers(target, color, tokens) {
  return [
    { ...base(target, "-fill"), type: "fill", paint: { "fill-color": color, "fill-opacity": number(tokens, "cw-opacity-fill-area") } },
    {
      ...base(target, "-outline"),
      type: "line",
      layout: { "line-join": "round" },
      paint: { "line-color": color, "line-width": number(tokens, "cw-stroke-area-outline") },
    },
  ];
}

/**
 * A choropleth, complete: classed polygons, and features with no value drawn
 * hollow with a dashed outline. Returned bottom to top; add them below the
 * basemap's labels.
 *
 * Missing data gets a different form, not a different colour. A grey fill is
 * the same colour as the teal and green steps of a ramp to a red-green
 * colour-blind reader (0.01 apart in OKLab under simulation), so grey alone
 * would read as a class.
 * @param {LayerTarget} target
 * @param {{ property: string, breaks: number[], colors: string[] }} classes property holding the number, interior
 *   breaks ascending (from classify.mjs) and one more colour than breaks (from dist/ramps.json)
 * @param {ThemeTokens} tokens
 * @returns {Layer[]} fill, outline, then the outline of features with no value
 */
export function choroplethLayers(target, classes, tokens) {
  const hasValue = ["==", ["typeof", ["get", classes.property]], "number"];
  const within = (/** @type {Expression} */ test) => (target.filter ? ["all", target.filter, test] : test);
  const color = /** @type {Expression} */ (stepExpression(classes.property, classes.breaks, classes.colors, token(tokens, "cw-data-cat-other"))[2]);
  return [
    ...areaLayers({ ...target, filter: within(hasValue) }, color, tokens),
    {
      ...base({ ...target, filter: within(["!", hasValue]) }, "-missing"),
      type: "line",
      layout: { "line-join": "round" },
      paint: { "line-color": token(tokens, "cw-data-cat-other"), "line-width": number(tokens, "cw-stroke-area-outline"), "line-dasharray": [2, 2] },
    },
  ];
}

/**
 * Data lines: the line over a wider casing, so it separates from whatever
 * basemap colour lies beneath. Returned bottom to top.
 * @param {LayerTarget} target
 * @param {string | Expression} color
 * @param {ThemeTokens} tokens
 * @param {number} [width] line width in pixels; the casing is added on both sides
 * @returns {Layer[]}
 */
export function lineLayers(target, color, tokens, width = 2) {
  const layout = { "line-cap": "round", "line-join": "round" };
  return [
    { ...base(target, "-casing"), type: "line", layout, paint: { "line-color": token(tokens, "cw-data-casing"), "line-width": width + 2 * number(tokens, "cw-stroke-casing") } },
    { ...base(target, "-line"), type: "line", layout, paint: { "line-color": color, "line-width": width } },
  ];
}

/**
 * Data points as dots: a filled circle with the casing as its stroke.
 * For people and places with a letter, use the `cw-marker` component instead.
 * @param {LayerTarget} target
 * @param {string | Expression} color
 * @param {ThemeTokens} tokens
 * @returns {Layer[]}
 */
export function pointLayers(target, color, tokens) {
  return [
    {
      ...base(target, "-point"),
      type: "circle",
      paint: {
        "circle-color": color,
        "circle-radius": number(tokens, "cw-size-marker-dot") / 2,
        "circle-stroke-color": token(tokens, "cw-data-casing"),
        "circle-stroke-width": number(tokens, "cw-stroke-casing"),
      },
    },
  ];
}

/**
 * A route: the route line over its casing, at the widths the system defines.
 * @param {LayerTarget} target
 * @param {ThemeTokens} tokens
 * @returns {Layer[]}
 */
export function routeLayers(target, tokens) {
  const layout = { "line-cap": "round", "line-join": "round" };
  return [
    { ...base(target, "-casing"), type: "line", layout, paint: { "line-color": token(tokens, "cw-data-route-casing"), "line-width": number(tokens, "cw-stroke-route-casing") } },
    { ...base(target, "-line"), type: "line", layout, paint: { "line-color": token(tokens, "cw-data-route"), "line-width": number(tokens, "cw-stroke-route") } },
  ];
}

/**
 * The selection outline. Works on polygons and lines; add it above the
 * basemap's labels, and filter it to the one selected feature.
 * @param {LayerTarget} target give it a `filter` that matches the selected feature
 * @param {ThemeTokens} tokens
 * @returns {Layer[]}
 */
export function selectionLayers(target, tokens) {
  return [
    {
      ...base(target, "-selection"),
      type: "line",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": token(tokens, "cw-data-selection"), "line-width": number(tokens, "cw-stroke-selection") },
    },
  ];
}
