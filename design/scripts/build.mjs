#!/usr/bin/env node
/**
 * Compiles design/tokens into everything consumers read:
 *
 *   dist/tokens.css             CSS custom properties, light and dark, plus type classes
 *   dist/fonts.css              @font-face rules for the bundled font files
 *   dist/tokens.json            resolved values per theme, for scripts and tests
 *   dist/mapbox-standard.json   basemap config per theme and emphasis
 *   dist/protomaps-flavors.json Flavor objects per theme and emphasis
 *   system/project/tokens.json  the same tokens in the shape the design-system page reads
 *
 * Usage:
 *   node design/scripts/build.mjs                   write the outputs
 *   node design/scripts/build.mjs --check           fail if the committed outputs are stale
 *   node design/scripts/build.mjs --fix-components  rewrite each colour's components from its hex
 */

import fs from "node:fs";
import path from "node:path";
import { hexToSrgb } from "../lib/color.mjs";
import { EMPHASES, toMapboxStandard, toProtomapsFlavor } from "../lib/adapters.mjs";
import { DESIGN_ROOT, PREFIX, THEMES, cssEntries, cssName, cssValue, loadTheme, resolve } from "../lib/tokens.mjs";

const BANNER = "Cartowolf — generated from design/tokens by design/scripts/build.mjs. Do not edit.";

/** Bundled font files: [family, file, weight]. Paths are relative to design/system/project. */
const FONTS = [
  ["IBM Plex Sans", "fonts/ibm-plex-sans-latin-400-normal.woff2", "400"],
  ["IBM Plex Sans", "fonts/ibm-plex-sans-latin-500-normal.woff2", "500"],
  ["IBM Plex Sans", "fonts/ibm-plex-sans-latin-600-normal.woff2", "600"],
  ["IBM Plex Sans Hebrew", "fonts/ibm-plex-sans-hebrew-hebrew-400-normal.woff2", "400"],
  ["IBM Plex Sans Hebrew", "fonts/ibm-plex-sans-hebrew-hebrew-500-normal.woff2", "500"],
  ["IBM Plex Sans Hebrew", "fonts/ibm-plex-sans-hebrew-hebrew-600-normal.woff2", "600"],
  ["IBM Plex Sans Condensed", "fonts/ibm-plex-sans-condensed-latin-500-normal.woff2", "500"],
  ["IBM Plex Sans Condensed", "fonts/ibm-plex-sans-condensed-latin-600-normal.woff2", "600"],
  ["IBM Plex Mono", "fonts/ibm-plex-mono-latin-400-normal.woff2", "400"],
];

/** Type styles grouped as the design-system page shows them: [group, family key, style names]. */
const TYPE_GROUPS = [
  ["Interface", "sans", ["display", "title-1", "title-2", "body", "body-strong", "small"]],
  ["Labels", "condensed", ["label", "overline"]],
  ["Data", "mono", ["data"]],
];

/** Sample text per type style, for the specimen. */
const TYPE_SAMPLES = {
  display: "Halfway between us",
  "title-1": "Routes to the meeting point",
  "title-2": "Tel Aviv–Yafo תל אביב–יפו",
  body: "Each person sees their own route and arrival time. The midpoint moves as people do.",
  "body-strong": "Navigate",
  small: "Updated 12 seconds ago",
  label: "Built-up area · שטח בנוי",
  overline: "LAND COVER",
  data: "32.0853° N  34.7818° E   40.6 km",
};

/**
 * Rewrite every colour's `components` from its `hex` in the three source files.
 */
function fixComponents() {
  for (const name of ["core.tokens.json", ...THEMES.map((t) => `theme.${t}.tokens.json`)]) {
    const file = path.join(DESIGN_ROOT, "tokens", name);
    const tree = JSON.parse(fs.readFileSync(file, "utf8"));
    const visit = (/** @type {any} */ node) => {
      if (node === null || typeof node !== "object") return;
      if (node.colorSpace === "srgb" && typeof node.hex === "string") {
        node.hex = node.hex.toLowerCase();
        node.components = hexToSrgb(node.hex).map((v) => Math.round(v * 1e4) / 1e4);
      }
      Object.values(node).forEach(visit);
    };
    visit(tree);
    fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`);
  }
}

/**
 * Declarations for one theme, optionally limited to tokens whose value differs from another theme.
 * @param {ReturnType<typeof cssEntries>} entries
 * @param {Map<string, string> | null} baseline values of the first theme; null emits everything
 * @returns {string[]}
 */
function declarations(entries, baseline) {
  return entries
    .filter((entry) => baseline === null || baseline.get(entry.name) !== entry.value)
    .map((entry) => `  --${entry.name}: ${entry.value};`);
}

/**
 * CSS for the typography composites, one class per style.
 * @param {import("../lib/tokens.mjs").TokenMap} tokens
 * @returns {string}
 */
function typeClasses(tokens) {
  const blocks = [];
  for (const [key, token] of tokens) {
    if (token.type !== "typography") continue;
    const value = /** @type {Record<string, any>} */ (token.value);
    const ref = (/** @type {string} */ alias) => alias.slice(1, -1);
    const family = cssName(resolve(tokens, ref(value.fontFamily)).path);
    const weight = cssValue(resolve(tokens, ref(value.fontWeight)));
    const lines = [
      `  font-family: var(--${family});`,
      `  font-weight: ${weight};`,
      `  font-size: ${value.fontSize.value}${value.fontSize.unit};`,
      `  line-height: ${value.lineHeight};`,
      `  letter-spacing: ${value.letterSpacing.value === 0 ? "0" : `${value.letterSpacing.value}${value.letterSpacing.unit}`};`,
    ];
    if (key === "type.overline") lines.push("  text-transform: uppercase;");
    if (key === "type.data") lines.push("  font-variant-numeric: tabular-nums;");
    blocks.push(`.${PREFIX}-${token.path.at(-1)} {\n${lines.join("\n")}\n}`);
  }
  return blocks.join("\n\n");
}

/**
 * Build every output as a map of path (relative to design/) to file content.
 * @returns {Map<string, string>}
 */
function build() {
  const themes = Object.fromEntries(THEMES.map((theme) => [theme, loadTheme(theme)]));
  const entries = Object.fromEntries(THEMES.map((theme) => [theme, cssEntries(themes[theme])]));
  const [first, ...rest] = THEMES;
  const baseline = new Map(entries[first].map((entry) => [entry.name, entry.value]));
  /** @type {Map<string, string>} */
  const out = new Map();

  const css = [`/* ${BANNER} */`, "", `:root,\n[data-theme="${first}"] {\n  color-scheme: ${first};\n${declarations(entries[first], null).join("\n")}\n}`];
  for (const theme of rest) {
    const lines = declarations(entries[theme], baseline).join("\n");
    css.push(
      `@media (prefers-color-scheme: ${theme}) {\n  :root:not([data-theme="${first}"]) {\n    color-scheme: ${theme};\n${lines.replace(/^/gm, "  ")}\n  }\n}`,
      `[data-theme="${theme}"] {\n  color-scheme: ${theme};\n${lines}\n}`,
    );
  }
  css.push(typeClasses(themes[first]));
  out.set("dist/tokens.css", `${css.join("\n\n")}\n`);

  const faces = FONTS.map(
    ([family, file, weight]) =>
      `@font-face {\n  font-family: "${family}";\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url("../system/project/${file}") format("woff2");\n}`,
  );
  out.set("dist/fonts.css", `/* ${BANNER} */\n\n${faces.join("\n\n")}\n`);

  out.set(
    "dist/tokens.json",
    `${JSON.stringify(Object.fromEntries(THEMES.map((theme) => [theme, Object.fromEntries(entries[theme].map((e) => [e.name, e.value]))])), null, 2)}\n`,
  );

  const perFlavor = (/** @type {(theme: import("../lib/tokens.mjs").ThemeId, emphasis: import("../lib/adapters.mjs").Emphasis) => unknown} */ make) =>
    Object.fromEntries(THEMES.flatMap((theme) => EMPHASES.map((emphasis) => [`${theme}-${emphasis}`, make(theme, emphasis)])));
  out.set("dist/mapbox-standard.json", `${JSON.stringify(perFlavor((theme, emphasis) => toMapboxStandard(themes[theme], theme, emphasis)), null, 2)}\n`);
  out.set("dist/protomaps-flavors.json", `${JSON.stringify(perFlavor((theme, emphasis) => toProtomapsFlavor(themes[theme], emphasis)), null, 2)}\n`);

  out.set("system/project/tokens.json", `${JSON.stringify(systemTokens(themes, entries), null, 2)}\n`);
  return out;
}

/**
 * The tokens in the list shape the design-system page reads.
 * @param {Record<string, import("../lib/tokens.mjs").TokenMap>} themes
 * @param {Record<string, ReturnType<typeof cssEntries>>} entries
 * @returns {Record<string, unknown>}
 */
function systemTokens(themes, entries) {
  const [first] = THEMES;
  const byName = Object.fromEntries(THEMES.map((theme) => [theme, new Map(entries[theme].map((e) => [e.name, e]))]));
  const isThemed = (/** @type {string} */ name) => THEMES.some((theme) => byName[theme].get(name)?.value !== byName[first].get(name)?.value);
  const literalOrAlias = (/** @type {ReturnType<typeof cssEntries>[number]} */ entry, /** @type {string} */ theme) => {
    const source = entry.source;
    if (source.alias !== null) return `{${cssName(themes[theme].get(source.alias).path)}}`;
    return entry.value;
  };

  /** @type {Record<string, { name: string, value: unknown, usage: string }[]>} */
  const families = { color: [], spacing: [], radius: [], shadow: [], size: [], stroke: [], zIndex: [], opacity: [] };
  const familyOf = (/** @type {import("../lib/tokens.mjs").Token} */ token, /** @type {string} */ root) => {
    if (token.type === "color") return "color";
    if (token.type === "shadow") return "shadow";
    return { space: "spacing", radius: "radius", size: "size", stroke: "stroke", z: "zIndex", opacity: "opacity" }[root] ?? null;
  };

  const themedFirst = [...entries[first]].sort((a, b) => Number(isThemed(b.name)) - Number(isThemed(a.name)));
  for (const entry of themedFirst) {
    const family = familyOf(entry.token, entry.source.path[0]);
    if (family === null) continue;
    const usage = entry.source.description || entry.source.groupDescription || entry.token.description;
    const value = isThemed(entry.name)
      ? Object.fromEntries(THEMES.map((theme) => [theme, literalOrAlias(byName[theme].get(entry.name), theme)]))
      : literalOrAlias(entry, first);
    families[family].push({ name: entry.name, value, usage });
  }

  const tokens = themes[first];
  const styleOf = (/** @type {string} */ name) => {
    const token = tokens.get(`type.${name}`);
    const value = /** @type {Record<string, any>} */ (token.value);
    return {
      name: `${PREFIX}-${name}`,
      fontSize: `${value.fontSize.value}${value.fontSize.unit}`,
      lineHeight: value.lineHeight,
      fontWeight: Number(cssValue(resolve(tokens, value.fontWeight.slice(1, -1)))),
      letterSpacing: `${value.letterSpacing.value}${value.letterSpacing.unit}`,
      sample: TYPE_SAMPLES[name],
      usage: token.description,
    };
  };

  return {
    name: "Cartowolf",
    version: 1,
    color: { themes: THEMES.map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1) })), tokens: families.color },
    type: {
      fonts: FONTS.map(([family, file, weight]) => ({ family, file, weight })),
      families: Object.fromEntries(
        ["sans", "condensed", "mono"].map((key) => [key, cssValue(resolve(tokens, `font.family.${key}`))]),
      ),
      groups: TYPE_GROUPS.map(([name, family, styles]) => ({ name, family, styles: /** @type {string[]} */ (styles).map(styleOf) })),
    },
    spacing: { tokens: families.spacing },
    radius: { tokens: families.radius },
    shadow: { tokens: families.shadow },
    size: { tokens: families.size },
    stroke: { tokens: families.stroke },
    zIndex: { tokens: families.zIndex },
    opacity: { tokens: families.opacity },
  };
}

const args = new Set(process.argv.slice(2));
if (args.has("--fix-components")) fixComponents();

const outputs = build();
if (args.has("--check")) {
  const stale = [...outputs].filter(([file, content]) => {
    const target = path.join(DESIGN_ROOT, file);
    return !fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content;
  });
  if (stale.length > 0) {
    console.error(`Stale outputs: ${stale.map(([file]) => `design/${file}`).join(", ")}\nRun: node design/scripts/build.mjs`);
    process.exit(1);
  }
  console.log(`design: ${outputs.size} outputs are up to date`);
} else {
  for (const [file, content] of outputs) {
    const target = path.join(DESIGN_ROOT, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    console.log(`wrote design/${file}`);
  }
}
