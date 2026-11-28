// Forms, order and remarks follow the teacher's handout (Handout 3, p. 3),
// except IJP_DISAGREES_REMARK, which comes from IJP.

// Footnote 1: jej/něj is more common than jeho/něho in the genitive, and after
// a preposition in the accusative něj is more common than něho or ně.
const LESS_COMMON_REMARK = "less-commonly-used" as const;
// Footnote 2: ho and mu are never stressed, never follow a preposition and
// never start a sentence.
const CLITIC_REMARK = "unstressed-not-sentence-initial" as const;
// The handout does not split masculine forms by animacy. IJP does in one cell:
// the accusative singular of an inanimate noun takes only ho, jej and něj, so
// jeho and něho there may be wrong. They stay, as the handout has them.
const IJP_DISAGREES_REMARK = "ijp-animate-only" as const;

// Forms with j- are used without a preposition and forms with n- after one.
// The nominative and the locative have no such pair, so they are plain lists.
const pronounsMap = {
  nominativ: {
    singular: {
      "m. živ.": ["on"],
      "m. neživ.": ["on"],
      "ž.": ["ona"],
      "s.": ["ono"],
    },
    plural: {
      "m. živ.": ["oni"],
      "m. neživ.": ["ony"],
      "ž.": ["ony"],
      "s.": ["ona"],
    },
  },
  genitiv: {
    singular: {
      "m. živ.": {
        withoutPreposition: [
          { value: "jeho", remarks: [LESS_COMMON_REMARK] },
          "jej",
          { value: "ho", remarks: [CLITIC_REMARK] },
        ],
        afterPreposition: [
          { value: "něho", remarks: [LESS_COMMON_REMARK] },
          "něj",
        ],
      },
      "m. neživ.": {
        withoutPreposition: [
          { value: "jeho", remarks: [LESS_COMMON_REMARK] },
          "jej",
          { value: "ho", remarks: [CLITIC_REMARK] },
        ],
        afterPreposition: [
          { value: "něho", remarks: [LESS_COMMON_REMARK] },
          "něj",
        ],
      },
      "ž.": { withoutPreposition: ["jí"], afterPreposition: ["ní"] },
      "s.": {
        withoutPreposition: [
          { value: "jeho", remarks: [LESS_COMMON_REMARK] },
          "jej",
          { value: "ho", remarks: [CLITIC_REMARK] },
        ],
        afterPreposition: [
          { value: "něho", remarks: [LESS_COMMON_REMARK] },
          "něj",
        ],
      },
    },
    plural: {
      "m. živ.": { withoutPreposition: ["jich"], afterPreposition: ["nich"] },
      "m. neživ.": { withoutPreposition: ["jich"], afterPreposition: ["nich"] },
      "ž.": { withoutPreposition: ["jich"], afterPreposition: ["nich"] },
      "s.": { withoutPreposition: ["jich"], afterPreposition: ["nich"] },
    },
  },
  dativ: {
    singular: {
      "m. živ.": {
        withoutPreposition: ["jemu", { value: "mu", remarks: [CLITIC_REMARK] }],
        afterPreposition: ["němu"],
      },
      "m. neživ.": {
        withoutPreposition: ["jemu", { value: "mu", remarks: [CLITIC_REMARK] }],
        afterPreposition: ["němu"],
      },
      "ž.": { withoutPreposition: ["jí"], afterPreposition: ["ní"] },
      "s.": {
        withoutPreposition: ["jemu", { value: "mu", remarks: [CLITIC_REMARK] }],
        afterPreposition: ["němu"],
      },
    },
    plural: {
      "m. živ.": { withoutPreposition: ["jim"], afterPreposition: ["nim"] },
      "m. neživ.": { withoutPreposition: ["jim"], afterPreposition: ["nim"] },
      "ž.": { withoutPreposition: ["jim"], afterPreposition: ["nim"] },
      "s.": { withoutPreposition: ["jim"], afterPreposition: ["nim"] },
    },
  },
  akuzativ: {
    singular: {
      "m. živ.": {
        withoutPreposition: [
          "jeho",
          "jej",
          { value: "ho", remarks: [CLITIC_REMARK] },
        ],
        afterPreposition: [
          { value: "něho", remarks: [LESS_COMMON_REMARK] },
          "něj",
        ],
      },
      "m. neživ.": {
        withoutPreposition: [
          { value: "jeho", remarks: [IJP_DISAGREES_REMARK] },
          "jej",
          { value: "ho", remarks: [CLITIC_REMARK] },
        ],
        afterPreposition: [
          {
            value: "něho",
            remarks: [LESS_COMMON_REMARK, IJP_DISAGREES_REMARK],
          },
          "něj",
        ],
      },
      "ž.": { withoutPreposition: ["ji"], afterPreposition: ["ni"] },
      "s.": {
        withoutPreposition: [
          "je",
          "jej",
          { value: "ho", remarks: [CLITIC_REMARK] },
        ],
        afterPreposition: [
          { value: "ně", remarks: [LESS_COMMON_REMARK] },
          "něj",
        ],
      },
    },
    plural: {
      "m. živ.": { withoutPreposition: ["je"], afterPreposition: ["ně"] },
      "m. neživ.": { withoutPreposition: ["je"], afterPreposition: ["ně"] },
      "ž.": { withoutPreposition: ["je"], afterPreposition: ["ně"] },
      "s.": { withoutPreposition: ["je"], afterPreposition: ["ně"] },
    },
  },
  lokál: {
    singular: {
      "m. živ.": ["něm"],
      "m. neživ.": ["něm"],
      "ž.": ["ní"],
      "s.": ["něm"],
    },
    plural: {
      "m. živ.": ["nich"],
      "m. neživ.": ["nich"],
      "ž.": ["nich"],
      "s.": ["nich"],
    },
  },
  instrumentál: {
    singular: {
      "m. živ.": { withoutPreposition: ["jím"], afterPreposition: ["ním"] },
      "m. neživ.": { withoutPreposition: ["jím"], afterPreposition: ["ním"] },
      "ž.": { withoutPreposition: ["jí"], afterPreposition: ["ní"] },
      "s.": { withoutPreposition: ["jím"], afterPreposition: ["ním"] },
    },
    plural: {
      "m. živ.": { withoutPreposition: ["jimi"], afterPreposition: ["nimi"] },
      "m. neživ.": { withoutPreposition: ["jimi"], afterPreposition: ["nimi"] },
      "ž.": { withoutPreposition: ["jimi"], afterPreposition: ["nimi"] },
      "s.": { withoutPreposition: ["jimi"], afterPreposition: ["nimi"] },
    },
  },
} as const;

type GrammarCase = keyof typeof pronounsMap;
type GrammarNumber = keyof (typeof pronounsMap)[GrammarCase];
type GrammarGender = keyof (typeof pronounsMap)[GrammarCase][GrammarNumber];

export function pronoun(
  grammarCase: GrammarCase,
  grammarNumber: GrammarNumber,
  grammarGender: GrammarGender,
  afterPreposition: boolean,
) {
  const forms = pronounsMap[grammarCase][grammarNumber][grammarGender];
  if (!forms) throw new Error("Wrong input data!");
  if (!("afterPreposition" in forms)) return forms;
  return afterPreposition ? forms.afterPreposition : forms.withoutPreposition;
}
