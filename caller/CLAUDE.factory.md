<!-- factory:start -->
## Factory

This repo is built by a design-gated factory. Humans approve designs and merge pull requests. Unattended runs build one ticket at a time and give it a first review.

- Approved designs live in `docs/designs/`, indexed by `docs/designs/SITEMAP.md`. A ticket implements one slice of one design and links it.
- EGM artifact directory: docs/designs/drafts
- The gate is `bash .factory/check.sh`.
- Ticket labels: `needs-triage`, `needs-info`, `ready-for-agent`, `agent-in-progress`, `in-review`, `ready-for-human`.

### Always
- Write the failing test before the code that makes it pass.
- Run the gate commands and report what they printed before saying anything passes.
- Use the terms in `GLOSSARY.md` for names. Keep changes inside the ticket.

### Ask first
In a session with a person, ask. In an unattended run, write the question to `.factory-run/BLOCKED.md` and stop.
- Adding or upgrading a dependency the design does not name.
- Changing a public interface, a database schema, or a data format.
- Anything the ticket and the design disagree about.

### Never
- Edit `.github/` or `.factory/` from an unattended run.
- Weaken or delete a test, lint rule or type check to get to green.
- Commit credentials, `.env` files, model weights or data files.
- Push to the default branch or merge a pull request.
<!-- factory:end -->
