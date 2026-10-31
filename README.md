# Czech verb conjugation trainer

A small, backendless website for practising Czech present-tense verb conjugation. Each round shows one
random verb; you type all six forms, check them cell by cell (or all at once), and the scores are kept in
your browser.

Live site (GitHub Pages project page): <https://5zysz3k.github.io/uceni-se-cestiny/>

## How it works

There is no server and no runtime scraping.

1. **At build time** `npm run scrape` reads [`czech_verbs.txt`](czech_verbs.txt), fetches each verb from
   <https://prirucka.ujc.cas.cz/> (Internetová jazyková příručka), parses the present-tense table and writes
   `public/data/verb-present-tense.json`.
2. **Vite** builds the page. The page fetches that JSON file from its own origin.
3. **GitHub Actions** does both on every push to `main` and force-pushes only the built output to the
   `gh-pages` branch.

## Everyday use

```sh
npm ci
npm run scrape      # fetch the verbs that are not scraped yet (a few seconds each; see below)
npm run dev         # http://localhost:5173
npm test            # unit tests (parser tests run against saved HTML fixtures)
npm run typecheck
npm run build       # typecheck + production build into dist/
```

### Adding verbs

Add them to `czech_verbs.txt` (comma-separated infinitives; reflexives are written like `bát se`, `dát si`).
That file is the single source of truth: a verb that is removed from it is also removed from the data. The
next push only fetches the new verbs.

### The scraper

- **Incremental.** Only verbs missing from `public/data/verb-present-tense.json` are fetched.
  `npm run scrape -- --force` re-fetches everything.
- **Failures.** A verb that cannot be fetched or parsed is logged and left out of the data (so it is not on
  the site). The run ends with a summary and a **non-zero exit code**; the verbs that worked are still
  written. There is no overrides file for now. Two safety rules: a failed `--force` refresh keeps the
  verb's previous data instead of deleting it, and after 5 fetch failures in a row (timeouts, "busy", HTTP
  errors; a page that merely fails to parse does not count) the run stops asking the site and reports the
  remaining verbs as "not attempted".
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
- **Politeness.** One request at a time, 1.5 s apart, 30 s timeout, retries with a growing wait. The site
  keeps an address "busy" while it thinks an earlier query from it is still being evaluated, and answers
  HTTP 200 with a "server is overloaded" page (the scraper recognises it and retries after a pause; it
  never uses the page's "nechci čekat" override). During development this state set in after a burst of
  overlapping and timed-out requests from one address and then lasted tens of minutes, so: **never run two
  scrapes at once, and do not keep re-running a scrape that is failing**. The scraper itself stops after 5
  fetch failures in a row for the same reason.

> **Not yet verified at full scale.** The parser and the scrape logic are tested against saved real pages, and
> one verb (`bavit`) was fetched live through the CLI and came out correct, but a complete scrape of
> `czech_verbs.txt` has not been run against the live site yet: the site stopped answering the development
> machine after the first few hundred requests. The first run in GitHub Actions (a different address) is the
> first real full-scale test; check its log, and its failure summary, before relying on the site.

#### Verbs known to fail

`nechtít se` cannot be scraped: the site only has *chtít*, and the impersonal *nechce se mi* is a different
construction, so it is rejected and will appear in the failure summary on every run until it is removed from
`czech_verbs.txt` (or an overrides mechanism is added). Any other verb that fails is listed by the run itself.

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main` (and manually,
with an optional "force" input for a full re-scrape):

1. check out the previously scraped data from `gh-pages` (if the branch exists),
2. scrape the missing verbs,
3. build,
4. force-push only the built output (including the merged data JSON) to `gh-pages`.

If some verbs fail to scrape, the site is still built and deployed without them, and the job is then marked
as failed so the problem is visible. The build output is never committed to `main`.

### One-time repository settings (done by the owner, not by the workflow)

- **Settings → Pages → Build and deployment:** Source = *Deploy from a branch*, Branch = `gh-pages`, folder
  `/ (root)`.
- **Settings → Actions → General → Workflow permissions:** *Read and write permissions*. The workflow also
  declares `permissions: contents: write`.

## Code layout

```
src/
  core/        pure, tested logic: matching, typing shortcuts, Round, Scores, random pick
  exercises/   what the page needs to know about an exercise (type id, cell labels)
  i18n/        typed en / cs dictionaries and the t() helper
  app.ts       the DOM layer (deliberately thin and not unit tested)
scraper/       build-time only, never shipped: HTTP policy, scrape orchestration, the verb parser
  fixtures/    trimmed real pages from prirucka.ujc.cas.cz that the parser tests run against
```

### Extension points (and nothing more)

- A neutral `Cell` model (`label`, `acceptedForms[]`); the UI and scoring never mention persons or verbs.
- An `Exercise` interface with `VerbPresentTense` as the only implementation. The page only needs the
  runtime part (`src/core/exercise.ts`); fetching and parsing live in `scraper/` so the parser is not
  bundled.
- Scores are stored per exercise type, so future tenses or parts of speech cannot collide with them. The
  exercise `type` (`verb-present-tense`) is also the data file name and must not change.
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
