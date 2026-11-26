/**
 * Checks on the class-break methods: each returns interior breaks that the
 * `step` rule can apply, missing values are never counted as zeros, and the
 * natural-breaks search finds the cut a person would draw.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { classOf, equalInterval, naturalBreaks, numeric, quantile } from "../lib/classify.mjs";

/**
 * Number of values that fall in each class.
 * @param {number[]} values
 * @param {number[]} breaks
 * @returns {number[]}
 */
function counts(values, breaks) {
  const out = new Array(breaks.length + 1).fill(0);
  for (const value of values) out[classOf(value, breaks)] += 1;
  return out;
}

test("numeric keeps finite numbers only: a missing value is not a zero", () => {
  assert.deepEqual(numeric([3, null, undefined, NaN, "7", Infinity, -Infinity, 0, -2.5, 1]), [-2.5, 0, 1, 3]);
});

test("equal interval cuts the range into classes of the same width", () => {
  assert.deepEqual(equalInterval([0, 100], 4), [25, 50, 75]);
  assert.deepEqual(equalInterval([10, 12, 20, null, 30], 2), [20]);
  assert.deepEqual(equalInterval([5, 5, 5], 5), [], "one distinct value has no breaks");
});

test("quantile puts about the same number of values in each class", () => {
  const values = Array.from({ length: 100 }, (_, i) => i * i);
  const breaks = quantile(values, 5);
  assert.equal(breaks.length, 4);
  assert.deepEqual(counts(values, breaks), [20, 20, 20, 20, 20]);
  for (const b of breaks) assert.ok(values.includes(b), "every break is a value that occurs");
});

test("quantile drops repeated breaks when the data is tied", () => {
  const breaks = quantile([0, 0, 0, 0, 0, 0, 0, 0, 1, 2], 5);
  assert.deepEqual(breaks, [1], "four of the five cut points fall inside the run of zeros");
  assert.ok(counts([0, 0, 0, 0, 0, 0, 0, 0, 1, 2], breaks).every((n) => n > 0), "no class is empty");
});

test("natural breaks find the gaps between clusters", () => {
  const values = [1, 2, 2, 3, 40, 41, 43, 44, 200, 201, 205];
  assert.deepEqual(naturalBreaks(values, 3), [40, 200]);
  assert.deepEqual(counts(values, naturalBreaks(values, 3)), [4, 4, 3]);
});

test("natural breaks are optimal: no other cut of a small set is tighter", () => {
  const values = [2, 3, 5, 9, 10, 11, 20, 26, 27, 40];
  const sse = (/** @type {number[]} */ breaks) => {
    const groups = Array.from({ length: breaks.length + 1 }, () => /** @type {number[]} */ ([]));
    for (const v of values) groups[classOf(v, breaks)].push(v);
    return groups.reduce((sum, g) => {
      if (g.length === 0) return Infinity;
      const mean = g.reduce((a, b) => a + b, 0) / g.length;
      return sum + g.reduce((a, b) => a + (b - mean) ** 2, 0);
    }, 0);
  };
  const found = sse(naturalBreaks(values, 3));
  let best = Infinity;
  for (let i = 1; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) best = Math.min(best, sse([values[i], values[j]]));
  }
  assert.ok(Math.abs(found - best) < 1e-9, `found ${found}, best ${best}`);
});

test("natural breaks never return more classes than there are distinct values", () => {
  assert.deepEqual(naturalBreaks([4, 4, 4, 9, 9], 5), [9]);
  assert.deepEqual(naturalBreaks([7, 7, 7], 4), []);
});

test("natural breaks on a large column stay ascending and within the data", () => {
  // Deterministic skewed values: a long right tail, as counts and densities have.
  const values = Array.from({ length: 6000 }, (_, i) => Math.round(Math.exp(((i * 7919) % 6000) / 800) * 10) / 10);
  const breaks = naturalBreaks(values, 6);
  assert.equal(breaks.length, 5);
  assert.ok(breaks.every((b, i) => i === 0 || b > breaks[i - 1]));
  assert.ok(breaks[0] > Math.min(...values) && breaks.at(-1) <= Math.max(...values));
  assert.ok(counts(values, breaks).every((n) => n > 0));
});

test("classOf applies the step rule: a value at a break belongs to the class above", () => {
  assert.equal(classOf(9.99, [10, 20]), 0);
  assert.equal(classOf(10, [10, 20]), 1);
  assert.equal(classOf(20, [10, 20]), 2);
  assert.equal(classOf(5, []), 0);
});

test("the methods refuse input they cannot classify", () => {
  assert.throws(() => quantile([], 5), /No finite numbers/);
  assert.throws(() => equalInterval([null, NaN], 3), /No finite numbers/);
  assert.throws(() => naturalBreaks([1, 2, 3], 1), /at least 2 classes/);
});
