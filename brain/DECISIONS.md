# Decisions

Decisions that apply to every project, and why. Append; never edit an entry. To reverse one, add a new entry that names the one it replaces. Project-only decisions go in that project's `docs/brain/DECISIONS.md`.

Format: `YYYY-MM-DD — decision. Why. (replaces YYYY-MM-DD, if it does)`

- 2026-11-12 — One central factory repository; each project holds only a thin caller workflow and its own gate. A fix here reaches every project at once.
- 2026-11-12 — The factory repository is public. Public and private projects can both call it, so it never holds secrets.
- 2026-11-12 — The building agent's token is read-only; a separate clean runner scans and publishes. A run that is tricked into misbehaving still cannot push.
- 2026-11-12 — One build at a time per repository. Parallel builds would race on shared files and on the ticket queue.
- 2026-11-12 — Releases go out by moving the `v1` branch, not a tag, so a release is an ordinary push.
- 2026-11-15 — Shared context lives in `brain/` in this repository and holds only public-safe material. Private context goes in a separate private repository that runs do not read.
- 2026-11-15 — Lessons are written one file per lesson, with the date in the name. Concurrent pull requests then never conflict on a shared file.
- 2026-11-15 — The weekly curate run may change only `brain/playbooks/` and `brain/digests/`, through a pull request. Facts, voice, principles and decisions are yours alone.
- 2026-11-15 — Runs read `brain/` from the factory's `main` branch; prompts and workflows stay on `v1`. Brain is content: an approved playbook change should be live on merge, without a code release.
- 2026-11-15 — Every run records its cost and turn count on the ticket or PR. A job that costs more than it saves gets fixed or dropped.
