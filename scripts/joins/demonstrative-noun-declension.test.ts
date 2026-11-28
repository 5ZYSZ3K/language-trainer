import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Variant } from '../../src/core/cell'
import type { GoverningVerb } from '../../src/quizzes/adjective-noun-declension/governing-verbs'
import { DEMONSTRATIVE_TABLES } from '../../src/quizzes/demonstrative-noun-declension'
import { checkJoins, readDataFiles } from '../check-data'
import { czechDemonstrativesWithNouns, joinDemonstrativesWithNouns, type DemonstrativeNounJoinInputs } from './demonstrative-noun-declension'
import { JOINS } from './index'
import { readFilesBelow } from './join'

const czech = DEMONSTRATIVE_TABLES.cs!

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
    cell('voc-sg', 'advokáte'),
    cell('nom-pl', 'advokáti'),
    cell('voc-pl', 'advokáti'),
    cell('ins-pl', 'advokáty'),
  ],
}
const dítě = { prompt: 'dítě', gender: 's.', cells: [cell('nom-sg', 'dítě'), cell('voc-sg', 'dítě'), cell('nom-pl', 'děti')] }
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
  verb('hýbat', 'hýbu', 'hýbeš', 'hýbe', 'hýbeme', 'hýbete', 'hýbou'),
]
const governingVerbs: GoverningVerb[] = [
  { verb: 'být', subject: 'to', case: 'nom', show: { '3sg': 'je' } },
  { verb: 'bát se', case: 'gen' },
  { verb: 'pomáhat', case: 'dat' },
  { verb: 'vidět', case: 'acc' },
  { verb: 'mluvit', preposition: 'o', case: 'loc' },
  { verb: 'hýbat', case: 'ins' },
]

const inputs = (change: Partial<DemonstrativeNounJoinInputs> = {}): DemonstrativeNounJoinInputs => ({
  pairing: [
    { noun: 'advokát', gender: 'm. živ.', adjectives: ['dobrý', 'chytrý'] },
    { noun: 'dítě', gender: 's.', 'plural-gender': 'ž.', adjectives: ['malý'] },
  ],
  nouns: { name: 'cs/prirucka/noun-declension', items: [dítě, advokát, noha, vedoucí] },
  verbs: { name: 'cs/prirucka/verb-present-tense', items: verbs },
  governingVerbs,
  table: czech,
  ...change,
})
const problemsOf = (change: Partial<DemonstrativeNounJoinInputs>) => joinDemonstrativesWithNouns(inputs(change)).problems
const pairingWith = (...entries: unknown[]) => ({ pairing: entries })

describe('joinDemonstrativesWithNouns', () => {
  it('makes the nouns in pairing order, then the governing verbs in module order', () => {
    const { items, problems } = joinDemonstrativesWithNouns(inputs())
    expect(problems).toEqual([])
    expect(items.map((item) => (item.kind === 'noun' ? item.prompt : item.verb))).toEqual([
      'advokát', 'dítě', 'být', 'bát se', 'pomáhat', 'vidět', 'mluvit', 'hýbat',
    ])
  })

  it('gives a noun its gender, its plural gender only when the pairing gives one, and its cells, but not its adjectives', () => {
    const [advokátItem, dítěItem] = joinDemonstrativesWithNouns(inputs()).items
    expect(Object.keys(advokátItem!)).toEqual(['kind', 'prompt', 'gender', 'cells'])
    expect(dítěItem).toEqual({ kind: 'noun', prompt: 'dítě', gender: 's.', pluralGender: 'ž.', cells: [cell('nom-sg', 'dítě'), cell('nom-pl', 'děti')] })
    expect(Object.keys(dítěItem!)).toEqual(['kind', 'prompt', 'gender', 'pluralGender', 'cells'])
  })

  it('drops the vocative cells, which this quiz never asks, and the non-final variants and every remark', () => {
    const [advokátItem] = joinDemonstrativesWithNouns(inputs()).items
    expect(advokátItem).toMatchObject({
      cells: [cell('nom-sg', 'advokát'), cell('dat-sg', 'advokátovi'), cell('nom-pl', 'advokáti'), cell('ins-pl', 'advokáty')],
    })
    // A dual outside the instrumental plural is kept, as a plain variant.
    const remarked = { ...noha, cells: [cell('nom-sg', 'noha'), cell('gen-pl', 'noh', { value: 'nohou', remarks: ['dual'] })] }
    const [nohaItem] = joinDemonstrativesWithNouns(inputs({ ...pairingWith({ noun: 'noha', gender: 'ž.' }), nouns: { name: 'n', items: [remarked] } })).items
    expect(nohaItem).toMatchObject({ cells: [cell('nom-sg', 'noha'), cell('gen-pl', 'noh', 'nohou')] })
  })

  it('reads no adjectives: a pairing entry without them, or with a list that adjectives with nouns refuses, is joined', () => {
    const { problems } = joinDemonstrativesWithNouns(
      inputs(pairingWith({ noun: 'advokát', gender: 'm. živ.' }, { noun: 'dítě', gender: 's.', adjectives: ['rychle', 'rychle'] })),
    )
    expect(problems).toEqual([])
  })

  it('makes a governing verb exactly as adjectives with nouns does', () => {
    const items = joinDemonstrativesWithNouns(inputs()).items
    expect(items.find((item) => item.kind === 'verb' && item.verb === 'být')).toEqual({
      kind: 'verb',
      verb: 'být',
      subject: 'to',
      case: 'nom',
      forms: { '1sg': 'jsem', '2sg': 'jsi', '3sg': 'je', '1pl': 'jsme', '2pl': 'jste', '3pl': 'jsou' },
    })
    expect(items.find((item) => item.kind === 'verb' && item.verb === 'mluvit')).toMatchObject({ preposition: 'o', case: 'loc' })
  })

  describe('writes nothing, and lists every problem, when', () => {
    it('a pairing noun is not a noun of the noun dataset, has no gender there, or a different one', () => {
      const { items, problems } = joinDemonstrativesWithNouns(
        inputs(pairingWith({ noun: 'pes', gender: 'm. živ.' }, { noun: 'vedoucí', gender: 'm. živ.' }, { noun: 'dítě', gender: 'ž.' })),
      )
      expect(items).toEqual([])
      expect(problems).toEqual([
        'noun "pes" is not a noun of cs/prirucka/noun-declension',
        'noun "vedoucí" has no gender in cs/prirucka/noun-declension',
        'noun "dítě" is "ž." in the pairing but "s." in cs/prirucka/noun-declension',
      ])
    })

    it('a plural gender is not one of m. živ., m. neživ., ž., s.', () => {
      expect(problemsOf(pairingWith({ noun: 'dítě', gender: 's.', 'plural-gender': 'f.' }))).toEqual([
        'noun "dítě" has the plural gender "f.", which is not one of m. živ., m. neživ., ž., s.',
      ])
    })

    it("a noun's ins-pl has a variant with the dual remark, which this quiz does not handle yet", () => {
      expect(problemsOf(pairingWith({ noun: 'noha', gender: 'ž.' }))).toEqual([
        'noun "noha" has a dual variant in ins-pl (nohama), which this quiz does not handle yet',
      ])
    })

    it('a governing verb is not a verb of the verb dataset, or names a variant the verb does not have', () => {
      const wrong: GoverningVerb[] = [{ verb: 'být', case: 'nom', show: { '3sg': 'jsi' } }, ...governingVerbs.slice(1), { verb: 'pomoct', case: 'dat' }]
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

    it('the table gives no form for a cell a noun has', () => {
      const noPlural = { ...czech, form: (form: Parameters<typeof czech.form>[0]) => (form.number === 'pl' ? '' : czech.form(form)) }
      expect(problemsOf({ table: noPlural })).toEqual([
        'noun "advokát": the demonstrative pronoun has no form in nom-pl',
        'noun "dítě": the demonstrative pronoun has no form in nom-pl',
      ])
      // A gender the table does not know: the noun dataset and the pairing agree on it, but it declines nothing.
      const oddAdvokát = { ...advokát, gender: 'm.' }
      expect(problemsOf({ ...pairingWith({ noun: 'advokát', gender: 'm.' }), nouns: { name: 'n', items: [oddAdvokát] } })).toEqual([
        'noun "advokát": the demonstrative pronoun has no form in nom-sg: unknown gender "m."',
      ])
    })

    it('the pairing is not a list of nouns, or names a noun twice', () => {
      expect(problemsOf({ pairing: { noun: 'dítě' } })).toEqual(['the pairing must be a list of nouns'])
      expect(problemsOf(pairingWith('dítě', { gender: 's.' }))).toEqual([
        'pairing entry 1 must be an object with a noun and its gender',
        'pairing entry 2 has no noun',
      ])
      expect(problemsOf(pairingWith({ noun: 'dítě', gender: 's.' }, { noun: 'dítě', gender: 's.' }))).toEqual(['noun "dítě" is in the pairing twice'])
    })

    it('an input dataset item breaks its own contract, which check-data reports in full', () => {
      expect(problemsOf({ nouns: { name: 'cs/prirucka/noun-declension', items: [dítě, { ...advokát, cells: [] }] } })).toEqual([
        'noun "advokát" is not a valid item of cs/prirucka/noun-declension (npm run check-data says why)',
      ])
    })

    it("something the join makes breaks this quiz's contract", () => {
      const vocativeVerb = [...governingVerbs, { verb: 'pomáhat', preposition: 'k', case: 'voc' } as unknown as GoverningVerb]
      expect(problemsOf({ governingVerbs: vocativeVerb })).toEqual([
        'governing verb "pomáhat k": case must be one of nom, gen, dat, acc, loc, ins, found "voc"',
      ])
    })
  })
})

describe('check-data, on the committed Czech demonstratives with nouns', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const FILE = 'cs/language-trainer/demonstrative-noun-declension.json'
  const STALE = 'data/cs/language-trainer/demonstrative-noun-declension.json is out of step with its inputs. Run: npm run join:cs:demonstratives'
  const committed = async () => ({
    data: await readDataFiles(join(root, 'data')),
    lists: await readFilesBelow(join(root, 'lists'), JOINS.flatMap((entry) => entry.lists)),
  })

  it('runs its join on every build, and finds the committed file in step with its inputs', async () => {
    expect(JOINS).toContain(czechDemonstrativesWithNouns)
    const { data, lists } = await committed()
    expect(data[FILE]).toBeDefined()
    expect(await checkJoins([czechDemonstrativesWithNouns], { data, lists }, root)).toEqual([])
  })

  it('fails once the file is stale: a noun was taken off the pairing since it was joined, or the file is gone', async () => {
    const { data, lists } = await committed()
    const pairing = JSON.parse(lists['cs/adjective-noun-declension.json']!) as unknown[]
    const shorter = { 'cs/adjective-noun-declension.json': JSON.stringify(pairing.slice(1)) }
    expect(await checkJoins([czechDemonstrativesWithNouns], { data, lists: shorter }, root)).toEqual([STALE])
    const { [FILE]: _gone, ...withoutIt } = data
    expect(await checkJoins([czechDemonstrativesWithNouns], { data: withoutIt, lists }, root)).toEqual([STALE])
  })
})
