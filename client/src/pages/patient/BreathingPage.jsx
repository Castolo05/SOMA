import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wind } from 'lucide-react'
import { usePageTitle } from '../../hooks/usePageTitle'

const PHASES = [
  { label: 'Inhala', duration: 4, color: '#059669' },
  { label: 'Sostén', duration: 4, color: '#267783' },
  { label: 'Exhala', duration: 4, color: '#0d9488' },
]

export default function BreathingPage() {
  usePageTitle('Respiración 4-4-4')
  const navigate = useNavigate()
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState(0)
  const [tick, setTick] = useState(0)
  const [cycles, setCycles] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0].duration)

  useEffect(() => {
    if (!running) return

    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [running])

  useEffect(() => {
    if (!running) return

    setSecondsLeft((prev) => {
      if (prev <= 1) {
        const nextPhase = (phase + 1) % PHASES.length
        setPhase(nextPhase)
        if (nextPhase === 0) setCycles((c) => c + 1)
        return PHASES[nextPhase].duration
      }
      return prev - 1
    })
  }, [tick])

  const currentPhase = PHASES[phase]
  const progress = 1 - (secondsLeft / currentPhase.duration)
  const circumference = 2 * Math.PI * 70

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Respiración 4-4-4</h1>
          <p className="text-sm text-gray-400">Técnica de calma rápida</p>
        </div>
      </div>

      {/* Animación central */}
      <div className="flex flex-col items-center justify-center py-8 gap-6">
        <div className="relative w-44 h-44">
          {/* Círculo de fondo */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="80" cy="80" r="70"
              fill="none"
              stroke={running ? currentPhase.color : '#d1d5db'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - (running ? progress : 0))}
              style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s' }}
            />
          </svg>

          {/* Contenido central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {running ? (
              <>
                <p
                  className="text-2xl font-extrabold transition-all"
                  style={{ color: currentPhase.color }}
                >
                  {currentPhase.label}
                </p>
                <p className="text-4xl font-black text-gray-700 dark:text-gray-200 tabular-nums mt-1">
                  {secondsLeft}
                </p>
              </>
            ) : (
              <div className="text-center">
                <Wind size={32} className="text-gray-300 mx-auto mb-1" />
                <p className="text-sm text-gray-400 font-medium">Listo</p>
              </div>
            )}
          </div>
        </div>

        {/* Ciclos */}
        {running && (
          <div className="text-center animate-fade-in">
            <p className="text-sm text-gray-400">
              Ciclos completados: <span className="font-bold text-gray-700 dark:text-gray-200">{cycles}</span>
            </p>
          </div>
        )}

        {/* Botón */}
        <button
          onClick={() => {
            if (running) {
              setRunning(false)
              setPhase(0)
              setSecondsLeft(PHASES[0].duration)
              setTick(0)
            } else {
              setRunning(true)
              setCycles(0)
            }
          }}
          className={`px-8 py-3 rounded-2xl font-bold text-white transition-all shadow-md ${
            running
              ? 'bg-gray-400 hover:bg-gray-500'
              : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg'
          }`}
        >
          {running ? 'Detener' : 'Comenzar'}
        </button>
      </div>

      {/* Instrucciones */}
      <div className="card bg-white dark:bg-gray-800">
        <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-3 text-sm">¿Cómo funciona?</h3>
        <div className="space-y-2">
          {PHASES.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: p.color }}>
                {p.duration}s
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{p.label} durante {p.duration} segundos</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          La respiración 4-4-4 activa el sistema nervioso parasimpático, reduciendo la frecuencia cardíaca y la ansiedad en menos de 2 minutos.
        </p>
      </div>
    </div>
  )
}
