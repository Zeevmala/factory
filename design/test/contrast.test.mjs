/**
 * The pairing checks. Every colour pair the system relies on is declared here with
 * the contrast it must hold, and checked in both themes and both basemap emphases.
 * A token change that breaks legibility fails here before it reaches an app.
 *
 * Thresholds: 4.5:1 for text, 3:1 for marks that carry meaning (WCAG 2.1 AA).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { contrast, over } from "../lib/color.mjs";
import { EMPHASES } from "../lib/adapters.mjs";
import { THEMES, alphaOf, hexOf, loadTheme } from "../lib/tokens.mjs";

const TEXT = 4.5;
const MARK = 3;
const SURFACES = ["color.surface.0", "color.surface.1", "color.surface.2"];
const STATUSES = ["danger", "warning", "success"];
/** Basemap colours a floating control can sit over. */
const GROUNDS = ["land", "water", "greenspace", "built", "road-minor", "road-major", "road-motorway"];
const CATEGORIES = [1, 2, 3, 4, 5, 6];

/**
 * Collect every pairing that misses its threshold.
 * @param {[string, string, string, number][]} pairs label, foreground hex, background hex, minimum ratio
 * @returns {string[]}
 */
function failures(pairs) {
  return pairs
    .map(([label, fg, bg, min]) => ({ label, ratio: contrast(fg, bg), min, fg, bg }))
    .filter((p) => p.ratio < p.min)
    .map((p) => `${p.label}: ${p.ratio.toFixed(2)}:1, needs ${p.min}:1 (${p.fg} on ${p.bg})`);
}

for (const theme of THEMES) {
  const tokens = loadTheme(theme);
  const hex = (/** @type {string} */ key) => hexOf(tokens, key);
  /** The translucent overlay composited over a basemap colour. */
  const overlayOn = (/** @type {string} */ ground) => over(hex("color.overlay"), alphaOf(tokens, "color.overlay"), ground);

  test(`${theme}: text on surfaces`, () => {
    /** @type {[string, string, string, number][]} */
    const pairs = [];
    for (const surface of SURFACES) {
      for (const text of ["color.text.default", "color.text.muted", "color.accent.text", ...STATUSES.map((s) => `color.${s}.text`)]) {
        pairs.push([`${text} on ${surface}`, hex(text), hex(surface), TEXT]);
      }
    }
    pairs.push(["text on accent-subtle", hex("color.text.default"), hex("color.accent.subtle"), TEXT]);
    pairs.push(["accent-text on accent-subtle", hex("color.accent.text"), hex("color.accent.subtle"), TEXT]);
    for (const fill of ["color.accent.default", "color.accent.hover"]) {
      pairs.push([`text-on-accent on ${fill}`, hex("color.text.on-accent"), hex(fill), TEXT]);
    }
    for (const status of STATUSES) {
      pairs.push([`${status}.on on ${status}`, hex(`color.${status}.on`), hex(`color.${status}.default`), TEXT]);
      pairs.push([`${status}.text on ${status}.subtle`, hex(`color.${status}.text`), hex(`color.${status}.subtle`), TEXT]);
    }
    assert.deepEqual(failures(pairs), []);
  });

  test(`${theme}: controls, borders and focus rings`, () => {
    /** @type {[string, string, string, number][]} */
    const pairs = [];
    for (const surface of SURFACES) {
      pairs.push([`border-strong on ${surface}`, hex("color.border.strong"), hex(surface), MARK]);
      pairs.push([`focus on ${surface}`, hex("color.focus"), hex(surface), MARK]);
    }
    for (const surface of SURFACES.slice(0, 2)) {
      for (const fill of ["accent", ...STATUSES]) {
        pairs.push([`${fill} on ${surface}`, hex(`color.${fill}.default`), hex(surface), MARK]);
      }
    }
    assert.deepEqual(failures(pairs), []);
  });

  for (const emphasis of EMPHASES) {
    const map = (/** @type {string} */ key) => hex(`map.${emphasis}.${key}`);

    test(`${theme}/${emphasis}: map chrome floating on the basemap`, () => {
      /** @type {[string, string, string, number][]} */
      const pairs = [];
      for (const ground of GROUNDS) {
        const surface = overlayOn(map(ground));
        pairs.push([`text on overlay over ${ground}`, hex("color.text.default"), surface, TEXT]);
        pairs.push([`text-muted on overlay over ${ground}`, hex("color.text.muted"), surface, TEXT]);
        pairs.push([`accent-text on overlay over ${ground}`, hex("color.accent.text"), surface, TEXT]);
        pairs.push([`focus on overlay over ${ground}`, hex("color.focus"), surface, MARK]);
      }
      assert.deepEqual(failures(pairs), []);
    });

    test(`${theme}/${emphasis}: basemap labels and lines`, () => {
      /** @type {[string, string, string, number][]} */
      const pairs = [];
      for (const ground of ["land", "built", "greenspace", "road-minor", "road-major"]) {
        pairs.push([`label on ${ground}`, map("label"), map(ground), TEXT]);
      }
      pairs.push(["label on its halo", map("label"), map("label-halo"), TEXT]);
      pairs.push(["label-water on water", map("label-water"), map("water"), TEXT]);
      pairs.push(["poi on land", map("poi"), map("land"), emphasis === "default" ? TEXT : MARK]);
      pairs.push(["boundary on land", map("boundary"), map("land"), MARK]);
      assert.deepEqual(failures(pairs), []);
    });

    test(`${theme}/${emphasis}: data drawn on the basemap`, () => {
      /** @type {[string, string, string, number][]} */
      const pairs = [];
      for (const n of CATEGORIES) {
        pairs.push([`cat-${n} on land`, hex(`data.cat.${n}`), map("land"), MARK]);
        pairs.push([`cat-${n} against its casing`, hex(`data.cat.${n}`), hex("data.casing"), MARK]);
      }
      pairs.push(["cat-other on land", hex("data.cat.other"), map("land"), MARK]);
      for (const ground of ["land", "water", "greenspace"]) {
        pairs.push([`selection on ${ground}`, hex("data.selection"), map(ground), MARK]);
        pairs.push([`route on ${ground}`, hex("data.route"), map(ground), MARK]);
      }
      pairs.push(["route against its casing", hex("data.route"), hex("data.route-casing"), MARK]);
      assert.deepEqual(failures(pairs), []);
    });
  }
}
