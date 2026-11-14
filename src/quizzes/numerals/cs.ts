// Czech numerals in words: every accepted way of writing a whole number from 0 to 999 999 999 999, each with remarks
// that say what is special about it (the codes of `REMARK_CODES` in ./versions). These are the site's own rules (the
// source `language-trainer`, unverified).

type GrammarGender = 'm' | 'f' | 'n'

type Version = { value: string; remark?: string; remarks?: string[] }
type JoinedVersion = { value: string; remarks: string[] }

const nominativeUniformMap: Record<number, string> = {
  [3]: 'tři',
  [4]: 'čtyři',
  [5]: 'pět',
  [6]: 'šest',
  [7]: 'sedm',
  [8]: 'osm',
  [9]: 'devět',
  [10]: 'deset',
  [11]: 'jedenáct',
  [12]: 'dvanáct',
  [13]: 'třináct',
  [14]: 'čtrnáct',
  [15]: 'patnáct',
  [16]: 'šestnáct',
  [17]: 'sedmnáct',
  [18]: 'osmnáct',
  [19]: 'devatenáct',
  [20]: 'dvacet',
  [30]: 'třicet',
  [40]: 'čtyřicet',
  [50]: 'padesát',
  [60]: 'šedesát',
  [70]: 'sedmdesát',
  [80]: 'osmdesát',
  [90]: 'devadesát',
}

const onesMap = {
  m: 'jeden',
  f: 'jedna',
  n: 'jedno',
}

const twosMap = {
  m: 'dva',
  f: 'dvě',
  n: 'dvě',
}

const hundretsMap = {
  [1]: 'sto',
  [2]: 'dvě stě',
  [3]: 'tři sta',
  [4]: 'čtyři sta',
  [5]: 'pět set',
  [6]: 'šest set',
  [7]: 'sedm set',
  [8]: 'osm set',
  [9]: 'devět set',
}

const thousandsMap = {
  gender: 'm',
  'nominative-singular': 'tisíc',
  'nominative-plural': 'tisíce',
  'genitive-plural': 'tisíc',
}

const milionsMap: typeof thousandsMap = {
  gender: 'm',
  'nominative-singular': 'milion',
  'nominative-plural': 'miliony',
  'genitive-plural': 'milionů',
}

// accepted, less common spelling of "milion"
const milionsAltSpellingMap: typeof thousandsMap = {
  gender: 'm',
  'nominative-singular': 'milión',
  'nominative-plural': 'milióny',
  'genitive-plural': 'miliónů',
}

const bilionsMap: typeof thousandsMap = {
  gender: 'f',
  'nominative-singular': 'miliarda',
  'nominative-plural': 'miliardy',
  'genitive-plural': 'miliard',
}

const LESS_COMMON_REMARK = 'less-commonly-used' as const
const COUNTING_FORM_REMARK = 'counting-form' as const
// one-word form with the units first ("pětadvacet"); invariable, always followed by the genitive plural
const INVERTED_FORM_REMARK = 'inverted-form' as const
// inverted and standard order mixed within one number, e.g. "jedenadvacet tisíc tři sta sedmdesát pět"
const MIXED_FORM_REMARK = 'mixed-form' as const

// endsWith also matches magnitude-prefixed remarks, e.g. "tisíc:inverted-form"
const isInvertedRemark = (remark: string) => remark.endsWith(INVERTED_FORM_REMARK)
const isInverted = (version: Version) => !!version.remarks?.some(isInvertedRemark)

// remarks for 1 and 2 when no gender is given; the counting form is the one used for a bare number ("dvacet jedna")
const unitRemarksMap: Record<string, string[]> = {
  jeden: ['masculine'],
  jedna: ['feminine', COUNTING_FORM_REMARK],
  jedno: ['neuter'],
  dva: ['masculine', COUNTING_FORM_REMARK],
  dvě: ['feminine', 'neuter'],
}

function selectGrammarCaseForDecimal(n: number): {
  value: keyof typeof thousandsMap
  remark?: typeof LESS_COMMON_REMARK
  grammarGender?: GrammarGender
}[] {
  if (n < 0 || n > 999 || Math.floor(n) !== n) throw new Error('Wrong number!')
  if (n === 1) return [{ value: 'nominative-singular' }]
  const decimals = n % 100
  if (decimals > 1 && decimals < 5) {
    if (n < 100) return [{ value: 'nominative-plural' }]
    return [
      { value: 'nominative-plural' },
      // compound numerals ending in 2–4 also take the genitive plural, as 22–24 do, e.g. "sto dva milionů";
      // no remark: the genitive is documented as the more common form only for 21–99
      { value: 'genitive-plural', grammarGender: 'm' },
    ]
  }
  const unitPart = n % 10
  if (unitPart === 1 && decimals !== 11) {
    return [
      { value: 'nominative-singular' },
      // invariable "jedna" (same as the feminine form) + genitive plural, e.g. "dvacet jedna milionů"
      { value: 'genitive-plural', grammarGender: 'f' },
    ]
  }
  if (decimals > 20 && unitPart > 1 && unitPart < 5) {
    return [
      // gender-neutral "dva" + genitive plural, also with feminine nouns, e.g. "dvacet dva miliard"
      { value: 'genitive-plural', grammarGender: 'm' },
      { value: 'nominative-plural', remark: LESS_COMMON_REMARK },
    ]
  }
  return [{ value: 'genitive-plural' }]
}

function getUnitString(n: number, grammarGender: GrammarGender | undefined): Version[] {
  if (n < 1 || n > 9 || Math.floor(n) !== n) throw new Error('Wrong number!')
  if (n === 1)
    return grammarGender
      ? [{ value: onesMap[grammarGender] }]
      : Object.values(onesMap).map((value) => ({
          value,
          remarks: unitRemarksMap[value],
        }))
  if (n === 2) {
    if (grammarGender) return [{ value: twosMap[grammarGender] }]
    const twosArr = Object.values(twosMap)
    return [...new Set(twosArr)].map((value) => ({
      value,
      remarks: unitRemarksMap[value],
    }))
  }
  return [{ value: nominativeUniformMap[n]! }]
}

function hundretsPartString(n: number, skipOnes: boolean, grammarGender: GrammarGender | undefined): Version[] {
  if (n < 0 || n > 999 || Math.floor(n) !== n) throw new Error('Wrong number!')
  if (n === 0) return [{ value: '' }]
  if (skipOnes && n === 1) {
    return [{ value: '' }, { value: onesMap[grammarGender ?? 'm'] }]
  }
  const hundretsString = n < 100 ? undefined : hundretsMap[Math.floor(n / 100) as keyof typeof hundretsMap]
  if (Math.floor(n / 100) === n / 100) {
    return [{ value: hundretsString as string }]
  }
  const decimals = n % 100
  const decimalsReadyString = nominativeUniformMap[decimals]
  if (decimalsReadyString) {
    return [
      {
        value: [hundretsString, decimalsReadyString].filter((a) => !!a).join(' '),
      },
    ]
  }
  const decimalsString = nominativeUniformMap[Math.floor(decimals / 10) * 10]
  const unitsStrings = getUnitString(decimals % 10, grammarGender)
  // e.g. "pětadvacet", "dvaadvacet" (masculine form of 2, whatever the gender);
  // 1 has two equally accepted forms: "jedenadvacet" and "jednadvacet" (the "a" of "jedna" doubles as the joining "a")
  const invertedPrefixes =
    decimals % 10 === 1 ? [`${onesMap.m}a`, onesMap.f] : [`${getUnitString(decimals % 10, 'm')[0]!.value}a`]
  const invertedVersions =
    decimals > 20
      ? invertedPrefixes.map((invertedPrefix) => ({
          value: [hundretsString, `${invertedPrefix}${decimalsString}`].filter((a) => !!a).join(' '),
          remarks: [INVERTED_FORM_REMARK],
        }))
      : []
  return unitsStrings
    .map((unitString) => ({
      value: [hundretsString, decimalsString, unitString.value].filter((a) => !!a).join(' '),
      remarks: unitString.remarks,
    }))
    .concat(invertedVersions)
}

function joinAllVersions(versions: ((Version & { remarks?: string[] })[] | undefined)[]): JoinedVersion[] {
  // groups with a 21–99 part, where every version is either inverted or in the standard order
  const compoundGroupsCount = versions.filter((group) => group?.some(isInverted)).length
  return versions
    .filter((group): group is (Version & { remarks?: string[] })[] => !!group?.length)
    .reduce<JoinedVersion[]>(
      (acc, group) =>
        acc.flatMap((prev) =>
          group.map((c) => ({
            value: `${prev.value} ${c.value}`.trim(),
            remarks: [...prev.remarks, ...(c.remark ? [c.remark] : []), ...(c.remarks ?? [])],
          })),
        ),
      [{ value: '', remarks: [] }],
    )
    .map((version) => {
      // each group contributes at most one inverted remark
      const invertedGroupsCount = version.remarks.filter(isInvertedRemark).length
      return invertedGroupsCount > 0 && invertedGroupsCount < compoundGroupsCount
        ? { ...version, remarks: [...version.remarks, MIXED_FORM_REMARK] }
        : version
    })
}

function getMagnitudeVersions(amount: number, magnitudeMap: typeof thousandsMap, grammarGender: GrammarGender) {
  return amount
    ? selectGrammarCaseForDecimal(amount)
        .map((grammarCase) =>
          hundretsPartString(amount, true, grammarCase.grammarGender ?? grammarGender)
            // the inverted form always takes the genitive plural ("pětadvacet milionů", never "jedenadvacet milion")
            .filter((hundretsVersion) => grammarCase.value === 'genitive-plural' || !isInverted(hundretsVersion))
            .map((hundretsVersion) => ({
              value: `${hundretsVersion.value} ${magnitudeMap[grammarCase.value]}`.trim(),
              remarks: [
                // the case remark describes the regular form, not the inverted one
                isInverted(hundretsVersion) ? undefined : grammarCase.remark,
                ...(hundretsVersion.remarks ?? []),
              ]
                .filter((a) => !!a)
                .map((a) => `${magnitudeMap['nominative-singular']}:${a}`),
            })),
        )
        .flatMap((a) => a)
    : undefined
}

/** Every accepted way of writing `n` (a whole number from 0 to 999 999 999 999) in Czech words. */
export function numberToCzechNumeral(n: number): JoinedVersion[] {
  if (n >= Math.pow(10, 12) || n < 0 || Math.floor(n) !== n) {
    throw new Error('Too big number for this parser')
  }
  if (n === 0) return [{ value: 'nula', remarks: [] }]
  const amountOfBilions = Math.floor(n / Math.pow(10, 9)) % Math.pow(10, 3)
  const amountOfMilions = Math.floor(n / Math.pow(10, 6)) % Math.pow(10, 3)
  const amountOfThousands = Math.floor(n / Math.pow(10, 3)) % Math.pow(10, 3)
  const rest = n % Math.pow(10, 3)
  const bilionsVersions = getMagnitudeVersions(amountOfBilions, bilionsMap, 'f')
  const milionsVersions = getMagnitudeVersions(amountOfMilions, milionsMap, 'm')?.concat(
    getMagnitudeVersions(amountOfMilions, milionsAltSpellingMap, 'm')!.map((version) => ({
      ...version,
      remarks: [...new Set([...version.remarks, `${milionsAltSpellingMap['nominative-singular']}:${LESS_COMMON_REMARK}`])],
    })),
  )
  const thousandsVersions = getMagnitudeVersions(amountOfThousands, thousandsMap, 'm')
  const restVersions = rest ? hundretsPartString(rest, false, undefined) : undefined

  return joinAllVersions([bilionsVersions, milionsVersions, thousandsVersions, restVersions]).concat(
    // 1100–1999 can also be counted in hundreds, e.g. "patnáct set padesát" for 1550
    n >= 1100 && n < 2000
      ? joinAllVersions([
          [
            {
              value: `${nominativeUniformMap[Math.floor(n / 100)]} set`,
              remark: LESS_COMMON_REMARK,
            },
          ],
          n % 100 ? hundretsPartString(n % 100, false, undefined) : undefined,
        ])
      : [],
  )
}
