/**
 * Checks on the palettes as sets: categories stay apart for colour-blind readers,
 * ramps run in one direction, and the muted basemap really is quieter.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { deltaE, hexToOklch, worstCaseDeltaE } from "../lib/color.mjs";
import { FLAVOR_KEYS } from "../lib/adapters.mjs";
import { THEMES, hexOf, loadTheme } from "../lib/tokens.mjs";

/** Smallest OKLab distance at which two categories still read as different marks. */
const CATEGORY_GAP = 0.08;
/** Smallest OKLab distance between neighbouring ramp steps. */
const STEP_GAP = 0.035;
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

const tokens = loadTheme("light");
const hex = (/** @type {string} */ key) => hexOf(tokens, key);

for (const ramp of ["hydro", "emrld"]) {
  test(`sequential ${ramp}: lightness falls step by step and neighbours stay distinct`, () => {
    const colours = STEPS.map((n) => hex(`data.seq.${ramp}.${n}`));
    const lightness = colours.map((c) => hexToOklch(c).L);
    for (let i = 1; i < colours.length; i += 1) {
      assert.ok(lightness[i] < lightness[i - 1], `step ${i + 1} is not darker than step ${i}`);
      const worst = worstCaseDeltaE(colours[i], colours[i - 1]);
      assert.ok(worst.value >= STEP_GAP, `steps ${i} and ${i + 1}: ${worst.value.toFixed(3)} under ${worst.vision}`);
    }
  });
}

for (const ramp of ["geyser", "earth"]) {
  test(`diverging ${ramp}: light middle, dark ends, ends distinct for colour-blind readers`, () => {
    const colours = STEPS.map((n) => hex(`data.div.${ramp}.${n}`));
    const lightness = colours.map((c) => hexToOklch(c).L);
    assert.equal(Math.max(...lightness), lightness[3], "the midpoint is not the lightest step");
    for (let i = 1; i <= 3; i += 1) {
      assert.ok(lightness[3 - i] < lightness[4 - i], `left arm does not darken at step ${4 - i}`);
      assert.ok(lightness[3 + i] < lightness[2 + i], `right arm does not darken at step ${4 + i}`);
    }
    const ends = worstCaseDeltaE(colours[0], colours[6]);
    assert.ok(ends.value >= 0.1, `ends: ${ends.value.toFixed(3)} under ${ends.vision}`);
  });
}
