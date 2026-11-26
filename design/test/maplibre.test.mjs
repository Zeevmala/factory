/**
 * Checks on the data-layer recipes: the expressions draw missing data as
 * "other", refuse input the brand book forbids, and the layers carry the
 * casing, opacity and widths the tokens define, in both themes.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { MAX_CATEGORIES, areaLayers, categoryColors, choroplethLayers, interpolateExpression, lineLayers, matchExpression, pointLayers, routeLayers, selectionLayers, stepExpression } from "../lib/maplibre.mjs";
import { DESIGN_ROOT, THEMES } from "../lib/tokens.mjs";

const dist = (/** @type {string} */ name) => JSON.parse(fs.readFileSync(path.join(DESIGN_ROOT, "dist", name), "utf8"));
const TOKENS = dist("tokens.json");
const RAMPS = dist("ramps.json");
const TARGET = { id: "districts", source: "districts" };

test("stepExpression classes numbers and sends everything else to the other colour", () => {
  const colors = RAMPS.light.seq.emrld.classes[3];
  const other = RAMPS.light.cat.other;
  assert.deepEqual(stepExpression("density", [10, 50], colors, other), [
    "case",
    ["==", ["typeof", ["get", "density"]], "number"],
    ["step", ["get", "density"], colors[0], 10, colors[1], 50, colors[2]],
    other,
  ]);
  assert.deepEqual(stepExpression("density", [], [colors[0]], other)[2], colors[0], "no breaks: one class");
});

test("stepExpression refuses breaks and colours that do not fit", () => {
  assert.throws(() => stepExpression("v", [1, 2], ["#000000", "#111111"], "#888888"), /2 breaks need 3 colours/);
  assert.throws(() => stepExpression("v", [2, 1], ["#000000", "#111111", "#222222"], "#888888"), /strictly ascending/);
  assert.throws(() => stepExpression("v", [1, 1], ["#000000", "#111111", "#222222"], "#888888"), /strictly ascending/);
  assert.throws(() => stepExpression("v", [NaN], ["#000000", "#111111"], "#888888"), /finite/);
});

test("matchExpression assigns colours in order and stops at six categories", () => {
  for (const theme of THEMES) {
    const colors = categoryColors(TOKENS[theme]);
    assert.deepEqual(colors, RAMPS[theme].cat.colors);
    const other = TOKENS[theme]["cw-data-cat-other"];
    assert.deepEqual(matchExpression("use", ["residential", "commercial"], colors, other), ["match", ["get", "use"], "residential", colors[0], "commercial", colors[1], other]);
  }
  const colors = categoryColors(TOKENS.light);
  assert.equal(MAX_CATEGORIES, 6);
  assert.throws(() => matchExpression("use", ["a", "b", "c", "d", "e", "f", "g"], colors, "#888888"), /7 categories: the palette has 6/);
  assert.throws(() => matchExpression("use", ["a", "a"], colors, "#888888"), /Repeated category/);
  assert.throws(() => matchExpression("use", [], colors, "#888888"), /No categories/);
});

test("interpolateExpression maps the stops onto the value range", () => {
  const stops = RAMPS.dark.seq.hydro.stops;
  const expression = interpolateExpression("ndvi", -1, 1, stops, "#888888");
  const ramp = /** @type {unknown[]} */ (expression[2]);
  assert.deepEqual(ramp.slice(0, 3), ["interpolate-lab", ["linear"], ["get", "ndvi"]]);
  assert.equal(ramp[3], -1);
  assert.equal(ramp[4], stops[0][1]);
  assert.equal(ramp.at(-2), 1);
  assert.equal(ramp.at(-1), stops.at(-1)[1]);
  assert.throws(() => interpolateExpression("ndvi", 1, 1, stops, "#888888"), /min < max/);
});

for (const theme of THEMES) {
  const tokens = TOKENS[theme];

  test(`${theme}: area layers are a translucent fill under an opaque outline in the same colour`, () => {
    const color = stepExpression("density", [10], RAMPS[theme].seq.hydro.classes[3].slice(0, 2), tokens["cw-data-cat-other"]);
    const [fill, outline] = areaLayers({ ...TARGET, sourceLayer: "admin", filter: ["==", ["get", "level"], 2] }, color, tokens);
    assert.equal(fill.id, "districts-fill");
    assert.equal(fill.type, "fill");
    assert.equal(fill["source-layer"], "admin");
    assert.deepEqual(fill.filter, ["==", ["get", "level"], 2]);
    assert.deepEqual(fill.paint, { "fill-color": color, "fill-opacity": 0.35 });
    assert.equal(outline.type, "line");
    assert.deepEqual(outline.paint, { "line-color": color, "line-width": 1.5 });
  });

  test(`${theme}: a choropleth draws features with no value hollow and dashed, never as a class`, () => {
    const colors = RAMPS[theme].seq.emrld.classes[3];
    const hasValue = ["==", ["typeof", ["get", "density"]], "number"];
    const [fill, outline, missing] = choroplethLayers(TARGET, { property: "density", breaks: [10, 50], colors }, tokens);
    const step = ["step", ["get", "density"], colors[0], 10, colors[1], 50, colors[2]];
    assert.deepEqual(fill.filter, hasValue);
    assert.deepEqual(fill.paint, { "fill-color": step, "fill-opacity": 0.35 });
    assert.deepEqual(outline.paint, { "line-color": step, "line-width": 1.5 });
    assert.equal(missing.id, "districts-missing");
    assert.equal(missing.type, "line");
    assert.deepEqual(missing.filter, ["!", hasValue]);
    assert.deepEqual(missing.paint, { "line-color": tokens["cw-data-cat-other"], "line-width": 1.5, "line-dasharray": [2, 2] });

    const scoped = choroplethLayers({ ...TARGET, filter: ["==", ["get", "level"], 2] }, { property: "density", breaks: [10, 50], colors }, tokens);
    assert.deepEqual(scoped[0].filter, ["all", ["==", ["get", "level"], 2], hasValue]);
    assert.deepEqual(scoped[2].filter, ["all", ["==", ["get", "level"], 2], ["!", hasValue]]);
  });

  test(`${theme}: lines, points and routes carry the casing the tokens define`, () => {
    const [casing, line] = lineLayers(TARGET, tokens["cw-data-cat-1"], tokens, 3);
    assert.deepEqual(casing.paint, { "line-color": tokens["cw-data-casing"], "line-width": 7 });
    assert.deepEqual(line.paint, { "line-color": tokens["cw-data-cat-1"], "line-width": 3 });

    const [point] = pointLayers(TARGET, tokens["cw-data-cat-2"], tokens);
    assert.deepEqual(point.paint, { "circle-color": tokens["cw-data-cat-2"], "circle-radius": 7, "circle-stroke-color": tokens["cw-data-casing"], "circle-stroke-width": 2 });

    const [routeCasing, route] = routeLayers(TARGET, tokens);
    assert.deepEqual(routeCasing.paint, { "line-color": tokens["cw-data-route-casing"], "line-width": 7 });
    assert.deepEqual(route.paint, { "line-color": tokens["cw-data-route"], "line-width": 4 });

    const [selection] = selectionLayers({ ...TARGET, filter: ["==", ["id"], 7] }, tokens);
    assert.deepEqual(selection.paint, { "line-color": tokens["cw-data-selection"], "line-width": 3 });
    assert.equal(selection.id, "districts-selection");
  });
}

test("the recipes name the token that is missing", () => {
  assert.throws(() => areaLayers(TARGET, "#000000", {}), /Unknown token --cw-opacity-fill-area/);
  assert.throws(() => pointLayers(TARGET, "#000000", { "cw-size-marker-dot": "wide" }), /not a number/);
});
