# 🧠 NexoMente — MVP Local

Plataforma de bienestar mental bidireccional: conecta psicólogos con sus pacientes entre sesiones.

**Stack:** React + Vite + TailwindCSS | Node.js + Express + Prisma + SQLite

---

## 🚀 Cómo levantar el proyecto (3 comandos)

```bash
# 1. Instalar todas las dependencias + crear la base de datos SQLite + seed
npm run setup

# 2. Instalar concurrently en la raíz
npm install

# 3. Levantar servidor y cliente al mismo tiempo
npm run dev
```

Abre http://localhost:5173 en el navegador.

### Alternativa: dos terminales (si falla npm install en la raíz)

**Terminal 1 — Backend:**
```bash
cd server && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client && npm run dev
```

---

## 🔐 Credenciales de prueba (cargadas automáticamente)

| Rol | Email | Contraseña |
|---|---|---|
| 🩺 Psicólogo | laura@nexomente.com | psicologo123 |
| 👤 Paciente | carlos@nexomente.com | paciente123 |

---

## 📁 Estructura del proyecto

```
nexomente/
├── package.json          ← raíz (dev + setup)
├── server/               ← Backend Express + Prisma + SQLite
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── dev.db        ← (se crea automáticamente)
│   ├── src/
│   │   ├── index.js
│   │   ├── lib/          ← prisma, tags
│   │   ├── middleware/   ← JWT auth
│   │   └── routes/       ← auth, journal, notes, patients
│   └── .env
└── client/               ← Frontend React + Vite + TailwindCSS
    └── src/
        ├── pages/
        │   ├── auth/     ← Login, Register
        │   ├── patient/  ← Dashboard, NewEntry, History, Profile, Emergency
        │   └── psychologist/ ← Dashboard, PatientsList, PatientDetail
        ├── context/      ← AuthContext
        └── lib/          ← api.js, constants.js
```

---

## 🛠️ Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run setup` | Instala todo + crea BD + seed (solo la primera vez) |
| `npm run dev` | Levanta server (3001) + client (5173) simultáneamente |
| `npm run db:studio` | Abre Prisma Studio (GUI de la base de datos) |

---

## ⚡ Funcionalidades implementadas

### 👤 Interfaz del Paciente
- Login / Registro
- Dashboard con saludo personalizado y resumen semanal
- Crear entrada de diario (emoji de ánimo + texto + tags)
- Historial con entradas colapsables (editar/eliminar solo 24h)
- Vinculación con psicólogo mediante código
- Modo oscuro
- Página de emergencia con líneas de crisis

### 🩺 Interfaz del Psicólogo
- Dashboard con lista de pacientes y alertas de ánimo bajo
- Código de invitación visible (con botón copiar)
- Lista de pacientes con buscador
- Vista de paciente: gráfico Recharts (7/14/30 días)
- Filtros por tag y ánimo
- Notas clínicas privadas (invisible para el paciente)

---

## 📱 App Android (APK de SOMA)

El cliente también puede compilarse como una aplicación Android nativa mediante
Capacitor. Conserva el nombre **SOMA**, el icono de `client/public/logo.png` y
todas las pantallas web, con recordatorios locales que funcionan aun cuando la
app está cerrada.

### Antes de compilar

1. En Supabase, ejecutar una vez
   [`client/supabase_mobile_migration.sql`](client/supabase_mobile_migration.sql).
   La migración agrega `entry_date`, deja una sola anotación por paciente/día y
   hace cumplir en base de datos que solo se puede crear, editar o borrar una
   nota de hoy o de ayer.
2. Instalar Android Studio con Android SDK Platform 34 y JDK 17. Configurar
   `JAVA_HOME` para que apunte al JDK y `ANDROID_HOME` al SDK de Android.

### Generar e instalar un APK de prueba

```bash
cd client
npm install
npm run android:apk
```

El APK de prueba queda en
`client/android/app/build/outputs/apk/debug/app-debug.apk`. También podés abrir
el proyecto nativo con `npm run android:open` y ejecutar en un emulador o un
teléfono desde Android Studio.

### Recordatorios

- A las **23:00**, SOMA invita de manera amable a anotar el día si todavía no
  existe una nota.
- A las **12:00** del día siguiente, si falta la nota de ayer, recuerda que aún
  se puede completar o editarla.
- En **Perfil → Recordatorios diarios** se pueden desactivar en cualquier
  momento. Android pide autorización al abrir el dashboard por primera vez.

Los avisos se planifican en la hora local del teléfono y se reprograman al
guardar o modificar una anotación, de modo que el aviso puntual se cancela.

---

## ❌ No necesitas instalar

- PostgreSQL ✅ (usa SQLite en archivo local)
- Docker ✅
- Redis ✅
- Ningún servicio cloud ✅
