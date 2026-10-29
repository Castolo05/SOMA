import {
  CloudLightning, CloudRain, Cloud, Wind, Minus,
  CloudSun, Sun, Sparkles, Star, Zap,
} from 'lucide-react'
import { MOOD_ICONS } from '../lib/constants'

const ICON_MAP = {
  CloudLightning, CloudRain, Cloud, Wind, Minus,
  CloudSun, Sun, Sparkles, Star, Zap,
}

/**
 * MoodIcon — renderiza el ícono Lucide correspondiente al puntaje (1-10)
 * Props:
 *   score: number (1-10)
 *   size?: number (px, default 20)
 *   className?: string adicional
 *   showLabel?: boolean
 *   showScore?: boolean
 */
export default function MoodIcon({ score, size = 20, className = '', showLabel = false, showScore = false, color }) {
  const config = MOOD_ICONS[score]
  if (!config) return null

  const IconComponent = ICON_MAP[config.icon]
  if (!IconComponent) return null

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          color: color || config.text,
          padding: size > 24 ? '6px' : '4px',
        }}
      >
        <IconComponent size={size} strokeWidth={2} />
      </span>
      {showScore && (
        <span className="font-bold tabular-nums" style={{ color: color || config.text }}>
          {score}
        </span>
      )}
      {showLabel && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {config.label}
        </span>
      )}
    </span>
  )
}

/**
 * MoodBadge — ícono + número en una pastilla coloreada
 */
export function MoodBadge({ score, size = 'md' }) {
  const config = MOOD_ICONS[score]
  if (!config) return null

  const IconComponent = ICON_MAP[config.icon]
  const sizeMap = { sm: 14, md: 16, lg: 20 }
  const iconSize = sizeMap[size] || 16

  return (
    <span
      className="bg-[var(--mood-bg)] dark:bg-[var(--mood-bg-dark)] inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-xs"
      style={{ '--mood-bg': config.bg, '--mood-bg-dark': config.darkBg, color: config.text }}
    >
      <IconComponent size={iconSize} strokeWidth={2.5} />
      <span>{score}/10</span>
    </span>
  )
}

/**
 * MoodDot — punto pequeño para el calendario (sin texto)
 */
export function MoodDot({ score, size = 8 }) {
  const config = MOOD_ICONS[score]
  if (!config) return null
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, backgroundColor: config.color }}
    />
  )
}
