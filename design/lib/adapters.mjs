/**
 * Turns the basemap flavor tokens into the configuration two map stacks expect:
 * Mapbox Standard (`config.basemap`) and Protomaps basemaps (a `Flavor` object for MapLibre).
 *
 * @typedef {import("./tokens.mjs").TokenMap} TokenMap
 * @typedef {import("./tokens.mjs").ThemeId} ThemeId
 * @typedef {"default" | "muted"} Emphasis
 */

import { hexOf } from "./tokens.mjs";

/** @type {Emphasis[]} */
export const EMPHASES = ["default", "muted"];

/** The flavor keys every theme and emphasis defines. */
export const FLAVOR_KEYS = [
  "land", "water", "greenspace", "built", "road-minor", "road-casing", "road-major", "road-motorway",
  "rail", "boundary", "label", "label-halo", "label-water", "poi",
];

/**
 * Read one flavor as a plain object of hex colours.
 * @param {TokenMap} tokens
 * @param {Emphasis} emphasis
 * @returns {Record<string, string>}
 */
export function flavorOf(tokens, emphasis) {
  return Object.fromEntries(FLAVOR_KEYS.map((key) => [key, hexOf(tokens, `map.${emphasis}.${key}`)]));
}

/**
 * Configuration for the Mapbox Standard style: pass as `config: { basemap }` when
 * creating the map, or apply each key with `map.setConfigProperty("basemap", key, value)`.
 * Land-use tints are flattened to the built colour so the palette stays at the
 * flavor's few tones. POI labels are off in the muted emphasis, where data leads.
 * @param {TokenMap} tokens
 * @param {ThemeId} theme
 * @param {Emphasis} emphasis
 * @returns {Record<string, string | boolean>}
 */
export function toMapboxStandard(tokens, theme, emphasis) {
  const flavor = flavorOf(tokens, emphasis);
  return {
    lightPreset: theme === "dark" ? "night" : "day",
    theme: emphasis === "muted" ? "faded" : "default",
    colorLand: flavor.land,
    colorWater: flavor.water,
    colorGreenspace: flavor.greenspace,
    colorCommercial: flavor.built,
    colorEducation: flavor.built,
    colorMedical: flavor.built,
    colorIndustrial: flavor.built,
    colorRoads: flavor["road-minor"],
    colorTrunks: flavor["road-major"],
    colorMotorways: flavor["road-motorway"],
    colorPlaceLabelHighlight: hexOf(tokens, "data.selection"),
    colorPlaceLabelSelect: hexOf(tokens, "data.selection"),
    showPointOfInterestLabels: emphasis === "default",
    showTransitLabels: emphasis === "default",
  };
}

/**
 * Which flavor colour fills each required key of the Protomaps `Flavor` interface
 * (protomaps/basemaps, styles/src/flavors.ts).
 * @type {Record<string, string>}
 */
const PROTOMAPS_KEYS = {
  background: "water",
  earth: "land",
  park_a: "greenspace", park_b: "greenspace", wood_a: "greenspace", wood_b: "greenspace",
  scrub_a: "greenspace", scrub_b: "greenspace", zoo: "greenspace",
  hospital: "built", industrial: "built", school: "built", pedestrian: "built", military: "built",
  aerodrome: "built", pier: "built", buildings: "built",
  glacier: "land", sand: "land", beach: "land",
  runway: "road-minor",
  water: "water",
  tunnel_other_casing: "road-casing", tunnel_minor_casing: "road-casing", tunnel_link_casing: "road-casing",
  tunnel_major_casing: "road-casing", tunnel_highway_casing: "road-casing",
  tunnel_other: "built", tunnel_minor: "built", tunnel_link: "built", tunnel_major: "built", tunnel_highway: "built",
  minor_service_casing: "road-casing", minor_casing: "road-casing", link_casing: "road-casing",
  major_casing_late: "road-casing", major_casing_early: "road-casing",
  highway_casing_late: "road-casing", highway_casing_early: "road-casing",
  other: "road-minor", minor_service: "road-minor", minor_a: "road-minor", minor_b: "road-minor",
  link: "road-major", major: "road-major", highway: "road-motorway",
  railway: "rail",
  boundaries: "boundary",
  bridges_other_casing: "road-casing", bridges_minor_casing: "road-casing", bridges_link_casing: "road-casing",
  bridges_major_casing: "road-casing", bridges_highway_casing: "road-casing",
  bridges_other: "road-minor", bridges_minor: "road-minor", bridges_link: "road-major",
  bridges_major: "road-major", bridges_highway: "road-motorway",
  roads_label_minor: "label", roads_label_minor_halo: "label-halo",
  roads_label_major: "label", roads_label_major_halo: "label-halo",
  ocean_label: "label-water",
  subplace_label: "label", subplace_label_halo: "label-halo",
  city_label: "label", city_label_halo: "label-halo",
  state_label: "poi", state_label_halo: "label-halo",
  country_label: "poi",
  address_label: "poi", address_label_halo: "label-halo",
};

/** Required keys of the Protomaps `Flavor` interface that this adapter fills. */
export const PROTOMAPS_FLAVOR_KEYS = Object.keys(PROTOMAPS_KEYS);

/**
 * A complete Protomaps `Flavor`: pass to `layers("protomaps", flavor, { lang })`
 * from `@protomaps/basemaps`. The optional `pois` and `landcover` blocks are left
 * out, so the style draws no POI icons, as its data-visualisation flavors do.
 * @param {TokenMap} tokens
 * @param {Emphasis} emphasis
 * @returns {Record<string, string>}
 */
export function toProtomapsFlavor(tokens, emphasis) {
  const flavor = flavorOf(tokens, emphasis);
  return Object.fromEntries(Object.entries(PROTOMAPS_KEYS).map(([key, source]) => [key, flavor[source]]));
}
