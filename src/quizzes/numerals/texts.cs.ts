import type { NumeralsTextKey } from './texts.en'

export const cs: Record<NumeralsTextKey, string> = {
  title: 'Trénink českých číslovek',
  name: 'Číslovky',
  intro: 'Napište číslo českými slovy a potom odpověď zkontrolujte.',
  empty: 'Zatím tu nejsou žádná čísla k procvičování.',

  'prompt.label': 'Napište slovy',
  'input.label': 'Číslo slovy',
  next: 'Další číslo',

  'result.yours': 'Vaše podoba:',
  'result.others': 'Další podoby',
  'result.all': 'Všechny správné podoby',
  'result.showAll': 'Zobrazit všechny',
  'result.showFewer': 'Zobrazit méně',

  'legend.title': 'Poznámky',
  'legend.parts': 'Slovo v závorce označuje část čísla, které se poznámka týká.',

  'remark.masculine': 'mužský rod',
  'remark.feminine': 'ženský rod',
  'remark.neuter': 'střední rod',
  'remark.counting-form': 'tvar při počítání',
  'remark.less-commonly-used': 'méně časté',
  'remark.inverted-form': 'obrácené pořadí',
  'remark.mixed-form': 'smíšené pořadí',
  'legend.masculine': 'tvar u podstatných jmen mužského rodu (jeden, dva)',
  'legend.feminine': 'tvar u podstatných jmen ženského rodu (jedna, dvě)',
  'legend.neuter': 'tvar u podstatných jmen středního rodu (jedno, dvě)',
  'legend.counting-form': 'tvar, který se používá při počítání a u samotného čísla (jedna, dva)',
  'legend.less-commonly-used': 'správně, ale používá se méně často než ostatní tvary',
  'legend.inverted-form':
    'jednotky napřed a v jednom slově: pětadvacet místo dvacet pět; následuje vždy 2. pád množného čísla (pětadvacet milionů)',
  'legend.mixed-form': 'obrácené i běžné pořadí v jednom čísle (jedenadvacet tisíc tři sta sedmdesát pět)',

  'help.versions':
    'Za správnou se počítá každá přijatelná podoba čísla. Po kontrole stránka vypíše i ostatní podoby s poznámkami o tom, čím jsou zvláštní.',

  'meter.numbers': 'Správně napsaná čísla',
}
