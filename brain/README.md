# Brain

The factory's shared context. Every build and review run gets a copy of this folder in `.factory-run/brain/` and reads it before it starts. The models are the same for everyone; this folder is the part that is yours.

This repository is public, so only public-safe material goes here. Customer data, private decisions, numbers you would not post, and your personal second brain belong in a private repository. Runs never read that one.

## Files

| File | What it holds | Who writes it |
| --- | --- | --- |
| `FACTS.md` | True statements about you and your projects that agents may repeat. Anything not here or in the code is left out, not guessed. | You |
| `VOICE.md` | How prose an agent writes for you should read: READMEs, PR text, docs, commit messages. | You |
| `PRINCIPLES.md` | How you decide: engineering rules, stack defaults, GIS conventions. | You |
| `STACK.md` | Default technology choices for new work, and where they do not apply. | You |
| `DECISIONS.md` | Decisions that apply across projects, with the reason and the date. | You |
| `playbooks/build.md`, `playbooks/review.md` | Lessons from past runs, condensed into rules for the next ones. | The weekly curate run proposes; you merge |
| `digests/` | One file per week: what shipped, what failed, cost per ticket, what to stop. | The weekly curate run proposes; you merge |
| `projects.txt` | Repositories connected to the factory. The curate run reads their week. | `Add-FactoryRepo.ps1` |

Each project also keeps its own `docs/brain/`: `DECISIONS.md` for that project and `lessons/`, one dated file per lesson, written by build runs inside their pull requests.

## Rules

1. Read before any task. Runs read `README.md`, `FACTS.md`, `PRINCIPLES.md`, `STACK.md` and the playbook for their role; `VOICE.md` when they write prose.
2. Never overwrite an entry. Correct a dated entry by adding a new one that says what it replaces.
3. Always date. Entries start with `YYYY-MM-DD`. Files that agents create carry the date in the name.
4. Agents propose, you approve. Nothing here changes without a pull request that you merge, and the curate run can only touch `playbooks/` and `digests/`.
5. Small beats complete. A rule that fits on one line is read; a page of caveats is skimmed.
