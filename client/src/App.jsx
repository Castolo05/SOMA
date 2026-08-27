import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

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

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
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
