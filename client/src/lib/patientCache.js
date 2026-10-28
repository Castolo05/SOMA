import { getHabitCorrelation, getHabits, getJournal } from './api'

const cache = {
  entries: null,
  habits: null,
  correlation: null,
}

let preloadPromise = null

export function preloadPatientData() {
  if (preloadPromise) return preloadPromise

  preloadPromise = Promise.allSettled([
    getJournal().then(({ data }) => { cache.entries = data.entries }),
    getHabits().then(({ data }) => { cache.habits = data.habits }),
    getHabitCorrelation().then(({ data }) => { cache.correlation = data }),
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
  cache.correlation = null
  preloadPromise = null
}
