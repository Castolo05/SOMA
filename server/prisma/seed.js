import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de base de datos local (SQLite)...\n')

  // Limpiar en orden correcto (FK)
  await prisma.therapyGoal.deleteMany()
  await prisma.sessionNote.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.journalEntry.deleteMany()
  await prisma.user.deleteMany()

  const psicologoPassword = await bcrypt.hash('psicologo123', 12)
  const psicologo = await prisma.user.create({
    data: {
      name: 'Dra. Laura Gómez',
      email: 'laura@soma.app',
      passwordHash: psicologoPassword,
      role: 'PSYCHOLOGIST',
      inviteCode: nanoid(8).toUpperCase(),
    },
  })
  console.log(`✅ Psicólogo: ${psicologo.name} | Código: ${psicologo.inviteCode}`)

  const pacientePassword = await bcrypt.hash('paciente123', 12)
  const paciente = await prisma.user.create({
    data: {
      name: 'Carlos Ruiz',
      email: 'carlos@soma.app',
      passwordHash: pacientePassword,
      role: 'PATIENT',
      psychologistId: psicologo.id,
    },
  })
  console.log(`✅ Paciente: ${paciente.name}`)

  const hoy = new Date()
  hoy.setHours(12, 0, 0, 0)
  const diasAtras = (n) => {
    const d = new Date(hoy)
    d.setDate(d.getDate() - n)
    return d
  }

  // ── Entradas de diario (45 días) ──
  const entradas = [
    { d: 45, score: 3, content: 'Me cuesta levantarme. Sin energía para nada. No sé qué me pasa.', tags: ['Ansiedad'], flag: false },
    { d: 43, score: 2, content: 'Noche pésima. Pesadillas y pensamientos que no puedo callar.', tags: ['Insomnio', 'Ansiedad'], flag: false },
    { d: 42, score: 4, content: 'Fui al trabajo aunque no tenía ganas. Al menos salí de la cama.', tags: ['Trabajo'], flag: false },
    { d: 40, score: 3, content: 'Discusión con mi jefe. Me afecta mucho más de lo que debería.', tags: ['Trabajo', 'Discusión'], flag: false },
    { d: 38, score: 2, content: 'No pude dormir. Me quedé mirando el techo hasta las 4am.', tags: ['Insomnio'], flag: false },
    { d: 37, score: 3, content: 'Día gris. Comí mal, no salí. Al menos tomé la medicación.', tags: ['Medicación'], flag: false },
    { d: 35, score: 5, content: 'Un poco mejor hoy. Llamé a mi hermana, me hizo bien hablar.', tags: ['Familia'], flag: false },
    { d: 34, score: 4, content: 'Regular. No hubo grandes cambios pero tampoco caí tanto.', tags: [], flag: false },
    { d: 32, score: 3, content: 'Recaí un poco. Me puse a pensar demasiado en cosas del pasado.', tags: ['Ansiedad'], flag: false },
    { d: 31, score: 4, content: 'Sesión con Laura. Me ayudó poner en perspectiva algunas cosas.', tags: [], flag: false },
    { d: 30, score: 5, content: 'Primer día que me siento neutro de verdad. Sin angustia al despertarme.', tags: ['Medicación'], flag: false },
    { d: 28, score: 6, content: 'Salí a caminar 20 minutos. Primera vez en semanas. Me hizo bien.', tags: ['Ejercicio'], flag: false },
    { d: 27, score: 5, content: 'Trabajo pesado pero manejable. Apliqué lo de respiración que me enseñó Laura.', tags: ['Trabajo'], flag: false },
    { d: 25, score: 7, content: 'Buen día. Fui al parque con mi sobrino. Me reí bastante.', tags: ['Familia', 'Logro'], flag: false },
    { d: 24, score: 6, content: 'Dormí bien toda la noche por primera vez en mucho tiempo.', tags: ['Insomnio'], flag: false },
    { d: 22, score: 5, content: 'Día regular pero sin bajones. Eso ya es un avance.', tags: [], flag: false },
    { d: 21, score: 6, content: 'Sesión con Laura. Hablamos de la relación con mi pareja.', tags: ['Pareja'], flag: false },
    { d: 20, score: 7, content: 'Tuvimos una conversación sincera con mi pareja. Fue difícil pero necesaria.', tags: ['Pareja', 'Logro'], flag: false },
    { d: 18, score: 7, content: 'Terminé un proyecto que tenía pendiente. Sensación de logro real.', tags: ['Trabajo', 'Logro'], flag: false },
    { d: 17, score: 8, content: 'Salí a correr 30 minutos. Fue difícil pero terminé sonriendo.', tags: ['Ejercicio'], flag: false },
    { d: 15, score: 6, content: 'Un poco más cansado hoy. Pero manejé la situación sin caer.', tags: [], flag: false },
    { d: 14, score: 7, content: 'Cena con amigos. Me olvidé por un rato de todo lo que cargué este mes.', tags: ['Logro'], flag: false },
    { d: 13, score: 8, content: 'Excelente sesión con Laura. Siento que estoy avanzando de verdad.', tags: [], flag: false },
    { d: 11, score: 9, content: 'Uno de los mejores días en mucho tiempo. Gratitud genuina por la vida.', tags: ['Logro', 'Gratitud'], flag: false },
    { d: 10, score: 8, content: 'Seguí el momentum de ayer. Caminé, comí bien, dormí bien.', tags: ['Ejercicio'], flag: false },
    { d: 8, score: 7, content: 'Buen día en general. Pequeño bajón a la tarde pero lo pude manejar.', tags: ['Ansiedad'], flag: false },
    { d: 7, score: 6, content: 'Tuve que tomar una decisión difícil en el trabajo. Me genera incertidumbre.', tags: ['Trabajo'], flag: true },
    { d: 6, score: 5, content: 'La incertidumbre del trabajo me afectó. Dormí mal. Quiero hablar esto en sesión.', tags: ['Insomnio', 'Trabajo'], flag: true },
    { d: 5, score: 7, content: 'Me di cuenta que estaba catastrofizando. Respiré y me recentré.', tags: ['Logro'], flag: false },
    { d: 4, score: 8, content: 'Noticias positivas del trabajo. Me saqué un peso de encima.', tags: ['Trabajo', 'Logro'], flag: false },
    { d: 3, score: 7, content: 'Tranquilo. Sesión con Laura mañana, estoy con ganas de ir.', tags: [], flag: false },
    { d: 2, score: 8, content: 'Sesión muy productiva. Establecimos metas para el próximo mes.', tags: ['Gratitud'], flag: false },
    { d: 1, score: 9, content: 'Me desperté con energía. Fui al gimnasio. Me siento fuerte.', tags: ['Ejercicio', 'Gratitud'], flag: false },
  ]

  for (const e of entradas) {
    await prisma.journalEntry.create({
      data: {
        patientId: paciente.id,
        moodScore: e.score,
        content: e.content,
        tags: JSON.stringify(e.tags),
        flaggedForSession: e.flag,
        createdAt: diasAtras(e.d),
      },
    })
  }
  console.log(`✅ ${entradas.length} entradas de diario creadas (45 días, 2 marcadas para sesión)`)

  // ── Notas de sesión ──
  const sessionNotes = [
    {
      sessionDate: diasAtras(31),
      title: 'Sesión 1 — Presentación inicial',
      content: 'Primera sesión. Carlos presenta cuadro de ansiedad generalizada con episodios de insomnio frecuentes. Relata discusión reciente con pareja. Alta motivación para el tratamiento. Plan: técnicas de regulación emocional + revisión de rutina de sueño.',
    },
    {
      sessionDate: diasAtras(21),
      title: 'Sesión 2 — Avance en respiración',
      content: 'Carlos aplicó ejercicios de respiración con resultado positivo. Sigue sin resolver tensión con pareja. Trabajamos en comunicación asertiva. Tarea: una conversación honesta esta semana. Ánimo en ascenso progresivo.',
    },
    {
      sessionDate: diasAtras(13),
      title: 'Sesión 3 — Conversación con pareja',
      content: 'Tuvo la conversación con su pareja. Refirió que fue difícil pero liberador. Ánimo 8/10 post-sesión. El ejercicio físico emergió como regulador natural. Reforzar hábito. Próximo foco: autoestima laboral.',
    },
    {
      sessionDate: diasAtras(2),
      title: 'Sesión 4 — Incertidumbre laboral',
      content: 'Carlos trajo preocupación por decisión laboral importante (ver entradas marcadas días 6-7). Trabajamos reestructuración cognitiva. Salió bien resuelto. Establecimos 2 metas concretas para el próximo mes. Evolución muy positiva.',
    },
  ]

  for (const n of sessionNotes) {
    await prisma.sessionNote.create({
      data: {
        psychologistId: psicologo.id,
        patientId: paciente.id,
        sessionDate: n.sessionDate,
        title: n.title,
        content: n.content,
      },
    })
  }
  console.log(`✅ ${sessionNotes.length} notas de sesión creadas`)

  // ── Objetivos terapéuticos ──
  const goals = [
    { text: 'Caminar o correr mínimo 2 veces por semana', completed: true },
    { text: 'Practicar respiración 4-4-4 antes de dormir', completed: true },
    { text: 'Registrar estado de ánimo diariamente en la app', completed: false },
    { text: 'Hablar con la pareja de forma asertiva ante conflictos', completed: false },
  ]

  for (const g of goals) {
    await prisma.therapyGoal.create({
      data: {
        psychologistId: psicologo.id,
        patientId: paciente.id,
        text: g.text,
        completed: g.completed,
      },
    })
  }
  console.log(`✅ ${goals.length} objetivos terapéuticos creados`)

  // ── Citas de agenda ──
  const citaBase = new Date()
  citaBase.setHours(10, 0, 0, 0)
  const citaEn = (dias, hora = 10) => {
    const d = new Date(citaBase)
    d.setDate(d.getDate() + dias)
    d.setHours(hora, 0, 0, 0)
    return d
  }

  const citas = [
    { title: `Sesión 5 — ${paciente.name}`, date: citaEn(5, 10), patientId: paciente.id, duration: 50, notes: 'Seguimiento laboral y metas del mes.' },
    { title: `Sesión 6 — ${paciente.name}`, date: citaEn(12, 10), patientId: paciente.id, duration: 50, notes: '' },
    { title: 'Supervisión mensual de casos', date: citaEn(7, 15), patientId: null, duration: 90, notes: 'Con colegas del instituto.' },
    { title: `Sesión 7 — ${paciente.name}`, date: citaEn(19, 10), patientId: paciente.id, duration: 50, notes: '' },
  ]

  for (const c of citas) {
    await prisma.appointment.create({
      data: {
        psychologistId: psicologo.id,
        patientId: c.patientId,
        title: c.title,
        date: c.date,
        duration: c.duration,
        notes: c.notes,
      },
    })
  }
  console.log(`✅ ${citas.length} citas de agenda creadas`)

  console.log('\n🎉 Seed completado!')
  console.log('📋 Credenciales de prueba:')
  console.log('   Psicólogo → laura@soma.app / psicologo123')
  console.log('   Paciente  → carlos@soma.app / paciente123')
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
