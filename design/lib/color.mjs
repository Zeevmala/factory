/**
 * Colour maths for the design system: sRGB parsing, WCAG contrast, OKLab/OKLCH,
 * and colour-vision-deficiency simulation. No dependencies.
 *
 * @typedef {[number, number, number]} Triplet
 * @typedef {{ L: number, a: number, b: number }} Oklab
 * @typedef {{ L: number, C: number, h: number }} Oklch
 * @typedef {"protan" | "deutan" | "tritan"} Deficiency
 */

/**
 * Parse `#rgb` or `#rrggbb` (an alpha pair is ignored) into sRGB components in 0..1.
 * @param {string} hex
 * @returns {Triplet}
 */
export function hexToSrgb(hex) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a hex colour: ${hex}`);
  let digits = match[1];
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join("");
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);
}

/**
 * Format sRGB components in 0..1 as `#rrggbb`, clamping out-of-range values.
 * @param {Triplet} srgb
 * @returns {string}
 */
export function srgbToHex(srgb) {
  const part = (v) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${srgb.map(part).join("")}`;
}

/**
 * sRGB transfer function, encoded -> linear light.
 * @param {number} v
 * @returns {number}
 */
export function toLinear(v) {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/**
 * sRGB transfer function, linear light -> encoded.
 * @param {number} v
 * @returns {number}
 */
export function toEncoded(v) {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

/**
 * WCAG 2 relative luminance of a hex colour.
 * @param {string} hex
 * @returns {number}
 */
export function luminance(hex) {
  const [r, g, b] = hexToSrgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2 contrast ratio between two opaque colours, 1..21.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Composite a translucent colour over an opaque ground, in encoded sRGB as browsers do.
 * @param {string} hex foreground colour
 * @param {number} alpha 0..1
 * @param {string} ground opaque background colour
 * @returns {string}
 */
export function over(hex, alpha, ground) {
  const fg = hexToSrgb(hex);
  const bg = hexToSrgb(ground);
  return srgbToHex(/** @type {Triplet} */ (fg.map((v, i) => v * alpha + bg[i] * (1 - alpha))));
}

/**
 * Linear sRGB -> OKLab (Ottosson 2020).
 * @param {Triplet} linear
 * @returns {Oklab}
 */
export function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * OKLab -> linear sRGB. Components may fall outside 0..1 for out-of-gamut colours.
 * @param {Oklab} lab
 * @returns {Triplet}
 */
export function oklabToLinear({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * Hex -> OKLab.
 * @param {string} hex
 * @returns {Oklab}
 */
export function hexToOklab(hex) {
  return linearToOklab(/** @type {Triplet} */ (hexToSrgb(hex).map(toLinear)));
}

/**
 * Hex -> OKLCH, hue in degrees.
 * @param {string} hex
 * @returns {Oklch}
 */
export function hexToOklch(hex) {
  const { L, a, b } = hexToOklab(hex);
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

/**
 * OKLCH -> hex. Chroma is reduced until the colour fits the sRGB gamut, keeping
 * lightness and hue, so a ramp stays even where the requested chroma is unreachable.
 * @param {Oklch} lch
 * @returns {string}
 */
export function oklchToHex({ L, C, h }) {
  const rad = (h * Math.PI) / 180;
  const inGamut = (/** @type {Triplet} */ rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  let lo = 0;
  let hi = C;
  let linear = oklabToLinear({ L, a: C * Math.cos(rad), b: C * Math.sin(rad) });
  if (!inGamut(linear)) {
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      linear = oklabToLinear({ L, a: mid * Math.cos(rad), b: mid * Math.sin(rad) });
      if (inGamut(linear)) lo = mid;
      else hi = mid;
    }
    linear = oklabToLinear({ L, a: lo * Math.cos(rad), b: lo * Math.sin(rad) });
  }
  return srgbToHex(/** @type {Triplet} */ (linear.map((v) => toEncoded(Math.min(1, Math.max(0, v))))));
}

/**
 * Euclidean distance in OKLab, the perceptual difference between two colours.
 * Roughly: below 0.02 is hard to see, above 0.10 is plainly different.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function deltaE(a, b) {
  const p = hexToOklab(a);
  const q = hexToOklab(b);
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

/**
 * Machado, Oliveira and Fernandes (2009) matrices at severity 1.0, applied in linear RGB.
 * @type {Record<Deficiency, number[][]>}
 */
const MACHADO_2009 = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** @type {Deficiency[]} */
export const DEFICIENCIES = ["protan", "deutan", "tritan"];

/**
 * Simulate how a colour appears with a full dichromatic colour-vision deficiency.
 * @param {string} hex
 * @param {Deficiency} deficiency
 * @returns {string}
 */
export function simulate(hex, deficiency) {
  const linear = hexToSrgb(hex).map(toLinear);
  const matrix = MACHADO_2009[deficiency];
  const out = matrix.map((row) => row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]);
  return srgbToHex(/** @type {Triplet} */ (out.map((v) => toEncoded(Math.min(1, Math.max(0, v))))));
}

/**
 * Smallest perceptual difference between two colours across normal vision and
 * the three simulated deficiencies.
 * @param {string} a
 * @param {string} b
 * @returns {{ value: number, vision: "normal" | Deficiency }}
 */
export function worstCaseDeltaE(a, b) {
  /** @type {{ value: number, vision: "normal" | Deficiency }} */
  let worst = { value: deltaE(a, b), vision: "normal" };
  for (const deficiency of DEFICIENCIES) {
    const value = deltaE(simulate(a, deficiency), simulate(b, deficiency));
    if (value < worst.value) worst = { value, vision: deficiency };
  }
  return worst;
}
