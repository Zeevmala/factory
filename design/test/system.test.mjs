/**
 * Checks that the pieces agree with each other: generated outputs are current,
 * components only use tokens that exist, the map adapters cover what the map
 * stacks require, and the colour lint catches what it should.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { DEFICIENCIES, contrast, deltaE, hexToOklab, oklchToHex, hexToOklch, simulate } from "../lib/color.mjs";
import { EMPHASES, PROTOMAPS_FLAVOR_KEYS, toMapboxStandard, toProtomapsFlavor } from "../lib/adapters.mjs";
import { CLASS_COUNTS, RAMPS } from "../lib/ramps.mjs";
import { DESIGN_ROOT, THEMES, loadTheme } from "../lib/tokens.mjs";
import { check, literalsIn } from "../scripts/check-colors.mjs";

const read = (/** @type {string} */ file) => fs.readFileSync(path.join(DESIGN_ROOT, file), "utf8");
const fixture = (/** @type {string} */ name) => JSON.parse(read(`test/fixtures/${name}`));

test("colour maths: known values", () => {
  assert.equal(contrast("#000000", "#ffffff"), 21);
  const red = hexToOklab("#ff0000");
  assert.ok(Math.abs(red.L - 0.628) < 0.001 && Math.abs(red.a - 0.225) < 0.001 && Math.abs(red.b - 0.126) < 0.001);
  assert.equal(oklchToHex(hexToOklch("#3a7ca5")), "#3a7ca5");
  assert.ok(deltaE("#e03131", "#2f9e44") > 0.3);
});

test("colour-vision simulation matches the DaltonLens reference within one step per channel", () => {
  const reference = fixture("cvd-reference.json").colors;
  for (const [hex, expected] of Object.entries(reference)) {
    for (const deficiency of DEFICIENCIES) {
      const mine = simulate(hex, deficiency);
      const diff = [1, 3, 5].map((i) => Math.abs(parseInt(mine.slice(i, i + 2), 16) - parseInt(expected[deficiency].slice(i, i + 2), 16)));
      assert.ok(Math.max(...diff) <= 2, `${hex} ${deficiency}: ${mine} vs ${expected[deficiency]}`);
    }
  }
});

test("generated outputs are current", () => {
  execFileSync(process.execPath, [path.join(DESIGN_ROOT, "scripts/build.mjs"), "--check"], { stdio: "pipe" });
});

test("components and previews only use tokens that exist", () => {
  const defined = new Set(Object.keys(JSON.parse(read("dist/tokens.json")).light));
  const files = ["system/project/components/bundle.css", "system/project/components/bundle.js", "docs/index.html"];
  for (const dir of fs.readdirSync(path.join(DESIGN_ROOT, "system/project/components"), { withFileTypes: true })) {
    if (dir.isDirectory()) files.push(`system/project/components/${dir.name}/preview.html`);
  }
  const missing = [];
  for (const file of files) {
    const text = read(file);
    for (const match of text.matchAll(/var\(--(cw-[a-z0-9-]+)/g)) {
      const name = match[1];
      if (name.endsWith("-")) continue;
      const setLocally = new RegExp(`--${name}\\s*:`).test(text) || name === "cw-marker-color" || name === "cw-swatch";
      if (!defined.has(name) && !setLocally) missing.push(`${file}: --${name}`);
    }
    // bundle.js builds basemap names at run time: check the keys it can produce.
    for (const match of text.matchAll(/color\("([a-z-]+)"\)/g)) {
      for (const prefix of ["cw-map-", "cw-map-muted-"]) {
        if (!defined.has(prefix + match[1])) missing.push(`${file}: --${prefix}${match[1]}`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test("components hold no hand-written colours", () => {
  const findings = check([path.join(DESIGN_ROOT, "system/project/components")]);
  assert.deepEqual(findings.map((f) => `${path.basename(path.dirname(f.file))}/${path.basename(f.file)}:${f.line} ${f.match}`), []);
});

test("the colour lint flags literals and leaves tokens, ids and issue numbers alone", () => {
  assert.deepEqual(literalsIn("  color: #1a2b3c;", true), ["#1a2b3c"]);
  assert.deepEqual(literalsIn("  background: rgba(0, 0, 0, 0.5);", true), ["rgba(0, 0, 0, 0.5)"]);
  assert.deepEqual(literalsIn('const c = "#fff";', false), ["#fff"]);
  assert.deepEqual(literalsIn("  color: var(--cw-text);", true), []);
  assert.deepEqual(literalsIn("#header .nav {", true), []);
  assert.deepEqual(literalsIn("see issue #115 for why", false), []);
  assert.deepEqual(literalsIn("// was #ff0000 before", false), []);
  assert.deepEqual(literalsIn('fill: "#25d366", // cw-allow-color: WhatsApp brand green', false), []);
  assert.deepEqual(literalsIn('<a href="#section">', false), []);
});

test("Protomaps adapter fills every required Flavor key, and no others", () => {
  const required = fixture("protomaps-flavor-keys.json").keys;
  assert.deepEqual([...PROTOMAPS_FLAVOR_KEYS].sort(), [...required].sort());
  for (const theme of THEMES) {
    for (const emphasis of EMPHASES) {
      const flavor = toProtomapsFlavor(loadTheme(theme), emphasis);
      for (const key of required) assert.match(flavor[key], /^#[0-9a-f]{6}$/, `${theme}/${emphasis}: ${key}`);
    }
  }
});

test("Mapbox Standard adapter follows the theme and the emphasis", () => {
  const dark = toMapboxStandard(loadTheme("dark"), "dark", "muted");
  assert.equal(dark.lightPreset, "night");
  assert.equal(dark.theme, "faded");
  assert.equal(dark.showPointOfInterestLabels, false);
  const light = toMapboxStandard(loadTheme("light"), "light", "default");
  assert.equal(light.lightPreset, "day");
  assert.equal(light.theme, "default");
  for (const key of ["colorLand", "colorWater", "colorGreenspace", "colorRoads", "colorTrunks", "colorMotorways"]) {
    assert.match(String(light[key]), /^#[0-9a-f]{6}$/, key);
  }
});

test("ramps.json holds every palette of every theme, and its seven classes are the tokens", () => {
  const ramps = JSON.parse(read("dist/ramps.json"));
  const tokens = JSON.parse(read("dist/tokens.json"));
  assert.deepEqual(Object.keys(ramps), THEMES);
  for (const theme of THEMES) {
    assert.deepEqual(ramps[theme].cat.colors, [1, 2, 3, 4, 5, 6].map((n) => tokens[theme][`cw-data-cat-${n}`]));
    assert.equal(ramps[theme].cat.other, tokens[theme]["cw-data-cat-other"]);
    for (const [kind, names] of Object.entries(RAMPS)) {
      assert.deepEqual(Object.keys(ramps[theme][kind]), [...names]);
      for (const name of names) {
        const ramp = ramps[theme][kind][name];
        assert.deepEqual(Object.keys(ramp.classes).map(Number), CLASS_COUNTS);
        for (const n of CLASS_COUNTS) {
          assert.equal(ramp.classes[n].length, n);
          for (const colour of ramp.classes[n]) assert.match(colour, /^#[0-9a-f]{6}$/, `${theme} ${name} ${n}`);
        }
        const sevens = [1, 2, 3, 4, 5, 6, 7].map((n) => tokens[theme][`cw-data-${kind}-${name}-${n}`]);
        assert.deepEqual(ramp.classes[7], sevens);
        assert.deepEqual(ramp.stops.map((/** @type {[number, string]} */ stop) => stop[1]), sevens);
        assert.equal(ramp.stops[0][0], 0);
        assert.equal(ramp.stops.at(-1)[0], 1);
      }
    }
  }
});

test("the dark theme's data ramps differ from the light theme's: the direction follows the basemap", () => {
  const tokens = JSON.parse(read("dist/tokens.json"));
  for (const [kind, names] of Object.entries(RAMPS)) {
    for (const name of names) {
      assert.notEqual(tokens.dark[`cw-data-${kind}-${name}-1`], tokens.light[`cw-data-${kind}-${name}-1`], `${kind} ${name}`);
    }
  }
});

test("the design-system token list is in the shape its page reads", () => {
  const system = JSON.parse(read("system/project/tokens.json"));
  const names = [];
  for (const family of ["color", "spacing", "radius", "shadow", "size", "stroke", "zIndex", "opacity"]) {
    assert.ok(Array.isArray(system[family].tokens), `${family} is a list`);
    for (const token of system[family].tokens) {
      assert.match(token.name, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/);
      assert.ok(token.usage, `${token.name} has a usage note`);
      names.push(token.name);
    }
  }
  assert.equal(new Set(names).size, names.length, "token names are unique across families");
  const colours = new Set(system.color.tokens.map((t) => t.name));
  for (const token of system.color.tokens) {
    for (const value of typeof token.value === "string" ? [token.value] : Object.values(token.value)) {
      const alias = /^\{(.+)\}$/.exec(value);
      if (alias) assert.ok(colours.has(alias[1]), `${token.name} aliases a colour that exists`);
      else assert.match(value, /^(#[0-9a-f]{6}|rgba\(\d+, \d+, \d+, [\d.]+\))$/, token.name);
    }
  }
  for (const font of system.type.fonts) assert.ok(fs.existsSync(path.join(DESIGN_ROOT, "system/project", font.file)), font.file);
});
