import api from './api'

const cache = {
  entries: null,
  habits: null,
  appointments: null,
  correlation: null,
}

let preloadPromise = null

export function preloadPatientData() {
  if (preloadPromise) return preloadPromise

  preloadPromise = Promise.allSettled([
    api.get('/journal').then(({ data }) => { cache.entries = data.entries }),
    api.get('/habits').then(({ data }) => { cache.habits = data.habits }),
    api.get('/appointments').then(({ data }) => { cache.appointments = data.appointments }),
    api.get('/habits/correlation').then(({ data }) => { cache.correlation = data }),
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
  cache.appointments = null
  cache.correlation = null
  preloadPromise = null
}
