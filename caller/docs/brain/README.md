# Project brain

What this project has learned, kept next to its code.

- `DECISIONS.md`: project decisions, dated, append-only.
- `lessons/`: one file per lesson, named `YYYY-MM-DD-issue-N.md`. Build runs add one inside their pull request when they learned something the next run should know. You approve it when you merge.

Every week the factory's curate run reads the lessons added here, together with run results and reviews, and proposes updates to the shared playbooks in the factory repository's `brain/`.

A lesson file:

```markdown
# <one-line rule the next run should follow>

- Date: YYYY-MM-DD
- Ticket: #N
- What happened: what was tried, what failed or surprised, with the command or error.
- Rule: what to do next time, specific enough to act on.
```
