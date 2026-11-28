# Language trainer

A small, backendless website for practising how words inflect in a foreign language. Today it has five quizzes,
all for Czech. Two have data from the [Internetová jazyková příručka](https://prirucka.ujc.cas.cz/): present-tense
verb conjugation and noun declension; each round shows one random word, you type its forms and check them cell by
cell (or all at once). The other three follow the site's own rules (an *unverified* source, and the page says so):
numerals asks you to write a random number in words and accepts every version those rules allow; adjectives with
nouns shows a sentence such as `Pomáháme ___ ___.` with an adjective and a noun in their base forms, which you type
together in the case the verb asks for; and demonstratives with nouns does the same with the demonstrative pronoun
(`ten`, `ta`, `to`) in the adjective's place (`Mluvím o tom advokátovi.`). The scores are kept in your browser.

It is built to be hosted as a GitHub Pages project page from the `gh-pages` branch of
<https://github.com/5ZYSZ3K/language-trainer> (default URL: <https://5zysz3k.github.io/language-trainer/>). The
architecture lets other quiz types, other learned languages and other data sources be added without touching
what exists (see *Adding things later*). The page draws a selector for whatever there is a choice of: today one
dropdown under the heading with the five quizzes grouped by source, and a language dropdown as soon as a second
learned language exists.

## Words used in this repository

The words this README and the code use for the domain (language, UI language, source, quiz type, dataset, pool,
item, cell, adapter and the rest) are defined in [GLOSSARY.md](GLOSSARY.md). The ids behind them: languages `cs`;
UI languages `en`, `cs`; sources `prirucka` (trusted) and `language-trainer`, the site's own rules (unverified); quiz
types `verb-present-tense`, `noun-declension`, `numerals`, `adjective-noun-declension`,
`demonstrative-noun-declension`. A quiz type's id is permanent:
it is the data file name and part of the score key. A dataset is one JSON file, an adapter is build-time code in
`scraper/`, and a join is build-time code in `scripts/joins/`.

## How it works

There is no server, no runtime scraping and no CI: scraping, joining, building and publishing are four steps the
owner runs by hand.

1. **Scrape.** `npm run scrape:cs:verbs` reads
   [`lists/cs/verb-present-tense.txt`](lists/cs/verb-present-tense.txt), fetches each verb from
   <https://prirucka.ujc.cas.cz/>, parses the present-tense table and saves
   [`data/cs/prirucka/verb-present-tense.json`](data/cs/prirucka/verb-present-tense.json) after every verb.
   `npm run scrape:cs:nouns` does the same for the nouns of
   [`lists/cs/noun-declension.txt`](lists/cs/noun-declension.txt) (the declension table of each) into
   `data/cs/prirucka/noun-declension.json`. Beside each dataset, the scrape keeps the rest of every entry (its
   lines, footnotes and dictionary entries) in `source-material/cs/prirucka/`, for writing remarks and
   explanations from; the page never ships it. Those files are **committed to `main`** as scraped source data;
   they are the only copy, so commit them after a scrape.
2. **Join.** `npm run join:cs:adjectives` makes the joined dataset of adjectives with nouns,
   `data/cs/language-trainer/adjective-noun-declension.json`, from committed inputs alone: the noun dataset, the verb
   dataset, the pairing [`lists/cs/adjective-noun-declension.json`](lists/cs/adjective-noun-declension.json) and the
   governing verbs. `npm run join:cs:demonstratives` makes the one of demonstratives with nouns,
   `data/cs/language-trainer/demonstrative-noun-declension.json`, from the same inputs, the pairing's adjectives
   aside. Run both after a noun or verb scrape, or after editing the pairing or the governing verbs, and commit the
   result. They fetch nothing.
3. **Build.** `npm run build` type-checks, runs `scripts/check-data.ts` (it fails the build on an invalid
   dataset, when no dataset holds any item, or when a joined dataset is out of step with its inputs), then Vite
   builds the page into `dist/`. Each dataset is bundled into the page as its own JavaScript chunk; the page fetches
   no data file and never calls the source site.
4. **Publish.** `npm run publish-pages` commits `dist/` to the local `gh-pages` branch; you push that branch
   yourself.

## Everyday use

```sh
npm ci
npm run dev               # http://localhost:5173
npm test                  # unit tests (parser tests run against saved HTML fixtures)
npm run typecheck
npm run check-data        # validate data/ against the registries (also the second step of build)
npm run build             # typecheck + data check + production build into dist/
npm run preview           # serve dist/ (the build uses a relative base, so it works from a sub-path)
npm run scrape:cs:verbs   # fetch the Czech verbs that are not scraped yet (see "The scraper" below)
npm run scrape:cs:nouns   # the same for the Czech nouns
npm run join:cs:adjectives   # make the adjectives with nouns again from their inputs (see "Data" below)
npm run join:cs:demonstratives   # the same for the demonstratives with nouns
```

To put a new version on the site:

```sh
npm run scrape:cs:verbs               # only if a list changed or words are missing
npm run scrape:cs:nouns               # (one per list)
npm run join:cs:adjectives            # after any scrape, or an edit of the pairing or the governing verbs
npm run join:cs:demonstratives        # (one per joined dataset)
git add data source-material && git commit   # the scraped and joined data lives in the repo
npm run build
npm run publish-pages                 # commits dist/ to the local gh-pages branch
git push origin gh-pages
```

### Adding verbs and nouns

Add verbs to [`lists/cs/verb-present-tense.txt`](lists/cs/verb-present-tense.txt) (comma-separated infinitives;
reflexives are written like `bát se`, `dát si`; whitespace is collapsed and empty or repeated entries are
ignored). Add nouns to [`lists/cs/noun-declension.txt`](lists/cs/noun-declension.txt) the same way, as plain
dictionary forms (`pán`, `dveře`). Those files are the single source of truth for the scraper: a word that is
removed from one is also removed from the data when the next scrape starts. The next scrape only fetches the new
words. Only the scraper and the joins read lists; the page picks words from the dataset alone.
(`lists/cs/vocabulary/` is raw material, not read by anything.)

The nouns of the sentence quizzes (adjectives with nouns and demonstratives with nouns), and the adjectives each may be
paired with, are in [`lists/cs/adjective-noun-declension.json`](lists/cs/adjective-noun-declension.json) (see *Data*);
every noun there must be an item of the noun dataset, so add it to the noun list and scrape it first. Then run
`npm run join:cs:adjectives` and `npm run join:cs:demonstratives`.

## Data

- **File:** `data/<language>/<source>/<quiz type>.json`, e.g. `data/cs/prirucka/verb-present-tense.json`.
- **Shape:** `{ "language": "cs", "source": "prirucka", "quizType": "verb-present-tense", "items": [ ... ] }`.
  The three fields must match the file's location. A `verb-present-tense` item is
  `{ "prompt": "bát se", "cells": [ { "id": "1sg", "acceptedForms": [{ "value": "bojím se" }] }, ...6 cells... ] }`
  with the cell ids `1sg 2sg 3sg 1pl 2pl 3pl` in that order. A `noun-declension` item has the same shape,
  `{ "prompt": "pán", "cells": [ { "id": "nom-sg", "acceptedForms": [{ "value": "pán" }] }, ... ] }`, with cell ids
  named after case and number, `nom gen dat acc voc loc ins` (the Czech 1st to 7th case) each as `-sg` and `-pl`,
  singular first: up to 14 cells, of **only the forms that exist** (*dveře* has just the plural ones). The first cell,
  the nominative singular (the nominative plural when there is no singular), is the form the page shows locked as
  given, and at least one more cell must follow it. Cell ids are neutral: the quiz's texts map them to the labels
  the page shows, so data never mentions UI texts (and the cases are not numbered in data, because the number of a
  case differs between languages). The one exception, on purpose, is a noun's `explanation` (below).
- **Variants.** Each entry of a cell's `acceptedForms` is a variant, an object whose `value` is the accepted form:
  non-empty text, matched by the matching rules. A cell has at least one, in the order the source lists them
  (*pán*'s `dat-sg` is `[{ "value": "pánovi" }, { "value": "pánu" }]`). A verb variant may not have `remarks`.
- **Noun remarks and explanations.** A noun variant may have `remarks`: a non-empty list of codes, each once, from
  `NOUN_REMARK_CODES` in `src/quizzes/noun-declension/remarks.ts`: `dual` (a dual form, *nohama*), `non-final` (the
  form for a noun before another one, *panu doktoru Novákovi*) and `meaning` (another meaning, *manželové* next to
  *manželé*). Unlike numerals' remarks, a code has no `part:` in front. A noun may have an `explanation`,
  `{ "en": "…", "cs": "…" }`: its own note on its special variants, as HTML, with a non-empty text for every UI
  language. `{ "prompt": "manžel", "explanation": { … }, "cells": [ …, { "id": "nom-pl", "acceptedForms":
  [{ "value": "manželé" }, { "value": "manželové", "remarks": ["meaning"] }] } ] }`. An explanation is the one place
  where data holds UI texts, and on purpose: it is the owner's hand-written note on one noun, which no text of the quiz
  could say (so a new UI language has to be written into it, see *Adding things later*). The noun contract refuses a
  code it does not know; a remark on the given cell (the page shows only its first value there and never an answer
  line, so the remark could never be shown); a `meaning` remark on a noun without an explanation (only the noun can say
  which meaning is which; `meaning` is the one code without a shared explanation); an explanation on a noun with no
  remark outside the given cell (nothing could open it); and an explanation without a non-empty text for every UI
  language. Remarks and explanations are written by hand in the dataset, by the owner. Adding a code is one more code
  in `NOUN_REMARK_CODES` plus its texts: a label (`remark.<code>`) and, unless the code is marked as having none, a
  shared explanation (`remark-explanation.<code>`); a missing text is a compile error.
- **Source material.** Everything an entry says beyond the forms is kept beside its dataset, in two side files under
  `source-material/<language>/<source>/` (outside `data/`, so the page's glob never bundles them and `data/` holds
  only what the page ships). They are committed and never shipped, and the scraper writes them like the dataset
  (laid out by Prettier, replaced in one step). Both have the dataset's envelope.
  - `<quiz type>.json`: `items`, one per word, `{ "prompt": "manžel", "lines": [ { "label": "dělení", "html":
    "man-žel<sup>…</sup>", "footnotes": ["135"] }, { "label": "rod", "html": "m. živ.", "footnotes": [] }, … ],
    "cellFootnotes": { "nom-sg": ["220"], "dat-sg": ["224"], … } }`, and `footnotes`, every article the items
    lead to, once, by id, as HTML: `{ "135": "<h1>Dělení slov na konci řádku</h1>…", … }`. `lines` holds every
    line of the entry under the source's own label, with its HTML as the source has it and the ids of the articles
    its markers lead to; there are no fixed field names. `cellFootnotes` holds the article ids of each cell that has
    markers, by cell id, the given cell included, and so does a cell with no form (a noun's "—"), though the item has
    no such cell.
  - `<quiz type>.dictionaries.json`: `items`, one per word, `{ "prompt": "noha", "entries": { "ssc": "<html>",
    "ssjc": "<html>" } }`, keyed by the source's id of the dictionary.

  A word has entries in the side files only if it is an item of the dataset. Words that were scraped before source
  material was kept have none until a forced scrape.
- **Numerals** (`data/cs/language-trainer/numerals.json`, hand-written, `manual: true`): an item is a range of numbers,
  `{ "id": "0-100", "min": 0, "max": 100, "spread": "uniform" }`, with whole numbers 0 ≤ min ≤ max < 10¹² and a
  `spread` of `uniform` (every number equally likely) or `log` (every order of magnitude equally likely; needs min ≥ 1).
  Each round picks a range, all equally likely, then a number in it. The four ranges are 0–100 (uniform), 101–2 000,
  2 001–1 000 000 and 1 000 001–999 999 999 999 (log). The accepted versions of a number are not data: the
  language's numeral generator writes them (`src/quizzes/numerals/cs.ts` for Czech).
- **Adjectives with nouns** (`data/cs/language-trainer/adjective-noun-declension.json`, `manual: true` because no
  adapter makes it): a **joined dataset**, made by `npm run join:cs:adjectives` (`scripts/joins/`) and committed like
  every other dataset. Its inputs, all committed:
  - **The pairing**, [`lists/cs/adjective-noun-declension.json`](lists/cs/adjective-noun-declension.json), the list
    that alone decides which nouns the dataset holds: `[{ "noun": "dítě", "gender": "s.", "plural-gender": "ž.",
    "adjectives": ["boží", "hladový", …] }, …]`, with the adjectives each noun may be paired with. `plural-gender` is
    there only where the plural agrees in another gender than the noun (`dítě`, `dóže`).
  - **`cs/prirucka/noun-declension`**: each paired noun's cells and gender; **`cs/prirucka/verb-present-tense`**: the
    forms of the governing verbs.
  - **The governing verbs**, `src/quizzes/adjective-noun-declension/governing-verbs.cs.ts` (one module per learned
    language): each a verb of the verb dataset, the case it is always followed by (`nom`, `gen`, `dat`, `acc`, `loc` or
    `ins`) and at most one preposition, one that never changes its form (so none of `v`, `s`, `k`, `z`). A verb is
    there only if, with its preposition, it takes that case and no other (not `mávat`, which also takes the dative in
    `mávat někomu`). An entry may put a subject before the verb, which is then always in the third person (`být` has
    `to`, because `Jsem dobrým advokátem` takes the instrumental but `To je` only the nominative), and may name the
    variant to show for a person where the verb dataset's first one is the wrong one (`být` shows `je`, not `jest`).
    Each verb, or verb with its preposition, is there once. Only the join and `check-data` read it; the page gets the
    verbs from the dataset.

  Its items are the nouns, in pairing order, then the verbs, in module order: `{ "kind": "noun", "prompt": "dítě",
  "gender": "s.", "pluralGender": "ž.", "adjectives": ["boží", …], "cells": [ { "id": "nom-sg", "acceptedForms": [{
  "value": "dítě" }] }, … ] }` and `{ "kind": "verb", "verb": "mluvit", "preposition": "o", "case": "loc", "forms": {
  "1sg": "mluvím", "2sg": "mluvíš", "3sg": "mluví", "1pl": "mluvíme", "2pl": "mluvíte", "3pl": "mluví" } }`; a verb with
  a subject has it too (`"subject": "to"`). A noun's gender is the noun dataset's, `pluralGender` is the pairing's
  `plural-gender` (only when it is given), and its `cells` are its noun dataset cells, every case included, without the
  variants marked `non-final` (the noun ends the phrase, so *advokát*'s `dat-sg` is just `advokátovi`) and without any
  remark (this quiz shows none). A verb's `forms` hold one form per person: the verb dataset's first variant, unless the
  entry names another. The contract checks both shapes, and keeps a noun's key (`noun:<prompt>`) apart from a verb's
  (`verb:<verb>`, plus `+<preposition>`). The adjective forms are not data: the language's adjective declension
  generator decides them (`src/quizzes/adjective-noun-declension/declension-of-adjectives_with_nouns.ts`, the owner's,
  for Czech).

  The join writes the file laid out by Prettier and replaced in one step, as the scraper does. It writes nothing,
  lists every problem and exits 1 if a pairing noun is not a noun of the noun dataset, has no gender there or another
  gender there; a noun's adjective list is empty or repeats an adjective; declining one of a noun's adjectives throws
  (or gives no form) in any cell the noun has; a `plural-gender` is not one of `m. živ.`, `m. neživ.`, `ž.`, `s.`; a
  noun's `ins-pl` has a variant with the `dual` remark (the dual is not designed for this quiz yet); a governing verb is
  not a verb of the verb dataset, or names a variant the verb does not have; or a case other than the vocative has no
  governing verb. It also refuses a pairing that is not a list of nouns or names a noun twice, an input dataset item
  that breaks its own contract, and anything it makes that breaks this quiz's contract.
- **Demonstratives with nouns** (`data/cs/language-trainer/demonstrative-noun-declension.json`, `manual: true`): a
  joined dataset too, made by `npm run join:cs:demonstratives` from the inputs of adjectives with nouns, which the
  sentence quizzes share: the pairing's nouns, genders and plural genders (its adjectives are not read),
  `cs/prirucka/noun-declension`, `cs/prirucka/verb-present-tense` and the same governing verbs module, unchanged.

  Its items are the nouns, in pairing order, then the verbs, in module order. A noun is `{ "kind": "noun", "prompt":
  "dítě", "gender": "s.", "pluralGender": "ž.", "cells": [ … ] }`: the noun of adjectives with nouns without
  `adjectives`, and without its vocative cells (`voc-sg`, `voc-pl`), because this quiz never asks them; its `non-final`
  variants and every remark are dropped, as there. A verb is exactly the verb item of adjectives with nouns. The
  contract checks both shapes (a noun with a vocative cell is refused) and keeps a noun's key apart from a verb's, as
  there. The pronoun's forms are not data: the language's demonstrative pronoun table decides them
  (`src/quizzes/demonstrative-noun-declension/pointing-pronouns.ts`, the owner's, used as it is, for Czech).

  The join writes the file as the other join does. It writes nothing, lists every problem and exits 1 on the refusals
  of adjectives with nouns that are not about adjectives: a pairing noun that is not a noun of the noun dataset, has no
  gender there or another gender there; a `plural-gender` that is not one of `m. živ.`, `m. neživ.`, `ž.`, `s.`; a
  noun's `ins-pl` with a variant with the `dual` remark; a governing verb that is not a verb of the verb dataset, or
  names a variant the verb does not have; a case other than the vocative with no governing verb; a pairing that is not
  a list of nouns or names a noun twice; an input dataset item that breaks its own contract; and anything it makes that
  breaks this quiz's contract. It also refuses a noun one of whose cells the table gives no form for. The two joins
  share their code (`scripts/joins/sentence.ts`), and `check-data` runs both on every build.
- **Layout:** valid JSON formatted with [Prettier](https://prettier.io/) (the repository's Prettier config, if
  there is one, otherwise Prettier's defaults). The scraper formats the file as it saves it, so saving it from
  an editor that formats on save changes nothing.
- **Content rule:** the file only holds items that satisfy the quiz type's contract completely. A failed item is
  never written.
- **Missing or foreign file:** a missing file, or one whose language, source or quiz type differs from the
  target, counts as "nothing scraped yet". A file that is not valid JSON is a fatal error for the scraper (it
  would otherwise start over and send the whole list to the site again).
- **Build-time check** (`npm run check-data`, also run by `npm run build`): fails, listing every problem, if a
  dataset a source provides with `bundled` delivery has no file, a file under `data/` is not provided by any
  source, a file's envelope does not match its location, an item violates its quiz type's contract, two
  items of one file have the same key (the contract's `keyOf`), or no dataset holds any item. A dataset with zero items is valid; its pool shows the "nothing to practise yet"
  status. A second step checks `source-material/`: a missing side file is fine (it may not have been scraped
  yet), but a file there that is not a side file of a scraped dataset, or a side file whose envelope does not match
  its location, that has a word which is not an item of its dataset, or (the source-material file) a line or a cell
  leading to an article id that is not a key of its `footnotes`, fails the build like a dataset does. A third step
  runs every join (the list `JOINS` in `scripts/joins/index.ts`) in memory: it reports each problem the join finds in
  its inputs, as `data/<file> cannot be joined: <problem>`, and if there is none but the committed file differs from
  what the join would write now (or is missing), it fails with `data/cs/language-trainer/adjective-noun-declension.json
  is out of step with its inputs. Run: npm run join:cs:adjectives`. So a re-scrape or an edit of an input can never
  reach the site with a stale joined dataset. It prints `Data OK: <n> items in <n> dataset file(s), <n>
  source-material file(s).`
- **Delivery.** The only implemented delivery is `bundled` (above). A `github` delivery is typed in
  `src/sources/source.ts` but has no loader: `loadDataset` rejects it with a clear error, and no source uses it.

## The scraper

```
npm run scrape:cs:verbs | npm run scrape:cs:nouns [-- --force] [--delay-ms <ms>] [--fail-cooldown <duration>]
tsx scraper/cli.ts [--source <id>] [--language <id>] [--quiz <id>] [--force] [--delay-ms <ms>] [--fail-cooldown <duration>]
```

The two scripts in `package.json` (Czech verbs, Czech nouns) are the second form with `--language cs` and
`--quiz verb-present-tense` / `--quiz noun-declension` already given; anything after `--` is added to it. The rest of this section writes the flags once and applies to both.

- **Targets.** A target is one adapter: one source, language and quiz type. `--source`, `--language` and
  `--quiz` narrow the registered adapters. With no filter and exactly one adapter registered, that one runs. With
  no filter and several, the command lists them and exits 2, so it never scrapes everything by accident: today
  there are two (`verb-present-tense` and `noun-declension`), so `tsx scraper/cli.ts` with no filter lists them,
  which is why the scripts fix `--language` and `--quiz`. A filter that matches nothing exits 2 too, e.g.
  `npm run scrape:cs:verbs -- --source nope`. Several
  matching targets run one after another. A header line per target is printed, e.g.
  `== prirucka / cs / verb-present-tense ==`.
- **Incremental.** Only items missing from the target's data file are fetched, in list order.
  `npm run scrape:cs:verbs -- --force` (or `scrape:cs:nouns`) re-fetches everything (see below).
- **Saved as it goes.** After every item that was fetched, parsed and validated, the whole data file is
  rewritten (to `.scrape-data.tmp` in the repo root, then renamed over the data file, so it is never
  half-written), in the order of the list. Failures are never written. Items that are no longer in the list are
  pruned from the file when the scrape starts. Each line of progress is numbered: `ok     bavit (3/120)`, where
  the total is the number of items this run will try. Anything the adapter or the carry-over (below) warns about
  comes just before it, as `warn   manžel (3/120): <what>`; a warning never stops the item from being saved. A word
  that fails logs only its `FAILED` line: what was warned about concerns the fresh item, which is not saved.
- **Side files.** An adapter that keeps source material (see *Data*) hands the harness, for each word, its item, its
  source-material entry, its dictionary entry and the articles it leads to; the harness writes the dataset and both
  side files together, each the same way. On every run, not only with `--force`, the side files follow the list
  exactly as the dataset does: at the start, unlisted words are dropped and the rest re-ordered; a fetched word
  gets new entries (with `--force`, every fetched word's entries are replaced); a word that fails keeps its
  previous entries; and articles that no word of the file leads to any more are dropped. The three files are each
  replaced in one step but not together, so they are written in the order that never leaves a side file with a
  word its dataset lacks if the run stops in between. That is all that is guaranteed: with `--force`, the side
  files are written first, so a run that stops in between can leave a word's new entries beside its old item.

  _This contradicts the rule that adding a source changes nothing existing, the scraper harness included (see
  *Adding things later*)._ The harness knows the shape of prirucka's source material (lines, cell footnotes,
  articles, dictionary entries), because #3 asked for that shape, so a second source whose entries say something
  else would need the harness changed. It is not redesigned yet.
- **Interrupting is safe.** Ctrl-C (or SIGTERM) prints `Stopped: N of M items saved in <file>`, removes the
  lock and exits 130 (143 for SIGTERM). Run the scrape again and it carries on with the items that are
  missing. Nothing is lost, so stopping early when the site misbehaves is always fine.
- **One scrape at a time.** `.scrape.lock` (in the repo root, git-ignored) holds the PID of the running
  scrape. A second scrape is refused with exit code 2 while that process is alive; a lock left behind by a
  crashed run is ignored. The lock is global: two scrapes never run at once, whatever the sources.
- **`--force` is not resumable.** It replaces items one by one as they succeed, and a failed refresh keeps the
  old item, but a second `--force` starts again from the first entry. To refresh just a few verbs, delete
  their items from the data file and run the plain script again (for a noun, that also drops what was written
  on it by hand, which only `--force` carries over).
- **Keeping what was written by hand.** A forced scrape makes each item again from its page, which has none of the
  owner's remarks and explanations. So a quiz type whose items hold something written by hand gives its contract a
  `carryOver` hook, and the harness calls it for every fetched word that already had an item, before checking the
  fresh one. The noun hook puts each variant's remarks back onto the variant with the same value in the same cell,
  and the noun's explanation back onto the noun; everything else (forms, their order, the gender) is the page's. A
  remark whose variant is no longer on the page is dropped with a warning naming the word, the cell and the value:
  `warn   manžel (1/9): cell loc-pl no longer has the variant "manželách", so its remarks (dual) were dropped`. If
  what is carried over breaks the contract (an explanation left with no remark to open it), the word fails and
  keeps its previous item, so nothing written by hand is lost; the log then says only why it failed, not which
  remarks would have been dropped. Verbs have no hook: nothing in a verb item is written by hand.
- **Exit codes.** `0` everything requested is in the data; `1` some items failed or were not attempted, or a
  fatal error such as a failed save; `2` bad usage, an unknown target, or another scrape is running; `130` /
  `143` interrupted.
- **Failures.** An item that cannot be fetched or parsed is logged and left out of the data (so it is not on the
  site). The run ends with a summary and a **non-zero exit code**; the items that worked are already saved.
  There is no overrides file for now. Two safety rules: a failed `--force` refresh keeps the item's previous
  data instead of deleting it, and after 5 fetch failures in a row the run stops asking the site and reports the
  remaining items as "not attempted". A fetch failure is a timeout, "busy", an HTTP error or any other unexpected
  error while a word's entry is fetched; finding the entry is part of fetching it. Finding no single entry for the
  word, or anything that goes wrong once its entry is fetched (it fails to parse, its item breaks the contract, or
  the adapter's parser or the carry-over throws), is not a fetch failure: that word fails on its own. By default
  there is no cool-down: wait, then run it again, or use `--fail-cooldown` (next point).
- **`--fail-cooldown <duration>`.** When an item cannot be fetched (after the request-level retries described
  under *Politeness*), the scrape stops for that long and then tries the same item again instead of moving on,
  e.g. `npm run scrape:cs:nouns -- --fail-cooldown 10m`. The duration needs a unit: `500ms`, `90s`, `10m`, `1h` (a bare
  number is rejected, so it cannot be mistaken for the milliseconds of `--delay-ms`). Only fetch failures
  (previous point) trigger it. A word that fails on its own is logged `FAILED <item> (n/total): <reason>` at once,
  with no cool-down and no second fetch, because the site is fine and waiting will not change its entry. Each fetch
  failure still counts towards the 5-in-a-row limit, so a site that stays down is given up on after 5 attempts at
  the same item (4 cool-downs), not waited for forever. The progress log shows
  `retry  <item> (n/total): <reason>; cooling down for N s first`. Off by default; Ctrl-C works during a cool-down
  like at any other time.
- **Validation.** Every item is checked against its quiz type's contract before it is saved. For
  `verb-present-tense` that means six cells in the fixed order, each with at least one non-empty form; an item
  that falls short fails with `no form found for <id>` and is not written. For `noun-declension` it means cells in
  display order starting with the nominative, each with a form, and at least one cell besides the first.

### The prirucka adapter

[`scraper/sources/prirucka/`](scraper/sources/prirucka/) holds the source's request policy, its two adapters, the
parsers of the verb and the noun pages, and `page.ts`, what every page has in common (the source-material parser
among it).

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
- **Nouns.** The parser reads the `rod:` line (`m. živ.`, `m. neživ.`, `ž.`, `s.`) and the table of seven cases
  × singular / plural. The gender is saved with the item as `gender`, worded as the site words it; the quiz does not
  use it yet. It is optional in the data: nouns scraped before it was kept have none, and are not fetched again
  for it (only `--force` re-fetches a noun that is already saved). An empty cell (no plural, no singular) is simply not a cell of the item, and a cell that
  holds only a dash is ignored. Variants (`pánovi, pánu`) all count as correct, as for verbs. A word that has
  several entries is resolved by following the one entry whose label is a noun gender (`stát, m. neživ.`, not
  `stát, sloveso`). If there is none, or **more than one** (`vedoucí` is a man, a woman and an adjective), that word
  fails on its own with a clear message and is left out: the run goes on, like for any word that fails to parse,
  and ends with the usual summary and exit code 1. There is no way yet to say which entry is meant; see *Words known
  to fail*. A page whose entry names no gender (a verb, an adjective) is refused the same way.
- **Source material.** The shared parser in `page.ts` reads it for both adapters, from the entry's own body (its
  heading up to the next one).
  - **Lines** are the entry's `p.polozky` lines (`dělení`, `rod`, `příbuzná slova`, `příklady`, `poznámky k heslu`,
    `lze i`, …), split at the first colon into label and HTML. The table's rows that are not cells of the quiz are
    lines too, in their place: on a verb page *rozkazovací způsob*, *příčestí činné / trpné*, the *přechodník* rows
    and *verbální substantivum* are table rows, not `p.polozky` lines. Such a line is labelled with the row's header
    and holds the HTML of its value cells (`<td …>`, spans kept), so moct's article 590, which only its *přechodník
    přítomný, m.* leads to, stays referenced.
  - **Footnotes** are read only from those lines and from the table's cells, never from the rest of the page: the
    list of links at the bottom of the page repeats every marker. A marker
    (`bref_baleni("bref4", "226")`) names its block on this page and the article's global id; the article is the
    block's HTML, which the page already holds (no request), tidied so that one id reads the same from every word:
    without its `.screen` "Skrýt" links and its `div.print` rule, with `nadpis<n>_` heading ids turned into
    `nadpis_`, trimmed. A marker whose block is missing from the page is left out of its line or cell, with a
    warning in the scrape log naming the word and the article id; the word is still saved. A marker in a noun's
    case row but in no cell of it (a column past the plural) is left out the same way, with a warning naming the
    row.
  - **Dictionary entries** are the hidden `dict_ssc` and `dict_ssjc` blocks, without their title; a dictionary the
    page does not quote has none.
  - **Tests** read it from whole saved pages of `moct`, `noha`, `manžel` and `bratr` (`fixtures/`). The other saved
    pages are trimmed to the entry, so their markers lead to articles they do not hold, and only warn.
- **Politeness.** One request at a time, 30 s timeout, up to 4 retries (the wait before retry n is at least n × 15 s), and
  a pause of 1.5 s by default between one request finishing (answer, error or timeout) and the next one
  starting, so a slow answer never leaves two requests in flight. The requests carry the User-Agent
  `language-trainer-scraper (+https://github.com/5ZYSZ3K/language-trainer)`. Change the pause with
  `npm run scrape:cs:nouns -- --delay-ms 5000` or the `SCRAPE_DELAY_MS` environment variable (the flag wins); the retry
  waits are never shorter than it. The site keeps an address "busy" while it thinks an earlier query from it is
  still being evaluated, and answers HTTP 200 with a "server is overloaded" page (the scraper recognises it
  and retries after a pause; it never uses the page's "nechci čekat" override). During development this state
  set in after a burst of overlapping and timed-out requests from one address and then lasted tens of
  minutes, so: **never run two scrapes at once, and do not keep re-running a scrape that is failing**. The
  scraper itself stops after 5 fetch failures in a row for the same reason.

> **Not yet verified at full scale.** The parser and the scrape logic are tested against saved real pages, and
> a good part of the list has been fetched live, but a complete clean run over the whole list has not been
> checked end to end. Check the log, the failure summary and the produced JSON before relying on the data.
>
> The noun adapter has been run live on only a handful of words (*stát*, *kuře*, *zdraví*, *hrad*, *Čech*, plus
> saved pages of *pán*, *dveře*, *pusa*), all of which worked. `data/cs/prirucka/noun-declension.json` therefore
> holds just those eight nouns until you run `npm run scrape:cs:nouns` over the whole list.

#### Words known to fail

`nechtít se` (a verb) cannot be scraped: the site only has *chtít*, and the impersonal *nechce se mi* is a
different construction, so it would be rejected and appear in the failure summary on every run. It is not on the
verb list; leave it off unless an overrides mechanism is added. Nouns with more than one noun entry on the site
(`vedoucí`, and probably some homonyms such as *zámek*) fail on every run until there is a way to name the entry.
`lists/cs/noun-declension.txt` was seeded with every noun of the vocabulary list and has not yet been scraped in
full: the first complete run will show which ones fail. Any other word that fails is listed by the run itself.

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
lists/<language>/<quiz type>.txt      scraper input (comma-separated entries)
lists/<language>/<quiz type>.json     a join's input: the pairing of nouns with adjectives, which the joins of every
                                      sentence quiz read; only the scraper and the joins read lists
data/<language>/<source>/<quiz type>.json   the committed datasets
source-material/<language>/<source>/<quiz type>.json, <quiz type>.dictionaries.json
                                      each dataset's committed side files: source material, never shipped
public/                               .nojekyll only
src/
  core/        pure, tested logic: matching, typing shortcuts, Round, Scores, Settings (what a quiz remembers per
               pool), random pick, the record guard; knows nothing about languages, sources, quiz types or texts
  languages/   the languages that can be learned: characters, typing shortcuts, names (registry in index.ts)
  sources/     the data sources and which datasets each provides (registry in index.ts)
  quizzes/     one folder per quiz type: contract, score meters, texts, mount (the quiz's DOM)
               (registry in index.ts); noun-declension also holds its filter (pure, tested; the sentence quizzes
               use it too) and the filter dialog, its remark codes with what a checked cell's answer line and the
               explanation dialog show (pure, tested) and the explanation dialog, and its contract's carry-over hook
               (pure, tested);
               numerals holds its ranges and picking, the version list rules and the numeral generator of each
               learned language (cs.ts), all pure and tested; adjective-noun-declension holds its contract (items.ts),
               the owner's Czech adjective declension generator (declension-of-adjectives_with_nouns.ts, used as it
               is), its adapter to the quiz's ids (cs.ts) and the generators by language (generators.ts), the
               governing verbs of each learned language (governing-verbs.<id>.ts, read only by the joins), what fills
               its first blank (draw.ts, page.ts) and its mount (mount.ts). It also holds what every sentence quiz
               shares, each part taking the cases the quiz offers, its texts and its meters: the items and their
               contract checks (sentence-items.ts), the draw of a round and its steps, the noun, the case and number
               and the verb's person (sentence-draw.ts), the filter dialog's ticks while it is open (filter.ts, over
               the noun quiz's filter) and the page without its DOM (sentence-page.ts: SentenceRoundPage, the page of
               any sentence quiz whatever its round holds, and SentenceQuizPage, the page of a quiz of two fields that
               takes what fills the first blank), all pure and tested, the texts every sentence quiz has
               (sentence-texts.ts), and the DOM that draws the page (sentence-mount.ts: mountSentenceRounds, the page
               around the quiz's own view of its round, and mountSentenceQuiz, the view of two fields;
               filter-dialog.ts);
               demonstrative-noun-declension is a sentence quiz made of them: its contract (items.ts), the owner's
               Czech demonstrative pronoun table (pointing-pronouns.ts, used as it is), its adapter to the quiz's ids
               (cs.ts) and the tables by language (tables.ts), what fills its first blank (page.ts), all pure and
               tested, and its mount (mount.ts)
  datasets/    the pool (language, source, quiz type), the dataset file's envelope and the loader of the bundled
               datasets
  registry.ts  findById(): how anything looks up an entry of a registry by its id
  selection.ts what the selector offers (language, source, quiz type) and `choose`: the pool to open for a saved
               choice, falling back level by level for whatever is no longer there (pure rules)
  i18n/        the UI languages, createT() and the shell's own en / cs dictionaries (a quiz type's and ui/'s
               texts live with them)
  ui/          shared DOM building blocks: special-character buttons, typing shortcuts on inputs, help list, the
               element look-up (finder)
  app/         shell.ts: header, language switch, selector, scores panel, status line (thin DOM, not unit tested);
               pool-choice.ts: the saved choice of pool
  config.ts    repository coordinates
  main.ts      wiring: storage, UI language, the registries, mount
  style.css    the page's styles; fonts/ holds the bundled font files (Comic Relief, OFL)
scraper/       build-time only, never shipped
  cli.ts, cli-options.ts   entry point; arguments and environment
  harness/     lock, atomic data file, the side files (source-material.ts: their format, reading and writing),
               polite requests, run context, target selection, adapter registry
  list.ts          the word-list reader (comma-separated entries)
  list-driven.ts   the loop over a word list: fetch, parse, carry over, validate, save after every item
  sources/prirucka/   request policy, adapters, the verb and noun parsers and what they share (page.ts);
                      fixtures/ holds real pages from prirucka.ujc.cas.cz that the parser tests run against: moct,
                      noha, manzel and bratr whole, the others trimmed to the entry (so their footnote markers lead
                      to articles that are not in them)
scripts/       check-data.ts: validates data/ and source-material/ before every build, and runs the joins to check that
               each joined dataset is in step; publish-pages.ts: commits dist/ to the local gh-pages branch (tested
               against a temporary repo); registry.test.ts: checks the registries and the scraper's adapters against
               each other; join.ts: the command that writes a joined dataset (`npm run join:cs:adjectives`,
               `npm run join:cs:demonstratives`)
  joins/       the joined datasets (index.ts: `JOINS`), what a join is and reads (join.ts), what the joins of the
               sentence quizzes share (sentence.ts), and each join: adjective-noun-declension.ts, the Czech adjectives
               with nouns, and demonstrative-noun-declension.ts, the Czech demonstratives with nouns (pure, tested)
```

Rules the layout keeps: `src/` never imports from `scraper/` or `scripts/`, nor refers to `source-material/` (a
unit test scans for both), and `scraper/` and `scripts/` may import types, registries and contracts from `src/`.
The page never calls a source, and no parser or HTML library is in its bundle.

Tests sit next to the code (`*.test.ts`) and run with `npm test`. The `test-support.ts` files hold the little
helpers that several tests share (a run context, saved pages of the site).

## Adding things later

None of these should require changing the shell, the scores, the selection rules, the scraper harness or the
other quiz types. If one does, the architecture needs fixing first. Languages, sources and quiz types are plain
typed lists; nothing is discovered dynamically.

- **A quiz type.** Create `src/quizzes/<id>/` with its item type, `Contract` (`validateItem`, `keyOf`), meters,
  texts (typed `en` / `cs` dictionaries, including `name`, its label in the selector) and `mount`, and
  add it to `src/quizzes/index.ts`. It may reuse the type-in blocks in `src/ui/` and `src/core/` or bring a
  different interaction. A quiz that wants to remember something between visits (a filter, say) saves it through
  `host.settings`, which the shell keeps per pool. If its items hold something written by hand, its contract gets a
  `carryOver` hook, so that a forced scrape keeps it. Its id is permanent. The selector picks it up by itself.
- **A sentence quiz** (see the glossary) is such a quiz type built from what the sentence quizzes share, in
  `src/quizzes/adjective-noun-declension/`. Its noun item is a `SentenceNounItem` (sentence-items.ts, with the checks its
  contract is made of). A quiz of two fields, a word and the noun after the verb form, is a `SentenceQuizPage`
  (sentence-page.ts) made of its rules (`SentenceQuizRules`: what fills the first blank, with its base form for a noun and
  its accepted forms in a case and number, and the cases the quiz offers) and its meters; its texts have every
  `SentenceTextKey` of its cases (sentence-texts.ts), `field.<kind>`, the first field's label, and `field.noun`; its mount
  hands the page and its translator to `mountSentenceQuiz` (sentence-mount.ts). Any other sentence quiz extends
  `SentenceRoundPage` with its own draw (made of the steps in sentence-draw.ts) and the cells its round asks, and hands
  the page, its translator and its own view of the round to `mountSentenceRounds`. Its dataset is a joined dataset
  (below) whose join is `joinSentenceQuiz` (`scripts/joins/sentence.ts`) with the quiz's own `SentenceNounRules` and
  `SentenceVerbRules` (`GOVERNING_VERBS` takes the governing verb items as they are).
- **A source.** (It shows up in the selector as soon as a second source provides something for the language.)
  Add `src/sources/<id>.ts` (name, url, trust, license, attribution, `provides`) and register it
  in `src/sources/index.ts`. Add `scraper/sources/<id>/` with a request policy and one adapter per provided
  dataset, and register it in `scraper/harness/registry.ts`. An adapter may use `list-driven` or its own loop;
  it only has to write items that satisfy the contract. Keeping source material is up to the adapter: one that
  hands none over writes no side files. One whose source material has another shape than prirucka's needs the
  harness changed first (see *Side files* under *The scraper*).
- **A dataset** (a source covering another language or quiz type): add the `provides` entry and the adapter, run
  the scrape, and commit the file in `data/<language>/<source>/`. `npm run build` and the registry test
  (`scripts/registry.test.ts`) tell you what is missing.
- **A learned language.** (It shows up in the selector once a source provides something for it.) Add
  `src/languages/<id>.ts` (characters, shortcuts, names) and register it in `src/languages/index.ts`. Quiz types are unaffected; datasets for it live under `data/<id>/`, lists under
  `lists/<id>/`.
- **A hand-written dataset.** Add the `provides` entry with `manual: true` and commit the file; no adapter is
  needed. The build validates it like any other.
- **A joined dataset.** Add the `provides` entry with `manual: true` (no adapter makes it), write its join in
  `scripts/joins/` (a `Join`: the pool it makes, the npm script that writes it, the datasets and lists it reads, and a
  `make` that turns those inputs into items or lists every problem, without throwing), add it to `JOINS` in
  `scripts/joins/index.ts` and its npm script (`tsx scripts/join.ts <language>/<source>/<quiz type>`) to
  `package.json`. Run the script and commit the file. `check-data` then runs it on every build, so the file cannot fall
  out of step with its inputs. A joined dataset for another learned language is one more `Join` the same way; for
  adjectives with nouns it also needs that language's governing verbs (`governing-verbs.<id>.ts`) and its adjective
  declension generator in `ADJECTIVE_DECLENSION_GENERATORS`, and for demonstratives with nouns the same governing verbs
  and its demonstrative pronoun table in `DEMONSTRATIVE_TABLES` (a test asks for one for every provided pool).
- **A UI language.** List it in `UI_LANGUAGES` (`src/i18n/index.ts`) and write the file the compiler then asks
  for in each set of texts (the shell's, `src/ui/`'s, each quiz type's, each learned language's); a missing key
  is a compile error. Then write it into every noun's `explanation` in the data too: the compiler does not see
  those, but `check-data` (and so `npm run build`) refuses an explanation without a text in every UI language.
- **The `github` delivery.** Add the loader, change a dataset's `delivery`, extend the test; the data files do
  not move.

Other tenses, parts of speech and sources are not designed. Before the first publish, prirucka's terms of reuse
still need to be reviewed.

## Page behaviour in short

- **Selector.** Under the heading there is a native dropdown for each thing there is a choice of: the learned
  language (only once there are two), then the exercise. The exercise dropdown lists every quiz of the language,
  grouped by source (trusted sources first, then by name; an unverified one is labelled `· unverified`). A dropdown
  with fewer than two options is not shown. It is styled like the page's other controls, so it does not stand out.
  The choice is remembered in `localStorage` under `pool`; a remembered choice that no longer exists falls back to
  the default (the first language, its first trusted source, that source's first quiz). Scores are kept per pool,
  and the scores panel shows the meters of the quiz on the page.
- **Unverified sources.** While a quiz of an unverified source is open, a warning under the intro says that its
  answers have not been checked against an authoritative reference, and links to the source.

### Verbs

- A random verb each round, never the same one twice in a row (unless there is only one).
- All six forms are always shown, singular first, then plural: singular on the left and plural on the right on a
  wide screen, one after the other on a narrow one. Enter checks the field and moves to the next open form in that order; once every form is checked, Enter starts
  the next verb. Reflexive particles (`se`, `si`) are typed as part of the answer.
- Each cell has its own Check button, plus "Check all". Checking locks a cell for the round: correct turns it
  green, wrong turns it red and shows all accepted variants joined by ` / `. A single check on an empty cell is
  ignored; "Check all" counts empty cells as wrong. While any cell is still open, "Check all" is the highlighted
  button and the other one reads "Skip" (a new verb, this one left unfinished); once every cell is checked, "Check
  all" is disabled and the highlighted button is "Next verb".
- **Going to a verb.** Under the buttons, *Go to verb:* opens one particular verb: type its infinitive as the prompt
  shows it, reflexive particle included (`bát se`; `bát` finds nothing), and press Go or Enter. Case and spaces are
  forgiven as in answers, diacritics are not, and nothing is suggested. The verb opens as if it had come up at random
  (and is scored the same); Next then goes back to random verbs. A word that is not in the list gets *No verb "…" in
  this list.* and stays in the field, to be corrected. The special-character buttons and the typing shortcuts work
  in that field too.
- Matching ignores case and surrounding / repeated whitespace; nothing else is forgiven, diacritics included.
- Typing shortcuts: `'` after a vowel → `á é í ó ú ý`, `^` after a letter → `č ď ě ň ř š ť ž`, `u@` → `ů`;
  only plain typing triggers them, not deleting or pasting. There are also buttons for the special characters.
- Scores (forms correct / checked, verbs fully correct / completed) are kept per pool in `localStorage` under
  the key `scores`; "Reset scores" asks for confirmation and clears the scores of every pool, not only the one
  on the page.
### Nouns

- A random noun each round, never the same one twice in a row. The dictionary form is shown as the prompt and also
  put in the table, locked and marked "given" (the nominative singular, or the nominative plural for a noun
  without a singular such as *dveře*). It is never checked or scored. Everything else is a cell to fill in: seven
  cases (the Czech 1st to 7th, vocative included) for the singular and the plural, in two columns on a wide screen
  (singular left) and one after the other on a narrow one. A noun without a singular or a plural has no column for it.
- Checking, "Check all", "Skip" / "Next noun", Enter and the matching rules work as for verbs.
- **Remarks.** Nothing about them shows until a cell is checked. Then, in that cell's answer line, each variant with
  remarks is followed by a chip per remark, labelled in the UI language and styled like the numerals' remarks
  (*dual*, *before another noun*, *other meaning*), and an ⓘ. Plain variants get neither, and there is no legend. The
  ⓘ is outside the Tab order, so Enter and Tab keep moving between the fields; a click or tap opens a dialog, in the
  UI language, with the variant and its chips, then the shared explanation of each remark that has one (`dual`,
  `non-final`), then the noun's own explanation if it has one (`meaning` shows only that). Close, Esc or a click
  outside closes it, and the focus goes back to the field it was in. The given cell still shows only its first value.
- **Filters.** The Filters button opens a dialog with a grid of all 14 forms (7 cases × singular / plural), each a
  checkbox. A row heading or a column heading switches the whole row or column; "Select all" and "Clear all" do
  what they say. Closing the dialog (Done, Esc, a click outside) applies the choice, if anything changed, and starts
  the same noun again with empty fields. A cell is shown, and asked, only if its own box is ticked, the given one
  included; a random noun is only picked if at least one cell of it is asked, so a noun with no plural never comes
  up with only plural boxes ticked. A noun with nothing to ask for is still shown in the prompt, with *The current
  filters leave nothing to ask for.* instead of the fields; it counts as done ("Next noun" highlighted, "Check all"
  disabled, nothing scored). That is what you get after a filter change that leaves the noun nothing, for a noun
  opened with *Go to noun:* that the filters leave nothing, and, for a random noun, when no noun has anything to ask
  (everything cleared, or only the given cell ticked). The choice is remembered per pool in `localStorage` under
  `settings`.
- **Going to a noun** works as for verbs, by the dictionary form the prompt shows (`dveře`, `Čech`), whatever the
  filters say.
- Scores: forms correct / checked, nouns fully correct / completed (over the forms that were asked), per pool.

### Numerals

- A random number each round (never the same one twice in a row), shown with Czech digit grouping (`2137`,
  `21 375`). Type it in words in one field; the special characters and typing shortcuts work as for verbs.
- Enter or Check checks it once; an empty field counts as wrong (it is the way to see the answers). Every version
  the generator accepts is correct, the less common ones included; the matching rules are those of the other quizzes.
  Until then Check is the highlighted button and the one below reads "Skip" (a new number, this one unanswered);
  after the check, Check is disabled and the one below becomes the highlighted "Next number". Enter again, or that
  button, gives the next number.
- After a check: a correct answer turns green and shows your version with its remarks, then the other versions; a
  wrong one turns red and shows all versions. Versions without remarks come first, then by number of remarks; the
  first 10 are shown, the rest behind "Show all". Remarks are tags in the UI language (*less common*, *inverted
  order*, *mixed order*, *masculine*, …), with the part of the number they are about in brackets (*inverted order
  (tisíc)*), and a legend explains the ones on screen.
- Scores: numbers correct / checked, per pool.

### Adjectives with nouns

- Each round draws, each uniformly: a noun (never the same one twice in a row, unless there is only one), one of its
  adjectives, a case, a number, a governing verb followed by that case, and a person and number for the verb. The case
  is one where the filter ticks a form the noun has and some governing verb is followed by it (the vocative needs
  none); the number is one the filter ticks in that case and the noun has (`dveře` is always plural, `zdraví` always
  singular). So with the genitive singular and plural and the instrumental singular ticked, half the sentences are in
  the instrumental. A noun is drawn only if it has such a case. In the nominative the sentence is `To je ___ ___.` or
  `To jsou ___ ___.`: `být` after `to` is in the third person and its number follows the noun's (`To je dobrý
  advokát`, `To jsou dobří advokáti`), so nothing about the verb is drawn. The vocative has no verb.
- Above the sentence: the adjective and the noun in their base forms, then the case and number in the UI language, e.g.
  `dobrý · advokát — 3. dative, singular`, with the cases named and numbered as in the noun quiz. The gender is not
  shown: knowing it is part of the drill. The sentence is the verb form, after its subject and with its preposition,
  capitalised (`To je`, `Mluvím o`), then a field for the adjective and one for the noun, then a full stop: `Pomáháme
  ___ ___.`, `Mluvím o ___ ___.`, `Dívám se na ___ ___.`, and in the vocative `___ ___!`. There is no personal pronoun.
  On a narrow screen the sentence wraps and the fields keep their order. Sentences can be absurd (`Pomáhám zajímavé
  aktivitě`): it is a grammar drill, and the data cannot tell an animate feminine noun from an inanimate one.
- The adjective's accepted forms come from the language's adjective declension generator (the round's case and
  number, the noun's gender, and its plural gender in the plural); the noun's are its cell's. The matching rules are
  the usual ones. The special-character buttons and the typing shortcuts work in both fields.
- Enter checks the field it is in and moves to the next open field (an empty field is not checked: Enter only moves
  on); when both are checked, Enter starts the next sentence. There is no Check button per field: "Check all" counts
  empty fields as wrong, and "Skip" / "Next sentence" is highlighted the way the verb and noun quizzes highlight theirs.
  A checked field turns green with a ✓, or red with ✗ and every accepted form joined by ` / `. There are no remark
  chips.
- **Filters.** The Filters button opens a dialog like the noun quiz's: a grid of all 14 forms (7 cases × singular /
  plural), each a checkbox named by its case and number (*3. dative, singular*). A row heading or a column heading
  switches the whole row or column; "Select all" and "Clear all" do what they say. All forms are ticked at first.
  Closing it (Done, Esc, a click outside) applies the choice and, if anything changed, starts a new sentence. The
  choice is remembered per pool in `localStorage` under `settings`, saved as the noun quiz saves its own, and checked
  when it is read back (anything else, such as an older build's filter of cases, ticks every form). When the filter
  leaves no noun a form to ask (nothing ticked, or only forms no noun has, such as the plural of nouns that have none),
  the round shows *The current filters leave nothing to ask for.* instead of the sentence: "Next sentence" is
  highlighted, "Check all" is disabled, and nothing is scored.
- Scores, per pool: adjective forms correct / checked, noun forms correct / checked, sentences fully correct /
  completed. A skipped sentence counts only the fields it checked, and is not completed.
- The source is the site's own rules (the adjective forms are its generator's), so the unverified warning is shown, as
  for numerals.

### Demonstratives with nouns

- It is adjectives with nouns (above), with the demonstrative pronoun (`ten`, `ta`, `to`) in the adjective's place and
  no vocative. Each round draws a noun, a case, a number, a governing verb and a person and number for the verb, as
  there; the case is never the vocative, which the pronoun does not have.
- Above the sentence: `ten` and the noun in their base forms, then the case and number in the UI language, e.g.
  `ten · advokát — 3. dative, singular`. It is `ten` whatever the noun, and the gender is not shown: knowing it is part
  of the drill. The sentence is the verb form, after its subject and with its preposition, capitalised, then a field for
  the pronoun and one for the noun, then a full stop: `Pomáháme ___ ___.`, `Mluvím o ___ ___.`, and in the nominative
  `To je ___ ___.` / `To jsou ___ ___.`. The noun never starts the sentence.
- The pronoun's accepted form comes from the language's demonstrative pronoun table: the round's case and number, and
  the noun's gender, or its plural gender in the plural (`To jsou ty děti`, not `ta děti`). The noun's accepted forms
  are its cell's.
- Enter, "Check all", "Skip" / "Next sentence", the answer lines, the matching rules, the special-character buttons
  and the typing shortcuts work as in adjectives with nouns. There are no remark chips.
- **Filters.** The dialog is that of adjectives with nouns with the 12 forms of every case but the vocative (6 cases ×
  singular / plural), all ticked at first; a column heading switches its six. It is applied, remembered per pool and
  checked when read back the same way (of what is read back, only these 12 forms count), and a filter that leaves no
  noun a form to ask gives the same *The current filters leave nothing to ask for.*
- Scores, per pool: pronoun forms correct / checked, noun forms correct / checked, sentences fully correct /
  completed. A skipped sentence counts only the fields it checked, and is not completed.
- The source is the site's own rules (the pronoun forms are its table's), so the unverified warning is shown.

### All quizzes

- Language follows the browser (Czech if it starts with `cs`, otherwise English); the EN / CZ switch in the
  header is remembered in `localStorage` under `language`.
