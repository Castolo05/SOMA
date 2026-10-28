// SOMA global constants (1-10 mood scale with Lucide icons).
// La escala de ánimo va de violeta polvoriento (1) a dorado (10), dentro de la
// paleta cálida de la marca; cada color tiene contraste ≥3:1 en ambos temas.

// MOOD_ICONS: mapa de puntaje 1-10 → configuración visual
// Los iconos son nombres de componentes de lucide-react
// Se renderizan con el componente <MoodIcon score={n} />
export const MOOD_ICONS = {
  1:  { icon: 'CloudLightning', label: 'Terrible',    color: '#9058a3', bg: '#efe0e5', darkBg: '#3f2d41' },
  2:  { icon: 'CloudRain',      label: 'Muy mal',     color: '#a2529b', bg: '#f2dfe4', darkBg: '#442c3f' },
  3:  { icon: 'Cloud',          label: 'Mal',         color: '#b04f87', bg: '#f4dfe1', darkBg: '#472b3a' },
  4:  { icon: 'Wind',           label: 'Regular',     color: '#b8506a', bg: '#f5dfdd', darkBg: '#492c33' },
  5:  { icon: 'Minus',          label: 'Neutro',      color: '#bf5248', bg: '#f6dfd8', darkBg: '#4b2c2b' },
  6:  { icon: 'CloudSun',       label: 'Bien',        color: '#b75c35', bg: '#f5e0d6', darkBg: '#492e27' },
  7:  { icon: 'Sun',            label: 'Muy bien', color: '#ad682b', bg: '#f4e2d4', darkBg: '#463124' },
  8:  { icon: 'Sparkles',       label: 'Genial',    color: '#a47226', bg: '#f2e3d4', darkBg: '#443423' },
  9:  { icon: 'Star',           label: 'Excelente',   color: '#9e7923', bg: '#f1e4d3', darkBg: '#433522' },
  10: { icon: 'Zap',            label: 'Perfecto',    color: '#987f1d', bg: '#f1e5d2', darkBg: '#413721' },
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
