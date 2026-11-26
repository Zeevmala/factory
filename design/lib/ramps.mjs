/**
 * Data ramps as sets: which ramps exist, how to cut a seven-step ramp down to
 * fewer classes, and how to read one as continuous stops for a raster.
 * Pure functions, no file access: safe to import in a browser.
 */

import { mix } from "./color.mjs";

/** The ramps every theme defines, by kind. */
export const RAMPS = /** @type {const} */ ({ seq: ["hydro", "emrld"], div: ["geyser", "earth"] });

/** Class counts a ramp is published in. Fewer than three is a binary map; more than seven cannot be told apart in a legend. */
export const CLASS_COUNTS = [3, 4, 5, 6, 7];

/**
 * Sample a list of anchor colours at `n` even intervals, mixing in OKLab between
 * the two nearest anchors.
 * @param {string[]} anchors colours, low to high
 * @param {number} n number of colours, 2 or more
 * @returns {string[]}
 */
function sample(anchors, n) {
  const last = anchors.length - 1;
  return Array.from({ length: n }, (_, i) => {
    const position = (i / (n - 1)) * last;
    const below = Math.min(Math.floor(position), last - 1);
    const t = position - below;
    if (t < 1e-9) return anchors[below].toLowerCase();
    if (t > 1 - 1e-9) return anchors[below + 1].toLowerCase();
    return mix(anchors[below], anchors[below + 1], t);
  });
}

/**
 * Cut a ramp to `n` classes. Taking the first `n` steps instead would throw
 * away one end; taking every other step only works for some counts.
 *
 * A sequential ramp is sampled end to end. A diverging ramp keeps its midpoint
 * for an odd count. For an even count there is no middle class, so the midpoint
 * is left out and each arm is sampled on its own: sampling straight across
 * would put the two central classes a hair either side of the midpoint, and
 * "just below" and "just above" would be the same colour to most readers.
 * @param {"seq" | "div"} kind
 * @param {string[]} anchors the ramp's colours, low to high; an odd number for a diverging ramp
 * @param {number} n number of classes, 2 or more
 * @returns {string[]}
 */
export function resample(kind, anchors, n) {
  if (!Number.isInteger(n) || n < 2) throw new Error(`A ramp needs at least 2 classes, got ${n}`);
  if (anchors.length < 2) throw new Error("A ramp needs at least 2 anchor colours");
  if (kind === "seq" || n % 2 === 1) return sample(anchors, n);
  if (anchors.length % 2 === 0 || anchors.length < 3) throw new Error("A diverging ramp needs an odd number of anchors, three or more");
  const middle = (anchors.length - 1) / 2;
  const arm = (/** @type {string[]} */ colours) => (n === 2 ? [colours[0]] : sample(colours, n / 2));
  return [...arm(anchors.slice(0, middle)), ...arm(anchors.slice(middle + 1).reverse()).reverse()];
}

/**
 * A ramp as continuous colour stops over 0..1, for rasters and heatmaps.
 * @param {string[]} anchors the ramp's colours, low to high
 * @returns {[number, string][]}
 */
export function stops(anchors) {
  const last = anchors.length - 1;
  return anchors.map((hex, i) => [Math.round((i / last) * 1e4) / 1e4, hex.toLowerCase()]);
}
