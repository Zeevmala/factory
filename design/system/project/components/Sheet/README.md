The bottom card on a phone: everything that would otherwise float over the map lives here.

**You provide:** the content, and the positioning (fixed to the bottom edge, full width). Report the sheet's height to the map as bottom padding, so "fit to everyone" frames people in the visible part.

- The grabber is a real button with an `aria-label`. If the sheet does not resize, leave the grabber out.
- Lift the map provider's logo and attribution above the sheet.
- Add the bottom safe-area inset to the sheet's own padding.
- One sheet at a time. A second layer of detail replaces the content; it does not stack.
