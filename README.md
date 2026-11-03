# Language trainer

A small, backendless website for practising how words inflect in a foreign language. Today it has exactly one
quiz: Czech present-tense verb conjugation, with data from the
[Internetová jazyková příručka](https://prirucka.ujc.cas.cz/). Each round shows one random verb; you type all
six forms, check them cell by cell (or all at once), and the scores are kept in your browser.

It is built to be hosted as a GitHub Pages project page from the `gh-pages` branch of
<https://github.com/5ZYSZ3K/language-trainer> (default URL: <https://5zysz3k.github.io/language-trainer/>). The
architecture lets other quiz types, other learned languages and other data sources be added without touching
what exists (see *Adding things later*); none of those exists yet, so the page has no selector.

## Words used in this repository

- **UI language**: the language of the page's own texts (`en`, `cs`), chosen with the EN / CZ switch.
- **Language**: the language being learned (`cs`). It defines the special characters and typing shortcuts.
- **Source**: where data comes from (`prirucka`), with a trust level (`trusted` / `unverified`).
- **Quiz type**: one kind of quiz (`verb-present-tense`). It owns its data contract, its interaction, its score
  counters and its texts. Its id is permanent: it is the data file name and part of the score key.
- **Dataset**: one JSON file with the items of one quiz type, for one language, from one source.
- **Pool**: (language, source, quiz type), the thing you practise. Items are drawn from one pool's dataset only,
  and scores are kept per pool.
- **Adapter**: build-time code in `scraper/` that produces one dataset from one source. Never shipped.

## How it works

There is no server, no runtime scraping and no CI: scraping, building and publishing are three steps the
owner runs by hand.

1. **Scrape.** `npm run scrape` reads [`lists/cs/verb-present-tense.txt`](lists/cs/verb-present-tense.txt),
   fetches each verb from <https://prirucka.ujc.cas.cz/>, parses the present-tense table and saves
   [`data/cs/prirucka/verb-present-tense.json`](data/cs/prirucka/verb-present-tense.json) after every verb.
   That file is **committed to `main`** as scraped source data; it is the only copy, so commit it after a
   scrape.
2. **Build.** `npm run build` type-checks, runs `scripts/check-data.ts` (it fails the build on an invalid
   dataset or when no dataset holds any item), then Vite builds the page into `dist/`. Each dataset is bundled
   into the page as its own JavaScript chunk; the page fetches no data file and never calls the source site.
3. **Publish.** `npm run publish-pages` commits `dist/` to the local `gh-pages` branch; you push that branch
   yourself.

## Everyday use

```sh
npm ci
npm run dev           # http://localhost:5173
npm test              # unit tests (parser tests run against saved HTML fixtures)
npm run typecheck
npm run check-data    # validate data/ against the registries (also the second step of build)
npm run build         # typecheck + data check + production build into dist/
npm run preview       # serve dist/ (the build uses a relative base, so it works from a sub-path)
npm run scrape        # fetch the verbs that are not scraped yet (see "The scraper" below)
```

To put a new version on the site:

```sh
npm run scrape                        # only if the verb list changed or verbs are missing
git add data && git commit            # the scraped data lives in the repo
npm run build
npm run publish-pages                 # commits dist/ to the local gh-pages branch
git push origin gh-pages
```

### Adding verbs

Add them to [`lists/cs/verb-present-tense.txt`](lists/cs/verb-present-tense.txt) (comma-separated infinitives;
reflexives are written like `bát se`, `dát si`; whitespace is collapsed and empty or repeated entries are
ignored). That file is the single source of truth for the scraper: a verb that is removed from it is also
removed from the data when the next scrape starts. The next scrape only fetches the new verbs. Only the scraper
reads lists; the page picks verbs from the dataset alone.

## Data

- **File:** `data/<language>/<source>/<quiz type>.json`, e.g. `data/cs/prirucka/verb-present-tense.json`.
- **Shape:** `{ "language": "cs", "source": "prirucka", "quizType": "verb-present-tense", "items": [ ... ] }`.
  The three fields must match the file's location. A `verb-present-tense` item is
  `{ "prompt": "bát se", "cells": [ { "id": "1sg", "acceptedForms": ["bojím se", ...] }, ...6 cells... ] }`
  with the cell ids `1sg 2sg 3sg 1pl 2pl 3pl` in that order. Cell ids are neutral: the quiz's texts map them to
  the labels the page shows, so data never mentions UI texts.
- **Layout:** valid JSON with one item per line, so committing a change to one item gives a one-line diff.
- **Content rule:** the file only holds items that satisfy the quiz type's contract completely. A failed item is
  never written.
- **Missing or foreign file:** a missing file, or one whose language, source or quiz type differs from the
  target, counts as "nothing scraped yet". A file that is not valid JSON is a fatal error for the scraper (it
  would otherwise start over and send the whole list to the site again).
- **Build-time check** (`npm run check-data`, also run by `npm run build`): fails, listing every problem, if a
  dataset a source provides with `bundled` delivery has no file, a file under `data/` is not provided by any
  source, a file's envelope does not match its location, an item violates its quiz type's contract, or no
  dataset holds any item. A dataset with zero items is valid; its pool shows the "nothing to practise yet"
  status.
- **Delivery.** The only implemented delivery is `bundled` (above). A `github` delivery is typed in
  `src/sources/source.ts` but has no loader: `loadDataset` rejects it with a clear error, and no source uses it.

## The scraper

```
npm run scrape [-- --source <id>] [--language <id>] [--quiz <id>] [--force] [--delay-ms <ms>] [--fail-cooldown <duration>]
```

- **Targets.** A target is one adapter: one source, language and quiz type. `--source`, `--language` and
  `--quiz` narrow the registered adapters. With no filter and exactly one adapter registered (today), that one
  runs. With no filter and several, the command lists them and exits 2, so it never scrapes everything by
  accident. A filter that matches nothing exits 2 too, e.g. `npm run scrape -- --source nope`. Several matching
  targets run one after another. A header line per target is printed, e.g.
  `== prirucka / cs / verb-present-tense ==`.
- **Incremental.** Only items missing from the target's data file are fetched, in list order.
  `npm run scrape -- --force` re-fetches everything (see below).
- **Saved as it goes.** After every item that was fetched, parsed and validated, the whole data file is
  rewritten (to `.scrape-data.tmp` in the repo root, then renamed over the data file, so it is never
  half-written), in the order of the list. Failures are never written. Items that are no longer in the list are
  pruned from the file when the scrape starts. Each line of progress is numbered: `ok     bavit (3/120)`, where
  the total is the number of items this run will try.
- **Interrupting is safe.** Ctrl-C (or SIGTERM) prints `Stopped: N of M items saved in <file>`, removes the
  lock and exits 130 (143 for SIGTERM). Run the scrape again and it carries on with the items that are
  missing. Nothing is lost, so stopping early when the site misbehaves is always fine.
- **One scrape at a time.** `.scrape.lock` (in the repo root, git-ignored) holds the PID of the running
  scrape. A second scrape is refused with exit code 2 while that process is alive; a lock left behind by a
  crashed run is ignored. The lock is global: two scrapes never run at once, whatever the sources.
- **`--force` is not resumable.** It replaces items one by one as they succeed, and a failed refresh keeps the
  old item, but a second `--force` starts again from the first entry. To refresh just a few verbs, delete
  their items from the data file and run a plain `npm run scrape`.
- **Exit codes.** `0` everything requested is in the data; `1` some items failed or were not attempted, or a
  fatal error such as a failed save; `2` bad usage, an unknown target, or another scrape is running; `130` /
  `143` interrupted.
- **Failures.** An item that cannot be fetched or parsed is logged and left out of the data (so it is not on the
  site). The run ends with a summary and a **non-zero exit code**; the items that worked are already saved.
  There is no overrides file for now. Two safety rules: a failed `--force` refresh keeps the item's previous
  data instead of deleting it, and after 5 fetch failures in a row (timeouts, "busy", HTTP errors; a page that
  merely fails to parse does not count) the run stops asking the site and reports the remaining items as "not
  attempted". By default there is no cool-down: wait, then run it again, or use `--fail-cooldown` (next point).
- **`--fail-cooldown <duration>`.** When an item cannot be fetched (after the request-level retries described
  under *Politeness*), the scrape stops for that long and then tries the same item again instead of moving on,
  e.g. `npm run scrape -- --fail-cooldown 10m`. The duration needs a unit: `500ms`, `90s`, `10m`, `1h` (a bare
  number is rejected, so it cannot be mistaken for the milliseconds of `--delay-ms`). Only fetch failures
  trigger it; a page that merely fails to parse is not retried, because the site is fine and waiting will not
  change the page. Each failed attempt still counts towards the 5-in-a-row limit, so a site that stays down is
  given up on after 5 attempts at the same item (4 cool-downs), not waited for forever. The progress log shows
  `retry  <item> (n/total): <reason>; cooling down for N s first`. Off by default; Ctrl-C works during a
  cool-down like at any other time.
- **Validation.** Every item is checked against its quiz type's contract before it is saved. For
  `verb-present-tense` that means six cells in the fixed order, each with at least one non-empty form; an item
  that falls short fails with `no form found for <id>` and is not written.

### The prirucka adapter

[`scraper/sources/prirucka/`](scraper/sources/prirucka/) holds the source's request policy, its adapter and the
parser for the verb pages.

- **A page is only accepted if it is that verb's own entry.** The site answers some searches with an
  unrelated page (e.g. `dát si` returns the noun *pusa*, `nechtít se` returns the entry for *chtít*), so the
  entry heading must match the requested verb. Words with several entries (e.g. `stát`) are resolved by
  following the "sloveso" link.
- **Reflexives.** Where the site has an entry for the reflexive verb (`bát se`) its forms are used as they
  are. Where it only has the plain verb (`myslet si` is listed as *myslet*), `si` / `se` is added to every
  accepted form, because the particle is part of what the learner types. If the search for a reflexive
  verb finds no matching entry at all (`dát si` returns the noun *pusa*, `hnát se` is not a headword), the
  plain verb (`dát`, `hnát`) is searched instead and the particle added the same way.
- **Variants.** Forms listed with several variants (`mohu, můžu`) all count as correct. A parenthesised part
  is optional, as on the site itself (`bání (se)`): `bojí (se)` accepts both `bojí se` and `bojí`. Suffix-only
  clitics such as the `-s` in `jsi, -s` are dropped, since they are not words one can type alone.
- **Politeness.** One request at a time, 30 s timeout, up to 4 retries (the wait before retry n is at least n × 15 s), and
  a pause of 1.5 s by default between one request finishing (answer, error or timeout) and the next one
  starting, so a slow answer never leaves two requests in flight. The requests carry the User-Agent
  `language-trainer-scraper (+https://github.com/5ZYSZ3K/language-trainer)`. Change the pause with
  `npm run scrape -- --delay-ms 5000` or the `SCRAPE_DELAY_MS` environment variable (the flag wins); the retry
  waits are never shorter than it. The site keeps an address "busy" while it thinks an earlier query from it is
  still being evaluated, and answers HTTP 200 with a "server is overloaded" page (the scraper recognises it
  and retries after a pause; it never uses the page's "nechci čekat" override). During development this state
  set in after a burst of overlapping and timed-out requests from one address and then lasted tens of
  minutes, so: **never run two scrapes at once, and do not keep re-running a scrape that is failing**. The
  scraper itself stops after 5 fetch failures in a row for the same reason.

> **Not yet verified at full scale.** The parser and the scrape logic are tested against saved real pages, and
> a good part of the list has been fetched live, but a complete clean run over the whole list has not been
> checked end to end. Check the log, the failure summary and the produced JSON before relying on the data.

#### Verbs known to fail

`nechtít se` cannot be scraped: the site only has *chtít*, and the impersonal *nechce se mi* is a different
construction, so it would be rejected and appear in the failure summary on every run. It is not on the list;
leave it off unless an overrides mechanism is added. Any other verb that fails is listed by the run itself.

## Deployment

`npm run publish-pages` ([`scripts/publish-pages.ts`](scripts/publish-pages.ts)) puts the contents of
`dist/` on the `gh-pages` branch:

- It commits `dist/` on top of the **local** `gh-pages` branch (creating it as an orphan branch the first
  time), using a temporary git worktree, so your working tree, index, current branch and `HEAD` are left
  exactly as they were. The commit message is `Publish build of <short sha of main>`, plus
  ` (uncommitted changes)` when the working tree is dirty. It uses your own git identity.
- It only runs from `main`, and refuses to publish without `dist/index.html`. It reads no data or lists: the
  data is inside the bundle, and `npm run build` refuses to build a site without items. If `dist/` is
  identical to `gh-pages` it says so and makes no commit.
- It **does not build** (run `npm run build` first, after your last scrape) and **does not push**: it prints
  `git push origin gh-pages` for you to run. History on `gh-pages` therefore accumulates, and a normal
  `git push` is enough (no force-push).

The tests run the same logic against a temporary git repository; they never touch this one.

### Repository settings (the owner's, in GitHub)

- **Settings → Pages → Build and deployment:** Source = *Deploy from a branch*, Branch = `gh-pages`, folder
  `/ (root)`. No workflow is involved.
- The repository is named `language-trainer`. A clone whose `origin` still has the old repository name is pointed
  at the new one with `git remote set-url origin https://github.com/5ZYSZ3K/language-trainer.git`.
- The project is named `language-trainer` in `package.json`, and the repository coordinates (owner, name and the
  branch the data is committed to) are in [`src/config.ts`](src/config.ts); a test checks that the two names
  agree. The scraper's User-Agent is built from the same constants.

## Code layout

```
index.html, vite.config.ts, tsconfig.json   the page's HTML, the Vite / Vitest and the TypeScript configuration
lists/<language>/<quiz type>.txt      scraper input (comma-separated entries); only the scraper reads lists
data/<language>/<source>/<quiz type>.json   the committed datasets
public/                               .nojekyll only
src/
  core/        pure, tested logic: matching, typing shortcuts, Round, Scores, random pick, the record guard;
               knows nothing about languages, sources, quiz types or texts
  languages/   the languages that can be learned: characters, typing shortcuts, names (registry in index.ts)
  sources/     the data sources and which datasets each provides (registry in index.ts)
  quizzes/     one folder per quiz type: contract, score meters, texts, mount (the quiz's DOM)
               (registry in index.ts)
  datasets/    the pool (language, source, quiz type), the dataset file's envelope and the loader of the bundled
               datasets
  registry.ts  findById(): how anything looks up an entry of a registry by its id
  selection.ts which pool the page opens on (pure rules for a future selector; no selector is shown)
  i18n/        the UI languages, createT() and the shell's own en / cs dictionaries (a quiz type's and ui/'s
               texts live with them)
  ui/          shared DOM building blocks: special-character buttons, typing shortcuts on inputs, help list, the
               element look-up (finder)
  app/         shell.ts: header, language switch, scores panel, status line (thin DOM, not unit tested)
  config.ts    repository coordinates
  main.ts      wiring: storage, UI language, the default pool, mount
  style.css    the page's styles; fonts/ holds the bundled font files (Comic Relief, OFL)
scraper/       build-time only, never shipped
  cli.ts, cli-options.ts   entry point; arguments and environment
  harness/     lock, atomic data file, polite requests, run context, target selection, adapter registry
  list.ts          the word-list reader (comma-separated entries)
  list-driven.ts   the loop over a word list: fetch, parse, validate, save after every item
  sources/prirucka/   request policy, adapter and verb parser; fixtures/ holds trimmed real pages from
                      prirucka.ujc.cas.cz that the parser tests run against
scripts/       check-data.ts: validates data/ before every build; publish-pages.ts: commits dist/ to the local
               gh-pages branch (tested against a temporary repo); registry.test.ts: checks the registries and
               the scraper's adapters against each other
```

Rules the layout keeps: `src/` never imports from `scraper/` or `scripts/` (a unit test scans for it), and
`scraper/` and `scripts/` may import types, registries and contracts from `src/`. The page never calls a
source, and no parser or HTML library is in its bundle.

Tests sit next to the code (`*.test.ts`) and run with `npm test`. The `test-support.ts` files hold the little
helpers that several tests share (a run context, saved pages of the site).

## Adding things later

None of these should require changing the shell, the scores, the selection rules, the scraper harness or the
other quiz types. If one does, the architecture needs fixing first. Languages, sources and quiz types are plain
typed lists; nothing is discovered dynamically.

- **A quiz type.** Create `src/quizzes/<id>/` with its item type, `Contract` (`validateItem`, `keyOf`), meters,
  texts (typed `en` / `cs` dictionaries) and `mount`, and add it to `src/quizzes/index.ts`. It may reuse the
  type-in blocks in `src/ui/` and `src/core/` or bring a different interaction. Its id is permanent.
- **A source.** Add `src/sources/<id>.ts` (name, url, trust, license, attribution, `provides`) and register it
  in `src/sources/index.ts`. Add `scraper/sources/<id>/` with a request policy and one adapter per provided
  dataset, and register it in `scraper/harness/registry.ts`. An adapter may use `list-driven` or its own loop;
  it only has to write items that satisfy the contract.
- **A dataset** (a source covering another language or quiz type): add the `provides` entry and the adapter, run
  the scrape, and commit the file in `data/<language>/<source>/`. `npm run build` and the registry test
  (`scripts/registry.test.ts`) tell you what is missing.
- **A learned language.** Add `src/languages/<id>.ts` (characters, shortcuts, names) and register it in
  `src/languages/index.ts`. Quiz types are unaffected; datasets for it live under `data/<id>/`, lists under
  `lists/<id>/`.
- **A hand-written dataset.** Add the `provides` entry with `manual: true` and commit the file; no adapter is
  needed. The build validates it like any other.
- **A UI language.** List it in `UI_LANGUAGES` (`src/i18n/index.ts`) and write the file the compiler then asks
  for in each set of texts (the shell's, `src/ui/`'s, each quiz type's, each learned language's); a missing key
  is a compile error.
- **The `github` delivery.** Add the loader, change a dataset's `delivery`, extend the test; the data files do
  not move.

Other tenses, parts of speech and sources are not designed. Before the first publish, prirucka's terms of reuse
still need to be reviewed.

## Page behaviour in short

- A random verb each round, never the same one twice in a row (unless there is only one).
- All six forms are always shown, singular first, then plural: singular on the left and plural on the right on a
  wide screen, one after the other on a narrow one. Enter checks the field and moves to the next open form in that order; once every form is checked, Enter starts
  the next verb. Reflexive particles (`se`, `si`) are typed as part of the answer.
- Each cell has its own Check button, plus "Check all". Checking locks a cell for the round: correct turns it
  green, wrong turns it red and shows all accepted variants joined by ` / `. A single check on an empty cell is
  ignored; "Check all" counts empty cells as wrong. "Next verb" starts a new round.
- Matching ignores case and surrounding / repeated whitespace; nothing else is forgiven, diacritics included.
- Typing shortcuts: `'` after a vowel → `á é í ó ú ý`, `^` after a letter → `č ď ě ň ř š ť ž`, `u@` → `ů`;
  only plain typing triggers them, not deleting or pasting. There are also buttons for the special characters.
- Scores (forms correct / checked, verbs fully correct / completed) are kept per pool in `localStorage` under
  the key `scores`; "Reset scores" asks for confirmation and clears all of them.
- Language follows the browser (Czech if it starts with `cs`, otherwise English); the EN / CZ switch in the
  header is remembered in `localStorage` under `language`.
