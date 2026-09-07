import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'

// Auth
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

// Paciente
import PatientLayout from './pages/patient/PatientLayout'
import PatientDashboard from './pages/patient/PatientDashboard'
import NewEntryPage from './pages/patient/NewEntryPage'
import HistoryPage from './pages/patient/HistoryPage'
import PatientProfile from './pages/patient/PatientProfile'
import EditProfilePage from './pages/patient/EditProfilePage'
import EmergencyPage from './pages/patient/EmergencyPage'
import BreathingPage from './pages/patient/BreathingPage'

// Psicólogo
import PsychLayout from './pages/psychologist/PsychLayout'
import PsychDashboard from './pages/psychologist/PsychDashboard'
import PatientsList from './pages/psychologist/PatientsList'
import PatientDetail from './pages/psychologist/PatientDetail'

// 404
import NotFoundPage from './pages/NotFoundPage'

const TUTORIAL_STORAGE_KEY = 'soma_first_visit_hidden'

function FirstVisitTutorial() {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true'
    } catch {
      return true
    }
  })
  const [step, setStep] = useState(0)
  const [hideForever, setHideForever] = useState(false)

  const slides = [
    {
      icon: HeartPulse,
      title: '¿Qué es SOMA?',
      description: 'SOMA es una app de bienestar emocional para registrar cómo te sentís, acompañarte en tu rutina y mantenerte conectado con tu cuidado.',
      points: [
        'Seguimiento diario de tu ánimo.',
        'Registro de hábitos y experiencias.',
        'Espacio seguro para reflexionar.',
      ],
    },
    {
      icon: BookOpen,
      title: '¿Para qué sirve?',
      description: 'Te ayuda a entender tus patrones, reconocer momentos difíciles y llevar un historial claro de tu proceso emocional.',
      points: [
        'Guardar notas y observaciones diarias.',
        'Ver tu evolución en el historial.',
        'Tener un panorama más completo de tu bienestar.',
      ],
    },
    {
      icon: BrainCircuit,
      title: '¿Cómo funciona?',
      description: 'Cada día podés registrar tu estado de ánimo, hábitos y pensamientos. Si te vincularon con un profesional de salud mental, este puede acceder a la información para hacer un seguimiento y acompañamiento.',
      points: [
        'Elegí tu estado de ánimo cada día.',
        'Marcá hábitos cumplidos o pendientes.',
        'Tené en cuenta que es un proyecto independiente y una versión temprana en desarrollo, sujeta a cambios.',
      ],
    },
  ]

  const current = slides[step]
  const Icon = current.icon

  useEffect(() => {
    if (!isOpen) {
      setStep(0)
      setHideForever(false)
    }
  }, [isOpen])

  const handleClose = () => {
    if (hideForever) {
      try {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
      } catch {}
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sage-600 dark:text-sage-400">
            <Sparkles size={14} />
            Bienvenido
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200"
            aria-label="Cerrar tutorial"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-4 pt-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-sage-100 text-sage-600 shadow-sm dark:bg-sage-900/30 dark:text-sage-300">
            <Icon size={30} />
          </div>

          <h2 className="text-center text-2xl font-bold text-gray-800 dark:text-white">{current.title}</h2>
          <p className="mt-3 text-center text-sm leading-6 text-gray-600 dark:text-gray-300">{current.description}</p>

          <ul className="mt-5 space-y-2.5">
            {current.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sage-500" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 dark:border-slate-800">
          <div className="mb-4 flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setStep(index)}
                className={`h-2.5 rounded-full transition-all ${
                  step === index ? 'w-8 bg-sage-500' : 'w-2.5 bg-gray-300 dark:bg-slate-700'
                }`}
                aria-label={`Ir al paso ${index + 1}`}
              />
            ))}
          </div>

          <label className="mb-4 flex cursor-pointer items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={hideForever}
              onChange={(e) => setHideForever(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-sage-500 focus:ring-sage-400"
            />
            No volver a mostrar
          </label>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                Atrás
              </button>
            )}

            {step < slides.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev + 1)}
                className="flex-1 rounded-2xl bg-sage-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sage-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600"
              >
                Empezar <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <FirstVisitTutorial />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Paciente */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute requiredRole="PATIENT">
                <PatientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PatientDashboard />} />
            <Route path="new" element={<NewEntryPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="breathing" element={<BreathingPage />} />
          </Route>

          {/* Psicólogo */}
          <Route
            path="/psych"
            element={
              <ProtectedRoute requiredRole="PSYCHOLOGIST">
                <PsychLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PsychDashboard />} />
            <Route path="patients" element={<PatientsList />} />
            <Route path="patients/:id" element={<PatientDetail />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
