const pointingPronounsMap = {
  nominativ: {
    singular: {
      "m. živ.": "ten",
      "m. neživ.": "ten",
      "ž.": "ta",
      "s.": "to",
    },
    plural: {
      "m. živ.": "ti",
      "m. neživ.": "ty",
      "ž.": "ty",
      "s.": "ta",
    },
  },
  genitiv: {
    singular: {
      "m. živ.": "toho",
      "m. neživ.": "toho",
      "ž.": "té",
      "s.": "toho",
    },
    plural: {
      "m. živ.": "těch",
      "m. neživ.": "těch",
      "ž.": "těch",
      "s.": "těch",
    },
  },
  dativ: {
    singular: {
      "m. živ.": "tomu",
      "m. neživ.": "tomu",
      "ž.": "té",
      "s.": "tomu",
    },
    plural: {
      "m. živ.": "těm",
      "m. neživ.": "těm",
      "ž.": "těm",
      "s.": "těm",
    },
  },
  akuzativ: {
    singular: {
      "m. živ.": "toho",
      "m. neživ.": "ten",
      "ž.": "tu",
      "s.": "to",
    },
    plural: {
      "m. živ.": "ty",
      "m. neživ.": "ty",
      "ž.": "ty",
      "s.": "ta",
    },
  },
  lokál: {
    singular: {
      "m. živ.": "tom",
      "m. neživ.": "tom",
      "ž.": "té",
      "s.": "tom",
    },
    plural: {
      "m. živ.": "těch",
      "m. neživ.": "těch",
      "ž.": "těch",
      "s.": "těch",
    },
  },
  instrumentál: {
    singular: {
      "m. živ.": "tím",
      "m. neživ.": "tím",
      "ž.": "tou",
      "s.": "tím",
    },
    plural: {
      "m. živ.": "těmi",
      "m. neživ.": "těmi",
      "ž.": "těmi",
      "s.": "těmi",
    },
  },
} as const;

type GrammarCase = keyof typeof pointingPronounsMap;
type GrammarNumber = keyof (typeof pointingPronounsMap)[GrammarCase];
type GrammarGender =
  keyof (typeof pointingPronounsMap)[GrammarCase][GrammarNumber];

export function pointingPronoun(
  grammarCase: GrammarCase,
  grammarNumber: GrammarNumber,
  grammarGender: GrammarGender,
) {
  const pronoun =
    pointingPronounsMap[grammarCase][grammarNumber][grammarGender];
  if (!pronoun) throw new Error("Wrong input data!");
  return pronoun;
}
