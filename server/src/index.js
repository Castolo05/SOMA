import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import journalRoutes from './routes/journal.js'
import sessionNotesRoutes from './routes/session-notes.js'
import patientsRoutes from './routes/patients.js'
import appointmentsRoutes from './routes/appointments.js'
import goalsRoutes from './routes/goals.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Rutas
app.get('/api', (req, res) => res.json({ message: 'SOMA API — Online' }))
app.use('/api/auth', authRoutes)
app.use('/api/journal', journalRoutes)
app.use('/api/session-notes', sessionNotesRoutes)
app.use('/api/patients', patientsRoutes)
app.use('/api/appointments', appointmentsRoutes)
app.use('/api/goals', goalsRoutes)

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }))

// Error global
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor.' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 SOMA API corriendo en http://localhost:${PORT}`)
  console.log(`📂 Base de datos: SQLite (local)`)
  console.log(`✅ Rutas: auth, journal, session-notes, patients, appointments, goals\n`)
})

export default app
