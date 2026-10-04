import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { nanoid } from 'nanoid'

const router = express.Router()

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })

// ── POST /api/auth/register ────────────────────────────────
// Registrar un nuevo usuario (paciente o psicólogo)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Todos los campos son requeridos.' })
    }
    if (!['PATIENT', 'PSYCHOLOGIST'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido.' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        // Los psicólogos reciben un código de invitación automáticamente
        inviteCode: role === 'PSYCHOLOGIST' ? nanoid(8).toUpperCase() : null,
      },
      select: { id: true, name: true, email: true, role: true, inviteCode: true, psychologistId: true },
    })

    const token = generateToken(user.id)
    res.status(201).json({ token, user })
  } catch (err) {
    console.error('Error en register:', err)
    res.status(500).json({ error: 'Error al crear la cuenta.' })
  }
})

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' })
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' })
    }

    const token = generateToken(user.id)
    const { passwordHash, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error('Error en login:', err)
    res.status(500).json({ error: 'Error al iniciar sesión.' })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────
// Obtener el perfil del usuario autenticado
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})

// ── POST /api/auth/link/preview ───────────────────────────────
router.post('/link/preview', authenticate, async (req, res) => {
  try {
    const { inviteCode } = req.body
    if (!inviteCode) return res.status(400).json({ error: 'Código requerido.' })

    const psychologist = await prisma.user.findFirst({
      where: { inviteCode: inviteCode.trim().toUpperCase(), role: 'PSYCHOLOGIST' },
      select: { id: true, name: true, email: true }
    })

    if (!psychologist) return res.status(404).json({ error: 'Código de invitación no encontrado.' })
    res.json({ psychologist })
  } catch (err) {
    console.error('Error en link/preview:', err)
    res.status(500).json({ error: 'Error al verificar código.' })
  }
})

// ── POST /api/auth/link ───────────────────────────────────
// Paciente ingresa un código para vincularse con su psicólogo
router.post('/link', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Solo los pacientes pueden vincularse.' })
    }

    const { inviteCode } = req.body
    if (!inviteCode) {
      return res.status(400).json({ error: 'Código de invitación requerido.' })
    }

    const psychologist = await prisma.user.findFirst({
      where: { inviteCode: inviteCode.trim().toUpperCase(), role: 'PSYCHOLOGIST' },
    })

    if (!psychologist) {
      return res.status(404).json({ error: 'Código de invitación no encontrado.' })
    }

    if (req.user.psychologistId === psychologist.id && req.user.psychologistStatus === 'ACCEPTED') {
      return res.status(409).json({ error: 'Ya estás vinculado con este psicólogo.' })
    }

    if (req.user.psychologistId === psychologist.id && req.user.psychologistStatus === 'PENDING') {
      return res.status(409).json({ error: 'Tu solicitud ya está pendiente de aprobación.' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { psychologistId: psychologist.id, psychologistStatus: 'PENDING' },
      select: { id: true, name: true, email: true, role: true, psychologistId: true, psychologistStatus: true },
    })

    res.json({ message: `Solicitud enviada a ${psychologist.name}`, user: updatedUser })
  } catch (err) {
    console.error('Error en link:', err)
    res.status(500).json({ error: 'Error al vincular.' })
  }
})

export default router
