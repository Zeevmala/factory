/* @ds-bundle: {"format":4,"namespace":"Cartowolf","components":[]} */
/**
 * Cartowolf specimen helpers. Not an app runtime: the components are CSS classes
 * (bundle.css). This script only draws the sample basemap the previews sit on.
 */
(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  /**
   * Create an SVG element with attributes.
   * @param {string} name
   * @param {Record<string, string | number>} attrs
   * @returns {SVGElement}
   */
  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, String(attrs[key]));
    });
    return node;
  }

  /**
   * Draw a sample basemap from the flavor tokens: a coast with the sea to the
   * west, a river, a park, a street grid, a motorway with rail beside it and a
   * dashed boundary. Every colour is a `--cw-map-*` custom property, so the map
   * follows the theme and the chosen emphasis.
   *
   * @param {Element} target element to draw into; it should have a size
   * @param {{ emphasis?: "default" | "muted", labels?: boolean }} [options]
   * @returns {SVGElement} the map, in a 480 x 300 coordinate space
   */
  function miniMap(target, options) {
    var emphasis = options && options.emphasis === "muted" ? "muted-" : "";
    var labels = !options || options.labels !== false;
    var color = function (key) {
      return "var(--cw-map-" + emphasis + key + ")";
    };
    var svg = el("svg", { viewBox: "0 0 480 300", preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": "Sample basemap" });
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    var add = function (name, attrs, style) {
      var node = el(name, attrs);
      if (style) node.style.cssText = style;
      svg.appendChild(node);
      return node;
    };
    var line = function (d, key, width, extra) {
      add("path", { d: d, fill: "none", "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" }, "stroke:" + color(key) + ";" + (extra || ""));
    };

    add("rect", { x: 0, y: 0, width: 480, height: 300 }, "fill:" + color("water"));
    add("path", { d: "M150 0 C142 70 118 150 104 300 L480 300 L480 0 Z" }, "fill:" + color("land"));
    add("path", { d: "M300 150 C330 138 372 144 392 168 C404 190 384 214 350 214 C318 214 292 196 292 174 C292 164 294 156 300 150 Z" }, "fill:" + color("greenspace"));
    line("M480 62 C420 70 380 96 330 92 C280 88 250 108 210 104 C180 101 158 110 132 108", "water", 8);

    [[176, 132, 44, 30], [176, 176, 44, 36], [232, 132, 40, 30], [232, 176, 40, 36], [176, 228, 44, 40], [232, 228, 40, 40], [404, 196, 50, 34], [404, 244, 50, 36], [300, 232, 60, 44], [196, 28, 60, 44], [276, 20, 56, 40]].forEach(function (b) {
      add("rect", { x: b[0], y: b[1], width: b[2], height: b[3], rx: 2 }, "fill:" + color("built"));
    });

    var minor = ["M166 124 H470", "M166 170 H286", "M166 220 H286", "M398 190 H470", "M398 236 H470", "M226 124 V290", "M280 124 V290", "M398 124 V290", "M462 124 V290", "M190 14 V84", "M264 10 V80", "M340 14 V76"];
    minor.forEach(function (d) { line(d, "road-casing", 5); });
    minor.forEach(function (d) { line(d, "road-minor", 3); });
    var major = ["M120 118 C200 122 300 118 480 124", "M286 0 C290 100 284 200 290 300"];
    major.forEach(function (d) { line(d, "road-casing", 8); });
    major.forEach(function (d) { line(d, "road-major", 5.5); });
    line("M372 0 C380 90 366 190 380 300", "road-casing", 10);
    line("M372 0 C380 90 366 190 380 300", "road-motorway", 7);
    line("M386 0 C394 90 380 190 394 300", "rail", 1.5, "stroke-dasharray:6 4");
    line("M150 262 C230 250 330 270 480 252", "boundary", 1.5, "stroke-dasharray:2 5");

    if (labels) {
      var text = function (x, y, content, key, extra) {
        var node = add("text", { x: x, y: y }, "font:500 12px var(--cw-font-condensed, var(--font-condensed));fill:" + color(key) + ";paint-order:stroke;stroke-width:3px;stroke-linejoin:round;" + (extra || "stroke:" + color("label-halo")));
        node.textContent = content;
      };
      text(24, 150, "Mediterranean", "label-water", "font-style:italic;stroke:" + color("water"));
      text(24, 165, "Sea", "label-water", "font-style:italic;stroke:" + color("water"));
      text(178, 204, "Tel Aviv–Yafo", "label", "font-weight:600;font-size:13px;stroke:" + color("label-halo"));
      text(178, 219, "תל אביב–יפו", "label");
      text(306, 186, "HaYarkon Park", "poi");
      text(410, 60, "Ayalon", "label");
    }
    target.insertBefore(svg, target.firstChild);
    return svg;
  }

  global.Cartowolf = { miniMap: miniMap };
})(window);
