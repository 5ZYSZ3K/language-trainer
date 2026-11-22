# Triage labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the label strings used on
[5ZYSZ3K/language-trainer](https://github.com/5ZYSZ3K/language-trainer/labels), all of which exist on the repo.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from
this table. The category roles use GitHub's existing `bug` and `enhancement` labels. A batch of new words is an
`enhancement`.

## Choosing a state in this repo

**`ready-for-agent`**: the brief's acceptance criteria can be checked without the owner, with `npm test`,
`npm run typecheck`, `npm run check-data` or `npm run build`, or by using the page in `npm run dev`. Typical cases:

- Page behaviour in any quiz type, when the expected behaviour is written down (in the README's *Page behaviour in
  short*, or in the brief).
- A parser fix that can be reproduced against a saved page in the adapter's test fixtures.
- A new quiz type, learned language or UI language that follows the README's *Adding things later*.
- Changes to the build-time checks, the scraper harness or the publish script, all of which are tested without
  touching the real repo or the site.

**`ready-for-human`**: the work needs one of these, which an AFK agent can't or shouldn't do. Say which one in
the brief.

- **A live scrape.** Scraping prirucka.ujc.cas.cz is a step the owner runs by hand. The site turns "busy" for tens
  of minutes after a burst of requests, and two scrapes must never run at once. An agent may make the code or list
  change; the owner runs `npm run scrape:cs:verbs` / `scrape:cs:nouns` and commits the data.
- **Publishing.** That means `npm run publish-pages`, pushing `gh-pages`, or the repo's Pages settings.
- **Licensing.** For example, reviewing prirucka's terms of reuse, which the README says is still to do.
- **Judging Czech.** For example, whether a numerals version is right (the numerals source is unverified), or
  whether a new Czech UI text reads well.

**`needs-info`**: the report lacks what *Writing an issue for this repo* in `issue-tracker.md` asks for. Examples are
a scrape failure without its progress line, or a page bug without the quiz type, UI language or screen width.

**`needs-triage`, grill first**: the README lists other tenses, other parts of speech, other sources, the `github`
delivery and a way to name the entry meant for a word with several entries as not designed yet. An issue in one
of these areas isn't ready for anyone until it has been grilled into a design (`/grill-with-docs`).

**`wontfix`**:

- An enhancement that is rejected goes to `.out-of-scope/`, as the triage skill says.
- A word the site can't provide is not a code bug. Examples are a word whose entry doesn't exist (`nechtít se`) and
  a word with several noun entries (`vedoucí`). Record it in the README's *Words known to fail*, then close the
  issue. Whether the word stays on the list is the owner's call: `nechtít se` was taken off, while `vedoucí` stays
  on and fails on every run. If the real ask is a way to name the entry, re-file that as a design issue.
