# Language trainer

A backendless website for practising how words inflect in a foreign language: a quiz shows a word (or a number), the
learner types its forms and checks them. Today everything is Czech; the data is scraped ahead of time and shipped
with the page.

## Language

### What is practised

**Language**:
The language being learned (Czech today). It defines the special characters and the typing shortcuts. Say *learned
language* wherever it could be mistaken for the UI language.
_Avoid_: target language, locale

**UI language**:
The language of the page's own texts (English or Czech), chosen with the EN / CZ switch. It has nothing to do with
what is learned.
_Avoid_: language (on its own), locale

**Quiz type**:
One kind of quiz: present-tense verb conjugation, noun declension or numerals. It owns its contract, its interaction,
its meters and its texts. Its id is permanent.
_Avoid_: exercise, mode, game

**Source**:
Where data comes from: the Internetová jazyková příručka, or the site's own rules. Every source has a trust level.
_Avoid_: provider, dictionary

**Trusted / unverified**:
A source's trust level. While a quiz of an unverified source is open, the page warns that its answers have not been
checked against an authoritative reference.

**Pool**:
A (language, source, quiz type) combination: the thing the learner practises. Items are drawn from the pool's dataset
alone, and scores and settings are kept per pool. The page's selector calls a pool an *exercise*.
_Avoid_: deck, set, exercise (outside the UI)

**Dataset**:
All the items of one quiz type, for one language, from one source.
_Avoid_: word list, data file

**Manual dataset**:
A dataset that is written by hand, with no adapter behind it (the numerals ranges).

### A round

**Item**:
One thing a quiz can ask about: a word with its cells (verbs, nouns) or a number range (numerals).
_Avoid_: entry, card, question, word (numerals items are not words)

**Prompt**:
What an item shows and is known by: a verb's infinitive with its reflexive particle (`bát se`), or a noun's dictionary
form (`dveře`). No two items of a dataset share one.
_Avoid_: headword, lemma

**Cell**:
One form of an item for the learner to type, such as the 2nd person singular or the genitive plural, with every form
that counts as correct for it.
_Avoid_: field, slot, input (those are the page's controls)

**Accepted form**:
A form that counts as a correct answer for a cell: the value of one of its variants. A cell has at least one.
_Avoid_: answer, solution

**Variant**:
One of the forms a source lists for a cell (`mohu, můžu`): its value, which is an accepted form, plus optional
remarks.
_Avoid_: version (that is a numeral's)

**Given cell**:
The first cell of a noun (the nominative singular, or the nominative plural for a noun with no singular), shown filled
in and locked. It is never checked or scored.
_Avoid_: hint

**Round**:
One attempt at one item. Checking a cell locks it for the rest of the round; the round is done when every cell asked
has been checked. *Skip* abandons it unfinished.
_Avoid_: turn, question

**Matching rules**:
An input is correct when it equals an accepted form, ignoring letter case and surrounding or repeated whitespace.
Nothing else is forgiven, diacritics included.

**Go to**:
Opening one particular item by typing its prompt, instead of waiting for it to come up at random. The prompt is
matched by the matching rules.

**Typing shortcut**:
A key sequence that the page turns into a special character of the learned language as it is typed (`'` after a vowel
gives `á`).

**Meter**:
One score counter of a quiz type, e.g. forms correct of forms checked, or words fully correct of words completed.
_Avoid_: stat, counter

**Scores**:
The meters' counts, kept per pool in the learner's browser.

**Settings**:
What a quiz remembers about a pool between visits, such as the noun filter.
_Avoid_: preferences

**Filter**:
The noun cells the learner has chosen to see. Only those are shown, and all of them except the given cell are asked.
A random noun is only picked if at least one of its cells is asked.

### Grammar

**Reflexive particle**:
`se` or `si`. It is part of a verb's prompt and part of every form the learner types.

**Case**:
One of the seven Czech noun cases, nominative to instrumental, vocative included. Cases are known by name, never by
number, because languages number them differently.
_Avoid_: pád, 1st case

**Gender**:
A noun's grammatical gender, worded as the source words it (`m. živ.`, `ž.`). It is kept with the noun but no quiz
uses it yet.

### Numerals

**Range**:
A numerals item: the smallest and largest number it can pick, and its spread.

**Spread**:
How a range picks its number: *uniform* (every number equally likely) or *log* (every order of magnitude equally
likely).

**Version**:
One accepted way of writing a number in words. A number usually has several.
_Avoid_: variant (that is a cell's)

**Remark**:
A tag on a version saying what is special about it (*less common*, *inverted order*, *masculine*), sometimes with the
part of the number it is about.

**Numeral generator**:
A learned language's rules for writing any number in words. Numerals are not scraped: the generator decides every
version.

### Building the data

**List**:
The scraper's input for one quiz type of one language: the words to fetch, by prompt. It alone decides what the
dataset holds; a word removed from it is removed from the data at the next scrape.
_Avoid_: vocabulary, word bank

**Vocabulary**:
Raw word material kept for picking words from. Nothing reads it.

**Scraper**:
The build-time tool that fetches source pages and writes datasets. It is never shipped with the page.

**Adapter**:
The part of the scraper that produces one dataset from one source.
_Avoid_: scraper (the scraper runs adapters), plugin

**Target**:
One adapter, as a scrape selects it: one source, language and quiz type.

**Scrape**:
One run of the scraper over a target. It is incremental: it fetches only the words of the list that are missing from
the dataset, unless it is forced.

**Entry**:
The source site's page for one headword. A word is only accepted from its own entry, never from an unrelated page the
site returns for it.
_Avoid_: page (on its own), result

**Contract**:
The exact shape a quiz type requires of an item, and what makes two items the same. A dataset holds only items that
satisfy it completely.
_Avoid_: schema

**Envelope**:
The language, source and quiz type a dataset states about itself; it must agree with where the dataset is kept.

**Delivery**:
How the page gets a dataset. Every dataset is *bundled* into the page today; nothing is fetched at run time.

**Registry**:
The written-out list of every language, source or quiz type (and the scraper's adapters). Nothing is discovered.

**Publish**:
Putting a build on the branch GitHub Pages serves. The owner does it by hand, after the last scrape and build.
_Avoid_: deploy, release
