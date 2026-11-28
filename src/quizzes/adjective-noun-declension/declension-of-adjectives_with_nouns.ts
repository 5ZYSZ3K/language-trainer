const grammarCaseGenderEndings = {
  hard: {
    nominativ: {
      singular: {
        "m. živ.": "ý",
        "m. neživ.": "ý",
        "ž.": "á",
        "s.": "é",
      },
      plural: {
        "m. živ.": "í",
        "m. neživ.": "é",
        "ž.": "é",
        "s.": "á",
      },
    },
    genitiv: {
      singular: {
        "m. živ.": "ého",
        "m. neživ.": "ého",
        "ž.": "é",
        "s.": "ého",
      },
      plural: {
        "m. živ.": "ých",
        "m. neživ.": "ých",
        "ž.": "ých",
        "s.": "ých",
      },
    },
    dativ: {
      singular: {
        "m. živ.": "ému",
        "m. neživ.": "ému",
        "ž.": "é",
        "s.": "ému",
      },
      plural: {
        "m. živ.": "ým",
        "m. neživ.": "ým",
        "ž.": "ým",
        "s.": "ým",
      },
    },
    akuzativ: {
      singular: {
        "m. živ.": "ého",
        "m. neživ.": "ý",
        "ž.": "ou",
        "s.": "é",
      },
      plural: {
        "m. živ.": "é",
        "m. neživ.": "é",
        "ž.": "é",
        "s.": "á",
      },
    },
    vokativ: {
      singular: {
        "m. živ.": "ý",
        "m. neživ.": "ý",
        "ž.": "á",
        "s.": "é",
      },
      plural: {
        "m. živ.": "í",
        "m. neživ.": "é",
        "ž.": "é",
        "s.": "á",
      },
    },
    lokál: {
      singular: {
        "m. živ.": "ém",
        "m. neživ.": "ém",
        "ž.": "é",
        "s.": "ém",
      },
      plural: {
        "m. živ.": "ých",
        "m. neživ.": "ých",
        "ž.": "ých",
        "s.": "ých",
      },
    },
    instrumentál: {
      singular: {
        "m. živ.": "ým",
        "m. neživ.": "ým",
        "ž.": "ou",
        "s.": "ým",
      },
      plural: {
        "m. živ.": "ými",
        "m. neživ.": "ými",
        "ž.": "ými",
        "s.": "ými",
      },
    },
  },
  soft: {
    nominativ: {
      singular: {
        "m. živ.": "í",
        "m. neživ.": "í",
        "ž.": "í",
        "s.": "í",
      },
      plural: {
        "m. živ.": "í",
        "m. neživ.": "í",
        "ž.": "í",
        "s.": "í",
      },
    },
    genitiv: {
      singular: {
        "m. živ.": "ího",
        "m. neživ.": "ího",
        "ž.": "í",
        "s.": "ího",
      },
      plural: {
        "m. živ.": "ích",
        "m. neživ.": "ích",
        "ž.": "ích",
        "s.": "ích",
      },
    },
    dativ: {
      singular: {
        "m. živ.": "ímu",
        "m. neživ.": "ímu",
        "ž.": "í",
        "s.": "ímu",
      },
      plural: {
        "m. živ.": "ím",
        "m. neživ.": "ím",
        "ž.": "ím",
        "s.": "ím",
      },
    },
    akuzativ: {
      singular: {
        "m. živ.": "ího",
        "m. neživ.": "í",
        "ž.": "í",
        "s.": "í",
      },
      plural: {
        "m. živ.": "í",
        "m. neživ.": "í",
        "ž.": "í",
        "s.": "í",
      },
    },
    vokativ: {
      singular: {
        "m. živ.": "í",
        "m. neživ.": "í",
        "ž.": "í",
        "s.": "í",
      },
      plural: {
        "m. živ.": "í",
        "m. neživ.": "í",
        "ž.": "í",
        "s.": "í",
      },
    },
    lokál: {
      singular: {
        "m. živ.": "ím",
        "m. neživ.": "ím",
        "ž.": "í",
        "s.": "ím",
      },
      plural: {
        "m. živ.": "ích",
        "m. neživ.": "ích",
        "ž.": "ích",
        "s.": "ích",
      },
    },
    instrumentál: {
      singular: {
        "m. živ.": "ím",
        "m. neživ.": "ím",
        "ž.": "í",
        "s.": "ím",
      },
      plural: {
        "m. živ.": "ími",
        "m. neživ.": "ími",
        "ž.": "ími",
        "s.": "ími",
      },
    },
  },
  // Endings after the possessive stem (otcov-, matčin-). "" is the bare form: otcův, matčin.
  possessive: {
    nominativ: {
      singular: {
        "m. živ.": "",
        "m. neživ.": "",
        "ž.": "a",
        "s.": "o",
      },
      plural: {
        "m. živ.": "i",
        "m. neživ.": "y",
        "ž.": "y",
        "s.": "a",
      },
    },
    genitiv: {
      singular: {
        "m. živ.": "a",
        "m. neživ.": "a",
        "ž.": "y",
        "s.": "a",
      },
      plural: {
        "m. živ.": "ých",
        "m. neživ.": "ých",
        "ž.": "ých",
        "s.": "ých",
      },
    },
    dativ: {
      singular: {
        "m. živ.": "u",
        "m. neživ.": "u",
        "ž.": "ě",
        "s.": "u",
      },
      plural: {
        "m. živ.": "ým",
        "m. neživ.": "ým",
        "ž.": "ým",
        "s.": "ým",
      },
    },
    akuzativ: {
      singular: {
        "m. živ.": "a",
        "m. neživ.": "",
        "ž.": "u",
        "s.": "o",
      },
      plural: {
        "m. živ.": "y",
        "m. neživ.": "y",
        "ž.": "y",
        "s.": "a",
      },
    },
    vokativ: {
      singular: {
        "m. živ.": "",
        "m. neživ.": "",
        "ž.": "a",
        "s.": "o",
      },
      plural: {
        "m. živ.": "i",
        "m. neživ.": "y",
        "ž.": "y",
        "s.": "a",
      },
    },
    lokál: {
      // Masculine and neuter take -ě or -u: o otcově/otcovu návrhu, v matčině/matčinu pokoji (IJP).
      singular: {
        "m. živ.": ["ě", "u"],
        "m. neživ.": ["ě", "u"],
        "ž.": "ě",
        "s.": ["ě", "u"],
      },
      plural: {
        "m. živ.": "ých",
        "m. neživ.": "ých",
        "ž.": "ých",
        "s.": "ých",
      },
    },
    instrumentál: {
      singular: {
        "m. živ.": "ým",
        "m. neživ.": "ým",
        "ž.": "ou",
        "s.": "ým",
      },
      plural: {
        "m. živ.": "ými",
        "m. neživ.": "ými",
        "ž.": "ými",
        "s.": "ými",
      },
    },
  },
} as const;

type DeclensionType = keyof typeof grammarCaseGenderEndings;
export type GrammarCase = keyof (typeof grammarCaseGenderEndings)[DeclensionType];
export type GrammarNumber =
  keyof (typeof grammarCaseGenderEndings)[DeclensionType][GrammarCase];
export type GrammarGender =
  keyof (typeof grammarCaseGenderEndings)[DeclensionType][GrammarCase][GrammarNumber];

const declensionTypeByFinalLetter = {
  ý: "hard",
  í: "soft",
} as const;

type RegularFinalLetter = keyof typeof declensionTypeByFinalLetter;

function isRegularFinalLetter(letter: string): letter is RegularFinalLetter {
  return letter in declensionTypeByFinalLetter;
}

// Possessive adjectives: the suffix of the bare form, and the stem suffix the other forms build on.
// otcův → otcov-a, otcov-ým; matčin → matčin-a, matčin-ým.
const possessiveSuffixes = [
  ["ův", "ov"],
  ["in", "in"],
] as const;

function getDeclensionTypeAndStem(adjective: string): {
  declensionType: DeclensionType;
  stem: string;
} {
  const finalLetter = adjective.slice(-1);
  if (isRegularFinalLetter(finalLetter)) {
    return {
      declensionType: declensionTypeByFinalLetter[finalLetter],
      stem: adjective.slice(0, -1),
    };
  }
  for (const [suffix, stemSuffix] of possessiveSuffixes) {
    if (adjective.endsWith(suffix)) {
      return {
        declensionType: "possessive",
        stem: adjective.slice(0, -suffix.length) + stemSuffix,
      };
    }
  }
  throw new Error("Not an adjective");
}

// Hard stems soften before the "í" ending (nom./vok. pl. m. živ.): dobrý → dobří.
// Order matters: "sk"/"ck" before "k", "ch" before "h".
const softeningBeforeI: [RegExp, string][] = [
  [/sk$/, "št"],
  [/ck$/, "čt"],
  [/k$/, "c"],
  [/ch$/, "š"],
  [/h$/, "z"],
  [/r$/, "ř"],
];

// Paired body parts (noha, ruka, oko, ucho) keep the old dual in the instrumental plural,
// and the adjective follows it: dlouhýma nohama, vlastníma rukama. Other cases use the plural.
const dualInstrumentalEndings = {
  hard: "ýma",
  soft: "íma",
  possessive: "ýma",
} as const;

type AdjectiveObject = {
  value: string;
  indeclinable: boolean;
};

export type DeclineProps = {
  adjective: string | AdjectiveObject;
  grammarCase: GrammarCase;
  grammarNumber: GrammarNumber;
  grammarGender: GrammarGender;
  pluralGrammarGender?: GrammarGender;
  dual?: boolean;
};

export function declineAnAdjective({
  adjective,
  grammarCase,
  grammarNumber,
  grammarGender,
  pluralGrammarGender,
  dual = false,
}: DeclineProps): string[] {
  const adjectiveValue =
    typeof adjective === "string" ? adjective : adjective.value;
  if (!adjectiveValue.length) throw new Error("Empty string");
  if (typeof adjective === "object" && adjective.indeclinable) {
    return [adjectiveValue];
  }
  const { declensionType, stem: adjectiveStem } =
    getDeclensionTypeAndStem(adjectiveValue);
  // A cell holds one ending, or a list when the language accepts several forms.
  const cell: string | readonly string[] =
    dual && grammarCase === "instrumentál" && grammarNumber === "plural"
      ? dualInstrumentalEndings[declensionType]
      : grammarCaseGenderEndings[declensionType][grammarCase][grammarNumber][
          grammarNumber === "plural"
            ? (pluralGrammarGender ?? grammarGender)
            : grammarGender
        ];
  const endings = typeof cell === "string" ? [cell] : cell;
  return endings.map((ending) => {
    // Only possessives have an empty ending, and their bare form is not stem-based: otcův, not otcov.
    if (ending === "") return adjectiveValue;
    let stem = adjectiveStem;
    if (declensionType === "hard" && ending === "í") {
      const change = softeningBeforeI.find(([pattern]) => pattern.test(stem));
      if (change) stem = stem.replace(change[0], change[1]);
    }
    return stem + ending;
  });
}
