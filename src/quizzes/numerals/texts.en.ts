/** The quiz's own texts. Its Czech twin is typed against these keys, so a key missing there is a compile error. */
export const en = {
  title: 'Czech numeral trainer',
  name: 'Numerals',
  intro: 'Write the number in Czech words, then check it.',
  empty: 'There are no numbers to practise yet.',

  'prompt.label': 'Write in words',
  'input.label': 'The number in words',
  next: 'Next number',

  'result.yours': 'Your version:',
  'result.others': 'Other versions',
  'result.all': 'All correct versions',
  'result.showAll': 'Show all',
  'result.showFewer': 'Show fewer',

  'legend.title': 'Remarks',
  'legend.parts': 'A word in brackets names the part of the number the remark is about.',

  // A label per remark code (REMARK_CODES in ./versions), and its explanation in the legend.
  'remark.masculine': 'masculine',
  'remark.feminine': 'feminine',
  'remark.neuter': 'neuter',
  'remark.counting-form': 'counting form',
  'remark.less-commonly-used': 'less common',
  'remark.inverted-form': 'inverted order',
  'remark.mixed-form': 'mixed order',
  'legend.masculine': 'the form used with masculine nouns (jeden, dva)',
  'legend.feminine': 'the form used with feminine nouns (jedna, dvě)',
  'legend.neuter': 'the form used with neuter nouns (jedno, dvě)',
  'legend.counting-form': 'the form used when counting, and for a number on its own (jedna, dva)',
  'legend.less-commonly-used': 'correct, but used less often than the other forms',
  'legend.inverted-form':
    'units first, in one word: pětadvacet for dvacet pět; always followed by the genitive plural (pětadvacet milionů)',
  'legend.mixed-form': 'inverted and standard order in one number (jedenadvacet tisíc tři sta sedmdesát pět)',

  'help.versions':
    'Every accepted way of writing the number counts as correct. After a check, the page lists the other ways too, with remarks on what is special about them.',

  'meter.numbers': 'Numbers correct',
}

export type NumeralsTextKey = keyof typeof en
