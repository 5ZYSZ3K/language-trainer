import './style.css'
import { mountApp } from './app'
import type { StorageLike } from './core/scores'
import { loadDataset } from './datasets/load'
import { initLanguage } from './i18n'
import { LANGUAGES } from './languages'
import { QUIZ_TYPES } from './quizzes'
import { verbPresentCellLabelKeys } from './quizzes/verb-present-tense'
import { defaultPool } from './selection'
import { SOURCES } from './sources'

/** localStorage can throw on access (blocked cookies, some private modes); fall back to memory. */
function pickStorage(): StorageLike {
  try {
    const probe = '__probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    const memory = new Map<string, string>()
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    }
  }
}

const storage = pickStorage()
initLanguage(storage, navigator.language)

// No selector yet: the page opens on the single default pool of the registries.
const pool = defaultPool({ languages: LANGUAGES, sources: SOURCES, quizTypes: QUIZ_TYPES })
const language = LANGUAGES.find((candidate) => candidate.id === pool?.language)
const quizType = QUIZ_TYPES.find((candidate) => candidate.id === pool?.quizType)
if (!pool || !language || !quizType) throw new Error('No pool is registered, so there is nothing to practise.')

mountApp(document.getElementById('app')!, {
  quizType,
  pool,
  language,
  cellLabelKeys: verbPresentCellLabelKeys,
  storage,
  loadData: () => loadDataset(pool),
})
