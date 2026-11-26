/**
 * Class breaks for a choropleth: how a column of numbers is cut into the three
 * to seven classes a ramp has. Pure functions, no dependencies.
 *
 * Every function returns the interior breaks, ascending: `n` classes have at
 * most `n - 1` breaks, and a value belongs to class `i` when it is at or above
 * break `i - 1` and below break `i`. That is the rule a MapLibre `step`
 * expression applies, so the legend and the map cannot disagree.
 *
 * Missing values are not zeros. `numeric` drops them here; on the map they are
 * drawn in the "other" colour (see `stepExpression` in maplibre.mjs).
 */

/** Above this many values, natural breaks are computed on an evenly spaced sample of the sorted values. */
const JENKS_SAMPLE = 2000;

/**
 * The finite numbers of a column, sorted ascending. Null, undefined, NaN,
 * infinities and non-numbers are dropped: they are missing data, not zeros.
 * @param {Iterable<unknown>} values
 * @returns {number[]}
 */
export function numeric(values) {
  const out = [];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) out.push(value);
  }
  return out.sort((a, b) => a - b);
}

/**
 * Remove repeated breaks and breaks that would leave the first or last class empty.
 * @param {number[]} breaks
 * @param {number[]} sorted the values, ascending
 * @returns {number[]}
 */
function tidy(breaks, sorted) {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return [...new Set(breaks)].filter((b) => b > min && b <= max).sort((a, b) => a - b);
}

/**
 * @param {Iterable<unknown>} values
 * @param {number} classes
 * @returns {number[]}
 */
function prepared(values, classes) {
  if (!Number.isInteger(classes) || classes < 2) throw new Error(`Need at least 2 classes, got ${classes}`);
  const sorted = numeric(values);
  if (sorted.length === 0) throw new Error("No finite numbers to classify");
  return sorted;
}

/**
 * Equal interval: classes of the same width between the minimum and the maximum.
 * Easy to read in a legend; skewed data piles into one class.
 * @param {Iterable<unknown>} values
 * @param {number} classes
 * @returns {number[]} interior breaks, ascending
 */
export function equalInterval(values, classes) {
  const sorted = prepared(values, classes);
  const min = sorted[0];
  const width = (sorted[sorted.length - 1] - min) / classes;
  if (width === 0) return [];
  return tidy(Array.from({ length: classes - 1 }, (_, i) => min + width * (i + 1)), sorted);
}

/**
 * Quantile: about the same number of features in each class. Always fills the
 * ramp; can split near-identical values and hide a real gap.
 * Breaks are taken from the data (nearest rank, no interpolation), so every
 * break is a value that occurs.
 * @param {Iterable<unknown>} values
 * @param {number} classes
 * @returns {number[]} interior breaks, ascending
 */
export function quantile(values, classes) {
  const sorted = prepared(values, classes);
  const breaks = Array.from({ length: classes - 1 }, (_, i) => sorted[Math.min(sorted.length - 1, Math.ceil(((i + 1) * sorted.length) / classes))]);
  return tidy(breaks, sorted);
}

/**
 * Natural breaks (Fisher-Jenks): the cut that makes classes as tight as
 * possible around their own means. The default for a choropleth of one place at
 * one time; do not use it to compare two maps, since each gets its own breaks.
 *
 * Exact up to 2000 values. Above that the breaks come from an evenly spaced
 * sample of the sorted values, which keeps the shape of the distribution.
 * @param {Iterable<unknown>} values
 * @param {number} classes
 * @returns {number[]} interior breaks, ascending
 */
export function naturalBreaks(values, classes) {
  const all = prepared(values, classes);
  const sorted =
    all.length <= JENKS_SAMPLE ? all : Array.from({ length: JENKS_SAMPLE }, (_, i) => all[Math.round((i * (all.length - 1)) / (JENKS_SAMPLE - 1))]);
  const n = sorted.length;
  const distinct = new Set(sorted).size;
  const k = Math.min(classes, distinct);
  if (k < 2) return [];

  // Prefix sums give the squared deviation of sorted[i..j] from its mean in constant time.
  const sum = new Float64Array(n + 1);
  const sumSq = new Float64Array(n + 1);
  for (let i = 0; i < n; i += 1) {
    sum[i + 1] = sum[i] + sorted[i];
    sumSq[i + 1] = sumSq[i] + sorted[i] * sorted[i];
  }
  const deviation = (/** @type {number} */ i, /** @type {number} */ j) => {
    const count = j - i + 1;
    const total = sum[j + 1] - sum[i];
    return sumSq[j + 1] - sumSq[i] - (total * total) / count;
  };

  // cost[c][j]: least total deviation of sorted[0..j] cut into c + 1 classes. start[c][j]: where its last class begins.
  const cost = Array.from({ length: k }, () => new Float64Array(n).fill(Infinity));
  const start = Array.from({ length: k }, () => new Int32Array(n));
  for (let j = 0; j < n; j += 1) cost[0][j] = deviation(0, j);
  for (let c = 1; c < k; c += 1) {
    for (let j = c; j < n; j += 1) {
      for (let i = c; i <= j; i += 1) {
        const candidate = cost[c - 1][i - 1] + deviation(i, j);
        if (candidate < cost[c][j]) {
          cost[c][j] = candidate;
          start[c][j] = i;
        }
      }
    }
  }

  const breaks = [];
  let end = n - 1;
  for (let c = k - 1; c >= 1; c -= 1) {
    const first = start[c][end];
    breaks.push(sorted[first]);
    end = first - 1;
  }
  return tidy(breaks, sorted);
}

/**
 * Index of the class a value falls in, by the same rule as a `step` expression.
 * @param {number} value
 * @param {number[]} breaks interior breaks, ascending
 * @returns {number} 0 for the lowest class, `breaks.length` for the highest
 */
export function classOf(value, breaks) {
  let index = 0;
  while (index < breaks.length && value >= breaks[index]) index += 1;
  return index;
}
