// NexoMente — Constantes globales (escala 1-10 con iconos Lucide)

// MOOD_ICONS: mapa de puntaje 1-10 → configuración visual
// Los iconos son nombres de componentes de lucide-react
// Se renderizan con el componente <MoodIcon score={n} />
export const MOOD_ICONS = {
  1:  { icon: 'CloudLightning', label: 'Terrible',    color: '#dc2626', bg: '#fef2f2', darkBg: '#450a0a' },
  2:  { icon: 'CloudRain',      label: 'Muy mal',     color: '#ea580c', bg: '#fff7ed', darkBg: '#431407' },
  3:  { icon: 'Cloud',          label: 'Mal',         color: '#d97706', bg: '#fffbeb', darkBg: '#451a03' },
  4:  { icon: 'Wind',           label: 'Regular',     color: '#ca8a04', bg: '#fefce8', darkBg: '#422006' },
  5:  { icon: 'Minus',          label: 'Neutro',      color: '#65a30d', bg: '#f7fee7', darkBg: '#1a2e05' },
  6:  { icon: 'CloudSun',       label: 'Bien',        color: '#16a34a', bg: '#f0fdf4', darkBg: '#052e16' },
  7:  { icon: 'Sun',            label: 'Muy bien', color: '#059669', bg: '#ecfdf5', darkBg: '#022c22' },
  8:  { icon: 'Sparkles',       label: 'Genial',    color: '#0d9488', bg: '#f0fdfa', darkBg: '#042f2e' },
  9:  { icon: 'Star',           label: 'Excelente',   color: '#4f46e5', bg: '#eef2ff', darkBg: '#1e1b4b' },
  10: { icon: 'Zap',            label: 'Perfecto',    color: '#7c3aed', bg: '#faf5ff', darkBg: '#2e1065' },
}

// Color semáforo para gráficos (Recharts dot color)
import {
  Droplet, BookOpen, Footprints, Users, Activity, Heart,
  Coffee, Music, Sun, Moon, Dumbbell, Leaf, Smile, Star, CheckCircle
} from 'lucide-react'

export const HABIT_ICONS = {
  Droplet: Droplet,
  BookOpen: BookOpen,
  Footprints: Footprints,
  Users: Users,
  Activity: Activity,
  Heart: Heart,
  Coffee: Coffee,
  Music: Music,
  Sun: Sun,
  Moon: Moon,
  Dumbbell: Dumbbell,
  Leaf: Leaf,
  Smile: Smile,
  Star: Star,
  CheckCircle: CheckCircle,
}

export const MOOD_CHART_COLOR = (score) => {
  if (score <= 2) return '#dc2626'
  if (score <= 4) return '#d97706'
  if (score <= 6) return '#16a34a'
  if (score <= 8) return '#0d9488'
  return '#7c3aed'
}

export const MOOD_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Helpers de fecha
export const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export const formatDateShort = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export const formatTime = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export const isSameDay = (a, b) => {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

export const startOfDay = (date = new Date()) => {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

export const addDays = (date, days) => {
  const result = startOfDay(date)
  result.setDate(result.getDate() + days)
  return result
}

export const entryDateKey = (date = new Date()) => {
  const localDate = new Date(date)
  const year = localDate.getFullYear()
  const month = String(localDate.getMonth() + 1).padStart(2, '0')
  const day = String(localDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const entryDateFromDate = (value) => entryDateKey(value)

// Una fecha YYYY-MM-DD se interpreta al mediodía local para evitar saltos por UTC.
export const entryDateToDate = (entryDate) => {
  if (!entryDate) return new Date()
  if (entryDate instanceof Date) return entryDate
  if (/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return new Date(`${entryDate}T12:00:00`)
  return new Date(entryDate)
}

// La ventana de edición se define por día calendario: hoy o ayer.
export const isEditable = (entryDate) => {
  const target = entryDateKey(entryDateToDate(entryDate))
  const today = entryDateKey()
  const yesterday = entryDateKey(addDays(new Date(), -1))
  return target === today || target === yesterday
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
