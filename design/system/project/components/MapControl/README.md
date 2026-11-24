A stack of icon buttons floating on the map: zoom, fit, locate.

**You provide:** a `div.cw-control` holding `button.cw-control__button` elements, each with an inline SVG icon (20px box, drawn with strokes, no fill) and an `aria-label`. Position the stack yourself, 12px from the map edge, with logical insets so it mirrors in right-to-left layouts.

- A toggle sets `aria-pressed="true"`; the pressed style follows.
- Group related buttons in one stack (zoom in, zoom out). Separate stacks for unrelated ones.
- Show zoom buttons only where there is a pointer (`(hover: hover) and (pointer: fine)`); touch users pinch.
- Buttons grow to the 44px touch target on coarse pointers. Do not shrink them.
- Never cover the map provider's logo or attribution with a control.
