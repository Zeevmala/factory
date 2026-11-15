# Factory

One central repository that builds tickets for all your projects. You approve designs and merge pull requests; unattended runs on GitHub's runners do the building and a first review in between. Each project holds one small caller workflow and its own gate script, so a fix here reaches every project at once.

Every run reads a shared brain (`brain/`: facts, voice, principles, decisions, playbooks) and leaves what it learned in the project's `docs/brain/`. Once a week a curate run turns the week's lessons, failures, reviews and costs into a dated digest and updated playbooks, and opens a pull request for you to approve.

## Layout

```
.github/workflows/   build.yml, review.yml, drift.yml   reusable workflows (all the logic)
                     curate.yml                         weekly loop; runs in this repo only
prompts/             build.md, review.md, drift.md,     what each run is told
                     curate.md
brain/               facts, voice, principles,          shared context every run reads
                     decisions, playbooks, digests
profiles/            node/, python/                     starting gate files per stack
caller/              files copied into each project
Deploy-Factory.ps1   publish or update this repository
Add-FactoryRepo.ps1  connect one project
```

A connected project gets `.github/workflows/factory.yml` (the caller), `.factory/` (`check.sh`, `setup.sh`, `allowed-tools.txt`, `review-checklist.md`), `docs/designs/`, `docs/brain/` (`DECISIONS.md`, `lessons/`), and a block in `CLAUDE.md`.

## How a ticket moves

```
you, locally                         GitHub Actions                                   you
/egm:egm-brainstorm, -draft, -review
approved doc -> docs/designs/
/mattpocock-skills:to-tickets
label ready-for-agent ──▶ pick     claim the next unblocked ticket
                          build    agent builds test-first; gate runs      (read-only token)
                          publish  clean runner: scan, push, open PR       (write token, runs no project code)
                          review   new runner, sees diff + ticket only ──▶ review-pass / review-block ──▶ merge
```

Merging closes the ticket and unblocks the ones behind it; a sweep every four hours picks them up. A weekly run compares `docs/designs/` with the code and keeps one `design-drift` issue current.

## The brain and the loop

```
brain/ (this repo, main)  ──read by──▶  build and review runs  ──▶  PR adds docs/brain/lessons/<date>-issue-N.md
        ▲                                                                       │ you merge
        │ you merge                                                              ▼
curate PR: digests/<week>.md + playbooks  ◀── Friday curate run reads every project's week:
                                                lessons, run and review comments, your comments,
                                                merged / rejected / to-human, cost per run
```

- **What runs read.** Build runs read `FACTS.md`, `PRINCIPLES.md`, `playbooks/build.md`, and `VOICE.md` before writing prose; reviewers read `PRINCIPLES.md`, `FACTS.md` and `playbooks/review.md`. Runs read `brain/` from `main`, so a merged brain change is live at once; prompts and workflows still release through `v1`.
- **Facts file.** A run may state a fact about you or a project only if it is in `FACTS.md` or provable from the code. The reviewer blocks unsupported claims.
- **Append-only, dated.** Lessons are one file each with the date in the name, so concurrent PRs never conflict. A build PR that edits or deletes an existing brain entry gets a warning in its description, and the reviewer blocks it.
- **Cost per job.** Every run and review comment carries its cost (API-equivalent USD) and turn count, plus a machine-readable `<!-- factory-cost -->` line. The digest totals them per project and per merged ticket.
- **Curate.** Fridays 06:37 UTC, or by hand from the Actions tab. The agent runs with a read-only token and may edit only `brain/playbooks/` and `brain/digests/`; a separate job applies the patch only if every path is a plain Markdown file under those two folders. Facts, voice, principles and decisions change only when you edit them. It reads public projects only; a private one shows up as unreadable in the digest.
- **Private context stays out.** This repo is public. Customer data, private numbers and your personal notes go in a private repository that runs do not read.

## Rollout

**0. Prerequisites (once):** PowerShell 7, `git`, `gh auth login`, Claude Code.

**1. Publish this repository (once):**

```powershell
$env:CLAUDE_CODE_OAUTH_TOKEN = Read-Host -MaskInput 'Token'   # from `claude setup-token`; used by the weekly curate run
./Deploy-Factory.ps1          # creates the public repo <you>/factory and its v1 release branch
```

Then fill in the blanks in `brain/FACTS.md` and the examples in `brain/VOICE.md`, and correct anything in `brain/PRINCIPLES.md` that is not how you decide.

It must be public so that public and private projects can both call it. It contains no secrets.

**2. Get a credential (once per machine session):**

```powershell
claude setup-token
$env:CLAUDE_CODE_OAUTH_TOKEN = Read-Host -MaskInput 'Token'
```

Personal accounts have no shared secrets, so the next step stores it in each project for you.

**3. Connect a project (once each, including every future one):**

```powershell
./Add-FactoryRepo.ps1 -RepoPath C:\dev\meet-me-halfway -Global -OpenPr   # -Global only the first time
```

This detects the stack and app folder, copies the files, creates the labels, lets Actions open pull requests, stores the secret, adds the repo to `brain/projects.txt`, and opens a pull request. Run `./Deploy-Factory.ps1` afterwards so the curate run sees the new repo. Before merging it, edit `.factory/check.sh` until it runs the project's real checks and passes locally. That file defines "done".

**4. First live run:** on the first project, label one small ticket `ready-for-agent` and read the Actions log end to end before labelling a second.

Then in Claude Code, once per project: `/mattpocock-skills:setup-matt-pocock-skills` (choose GitHub, keep the default labels).

### Your repositories

| Repo | State | What to do |
| --- | --- | --- |
| meet-me-halfway | public, app in `apps/web` (detected) | Connect first. Make `check.sh` mirror the commands in its existing `web.yml`. |
| world-population-globe | public, Node, no `test` script | The default gate fails on `npm run test`. Point `check.sh` at `typecheck`, `lint`, `build`, `verify`, or add tests first. |
| solelot | public, static `index.html`, no manifest | Nothing to gate yet. Skip until it has a test command. |
| litmap, SLG | private, not inspected | Private repos spend your plan's Actions minutes. SLG has been idle since 2024. |
| chat-with-national-map, israel-coastline-change | not on GitHub under those names | Run step 3 the day each repo is created. |

## Daily use

- Label a ticket `ready-for-agent` to start a run. `priority-1` to `priority-4` jump the queue.
- Read `review-pass` pull requests first. For `review-block`, fix it or re-apply `ready-for-agent`; the next run continues on the same branch with the review in front of it.
- `needs-info` means the run posted a question. Answer in a comment and re-apply `ready-for-agent`.
- `ready-for-human` means the attempt cap was hit or the branch was held.

## Settings (repository variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `FACTORY_MAX_ATTEMPTS` | `3` | Runs per ticket before `ready-for-human` |
| `FACTORY_BUILD_MODEL` / `FACTORY_REVIEW_MODEL` | `sonnet` / `opus` | Models |
| `FACTORY_BUILD_MAX_TURNS` / `FACTORY_REVIEW_MAX_TURNS` | `80` / `40` | Turn caps |
| `FACTORY_MAX_FILE_MB` | `5` | Largest file a run may add |
| `FACTORY_AUTO_REWORK` | `false` | `true` sends a blocked factory PR back to the queue without you |
| `FACTORY_CURATE_MODEL` / `FACTORY_CURATE_MAX_TURNS` | `opus` / `60` | Weekly curate run (set on this repo) |

## What protects your default branch

1. **The agent's token is read-only.** It cannot push, comment or label. Its work leaves the runner as a git bundle.
2. **A clean runner publishes.** It refuses the bundle if it touches `.github/` or `.factory/`, adds a file over the size cap, or trips the secret scan (gitleaks, checksum-pinned; fails closed). It never checks out or runs the code.
3. **Deny rules** stop the agent editing `.github/` and `.factory/` or reading `.env`, key files and `secrets/`, whatever a ticket says.
4. **The gate** is the default branch's `check.sh`. The agent cannot change it.
5. **The reviewer** runs on another machine and never saw the build. It can write one report.
6. **You merge.** Nothing in the factory approves or merges. Add a branch rule on `main` that requires a pull request, so this holds even if a workflow is changed later.

Limits: the secret scan matches known key formats, not every possible secret. Code the agent runs (`npm`, `pytest`) can reach the network; the action is asked to strip secrets from those processes. Only text you wrote reaches the build prompt: the ticket and comments from repo owners and collaborators.

## Verified, and not

Verified here: workflows pass `actionlint` (callers and reusable workflows together) and `shellcheck`. Every shell step ran against scratch repositories: ticket selection, context building, pinned-skill loading, the gate, bundle hand-off, and publishing in eight outcomes, including a forged bundle that changed a workflow, a planted secret, a 6 MB file, a dead build job and a tampered result file (all held or retried as intended). Both scripts ran under PowerShell 7.4 against stand-ins for `gh`, on a monorepo, a Python repo, a static site and a dirty tree.

The brain and loop were checked the same way: the curate gather step against a scratch project (a lesson from this week collected, an old one skipped, a malformed `projects.txt` line and an unreadable repo skipped); the curate publish check against nine patches (accepted only the plain Markdown one under the allowed folders; rejected a symlink, binary, executable, rename, nested path, non-Markdown file, a forged edit to a prompt, and a `..` path); the brain fetch from `main` with fallback to `v1`; the append-only warning on five branches; cost parsing; and both PowerShell scripts under 7.4 against a stand-in `gh`.

Not verified, because it needs GitHub: a live run. In particular, the cross-repository workflow call, the one-build-at-a-time lock on the caller job, the action running on a read-only token, and the deny rules inside the action. Step 4 is the test.

Known behaviour: scheduled runs come only from the default branch, and GitHub pauses schedules on public repos after 60 days without activity. One build runs at a time per repo. A retry waits for the next sweep. With a subscription token, runs draw on the same plan limits as your own sessions.

## Updating

Edit this repository, then run `./Deploy-Factory.ps1` again. It pushes `main` and fast-forwards the `v1` branch, and every connected project uses the new version on its next run. `v1` is a branch, not a tag, so a release is an ordinary push; protect it in the repo's branch settings if anyone else gets write access. Third-party pieces are pinned in `build.yml` by commit or checksum; read the upstream diff before moving a pin.

## Where the parts come from

| Part | Source |
| --- | --- |
| Headless agent runtime | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) |
| Claim, reconcile, priority order, attempt counter, hand-off state | [openai/symphony](https://github.com/openai/symphony) `SPEC.md` |
| Evidence-before-claims and root-cause skills, loaded per run | [obra/superpowers](https://github.com/obra/superpowers) |
| Test-first skill per run; ticket slicing at your desk | [mattpocock/skills](https://github.com/mattpocock/skills) |
| Design and fresh-context review at your desk; drift report | [google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model) |
| Read-only agent job with a separate publishing job | pattern from [github/gh-aw](https://github.com/github/gh-aw) |
| Always / Ask first / Never block in `CLAUDE.md` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) |
| Shared brain, facts file, append-only dated entries, weekly playbook rewrite, cost per job | Greg Isenberg's "most AI-pilled company" list (items 1–9, 30, 38–41), adapted to a public repo |
