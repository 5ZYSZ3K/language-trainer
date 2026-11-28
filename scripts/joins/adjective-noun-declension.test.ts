import { describe, expect, it } from 'vitest'
import type { Variant } from '../../src/core/cell'
import { ADJECTIVE_DECLENSION_GENERATORS } from '../../src/quizzes/adjective-noun-declension/generators'
import type { GoverningVerb } from '../../src/quizzes/adjective-noun-declension/governing-verbs'
import { joinAdjectivesWithNouns, type AdjectiveNounJoinInputs } from './adjective-noun-declension'

const czech = ADJECTIVE_DECLENSION_GENERATORS.cs!

const cell = (id: string, ...values: (string | Variant)[]) => ({
  id,
  acceptedForms: values.map((value) => (typeof value === 'string' ? { value } : value)),
})
const advokát = {
  prompt: 'advokát',
  gender: 'm. živ.',
  cells: [
    cell('nom-sg', 'advokát'),
    cell('dat-sg', 'advokátovi', { value: 'advokátu', remarks: ['non-final'] }),
    cell('nom-pl', 'advokáti'),
    cell('ins-pl', 'advokáty'),
  ],
}
const dítě = { prompt: 'dítě', gender: 's.', cells: [cell('nom-sg', 'dítě'), cell('nom-pl', 'děti')] }
const noha = { prompt: 'noha', gender: 'ž.', cells: [cell('nom-sg', 'noha'), cell('ins-pl', { value: 'nohama', remarks: ['dual'] }, 'nohami')] }
const vedoucí = { prompt: 'vedoucí', cells: [cell('nom-sg', 'vedoucí'), cell('gen-sg', 'vedoucího')] }

const verb = (prompt: string, ...forms: (string | string[])[]) => ({
  prompt,
  cells: ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'].map((id, i) => cell(id, ...[forms[i]!].flat())),
})
const verbs = [
  verb('být', 'jsem', 'jsi', ['jest', 'je'], 'jsme', 'jste', 'jsou'),
  verb('bát se', 'bojím se', 'bojíš se', 'bojí se', 'bojíme se', 'bojíte se', 'bojí se'),
  verb('pomáhat', 'pomáhám', 'pomáháš', 'pomáhá', 'pomáháme', 'pomáháte', 'pomáhají'),
  verb('vidět', 'vidím', 'vidíš', 'vidí', 'vidíme', 'vidíte', 'vidí'),
  verb('mluvit', 'mluvím', 'mluvíš', 'mluví', 'mluvíme', 'mluvíte', 'mluví'),
  verb('stát se', 'stanu se', 'staneš se', 'stane se', 'staneme se', 'stanete se', 'stanou se'),
]
const governingVerbs: GoverningVerb[] = [
  { verb: 'být', case: 'nom', show: { '3sg': 'je' } },
  { verb: 'bát se', case: 'gen' },
  { verb: 'pomáhat', case: 'dat' },
  { verb: 'vidět', case: 'acc' },
  { verb: 'mluvit', preposition: 'o', case: 'loc' },
  { verb: 'stát se', case: 'ins' },
]

const inputs = (change: Partial<AdjectiveNounJoinInputs> = {}): AdjectiveNounJoinInputs => ({
  pairing: [
    { noun: 'advokát', gender: 'm. živ.', adjectives: ['dobrý', 'chytrý'] },
    { noun: 'dítě', gender: 's.', 'plural-gender': 'ž.', adjectives: ['malý'] },
  ],
  nouns: { name: 'cs/prirucka/noun-declension', items: [dítě, advokát, noha, vedoucí] },
  verbs: { name: 'cs/prirucka/verb-present-tense', items: verbs },
  governingVerbs,
  generator: czech,
  ...change,
})
const problemsOf = (change: Partial<AdjectiveNounJoinInputs>) => joinAdjectivesWithNouns(inputs(change)).problems
const pairingWith = (...entries: unknown[]) => ({ pairing: entries })

describe('joinAdjectivesWithNouns', () => {
  it('makes the nouns in pairing order, then the governing verbs in module order', () => {
    const { items, problems } = joinAdjectivesWithNouns(inputs())
    expect(problems).toEqual([])
    expect(items.map((item) => (item.kind === 'noun' ? item.prompt : item.verb))).toEqual([
      'advokát', 'dítě', 'být', 'bát se', 'pomáhat', 'vidět', 'mluvit', 'stát se',
    ])
  })

  it('gives a noun its gender from the noun dataset, its plural gender only when the pairing gives one, and its adjectives', () => {
    const [advokátItem, dítěItem] = joinAdjectivesWithNouns(inputs()).items
    expect(advokátItem).toEqual({ kind: 'noun', prompt: 'advokát', gender: 'm. živ.', adjectives: ['dobrý', 'chytrý'], cells: expect.any(Array) })
    expect(dítěItem).toEqual({
      kind: 'noun',
      prompt: 'dítě',
      gender: 's.',
      pluralGender: 'ž.',
      adjectives: ['malý'],
      cells: [cell('nom-sg', 'dítě'), cell('nom-pl', 'děti')],
    })
  })

  it('keeps every cell of a noun, but drops its non-final variants and every remark', () => {
    const [advokátItem] = joinAdjectivesWithNouns(inputs()).items
    expect(advokátItem).toMatchObject({
      cells: [cell('nom-sg', 'advokát'), cell('dat-sg', 'advokátovi'), cell('nom-pl', 'advokáti'), cell('ins-pl', 'advokáty')],
    })
    // A dual outside the instrumental plural is kept, as a plain variant.
    const remarked = { ...noha, cells: [cell('nom-sg', 'noha'), cell('gen-pl', 'noh', { value: 'nohou', remarks: ['dual'] })] }
    const [nohaItem] = joinAdjectivesWithNouns(inputs({ ...pairingWith({ noun: 'noha', gender: 'ž.', adjectives: ['dlouhý'] }), nouns: { name: 'n', items: [remarked] } })).items
    expect(nohaItem).toMatchObject({ cells: [cell('nom-sg', 'noha'), cell('gen-pl', 'noh', 'nohou')] })
  })

  it('gives a verb its preposition when it has one, its case, and the first variant of each person unless the entry names another', () => {
    const items = joinAdjectivesWithNouns(inputs()).items
    expect(items.find((item) => item.kind === 'verb' && item.verb === 'být')).toEqual({
      kind: 'verb',
      verb: 'být',
      case: 'nom',
      forms: { '1sg': 'jsem', '2sg': 'jsi', '3sg': 'je', '1pl': 'jsme', '2pl': 'jste', '3pl': 'jsou' },
    })
    expect(items.find((item) => item.kind === 'verb' && item.verb === 'mluvit')).toEqual({
      kind: 'verb',
      verb: 'mluvit',
      preposition: 'o',
      case: 'loc',
      forms: { '1sg': 'mluvím', '2sg': 'mluvíš', '3sg': 'mluví', '1pl': 'mluvíme', '2pl': 'mluvíte', '3pl': 'mluví' },
    })
  })

  describe('writes nothing, and lists every problem, when', () => {
    it('a pairing noun is not a noun of the noun dataset, has no gender there, or a different one', () => {
      const { items, problems } = joinAdjectivesWithNouns(
        inputs(
          pairingWith(
            { noun: 'pes', gender: 'm. živ.', adjectives: ['dobrý'] },
            { noun: 'vedoucí', gender: 'm. živ.', adjectives: ['dobrý'] },
            { noun: 'dítě', gender: 'ž.', adjectives: ['malý'] },
          ),
        ),
      )
      expect(items).toEqual([])
      expect(problems).toEqual([
        'noun "pes" is not a noun of cs/prirucka/noun-declension',
        'noun "vedoucí" has no gender in cs/prirucka/noun-declension',
        'noun "dítě" is "ž." in the pairing but "s." in cs/prirucka/noun-declension',
      ])
    })

    it("a noun's adjective list is empty or repeats an adjective", () => {
      expect(
        problemsOf(
          pairingWith(
            { noun: 'advokát', gender: 'm. živ.', adjectives: [] },
            { noun: 'dítě', gender: 's.', adjectives: ['malý', 'hladový', 'malý'] },
          ),
        ),
      ).toEqual(['noun "advokát" has no adjectives', 'noun "dítě" has the adjective "malý" twice'])
    })

    it("declining one of a noun's adjectives throws, in any cell the noun has", () => {
      // rychle is an adverb; otcův declines (a possessive), and so does every regular adjective.
      expect(problemsOf(pairingWith({ noun: 'advokát', gender: 'm. živ.', adjectives: ['dobrý', 'rychle', 'otcův'] }))).toEqual([
        'noun "advokát": the adjective "rychle" cannot be declined in nom-sg: Not an adjective',
      ])
      const pickyGenerator = { ...czech, decline: (adjective: string, form: { caseId: string }) => (form.caseId === 'ins' ? [] : czech.decline(adjective, form as never)) }
      expect(problemsOf({ generator: pickyGenerator })).toEqual([
        'noun "advokát": the adjective "dobrý" cannot be declined in ins-pl: it gives no form',
        'noun "advokát": the adjective "chytrý" cannot be declined in ins-pl: it gives no form',
      ])
    })

    it('one noun has several of these problems: each is listed, a repeated adjective and one that throws alike', () => {
      expect(problemsOf(pairingWith({ noun: 'advokát', gender: 'm. živ.', adjectives: ['dobrý', 'rychle', 'dobrý'] }))).toEqual([
        'noun "advokát" has the adjective "dobrý" twice',
        'noun "advokát": the adjective "rychle" cannot be declined in nom-sg: Not an adjective',
      ])
      expect(problemsOf(pairingWith({ noun: 'noha', gender: 'ž.', adjectives: ['rychle', 'rychle'] }))).toEqual([
        'noun "noha" has the adjective "rychle" twice',
        'noun "noha" has a dual variant in ins-pl (nohama), which this quiz does not handle yet',
        'noun "noha": the adjective "rychle" cannot be declined in nom-sg: Not an adjective',
      ])
    })

    it('a plural gender is not one of the genders the generator declines by', () => {
      expect(problemsOf(pairingWith({ noun: 'dítě', gender: 's.', 'plural-gender': 'f.', adjectives: ['malý'] }))).toEqual([
        'noun "dítě" has the plural gender "f.", which is not one of m. živ., m. neživ., ž., s.',
      ])
    })

    it("a noun's ins-pl has a variant with the dual remark, which this quiz does not handle yet", () => {
      expect(problemsOf(pairingWith({ noun: 'noha', gender: 'ž.', adjectives: ['dlouhý'] }))).toEqual([
        'noun "noha" has a dual variant in ins-pl (nohama), which this quiz does not handle yet',
      ])
    })

    it('a governing verb is not a verb of the verb dataset, or names a variant the verb does not have', () => {
      const wrong: GoverningVerb[] = [
        { verb: 'být', case: 'nom', show: { '3sg': 'jsi' } },
        ...governingVerbs.slice(1),
        { verb: 'pomoct', case: 'dat' },
      ]
      expect(problemsOf({ governingVerbs: wrong })).toEqual([
        'governing verb "být" shows "jsi" for 3sg, which is not a variant of its 3sg (jest, je)',
        'governing verb "pomoct" is not a verb of cs/prirucka/verb-present-tense',
      ])
    })

    it('a case other than the vocative has no governing verb', () => {
      const onlyThree = governingVerbs.filter((entry) => ['nom', 'dat', 'loc'].includes(entry.case))
      expect(problemsOf({ governingVerbs: onlyThree })).toEqual([
        'no governing verb is followed by the case gen',
        'no governing verb is followed by the case acc',
        'no governing verb is followed by the case ins',
      ])
    })

    it('the pairing is not a list of nouns, or names a noun twice', () => {
      expect(problemsOf({ pairing: { noun: 'dítě' } })).toEqual(['the pairing must be a list of nouns'])
      expect(problemsOf(pairingWith('dítě', { gender: 's.', adjectives: ['malý'] }))).toEqual([
        'pairing entry 1 must be an object with a noun, its gender and its adjectives',
        'pairing entry 2 has no noun',
      ])
      expect(problemsOf(pairingWith({ noun: 'dítě', gender: 's.', adjectives: ['malý'] }, { noun: 'dítě', gender: 's.', adjectives: ['velký'] }))).toEqual([
        'noun "dítě" is in the pairing twice',
      ])
    })

    it('an input dataset item breaks its own contract, which check-data reports in full', () => {
      expect(problemsOf({ nouns: { name: 'cs/prirucka/noun-declension', items: [dítě, { ...advokát, cells: [] }] } })).toEqual([
        'noun "advokát" is not a valid item of cs/prirucka/noun-declension (npm run check-data says why)',
      ])
    })
  })
})
