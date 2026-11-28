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
One kind of quiz: present-tense verb conjugation, noun declension, numerals or adjectives with nouns. It owns its
contract, its interaction, its meters and its texts. Its id is permanent.
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
A dataset that no adapter makes: one written by hand (the numerals ranges), or a joined dataset.

**Joined dataset**:
A manual dataset that a join makes from other datasets and hand-written input, rather than one scraped or written by
hand: adjectives with nouns takes its nouns' forms, its verbs' forms and the adjectives paired with each noun. The build
refuses one that differs from what its join would make of its inputs now.

**Join**:
The build-time step that makes one joined dataset from its inputs, as an adapter makes a scraped one; also one run of
it. The owner runs it by hand, like a scrape, after any of its inputs changes; the build runs it too, writing nothing,
to check the committed dataset against it.
_Avoid_: merge, generate

### A round

**Item**:
One thing a quiz can ask about: a word with its cells (verbs, nouns), a number range (numerals), or a noun with the
adjectives it may be paired with (adjectives with nouns). The dataset of adjectives with nouns also holds its governing
verbs as items, each with the forms its sentences show; they frame a round but are never asked about.
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

**Remark**:
A tag saying what is special about a noun's variant (*dual*, *before another noun*, *other meaning*) or a numeral's
version (*less common*, *inverted order*, *masculine*); on a version, sometimes with the part of the number it is
about. A noun's remark may have a shared explanation, the same for every noun that has it.

**Explanation**:
A noun's own hand-written note on its special variants, in every UI language.

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
What the learner has chosen to be asked. In noun declension it is the noun cells to see: only those are shown, all of
them except the given cell are asked, and a random noun is only picked if at least one of its cells is asked. In
adjectives with nouns it is the same set of cells, a case and a number each, read as the forms a sentence may ask for:
a noun is only drawn in a form that is ticked and that it has.

### Grammar

**Reflexive particle**:
`se` or `si`. It is part of a verb's prompt and part of every form the learner types.

**Case**:
One of the seven Czech cases, nominative to instrumental, vocative included, in which nouns and adjectives decline.
Cases are known by name, never by number, because languages number them differently.
_Avoid_: pád, 1st case

**Gender**:
A noun's grammatical gender, worded as the source words it (`m. živ.`, `ž.`). Adjectives with nouns decline the
adjective by it; no other quiz uses it.

### Numerals

**Range**:
A numerals item: the smallest and largest number it can pick, and its spread.

**Spread**:
How a range picks its number: *uniform* (every number equally likely) or *log* (every order of magnitude equally
likely).

**Version**:
One accepted way of writing a number in words. A number usually has several.
_Avoid_: variant (that is a cell's)

**Numeral generator**:
A learned language's rules for writing any number in words. Numerals are not scraped: the generator decides every
version.

### Adjectives with nouns

**Sentence**:
What a round of adjectives with nouns shows: a governing verb's form, after its subject and with its preposition if it
has them, followed by a blank for the adjective and one for the noun (`Mluvím o ___ ___.`, `To je ___ ___.`). A
vocative sentence has no verb (`___ ___!`).

**Governing verb**:
A verb, with at most one preposition, that is always followed by one case: `pomáhat` by the dative, `mluvit o` by the
locative. A verb that can be followed by more than one case is not a governing verb.
_Avoid_: valency verb

**Plural gender**:
The gender a noun's plural agrees in, where it differs from the noun's own: `dítě` is neuter, `děti` are feminine.

**Adjective declension generator**:
A learned language's rules for declining any adjective by case, number and gender. Adjective forms are not scraped:
the generator decides every one.

### Building the data

**List**:
The input that alone decides what one dataset of one quiz type holds, for one language: the words a scrape fetches,
by prompt, or the nouns with the adjectives they may be paired with, which a join takes. A word removed from it is
removed from the data at the next scrape or join.
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

**Source material**:
Everything an entry says beyond the forms: its lines (syllabification, related words, examples, the entry's notes and
the like), its footnotes and the dictionary entries it quotes. It is kept beside a dataset for the owner, who writes
remarks and explanations from it, and is never shipped with the page.
_Avoid_: notes, metadata

**Side file**:
One of the files of source material kept next to a dataset, with the dataset's envelope: one holds each word's lines
and footnotes together with the articles they lead to, the other each word's dictionary entries. A side file only
names words that are items of its dataset. It is committed and never shipped.
_Avoid_: notes file, metadata file

**Footnote**:
A marker in an entry that leads to one of the source's grammar articles, by the article's global id: the same id is
the same article on every entry.
_Avoid_: reference, link

**Article**:
One of the source's grammar articles, which a footnote leads to. It is known by its global id, the same on every
entry, so a side file keeps each article once however many words lead to it.
_Avoid_: footnote (that is the marker), explanation (that is the owner's note on a noun)

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
