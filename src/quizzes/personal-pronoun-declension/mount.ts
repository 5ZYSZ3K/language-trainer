import { getUiLanguage } from '../../i18n'
import type { GoverningCase } from '../adjective-noun-declension/sentence-items'
import { mountSentenceRounds, type SentenceView } from '../adjective-noun-declension/sentence-mount'
import { formText } from '../adjective-noun-declension/sentence-texts'
import type { QuizHost, QuizInstance } from '../quiz-type'
import type { PersonalPronounItem } from './items'
import { PersonalPronounPage, type AnswerPart } from './page'
import { PERSONAL_PRONOUN_TABLES } from './tables'
import { remarkLabelKey, t } from './texts'

/**
 * The round of personal pronouns: the noun in its base form with the case and number above the sentence, the sentence
 * with the noun, then the same sentence with one field for the pronoun in the noun's place. A wrong field's answer line
 * is every accepted form, each with remarks followed by a chip per remark (`less common`), in the UI language.
 */
function pronounView(page: PersonalPronounPage | undefined): SentenceView {
  return {
    html: `
      <p id="prompt" class="prompt sentence-prompt"><strong id="noun"></strong> — <span id="form"></span></p>
      <p id="with-noun" class="sentence-with-noun"></p>
      <p id="sentence" class="sentence">
        <span id="lead" class="lead"></span>
        <span class="cell blank" data-state="open">
          <input id="field-pronoun" type="text" data-i18n-label="field.pronoun" autocomplete="off" autocapitalize="none" spellcheck="false" autocorrect="off" />
          <span class="answer"><span class="answer-forms"></span></span>
        </span>
        <span id="tail" class="tail"></span>
        <span id="end" class="end">.</span>
      </p>
    `,
    checkKey: 'check',
    attach(find, htmlLang) {
      for (const element of [find('#noun'), find('#with-noun'), find('#sentence')]) element.lang = htmlLang
      const leadEl = find('#lead')
      const tailEl = find('#tail')
      const answerEl = find('#sentence .answer-forms')

      /** The answer line's nodes: the forms joined by " / ", in the learned language, each followed by its chips, in the UI language. */
      const answerNodes = (parts: readonly AnswerPart[]): (Node | string)[] => {
        let forms = 0
        return parts.flatMap((part): (Node | string)[] => {
          if (part.kind === 'remark') {
            const chip = document.createElement('span')
            chip.className = 'remark'
            // The sentence is in the learned language, the chip in the UI language.
            chip.lang = getUiLanguage()
            chip.textContent = t(remarkLabelKey(part.code))
            return [' ', chip]
          }
          const form = document.createElement('strong')
          form.textContent = part.value
          return forms++ === 0 ? [form] : [' / ', form]
        })
      }

      return () => {
        const sentence = page!.sentence!
        find('#noun').textContent = sentence.noun
        find('#form').textContent = formText<GoverningCase>(t, sentence.caseId, sentence.number)
        find('#with-noun').textContent = sentence.withNoun
        leadEl.textContent = sentence.lead
        leadEl.hidden = sentence.lead === ''
        // The full stop follows the last word: the field's, or the tail's.
        tailEl.textContent = `${sentence.tail}.`
        tailEl.hidden = sentence.tail === ''
        find('#end').hidden = sentence.tail !== ''
        answerEl.replaceChildren(...answerNodes(page!.answer))
      }
    },
  }
}

/**
 * The sentence quizzes' page (see mountSentenceRounds) with one field, the personal pronoun in the noun's place: the noun
 * and the case and number above the sentence with the noun, then the sentence with the field, "Check" and "Skip" /
 * "Next sentence". Filters offer the 12 forms of every case but the vocative. Records into the meter `pronouns` (per
 * checked field).
 */
export function mountPersonalPronounDeclension(container: HTMLElement, host: QuizHost<PersonalPronounItem>): QuizInstance {
  // Without a table for the learned language there is nothing to check answers against: no round, only the help.
  const table = PERSONAL_PRONOUN_TABLES[host.language.id]
  const page = table && new PersonalPronounPage({ items: host.items, table, settings: host.settings, record: host.record, random: Math.random })
  return mountSentenceRounds(container, host, { page, t, view: pronounView(page) })
}
