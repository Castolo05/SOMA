// SOMA global constants (1-10 mood scale with Lucide icons).
// La escala de ánimo es un semáforo continuo: rojo (1) → amarillo (5-6) → verde (10).
// Los tonos se calcularon en OKLCH para que los pasos se vean parejos.
//   color: relleno (puntos, calendario, gráficos); igual en ambos temas
//   ink:   color del ícono/texto sobre ese relleno (blanco o tinta oscura,
//          según cuál tenga contraste ≥3:1)
//   text:  color para texto sobre el fondo de la app; cambia con el tema
//          (variables --mood-N-text en theme.css, contraste ≥4.5:1)
//   bg / darkBg: tinte suave para pastillas

// MOOD_ICONS: mapa de puntaje 1-10 → configuración visual
// Los iconos son nombres de componentes de lucide-react
// Se renderizan con el componente <MoodIcon score={n} />
const INK_LIGHT = '#ffffff'
const INK_DARK = '#2a201c'

export const MOOD_ICONS = {
  1:  { icon: 'CloudLightning', label: 'Terrible',  color: '#c43f3e', ink: INK_LIGHT, text: 'var(--mood-1-text)',  bg: '#ffe6e3', darkBg: '#492826' },
  2:  { icon: 'CloudRain',      label: 'Muy mal',   color: '#ce4d2d', ink: INK_LIGHT, text: 'var(--mood-2-text)',  bg: '#ffe7df', darkBg: '#492921' },
  3:  { icon: 'Cloud',          label: 'Mal',       color: '#d7621d', ink: INK_LIGHT, text: 'var(--mood-3-text)',  bg: '#ffe8db', darkBg: '#482a1c' },
  4:  { icon: 'Wind',           label: 'Regular',   color: '#df7b0c', ink: INK_LIGHT, text: 'var(--mood-4-text)',  bg: '#ffe9d8', darkBg: '#462c18' },
  5:  { icon: 'Minus',          label: 'Neutro',    color: '#e69812', ink: INK_DARK,  text: 'var(--mood-5-text)',  bg: '#feebd6', darkBg: '#432e14' },
  6:  { icon: 'CloudSun',       label: 'Bien',      color: '#e3af19', ink: INK_DARK,  text: 'var(--mood-6-text)',  bg: '#f9edd5', darkBg: '#3e3112' },
  7:  { icon: 'Sun',            label: 'Muy bien',  color: '#b6a800', ink: INK_DARK,  text: 'var(--mood-7-text)',  bg: '#f2f0d6', darkBg: '#373413' },
  8:  { icon: 'Sparkles',       label: 'Genial',    color: '#7fa11c', ink: INK_DARK,  text: 'var(--mood-8-text)',  bg: '#e9f3da', darkBg: '#2d3719' },
  9:  { icon: 'Star',           label: 'Excelente', color: '#4b943b', ink: INK_LIGHT, text: 'var(--mood-9-text)',  bg: '#e3f5df', darkBg: '#253920' },
  10: { icon: 'Zap',            label: 'Perfecto',  color: '#1a8748', ink: INK_LIGHT, text: 'var(--mood-10-text)', bg: '#def6e3', darkBg: '#1e3a26' },
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
  const clamped = Math.min(10, Math.max(1, Math.round(score)))
  return MOOD_ICONS[clamped].color
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

// Sin límite de antigüedad: el paciente puede crear/editar anotaciones de cualquier
// día pasado o presente (fechas futuras siempre son inválidas).
export const isEditable = (entryDate) => {
  if (!entryDate) return false
  const target = entryDateKey(entryDateToDate(entryDate))
  const today = entryDateKey()
  return target <= today
}

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
