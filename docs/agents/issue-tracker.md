# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on
[5ZYSZ3K/language-trainer](https://github.com/5ZYSZ3K/language-trainer/issues). Use the `gh` CLI for every operation;
`gh` infers the repo when run inside the clone.

- **The repo is public.** Anything written in an issue or comment is public. Don't paste local paths, tokens or
  anything else private.
- **There is one maintainer, the owner.** Every issue's reporter is either the owner or a member of the public.
- **There are no pull requests.** Work lands as commits on `main` (see *How work lands*).

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, with `--label` and `--state` filters as needed.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`. The category labels
  `bug`, `enhancement` and `documentation` already exist; the state labels are in `triage-labels.md`.
- **Close**: `gh issue close <number> --comment "..."`.
- **Make an issue a sub-issue of a parent**: the installed `gh` (2.89) has no `--parent` / `--add-sub-issue` (they
  arrive in 2.94), so use the API: `gh api --method POST repos/5ZYSZ3K/language-trainer/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`,
  where the database id comes from `gh api repos/5ZYSZ3K/language-trainer/issues/<child> --jq .id`.

## Writing an issue for this repo

- Name things with the terms in `GLOSSARY.md`: pool, quiz type, item, cell, accepted form, version, adapter, list.
- Name a word by its prompt, in code formatting: `bát se`, `dveře`, `Čech`. Name a pool by its key:
  `cs/prirucka/noun-declension`.
- For a **page bug**, give the quiz type, the UI language, whether the screen was wide or narrow (the layouts
  differ), what was typed, and what the page did. `README.md`'s *Page behaviour in short* is the expected behaviour.
  Quote the line that is broken.
- For a **word that fails to scrape**, give the progress line (`FAILED <word> (n/total): <reason>`), the run's
  summary and exit code, and the entry's URL on prirucka.ujc.cas.cz.
- For a **numerals answer that looks wrong**, give the number, the version in question and its remarks. The numerals
  source is unverified, so say what reference the claim rests on.

## How work lands

- Each change is one commit on `main`, with a Conventional Commit subject, like the history: `feat:`, `fix:`,
  `refactor:`, and `chore:` for word batches (one list change plus its scraped data). Put `Closes #<n>` in the
  body; the issue closes when the commit reaches GitHub.
- An agent commits and pushes only when the owner asks. The owner publishes.
- There is no CI, so the checks run locally. Before saying an issue is done, run `npm test`, then
  `npm run build`: it type-checks, runs `check-data` and builds, but it doesn't run the tests. If behaviour changed,
  the README's matching section changes in the same commit.
- An issue that is closed is not on the live site yet. The site changes only when the owner runs
  `npm run publish-pages` and pushes `gh-pages`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Labels**: the `wayfinder:*` labels don't exist yet, and `gh issue create --label` fails on a missing label.
  Create each one the first time it's needed: `gh label create wayfinder:map` (also `wayfinder:research`,
  `wayfinder:prototype`, `wayfinder:grilling`, `wayfinder:task`).
- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a sub-issue (see **Make an issue a sub-issue of a parent**). Labels: `wayfinder:<type>`. Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's native issue dependencies. Add an edge with `gh api --method POST repos/5ZYSZ3K/language-trainer/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric database id (`gh api repos/5ZYSZ3K/language-trainer/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). If dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open sub-issues, drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
