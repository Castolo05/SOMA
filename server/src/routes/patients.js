import express from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePsychologist } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate, requirePsychologist)

// ── GET /api/patients ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const patients = await prisma.user.findMany({
      where: { psychologistId: req.user.id, psychologistStatus: 'ACCEPTED', role: 'PATIENT' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { name: 'asc' },
    })

    const patientsWithStats = await Promise.all(
      patients.map(async (p) => {
        const recentEntries = await prisma.journalEntry.findMany({
          where: { patientId: p.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
        })

        const lastEntry = recentEntries[0] || null
        const totalEntries = await prisma.journalEntry.count({ where: { patientId: p.id } })

        return {
          ...p,
          lastMood: lastEntry?.moodScore ?? null,
          lastEntryDate: lastEntry?.createdAt ?? null,
          totalEntries,
        }
      })
    )

    res.json({ patients: patientsWithStats })
  } catch (err) {
    console.error('Error GET /patients:', err)
    res.status(500).json({ error: 'Error al obtener pacientes.' })
  }
})

// ── GET /api/patients/requests ────────────────────────────
router.get('/requests', async (req, res) => {
  try {
    const requests = await prisma.user.findMany({
      where: { psychologistId: req.user.id, psychologistStatus: 'PENDING', role: 'PATIENT' },
      select: { id: true, name: true, email: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    res.json({ requests })
  } catch (err) {
    console.error('Error GET /patients/requests:', err)
    res.status(500).json({ error: 'Error al obtener solicitudes.' })
  }
})

// ── POST /api/patients/requests/:id/accept ────────────────
router.post('/requests/:id/accept', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id, psychologistId: req.user.id, psychologistStatus: 'PENDING' },
      data: { psychologistStatus: 'ACCEPTED' },
    })
    res.json({ success: true })
  } catch (err) {
    console.error('Error POST /requests/:id/accept:', err)
    res.status(500).json({ error: 'Error al aceptar solicitud.' })
  }
})

// ── POST /api/patients/requests/:id/reject ────────────────
router.post('/requests/:id/reject', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id, psychologistId: req.user.id, psychologistStatus: 'PENDING' },
      data: { psychologistId: null, psychologistStatus: null },
    })
    res.json({ success: true })
  } catch (err) {
    console.error('Error POST /requests/:id/reject:', err)
    res.status(500).json({ error: 'Error al rechazar solicitud.' })
  }
})

// ── GET /api/patients/:id/insights ───────────────────────
// Resumen clínico express para la ficha pre-sesión
router.get('/:id/insights', async (req, res) => {
  try {
    const patient = await prisma.user.findFirst({
      where: { id: req.params.id, psychologistId: req.user.id, psychologistStatus: 'ACCEPTED', role: 'PATIENT' },
    })
    if (!patient) return res.status(403).json({ error: 'Paciente no encontrado.' })

    // Últimas 7 entradas de esta semana
    const now = new Date()
    const week1Start = new Date(now); week1Start.setDate(now.getDate() - 7); week1Start.setHours(0,0,0,0)
    const week2Start = new Date(now); week2Start.setDate(now.getDate() - 14); week2Start.setHours(0,0,0,0)

    const thisWeek = await prisma.journalEntry.findMany({
      where: { patientId: req.params.id, createdAt: { gte: week1Start } },
      orderBy: { createdAt: 'desc' },
    })
    const lastWeek = await prisma.journalEntry.findMany({
      where: { patientId: req.params.id, createdAt: { gte: week2Start, lt: week1Start } },
    })

    const avg = (arr) => arr.length ? (arr.reduce((s, e) => s + e.moodScore, 0) / arr.length).toFixed(1) : null
    const avgThis = avg(thisWeek)
    const avgLast = avg(lastWeek)
    const trend = avgThis && avgLast ? (parseFloat(avgThis) - parseFloat(avgLast)).toFixed(1) : null

    // Tags más frecuentes en las últimas 14 entradas
    const recent14 = await prisma.journalEntry.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 14,
    })

    const tagCount = {}
    for (const e of recent14) {
      let tags = []
      try { tags = JSON.parse(e.tags || '[]') } catch {}
      for (const t of tags) {
        tagCount[t] = (tagCount[t] || 0) + 1
      }
    }
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag, count]) => ({ tag, count }))



    res.json({
      avgThisWeek: avgThis,
      avgLastWeek: avgLast,
      trend,
      entriesThisWeek: thisWeek.length,
      topTags,
    })
  } catch (err) {
    console.error('Error GET /patients/:id/insights:', err)
    res.status(500).json({ error: 'Error al obtener insights.' })
  }
})

export default router
