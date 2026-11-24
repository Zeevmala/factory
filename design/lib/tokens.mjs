/**
 * Loads the DTCG token files, resolves aliases and exposes one flat, typed view
 * per theme. Everything else in the design system reads tokens through here.
 *
 * @typedef {"light" | "dark"} ThemeId
 * @typedef {{ colorSpace: string, components: number[], alpha?: number, hex?: string }} ColorValue
 * @typedef {{ value: number, unit: string }} DimensionValue
 * @typedef {{ path: string[], type: string, value: unknown, alias: string | null, description: string, groupDescription: string }} Token
 * @typedef {Map<string, Token>} TokenMap keyed by dotted path
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hexToSrgb } from "./color.mjs";

export const DESIGN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {ThemeId[]} */
export const THEMES = ["light", "dark"];

/** Prefix on every CSS custom property and class, so the system can sit beside an app's own styles. */
export const PREFIX = "cw";

/**
 * Read and parse one token file.
 * @param {string} name file name inside design/tokens
 * @returns {Record<string, unknown>}
 */
function readTokenFile(name) {
  return JSON.parse(fs.readFileSync(path.join(DESIGN_ROOT, "tokens", name), "utf8"));
}

/**
 * Walk a DTCG tree into a flat map, applying group-level `$type` inheritance.
 * @param {Record<string, unknown>} tree
 * @param {TokenMap} out
 * @param {string[]} trail
 * @param {string | undefined} inheritedType
 * @param {string} inheritedDescription description of the nearest enclosing group below the file root
 */
function flatten(tree, out, trail = [], inheritedType = undefined, inheritedDescription = "") {
  const groupType = typeof tree.$type === "string" ? tree.$type : inheritedType;
  const groupDescription = trail.length > 0 && typeof tree.$description === "string" ? tree.$description : inheritedDescription;
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith("$")) continue;
    if (/[{}.]/.test(key)) throw new Error(`Token name "${key}" may not contain {, } or .`);
    if (node === null || typeof node !== "object") throw new Error(`Unexpected value at ${[...trail, key].join(".")}`);
    const child = /** @type {Record<string, unknown>} */ (node);
    const here = [...trail, key];
    if ("$value" in child) {
      const raw = child.$value;
      const alias = typeof raw === "string" && /^\{[^{}]+\}$/.test(raw) ? raw.slice(1, -1) : null;
      out.set(here.join("."), {
        path: here,
        type: typeof child.$type === "string" ? child.$type : (groupType ?? ""),
        value: raw,
        alias,
        description: typeof child.$description === "string" ? child.$description : "",
        groupDescription,
      });
    } else {
      flatten(child, out, here, groupType, groupDescription);
    }
  }
}

/**
 * Follow an alias chain to the token that holds a literal value.
 * @param {TokenMap} tokens
 * @param {string} key
 * @param {string[]} seen
 * @returns {Token}
 */
export function resolve(tokens, key, seen = []) {
  const token = tokens.get(key);
  if (!token) throw new Error(`Unknown token "${key}"${seen.length ? ` (referenced from ${seen.at(-1)})` : ""}`);
  if (token.alias === null) return token;
  if (seen.includes(key)) throw new Error(`Circular alias: ${[...seen, key].join(" -> ")}`);
  return resolve(tokens, token.alias, [...seen, key]);
}

/**
 * Load the core tokens merged with one theme, with every token typed and every alias checked.
 * @param {ThemeId} theme
 * @returns {TokenMap}
 */
export function loadTheme(theme) {
  /** @type {TokenMap} */
  const tokens = new Map();
  flatten(readTokenFile("core.tokens.json"), tokens);
  /** @type {TokenMap} */
  const themed = new Map();
  flatten(readTokenFile(`theme.${theme}.tokens.json`), themed);
  for (const [key, token] of themed) {
    if (tokens.has(key)) throw new Error(`Theme token "${key}" redefines a core token`);
    tokens.set(key, token);
  }
  for (const [key, token] of tokens) {
    const target = resolve(tokens, key);
    if (token.alias !== null) token.type = target.type;
    if (!token.type) throw new Error(`Token "${key}" has no $type`);
    if (target.type === "color") assertColor(key, /** @type {ColorValue} */ (target.value));
  }
  return tokens;
}

/**
 * A colour token must be sRGB with a hex that matches its components.
 * @param {string} key
 * @param {ColorValue} value
 */
function assertColor(key, value) {
  if (value.colorSpace !== "srgb" || !Array.isArray(value.components) || value.components.length !== 3 || !value.hex) {
    throw new Error(`Colour "${key}" must be srgb with three components and a hex`);
  }
  const fromHex = hexToSrgb(value.hex);
  value.components.forEach((component, i) => {
    if (Math.abs(component - fromHex[i]) > 0.003) {
      throw new Error(`Colour "${key}": components do not match hex ${value.hex}. Run: node design/scripts/build.mjs --fix-components`);
    }
  });
}

/**
 * Resolved opaque hex of a colour token (alpha ignored; use `alphaOf` for it).
 * @param {TokenMap} tokens
 * @param {string} key
 * @returns {string}
 */
export function hexOf(tokens, key) {
  const token = resolve(tokens, key);
  if (token.type !== "color") throw new Error(`"${key}" is not a colour`);
  return /** @type {ColorValue} */ (token.value).hex.toLowerCase();
}

/**
 * Alpha of a colour token, 1 when it has none.
 * @param {TokenMap} tokens
 * @param {string} key
 * @returns {number}
 */
export function alphaOf(tokens, key) {
  return /** @type {ColorValue} */ (resolve(tokens, key).value).alpha ?? 1;
}

/**
 * CSS custom-property name for a token path, without the leading dashes.
 * `color.surface.0` -> `cw-surface-0`, `color.text.default` -> `cw-text`,
 * `map.default.land` -> `cw-map-land`, `font.family.sans` -> `cw-font-sans`.
 * @param {string[]} tokenPath
 * @returns {string}
 */
export function cssName(tokenPath) {
  const parts = tokenPath.filter((part, i) => !(i === 0 && part === "color") && part !== "default" && part !== "family");
  return [PREFIX, ...parts].join("-");
}

/**
 * CSS value for a resolved token.
 * @param {Token} token a token holding a literal value
 * @returns {string}
 */
export function cssValue(token) {
  const value = token.value;
  switch (token.type) {
    case "color": {
      const color = /** @type {ColorValue} */ (value);
      if (color.alpha === undefined || color.alpha === 1) return color.hex.toLowerCase();
      const [r, g, b] = hexToSrgb(color.hex).map((v) => Math.round(v * 255));
      return `rgba(${r}, ${g}, ${b}, ${color.alpha})`;
    }
    case "dimension":
    case "duration": {
      const dimension = /** @type {DimensionValue} */ (value);
      return `${dimension.value}${dimension.unit}`;
    }
    case "fontFamily":
      return /** @type {string[]} */ (value).map((name) => (/^[a-z-]+$/.test(name) ? name : `"${name}"`)).join(", ");
    case "cubicBezier":
      return `cubic-bezier(${/** @type {number[]} */ (value).join(", ")})`;
    case "shadow": {
      const shadow = /** @type {Record<string, any>} */ (value);
      const length = (/** @type {DimensionValue} */ d) => `${d.value}${d.unit === "px" && d.value === 0 ? "" : d.unit}`;
      const [r, g, b] = hexToSrgb(shadow.color.hex).map((v) => Math.round(v * 255));
      return `${length(shadow.offsetX)} ${length(shadow.offsetY)} ${length(shadow.blur)} ${length(shadow.spread)} rgba(${r}, ${g}, ${b}, ${shadow.color.alpha ?? 1})`;
    }
    default:
      return String(value);
  }
}

/**
 * Every token that becomes a CSS custom property, in source order.
 * Typography composites are excluded: they compile to classes.
 * @param {TokenMap} tokens
 * @returns {{ name: string, value: string, token: Token, source: Token }[]}
 */
export function cssEntries(tokens) {
  const seen = new Map();
  const entries = [];
  for (const [key, source] of tokens) {
    if (source.type === "typography") continue;
    const name = cssName(source.path);
    if (seen.has(name)) throw new Error(`"${key}" and "${seen.get(name)}" both compile to --${name}`);
    seen.set(name, key);
    const token = resolve(tokens, key);
    entries.push({ name, value: cssValue(token), token, source });
  }
  return entries;
}
