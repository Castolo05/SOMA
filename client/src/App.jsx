import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import {
  BookOpen, BrainCircuit, CheckCircle2, HeartPulse, X,
} from 'lucide-react'

// Auth
import LoginPage from './pages/auth/LoginPage'
import CookieBanner from './components/CookieBanner'
import Wordmark from './components/Wordmark'
import { applyTheme } from './lib/theme'
import { isPasswordRecoveryPending } from './lib/supabase'

const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const ThankYouPage = lazy(() => import('./pages/auth/ThankYouPage'))
const PatientLayout = lazy(() => import('./pages/patient/PatientLayout'))
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'))
const NewEntryPage = lazy(() => import('./pages/patient/NewEntryPage'))
const HistoryPage = lazy(() => import('./pages/patient/HistoryPage'))
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'))
const EditProfilePage = lazy(() => import('./pages/patient/EditProfilePage'))
const BreathingPage = lazy(() => import('./pages/patient/BreathingPage'))
const PsychLayout = lazy(() => import('./pages/psychologist/PsychLayout'))
const PatientsList = lazy(() => import('./pages/psychologist/PatientsList'))
const PatientDetail = lazy(() => import('./pages/psychologist/PatientDetail'))
const PsychSettings = lazy(() => import('./pages/psychologist/PsychSettings'))
const PatientRequests = lazy(() => import('./pages/psychologist/PatientRequests'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const LegalPage = lazy(() => import('./pages/LegalPage'))

const TUTORIAL_STORAGE_KEY = 'soma_first_visit_hidden'

function InitialRoute() {
  const { search, hash } = useLocation()
  const params = new URLSearchParams(search)
  const isRecoveryCallback = params.has('recovery') || params.has('code') || params.get('type') === 'recovery'

  // Se conservan los parámetros: ResetPasswordPage necesita el código o los tokens.
  return <Navigate to={isRecoveryCallback ? `/reset-password${search}${hash}` : '/login'} replace />
}

// Si Supabase redirigió el enlace de recuperación a otra ruta (por ejemplo, a la
// Site URL), supabase-js ya creó la sesión de recuperación: se completa en /reset-password.
function PasswordRecoveryRedirect() {
  const { pathname } = useLocation()
  if (!isPasswordRecoveryPending() || pathname === '/reset-password') return null
  return <Navigate to="/reset-password" replace />
}

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
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-visit-tutorial-title"
        onKeyDown={(e) => { if (e.key === 'Escape') handleClose() }}
        className="w-full max-w-md overflow-hidden rounded-[22px] border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-2xl dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <Wordmark className="h-[13px] text-[var(--theme-wordmark)]" />
          <button
            type="button"
            onClick={handleClose}
            autoFocus
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200"
            aria-label="Cerrar tutorial"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-4 pt-6">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-100 text-brand-600 shadow-sm dark:bg-brand-900/30 dark:text-brand-300">
            <Icon size={30} />
          </div>

          <h2 id="first-visit-tutorial-title" className="text-center text-2xl font-bold text-gray-800 dark:text-white">{current.title}</h2>
          <p className="mt-3 text-center text-sm leading-6 text-gray-600 dark:text-gray-300">{current.description}</p>

          <ul className="mt-5 space-y-2.5">
            {current.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-500" />
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
                  step === index ? 'w-8 bg-brand-500' : 'w-2.5 bg-gray-300 dark:bg-slate-700'
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
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400"
            />
            No volver a mostrar
          </label>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="flex-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-canvas)] px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-brand-100 dark:border-[var(--theme-border)] dark:bg-[var(--theme-canvas)] dark:text-gray-200 dark:hover:bg-[var(--theme-accent)]"
              >
                Atrás
              </button>
            )}

            {step < slides.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev + 1)}
                className="flex-1 rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
              >
                Empezar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  useEffect(() => {
    const psychTheme = localStorage.getItem('nexo_dark_psych') === 'true'
    const patientTheme = localStorage.getItem('nexo_dark') === 'true'
    const isDark = psychTheme || patientTheme
    applyTheme(isDark, false)
  }, [])

  return (
    <AuthProvider>
      <BrowserRouter>
        <PasswordRecoveryRedirect />
        <FirstVisitTutorial />
        <CookieBanner />
        <Suspense
          fallback={
            <div
              className="flex min-h-screen items-center justify-center bg-[var(--theme-canvas)] text-sm font-medium text-gray-500 dark:bg-[var(--theme-canvas)] dark:text-gray-300"
              role="status"
              aria-live="polite"
            >
              Cargando…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<InitialRoute />} />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route
            path="/legal/privacy-policy"
            element={
              <LegalPage
                title="Política de privacidad"
                description="SOMA respeta la confidencialidad de los datos de salud emocional y la información personal de sus usuarios. Esta política explica cómo se recogen, usan y resguardan los datos en la plataforma."
                sections={[
                  {
                    heading: '1. Información que recopilamos',
                    text: [
                      'Recopilamos los datos necesarios para crear y mantener la cuenta, como nombre, correo electrónico y datos básicos de perfil.',
                      'Además, registramos información del diario emocional, hábitos, notas personales y vinculaciones con profesionales de salud mental, cuando el usuario lo autoriza.',
                    ],
                  },
                  {
                    heading: '2. Uso de la información',
                    text: [
                      'Los datos se utilizan para brindar la funcionalidad principal de la aplicación: llevar un seguimiento emocional, permitir el acceso a profesionales vinculados y mejorar la experiencia dentro de la plataforma.',
                      'La información personal no se comparte con terceros sin consentimiento previo, salvo obligación legal o cumplimiento de seguridad y operación del servicio.',
                    ],
                  },
                  {
                    heading: '3. Seguridad y almacenamiento',
                    text: [
                      'Los datos se almacenan en entornos administrados por Supabase y se mantienen bajo medidas de seguridad razonables para evitar acceso no autorizado.',
                      'Las personas vinculadas a un paciente solo podrán consultar la información que corresponda a esa relación de confianza y participación terapéutica.',
                    ],
                  },
                  {
                    heading: '4. Derechos del usuario',
                    text: [
                      'El usuario puede solicitar acceso, corrección o eliminación de sus datos personales dentro de los límites legales y de la operativa de la aplicación.',
                      'Para consultas relacionadas con privacidad, podés escribir a faustoguidou@gmail.com.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/legal/terms"
            element={
              <LegalPage
                title="Términos y condiciones"
                description="Estos términos regulan el uso de SOMA, la plataforma de bienestar emocional pensada para acompañar a pacientes y profesionales entre sesiones."
                sections={[
                  {
                    heading: '1. Aceptación',
                    text: [
                      'Para crear una cuenta, el usuario debe confirmar expresamente que leyó y acepta estos términos y condiciones. Al utilizar SOMA, se compromete a usar la plataforma de forma responsable.',
                    ],
                  },
                  {
                    heading: '2. Finalidad de la plataforma',
                    text: [
                      'SOMA sirve como herramienta de registro emocional, seguimiento de hábitos y acompañamiento terapéutico entre sesiones, siempre bajo la autorización y la relación de confianza entre paciente y profesional.',
                    ],
                  },
                  {
                    heading: '3. Limitaciones',
                    text: [
                      'SOMA no sustituye una atención profesional presencial ni un diagnóstico clínico, y no debe utilizarse como respuesta inmediata ante situaciones de crisis o emergencias.',
                      'En caso de crisis o riesgo inminente, se recomienda comunicarse con servicios de emergencia o con un profesional de salud habilitado.',
                    ],
                  },
                  {
                    heading: '4. Contacto y responsabilidades',
                    text: [
                      'El equipo de SOMA puede actualizar estos términos con fines de mejora del servicio o cumplimiento de regulaciones.',
                      'Para consultas, podés escribir a faustoguidou@gmail.com.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/legal/cookies"
            element={
              <LegalPage
                title="Política de cookies"
                description="SOMA utiliza cookies con fines funcionales y, cuando el usuario lo autoriza, para analizar uso y mejorar la experiencia del servicio."
                sections={[
                  {
                    heading: '1. ¿Qué son las cookies?',
                    text: [
                      'Las cookies son pequeños archivos de texto que se almacenan en el navegador para recordar preferencias, mantener la sesión y registrar información de uso del sitio.',
                    ],
                  },
                  {
                    heading: '2. Cookies funcionales',
                    text: [
                      'Se usan para mantener la sesión del usuario, recordar el tema visual y mantener la experiencia de navegación consistente.',
                    ],
                  },
                  {
                    heading: '3. Cookies de análisis',
                    text: [
                      'Cuando el usuario acepta el uso de analytics, se habilita la medición anónima del comportamiento del sitio para mejorar la experiencia y detectar problemas de uso.',
                      'El uso de analytics requiere consentimiento previo y se puede desactivar desde este banner o en la configuración del sitio.',
                    ],
                  },
                  {
                    heading: '4. Administración',
                    text: [
                      'El usuario puede rechazar o aceptar cookies desde el banner de consentimiento visible en la interfaz.',
                      'También podés contactarnos en faustoguidou@gmail.com para consultas sobre privacidad y cookies.',
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/legal/contact"
            element={
              <LegalPage
                title="Contacto"
                description="Si tenés dudas sobre la plataforma, privacidad, seguridad, acceso, o cualquier consulta general, podés comunicarte directamente con el equipo de SOMA."
                sections={[
                  {
                    heading: 'Contacto directo',
                    text: [
                      'Email: faustoguidou@gmail.com',
                      'Horario de atención: según disponibilidad del equipo de SOMA.',
                      'Si necesitás ayuda con tu cuenta o con el acceso al servicio, indicá tu correo de registro y una descripción breve del problema.',
                    ],
                  },
                ]}
              />
            }
          />

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
            <Route index element={<Navigate to="/psych/patients" replace />} />
            <Route path="patients" element={<PatientsList />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="requests" element={<PatientRequests />} />
            <Route path="settings" element={<PsychSettings />} />
          </Route>

          {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
