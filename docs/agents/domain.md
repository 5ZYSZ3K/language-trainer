# Domain docs

How the engineering skills should use this repo's domain documentation. The repo is single-context: one glossary
and one set of decisions at the root.

## Before exploring, read these

- **`GLOSSARY.md`**: the domain language (pool, quiz type, item, cell, contract, version, adapter, and so on). Use it
  as the source for every name you write.
- **`README.md`**: the detailed spec and the current record of decisions. Read the section for the area you are
  working in:
  - *How it works* and *Everyday use*: the three manual steps (scrape, build, publish) and the npm scripts.
  - *Data*: each quiz type's contract, the cell ids, the numerals ranges, and what `check-data` refuses.
  - *The scraper* and *The prirucka adapter*: targets, incremental scrapes, exit codes, politeness, how entries are
    accepted, and *Words known to fail*.
  - *Code layout*: what lives where, and the layout's rules.
  - *Adding things later*: how to add a quiz type, source, dataset, learned language or UI language.
  - *Page behaviour in short*: what the page does for each quiz type. Treat this as the expected behaviour when you
    reproduce a bug or write a test.
- **`docs/adr/`**: does not exist yet. Create it lazily, using the domain-modeling skill's ADR format, the first
  time a new decision qualifies for an ADR.

## Decisions already made

These are recorded in the README and, where noted, enforced by a test. Treat them like ADRs: don't reverse one
silently.

1. **No server, no CI, no fetching at run time.** Scraping, building and publishing are steps the owner runs by
   hand. The page never calls a source, and no parser or HTML library goes into its bundle. Every dataset is
   bundled into the page.
2. **The dependency rule.** `src/` never imports from `scraper/` or `scripts/`, and `src/core/` knows nothing about
   languages, sources, quiz types or texts. `scraper/` and `scripts/` may import types, registries and contracts
   from `src/`. Enforced by `src/dependency-rule.test.ts`.
3. **Registries are plain typed lists**, and nothing is discovered. `scripts/registry.test.ts` checks the page's
   registries and the scraper's adapters against each other.
4. **Adding things touches nothing existing.** A new quiz type, source, dataset, learned language or UI language
   must not require changing the shell, the scores, the selection rules, the scraper harness or the other quiz
   types. If it does, fix the architecture first.
5. **Ids and saved state are permanent.** A quiz type's id is its data file name and part of the pool key that
   scores are saved under. The browser keeps `pool`, `scores`, `settings` and `language` in `localStorage`. Saved
   settings may come from an older build, so the quiz checks them before using them.
6. **Data is neutral.** Cell ids are neutral (`1sg`, `nom-sg`), and each quiz type's texts map them to labels.
   Data never holds UI texts, and cases are named, never numbered.
7. **The scraped data is committed.** Datasets live on `main` and are the only copy. A list is the only thing
   that decides what a scrape fetches.
8. **A dataset holds only valid items.** An item that fails its contract is never written. `check-data` fails the
   build on an invalid dataset, or when no dataset holds any item.
9. **The source is treated politely.** One request at a time, never two scrapes at once, and no re-running of a
   scrape that keeps failing. The site's "busy" state lasts tens of minutes.
10. **Every text exists in every UI language.** A missing key is a compile error, so a new text needs both its
    `en` and its `cs` wording.

The README also lists what is not designed yet: other tenses, other parts of speech, other sources, the `github`
delivery, and a way to name the entry meant for a word with several entries. Work in those areas needs a design
first (see `/grill-with-docs`). Don't improvise one inside a ticket.

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a commit message, a test name, an identifier, a
hypothesis), use the term as `GLOSSARY.md` defines it. Don't drift to the synonyms it lists under _Avoid_. The
easy ones to get wrong here:

- An **item** is not always a word: a numerals item is a range.
- A cell's **variants** and a number's **versions** are different things.
- **Exercise** is only what the selector calls a pool; it is not a domain term.
- The **language** is the one being learned. The page's own language is the **UI language**.

If the concept you need isn't in the glossary yet, either you're inventing language the project doesn't use
(reconsider), or there's a real gap. If it's a gap, add the term to `GLOSSARY.md` in its format: no implementation
details, no file paths.

## Keep the README in step

Every `feat:` commit updates the README together with the code. When a change alters behaviour, the data shape, a
script or a rule above, update the matching README section in the same change. The glossary holds names; the README
holds behaviour.

## Flag conflicts

If your output contradicts a decision above, a README rule or an ADR, say so explicitly rather than overriding it
silently:

> _Contradicts the dependency rule (README, Code layout), but worth reopening because…_
