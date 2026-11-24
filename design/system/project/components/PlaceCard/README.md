What a selected place shows: its name, one line of context, a few rows of figures, and at most two actions.

**You provide:** the title, the meta line, rows as a `dl` (label in `dt`, figure in `dd`), and the buttons. Set `dir` and `lang` on the card when its language differs from the page.

- Wrap every number-with-unit in `<bdi>` ("6.2 km"). Inside Hebrew text the bidirectional algorithm otherwise reorders it to "km 6.2".
- Figures are mono with tabular figures, so columns of times and distances align.
- One primary button. A second action is `cw-button--quiet`.
- Keep the selected place visible: offset the card so it points at the place and does not sit on it.
- On a phone, show the same content in a Sheet instead.
