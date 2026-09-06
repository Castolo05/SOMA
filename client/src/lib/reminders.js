import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { addDays, entryDateFromDate, entryDateKey, startOfDay } from './constants'

const REMINDER_PREFERENCE_KEY = 'soma_daily_reminders_enabled'
const REMINDER_CHANNEL_ID = 'daily-journal-reminders'
const DAYS_TO_SCHEDULE = 35

const isNativeApp = () => Capacitor.isNativePlatform()

const notificationId = (date, type) => {
  const dateNumber = Number(entryDateKey(date).replaceAll('-', ''))
  return type === 'daily' ? dateNumber : 100_000_000 + dateNumber
}

const atTime = (date, hour) => {
  const scheduled = startOfDay(date)
  scheduled.setHours(hour, 0, 0, 0)
  return scheduled
}

const knownNotificationIds = () => {
  const today = startOfDay()
  const ids = []

  for (let offset = 0; offset <= DAYS_TO_SCHEDULE + 1; offset += 1) {
    const date = addDays(today, offset)
    ids.push({ id: notificationId(date, 'daily') })
    ids.push({ id: notificationId(date, 'backfill') })
  }

  return ids
}

export const getReminderPreference = () => localStorage.getItem(REMINDER_PREFERENCE_KEY) !== 'false'

export const setReminderPreference = (enabled) => {
  localStorage.setItem(REMINDER_PREFERENCE_KEY, String(enabled))
}

async function hasNotificationPermission({ requestPermission = false } = {}) {
  if (!isNativeApp()) return false

  let permission = await LocalNotifications.checkPermissions()
  if (permission.display === 'prompt' && requestPermission) {
    permission = await LocalNotifications.requestPermissions()
  }

  return permission.display === 'granted'
}

async function createReminderChannel() {
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Recordatorios diarios',
    description: 'Recordatorios amables para completar tu anotación diaria.',
    importance: 3,
    visibility: 1,
  })
}

export async function clearDailyReminders() {
  if (!isNativeApp()) return
  await LocalNotifications.cancel({ notifications: knownNotificationIds() })
}

/**
 * Programa un horizonte móvil de recordatorios. Cada fecha tiene su propio
 * aviso, para poder cancelar el del día apenas la persona registra su nota.
 */
export async function syncDailyReminders(entries = [], { requestPermission = false } = {}) {
  if (!isNativeApp() || !getReminderPreference()) return { scheduled: false, permission: 'not-applicable' }

  const hasPermission = await hasNotificationPermission({ requestPermission })
  if (!hasPermission) {
    // Reflejar el estado real del sistema en el interruptor de Perfil.
    setReminderPreference(false)
    return { scheduled: false, permission: 'denied' }
  }

  await createReminderChannel()
  await clearDailyReminders()

  const recordedDates = new Set(entries.map((entry) => entry.entryDate || entryDateFromDate(entry.createdAt)))
  const today = startOfDay()
  const now = new Date()
  const notifications = []

  for (let offset = 0; offset <= DAYS_TO_SCHEDULE; offset += 1) {
    const date = addDays(today, offset)
    const dateKey = entryDateKey(date)
    const nightlyReminder = atTime(date, 23)

    if (nightlyReminder > now && !recordedDates.has(dateKey)) {
      notifications.push({
        id: notificationId(date, 'daily'),
        title: 'SOMA · Tu momento del día',
        body: 'Si te hace bien, regalate un minuto para anotar cómo estuvo tu día.',
        channelId: REMINDER_CHANNEL_ID,
        schedule: { at: nightlyReminder, allowWhileIdle: true },
        extra: { route: '/patient', reminder: 'daily' },
      })
    }

    const middayReminder = atTime(date, 12)
    const previousDateKey = entryDateKey(addDays(date, -1))
    if (middayReminder > now && !recordedDates.has(previousDateKey)) {
      notifications.push({
        id: notificationId(date, 'backfill'),
        title: 'SOMA · Ayer sigue disponible',
        body: 'Todavía podés completar o revisar la anotación de ayer.',
        channelId: REMINDER_CHANNEL_ID,
        schedule: { at: middayReminder, allowWhileIdle: true },
        extra: { route: '/patient', reminder: 'yesterday' },
      })
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
  }

  return { scheduled: true, permission: 'granted' }
}

export async function setDailyReminders(enabled, entries = []) {
  setReminderPreference(enabled)

  if (!enabled) {
    await clearDailyReminders()
    return { scheduled: false, permission: 'not-requested' }
  }

  return syncDailyReminders(entries, { requestPermission: true })
}

export function registerReminderTapHandler() {
  if (!isNativeApp()) return

  LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const route = notification.extra?.route || '/patient'
    window.location.hash = `#${route}`
  })
}
