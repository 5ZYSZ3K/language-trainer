import './style.css'
import { mountApp } from './app'
import type { ExerciseData } from './core/cell'
import type { StorageLike } from './core/scores'
import { verbPresentTense } from './exercises/verb-present-tense'
import { initLanguage } from './i18n'

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

async function loadData(type: string): Promise<ExerciseData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${type}.json`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as ExerciseData
}

const storage = pickStorage()
initLanguage(storage, navigator.language)

mountApp(document.getElementById('app')!, {
  exercise: verbPresentTense,
  storage,
  loadData: () => loadData(verbPresentTense.type),
})
