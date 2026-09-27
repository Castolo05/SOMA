import express from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePatient } from '../middleware/auth.js'
import { serializeTags, parseEntry, parseEntries } from '../lib/tags.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(authenticate)

// ── GET /api/journal ──────────────────────────────────────
// Listar entradas del paciente autenticado (o de un paciente específico si es psicólogo)
router.get('/', async (req, res) => {
  try {
    const { patientId, tag, mood, days } = req.query
    let targetPatientId

    if (req.user.role === 'PATIENT') {
      targetPatientId = req.user.id
    } else if (req.user.role === 'PSYCHOLOGIST') {
      if (!patientId) return res.status(400).json({ error: 'Parámetro patientId requerido.' })
      // Verificar que el paciente pertenece al psicólogo
      const patient = await prisma.user.findFirst({
        where: { id: patientId, psychologistId: req.user.id },
      })
      if (!patient) return res.status(403).json({ error: 'Paciente no encontrado en tu lista.' })
      targetPatientId = patientId
    }

    const where = { patientId: targetPatientId }

    // Filtro por días
    if (days) {
      const date = new Date()
      date.setDate(date.getDate() - parseInt(days))
      where.createdAt = { gte: date }
    }

    // Filtro por mood
    if (mood) {
      where.moodScore = parseInt(mood)
    }

    let entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parsear tags y filtrar por tag si se especificó
    entries = parseEntries(entries)
    if (tag) {
      entries = entries.filter((e) => e.tags.includes(tag))
    }

    res.json({ entries })
  } catch (err) {
    console.error('Error GET /journal:', err)
    res.status(500).json({ error: 'Error al obtener entradas.' })
  }
})

// ── POST /api/journal ─────────────────────────────────────
// Crear una nueva entrada (solo pacientes, máximo una por día)
router.post('/', requirePatient, async (req, res) => {
  try {
    const { moodScore, content, tags } = req.body

    if (!moodScore || typeof content !== 'string') {
      return res.status(400).json({ error: 'moodScore y content son requeridos.' })
    }
    if (moodScore < 1 || moodScore > 10) {
      return res.status(400).json({ error: 'moodScore debe estar entre 1 y 10.' })
    }

    // ── Una entrada por día ──────────────────────────────
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const existing = await prisma.journalEntry.findFirst({
      where: {
        patientId: req.user.id,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    })

    if (existing) {
      return res.status(409).json({
        error: 'Ya registraste una entrada hoy. Puedes editarla durante las próximas 24 horas.',
        existingId: existing.id,
      })
    }
    // ────────────────────────────────────────────────────

    const entry = await prisma.journalEntry.create({
      data: {
        patientId: req.user.id,
        moodScore: parseInt(moodScore),
        content,
        tags: serializeTags(tags),
      },
    })

    res.status(201).json({ entry: parseEntry(entry) })
  } catch (err) {
    console.error('Error POST /journal:', err)
    res.status(500).json({ error: 'Error al crear entrada.' })
  }
})

// ── GET /api/journal/:id ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ error: 'Entrada no encontrada.' })

    // El paciente solo puede ver sus propias entradas
    if (req.user.role === 'PATIENT' && entry.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Acceso denegado.' })
    }
    // El psicólogo solo puede ver entradas de sus pacientes
    if (req.user.role === 'PSYCHOLOGIST') {
      const patient = await prisma.user.findFirst({ where: { id: entry.patientId, psychologistId: req.user.id } })
      if (!patient) return res.status(403).json({ error: 'Acceso denegado.' })
    }

    res.json({ entry: parseEntry(entry) })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener entrada.' })
  }
})

// ── PUT /api/journal/:id ──────────────────────────────────
// Editar entrada (solo paciente, solo dentro de 1 semana / 168h)
router.put('/:id', requirePatient, async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ error: 'Entrada no encontrada.' })
    if (entry.patientId !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' })

    // Regla de 1 semana (168 horas)
    const horasTranscurridas = (Date.now() - new Date(entry.createdAt).getTime()) / 3600000
    if (horasTranscurridas > 168) {
      return res.status(403).json({ error: 'Solo puedes editar entradas dentro de los últimos 7 días (una semana).' })
    }

    const { moodScore, content, tags } = req.body
    const updated = await prisma.journalEntry.update({
      where: { id: req.params.id },
      data: {
        ...(moodScore && { moodScore: parseInt(moodScore) }),
        ...(typeof content === 'string' && { content }),
        ...(tags !== undefined && { tags: serializeTags(tags) }),
      },
    })

    res.json({ entry: parseEntry(updated) })
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar entrada.' })
  }
})

// ── DELETE /api/journal/:id ───────────────────────────────
// Eliminar entrada (solo paciente, solo dentro de 1 semana / 168h)
router.delete('/:id', requirePatient, async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ error: 'Entrada no encontrada.' })
    if (entry.patientId !== req.user.id) return res.status(403).json({ error: 'Acceso denegado.' })

    const horasTranscurridas = (Date.now() - new Date(entry.createdAt).getTime()) / 3600000
    if (horasTranscurridas > 168) {
      return res.status(403).json({ error: 'Solo puedes eliminar entradas dentro de los últimos 7 días (una semana).' })
    }

    await prisma.journalEntry.delete({ where: { id: req.params.id } })
    res.json({ message: 'Entrada eliminada correctamente.' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar entrada.' })
  }
})


export default router
