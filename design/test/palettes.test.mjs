/**
 * Checks on the palettes as sets: categories stay apart for colour-blind readers,
 * ramps run in one direction, and the muted basemap really is quieter.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { contrast, deltaE, hexToOklch, worstCaseDeltaE } from "../lib/color.mjs";
import { EMPHASES, FLAVOR_KEYS } from "../lib/adapters.mjs";
import { CLASS_COUNTS, RAMPS, resample } from "../lib/ramps.mjs";
import { THEMES, hexOf, loadTheme } from "../lib/tokens.mjs";

/** Smallest OKLab distance at which two categories still read as different marks. */
const CATEGORY_GAP = 0.08;
/** Smallest OKLab distance between neighbouring ramp steps, and between the two arms of a diverging ramp. */
const STEP_GAP = 0.035;
/** Smallest OKLab distance between the lowest class and the land it is drawn on: below this a polygon cannot be seen. */
const VISIBLE = 0.02;
/** Largest hue difference, in degrees, between the light and the dark version of a diverging ramp's ends. */
const HUE_DRIFT = 25;
const STEPS = [1, 2, 3, 4, 5, 6, 7];

for (const theme of THEMES) {
  const tokens = loadTheme(theme);
  const hex = (/** @type {string} */ key) => hexOf(tokens, key);

  test(`${theme}: categorical colours stay apart under protan, deutan and tritan simulation`, () => {
    const names = [1, 2, 3, 4, 5, 6].map((n) => `data.cat.${n}`);
    const close = [];
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const worst = worstCaseDeltaE(hex(names[i]), hex(names[j]));
        if (worst.value < CATEGORY_GAP) close.push(`${names[i]} vs ${names[j]}: ${worst.value.toFixed(3)} under ${worst.vision}`);
      }
    }
    assert.deepEqual(close, []);
  });

  test(`${theme}: the "other" category is not mistaken for one of the six`, () => {
    const close = [1, 2, 3, 4, 5, 6]
      .map((n) => ({ n, worst: worstCaseDeltaE(hex(`data.cat.${n}`), hex("data.cat.other")) }))
      .filter(({ worst }) => worst.value < 0.06)
      .map(({ n, worst }) => `cat-${n} vs other: ${worst.value.toFixed(3)} under ${worst.vision}`);
    assert.deepEqual(close, []);
  });

  test(`${theme}: success and danger differ without relying on red versus green`, () => {
    const worst = worstCaseDeltaE(hex("color.success.default"), hex("color.danger.default"));
    assert.ok(worst.value >= 0.1, `success vs danger: ${worst.value.toFixed(3)} under ${worst.vision}`);
  });

  test(`${theme}: the muted basemap is less colourful than the default one`, () => {
    const meanChroma = (/** @type {string} */ emphasis) =>
      FLAVOR_KEYS.reduce((sum, key) => sum + hexToOklch(hex(`map.${emphasis}.${key}`)).C, 0) / FLAVOR_KEYS.length;
    assert.ok(meanChroma("muted") < meanChroma("default") * 0.6, `muted ${meanChroma("muted").toFixed(3)} vs default ${meanChroma("default").toFixed(3)}`);
  });

  test(`${theme}: water, land and greenspace are told apart`, () => {
    for (const emphasis of ["default", "muted"]) {
      const land = hex(`map.${emphasis}.land`);
      assert.ok(deltaE(hex(`map.${emphasis}.water`), land) >= 0.04, `${emphasis}: water vs land`);
      assert.ok(deltaE(hex(`map.${emphasis}.greenspace`), land) >= 0.015, `${emphasis}: greenspace vs land`);
    }
  });
}

/**
 * Every neighbouring pair that is too close under normal or simulated vision.
 * @param {string[]} colours
 * @returns {string[]}
 */
function closeNeighbours(colours) {
  const close = [];
  for (let i = 1; i < colours.length; i += 1) {
    const worst = worstCaseDeltaE(colours[i], colours[i - 1]);
    if (worst.value < STEP_GAP) close.push(`steps ${i} and ${i + 1}: ${worst.value.toFixed(3)} under ${worst.vision}`);
  }
  return close;
}

/**
 * Whether a list of numbers rises at every step.
 * @param {number[]} values
 * @returns {boolean}
 */
const rises = (values) => values.every((v, i) => i === 0 || v > values[i - 1]);

for (const theme of THEMES) {
  const tokens = loadTheme(theme);
  const hex = (/** @type {string} */ key) => hexOf(tokens, key);
  const ramp = (/** @type {string} */ kind, /** @type {string} */ name) => STEPS.map((n) => hex(`data.${kind}.${name}.${n}`));
  const lands = EMPHASES.map((emphasis) => hex(`map.${emphasis}.land`));

  for (const name of RAMPS.seq) {
    test(`${theme}: sequential ${name} runs from the basemap outwards, at every class count`, () => {
      const anchors = ramp("seq", name);
      for (const n of CLASS_COUNTS) {
        const colours = resample("seq", anchors, n);
        assert.equal(colours.length, n);
        assert.deepEqual(closeNeighbours(colours), [], `${n} classes`);
        for (const land of lands) {
          // Low values recede into the map and high values stand off it, whichever theme this is.
          assert.ok(rises(colours.map((c) => contrast(c, land))), `${n} classes: contrast against land ${land} does not rise step by step`);
          assert.ok(deltaE(colours[0], land) >= VISIBLE, `${n} classes: the lowest class cannot be seen on land ${land}`);
        }
      }
      assert.deepEqual(resample("seq", anchors, 7), anchors, "seven classes are the tokens themselves");
    });
  }

  for (const name of RAMPS.div) {
    test(`${theme}: diverging ${name} recedes at the midpoint and stands off at both ends, at every class count`, () => {
      const anchors = ramp("div", name);
      for (const n of CLASS_COUNTS) {
        const colours = resample("div", anchors, n);
        assert.equal(colours.length, n);
        assert.deepEqual(closeNeighbours(colours), [], `${n} classes`);
        const half = Math.floor(n / 2);
        if (n % 2 === 1) assert.equal(colours[half], anchors[3], `${n} classes keeps the midpoint`);
        for (const land of lands) {
          const against = colours.map((c) => contrast(c, land));
          assert.ok(rises(against.slice(0, n % 2 === 1 ? half + 1 : half).reverse()), `${n} classes: the lower arm does not stand off land ${land} step by step`);
          assert.ok(rises(against.slice(half)), `${n} classes: the upper arm does not stand off land ${land} step by step`);
        }
        // The two arms must not be confused with each other: compare each step with its mirror.
        for (let i = 0; i < half; i += 1) {
          const worst = worstCaseDeltaE(colours[i], colours[n - 1 - i]);
          assert.ok(worst.value >= STEP_GAP, `${n} classes: step ${i + 1} and its mirror are ${worst.value.toFixed(3)} apart under ${worst.vision}`);
        }
      }
      assert.deepEqual(resample("div", anchors, 7), anchors, "seven classes are the tokens themselves");
      assert.deepEqual(resample("div", anchors, 6), [...anchors.slice(0, 3), ...anchors.slice(4)], "six classes are the tokens without the midpoint");
      const ends = worstCaseDeltaE(anchors[0], anchors[6]);
      assert.ok(ends.value >= 0.1, `ends: ${ends.value.toFixed(3)} under ${ends.vision}`);
    });
  }
}

for (const name of RAMPS.div) {
  test(`diverging ${name}: each end keeps its hue between the light and the dark theme`, () => {
    const [light, dark] = ["light", "dark"].map((theme) => loadTheme(/** @type {"light" | "dark"} */ (theme)));
    for (const step of [1, 7]) {
      const a = hexToOklch(hexOf(light, `data.div.${name}.${step}`)).h;
      const b = hexToOklch(hexOf(dark, `data.div.${name}.${step}`)).h;
      const drift = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
      assert.ok(drift <= HUE_DRIFT, `step ${step}: hue ${a.toFixed(0)} in light, ${b.toFixed(0)} in dark`);
    }
  });
}

test("resample refuses a ramp it cannot cut", () => {
  assert.throws(() => resample("seq", ["#000000", "#ffffff"], 1), /at least 2 classes/);
  assert.throws(() => resample("seq", ["#000000"], 3), /at least 2 anchor/);
  assert.throws(() => resample("div", ["#000000", "#888888", "#aaaaaa", "#ffffff"], 4), /odd number of anchors/);
  assert.deepEqual(resample("seq", ["#000000", "#ffffff"], 2), ["#000000", "#ffffff"]);
  assert.deepEqual(resample("div", ["#000000", "#888888", "#ffffff"], 2), ["#000000", "#ffffff"], "two classes of a diverging ramp are its ends");
});
