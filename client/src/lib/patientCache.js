import { getHabits, getJournal } from './api'

const cache = {
  entries: null,
  habits: null,
}

let preloadPromise = null

export function preloadPatientData() {
  if (preloadPromise) return preloadPromise

  preloadPromise = Promise.allSettled([
    getJournal().then(({ data }) => { cache.entries = data.entries }),
    getHabits().then(({ data }) => { cache.habits = data.habits }),
  ])

  return preloadPromise
}

export function getPatientCache() {
  return cache
}

export function updatePatientCache(key, value) {
  cache[key] = value
}

export function clearPatientCache() {
  cache.entries = null
  cache.habits = null
  preloadPromise = null
}
