# Czech verb conjugation trainer

A small, backendless website for practising Czech present-tense verb conjugation. Each round shows one
random verb; you type all six forms, check them cell by cell (or all at once), and the scores are kept in
your browser.

Live site (GitHub Pages project page): <https://5zysz3k.github.io/uceni-se-cestiny/>

## How it works

There is no server, no runtime scraping and no CI: scraping, building and publishing are three steps the
owner runs by hand.

1. **Scrape.** `npm run scrape` reads [`lists/cs/verb-present-tense.txt`](lists/cs/verb-present-tense.txt), fetches each verb from
   <https://prirucka.ujc.cas.cz/> (Internetová jazyková příručka), parses the present-tense table and saves
   `data/cs/prirucka/verb-present-tense.json` after every verb. That file is **committed to `main`** as
   scraped source data; it is the only copy, so commit it after a scrape.
2. **Build.** `npm run build` checks the data (`scripts/check-data.ts` fails the build on an invalid dataset
   or when no dataset holds any item), then Vite builds the page into `dist/`. The dataset is bundled into the
   page as its own JavaScript chunk; the page fetches no data file.
3. **Publish.** `npm run publish-pages` commits `dist/` to the local `gh-pages` branch; you push that branch
   yourself.

## Everyday use

```sh
npm ci
npm run scrape      # fetch the verbs that are not scraped yet (a few seconds each; see below)
npm run dev         # http://localhost:5173
npm test            # unit tests (parser tests run against saved HTML fixtures)
npm run typecheck
npm run build       # typecheck + data check + production build into dist/
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

Add them to `lists/cs/verb-present-tense.txt` (comma-separated infinitives; reflexives are written like `bát se`, `dát si`).
That file is the single source of truth: a verb that is removed from it is also removed from the data. The
next *scrape* only fetches the new verbs.

### The scraper

- **Incremental.** Only verbs missing from `data/cs/prirucka/verb-present-tense.json` are fetched.
  `npm run scrape -- --force` re-fetches everything (see below).
- **Saved as it goes.** After every verb that was fetched and parsed, the whole data file is rewritten (to
  `.scrape-data.tmp`, then renamed over the data file, so it is never half-written), in the order of
  `lists/cs/verb-present-tense.txt`. Failures are never written. Verbs that are no longer in `lists/cs/verb-present-tense.txt` are pruned
  from the file when the scrape starts. The file has one verb per line (still plain JSON, same schema), so
  committing it gives readable diffs. Each line of progress is numbered: `ok     bavit (3/120)`, where the
  total is the number of verbs this run will try.
- **Interrupting is safe.** Ctrl-C (or SIGTERM) prints `Stopped: N of M items saved in <file>`, removes the
  lock and exits 130 (143 for SIGTERM). Run the scrape again and it carries on with the verbs that are
  missing. Nothing is lost, so stopping early when the site misbehaves is always fine.
- **One scrape at a time.** `.scrape.lock` (in the repo root, git-ignored) holds the PID of the running
  scrape. A second scrape is refused with exit code 2 while that process is alive; a lock left behind by a
  crashed run is ignored. (The lock and the temp file are in the repo root and git-ignored.)
- **`--force` is not resumable.** It replaces entries one by one as they succeed, and a failed refresh
  keeps the old entry, but a second `--force` starts again from the first verb. To refresh just a few
  verbs, delete their entries from the data file and run a plain `npm run scrape`.
- **Exit codes.** `0` everything worked; `1` some verbs failed, or a fatal error such as a failed save;
  `2` bad usage or another scrape is running; `130` / `143` interrupted.
- **Failures.** A verb that cannot be fetched or parsed is logged and left out of the data (so it is not on
  the site). The run ends with a summary and a **non-zero exit code**; the verbs that worked are already
  saved. There is no overrides file for now. Two safety rules: a failed `--force` refresh keeps the
  verb's previous data instead of deleting it, and after 5 fetch failures in a row (timeouts, "busy", HTTP
  errors; a page that merely fails to parse does not count) the run stops asking the site and reports the
  remaining verbs as "not attempted". By default there is no cool-down: wait, then run it again, or use
  `--fail-cooldown` (next point).
- **`--fail-cooldown <duration>`.** When a verb cannot be fetched (after the request-level retries described
  under *Politeness*), the scrape stops for that long and then tries the same verb again instead of moving
  on, e.g. `npm run scrape -- --fail-cooldown 10m`. The duration needs a unit: `500ms`, `90s`, `10m`, `1h`
  (a bare number is rejected, so it cannot be mistaken for the milliseconds of `--delay-ms`). Only fetch
  failures trigger it; a page that merely fails to parse is not retried, because the site is fine and waiting
  will not change the page. Each failed attempt still counts towards the 5-in-a-row limit, so a site that
  stays down is given up on after 5 attempts at the same verb (4 cool-downs), not waited for forever. Pass a
  longer duration if the site needs longer to recover. The progress log shows `retry  <verb> (n/total): <reason>;
  cooling down for N s first`. Off by default; Ctrl-C works during a cool-down like at any other time.
- **A page is only accepted if it is that verb's own entry.** The site answers some searches with an
  unrelated page (e.g. `dát si` returns the noun *pusa*, `nechtít se` returns the entry for *chtít*), so the
  heading must match the requested verb. Words with several entries (e.g. `stát`) are resolved by following
  the "sloveso" link.
- **Reflexives.** Where the site has an entry for the reflexive verb (`bát se`) its forms are used as they
  are. Where it only has the plain verb (`myslet si` is listed as *myslet*), `si` / `se` is added to every
  accepted form, because the particle is part of what the learner types. If the search for a reflexive
  verb finds no matching entry at all (`dát si` returns the noun *pusa*, `hnát se` is not a headword), the
  plain verb (`dát`, `hnát`) is searched instead and the particle added the same way.
- **Variants.** Forms listed with several variants (`mohu, můžu`) all count as correct. A parenthesised part
  is optional, as on the site itself (`bání (se)`): `bojí (se)` accepts both `bojí se` and `bojí`. Suffix-only
  clitics such as the `-s` in `jsi, -s` are dropped, since they are not words one can type alone.
- **Politeness.** One request at a time, 30 s timeout, retries with a growing wait, and a pause of 1.5 s by
  default between one request finishing (answer, error or timeout) and the next one starting, so a slow
  answer never leaves two requests in flight. Change the pause with `npm run scrape -- --delay-ms 5000` or
  the `SCRAPE_DELAY_MS` environment variable (the flag wins); the retry waits are never shorter than it. The site
  keeps an address "busy" while it thinks an earlier query from it is still being evaluated, and answers
  HTTP 200 with a "server is overloaded" page (the scraper recognises it and retries after a pause; it
  never uses the page's "nechci čekat" override). During development this state set in after a burst of
  overlapping and timed-out requests from one address and then lasted tens of minutes, so: **never run two
  scrapes at once, and do not keep re-running a scrape that is failing**. The scraper itself stops after 5
  fetch failures in a row for the same reason.

> **Not yet verified at full scale.** The parser and the scrape logic are tested against saved real pages, and
> one verb (`bavit`) was fetched live through the CLI and came out correct, but a complete scrape of
> `lists/cs/verb-present-tense.txt` has not been run against the live site yet: the site stopped answering the development
> machine after the first few hundred requests. The first full local run is the first real full-scale test;
> check its log, and its failure summary, before relying on the site.

#### Verbs known to fail

`nechtít se` cannot be scraped: the site only has *chtít*, and the impersonal *nechce se mi* is a different
construction, so it is rejected and will appear in the failure summary on every run until it is removed from
`lists/cs/verb-present-tense.txt` (or an overrides mechanism is added). Any other verb that fails is listed by the run itself.

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

### One-time repository settings (done by the owner)

- **Settings → Pages → Build and deployment:** Source = *Deploy from a branch*, Branch = `gh-pages`, folder
  `/ (root)`.

## Code layout

```
src/
  core/        pure, tested logic: matching, typing shortcuts, Round, Scores, random pick
  languages/   the languages that can be learned: characters and typing shortcuts (registry in index.ts)
  sources/     the data sources and which datasets each provides (registry in index.ts)
  quizzes/     the quiz types: id, contract, score meters (registry in index.ts)
  datasets/    the pool (language, source, quiz type) and the loader of the bundled datasets
  selection.ts which pool the page opens on (pure rules for a future selector)
  i18n/        typed en / cs dictionaries and the t() helper
  app.ts       the DOM layer (deliberately thin and not unit tested)
scraper/       build-time only, never shipped: cli.ts runs the adapters chosen by --source / --language / --quiz
  harness/     lock, atomic data file (one item per line), polite requests, run context, adapter registry
  list-driven.ts the loop over a word list: fetch, parse, validate, save after every item
  sources/prirucka/ request policy, adapter and verb parser; fixtures/ holds trimmed real pages from
               prirucka.ujc.cas.cz that the parser tests run against
lists/         scraper input: lists/<language>/<quiz type>.txt
scripts/       check-data.ts: validates data/ before every build; publish-pages.ts: commits dist/ to the local
               gh-pages branch (tested against a temporary repo)
data/          the committed datasets: data/<language>/<source>/<quiz type>.json
public/        .nojekyll only
```

### Extension points (and nothing more)

- A neutral `Cell` model (`id`, `acceptedForms[]`); the UI and scoring never mention persons or verbs.
- A `QuizType` interface (`src/quizzes/quiz-type.ts`) with `verb-present-tense` as the only implementation. The
  page only needs that runtime part; fetching and parsing live in `scraper/` so the parser is not
  bundled.
- Scores are stored per pool (`language/source/quizType`, e.g. `cs/prirucka/verb-present-tense`), one
  `{ correct, total }` counter per meter the quiz type declares, so future tenses, sources or languages
  cannot collide with them. The quiz type id (`verb-present-tense`) is also the data file name and must not
  change.
- Adding a language means adding a dictionary file typed like `src/i18n/cs.ts` and registering it in
  `src/i18n/index.ts`; a missing key is a compile error.

Other tenses and parts of speech are out of scope for now.

## Page behaviour in short

- A random verb each round, never the same one twice in a row (unless there is only one).
- All six forms are always shown. Reflexive particles (`se`, `si`) are typed as part of the answer.
- Matching ignores case and surrounding / repeated whitespace; nothing else is forgiven, diacritics included.
- Typing shortcuts: `'` after a vowel → `á é í ó ú ý`, `^` after a letter → `č ď ě ň ř š ť ž`, `u@` → `ů`;
  there are also buttons for the special characters.
- Scores (cells correct / checked, verbs fully correct / completed) live in `localStorage`; "Reset scores"
  asks for confirmation.
- Language follows the browser (Czech if it starts with `cs`, otherwise English); the EN / CZ switch in the
  header is remembered.
