# SOMA — Contexto del proyecto para asistentes de IA

Este documento es la guía de contexto que una IA debe leer antes de analizar,
proponer o implementar cambios en SOMA. Describe la arquitectura observada en
el código, las reglas del producto, las restricciones de datos y las
precauciones necesarias para no confundir herramientas de desarrollo con el
sistema en producción.

## 1. Producto y alcance

SOMA es una plataforma de bienestar emocional para pacientes y profesionales
de salud mental. La persona paciente lleva un registro de su ánimo, sus notas y
sus hábitos; cuando existe una vinculación aceptada, el profesional puede
revisar esa información y utilizarla para dar seguimiento al proceso
terapéutico.

La aplicación está en producción. La ejecución local, cuando se utiliza, es
una forma de previsualizar y validar cambios antes de una nueva versión; no
define la arquitectura ni el origen de los datos de producción.

### Roles

- **PATIENT:** registra su experiencia, administra hábitos, consulta su
  historial y puede solicitar una vinculación con profesionales.
- **PSYCHOLOGIST:** administra solicitudes de vinculación, consulta los datos
  de pacientes aceptados, y gestiona información de seguimiento profesional.

El registro público del cliente está orientado a pacientes. No asumir que la
creación autónoma de cuentas de psicólogo está habilitada: la lógica actual de
registro en `client/src/context/AuthContext.jsx` no ofrece ese flujo.

### Funcionalidad actualmente visible

**Paciente**

- Inicio de sesión, registro de paciente y recuperación de acceso.
- Dashboard diario con registro de ánimo, texto libre y seguimiento de hábitos.
- Historial con calendario, gráfico de ánimo y análisis de correlación entre
  hábitos y ánimo.
- Perfil editable, avatar, preferencias de tema y gestión de hábitos.
- Búsqueda, solicitud, consulta de estado y desvinculación de profesionales.
- Ejercicio de respiración guiado.
- Recordatorios del diario en la aplicación Android, configurables desde el
  perfil.

**Psicólogo**

- Lista de pacientes con vinculación aceptada y acceso a su ficha.
- Bandeja de solicitudes de pacientes: aceptar o rechazar una solicitud.
- Ficha de paciente con historial, gráficos, resumen de tendencias, hábitos,
  objetivos terapéuticos y notas privadas de sesión.
- Panel de ficha personalizable: se pueden mover, redimensionar, ocultar y
  restaurar paneles; las preferencias de distribución se guardan localmente en
  el navegador.
- Configuración de cuenta, avatar y tema.

La insignia de solicitudes pendientes en la navegación profesional representa
solicitudes de vinculación; no es una alerta clínica.

### Funcionalidad expresamente fuera del producto

- No existe una página o flujo de emergencia/crisis en la navegación actual.
- No se muestran alertas clínicas de ánimo bajo ni alertas por inactividad de
  pacientes.
- No presentar el producto como MVP.
- No reintroducir funciones, texto, enlaces o rutas de estas categorías salvo
  solicitud explícita.

## 2. Arquitectura real y fuentes de verdad

### Cliente de producción

El cliente activo está en `client/`. Es una SPA React/Vite que se conecta
directamente a Supabase para autenticación y operaciones de datos:

1. `client/src/lib/supabase.js` crea el cliente de Supabase con las variables
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. `client/src/context/AuthContext.jsx` gestiona sesión, perfil, registro,
   inicio/cierre de sesión y actualización de cuenta.
3. `client/src/lib/api.js` expone un adaptador de estilo API (`get`, `post`,
   `put`, `patch`, `delete`), pero ejecuta las operaciones directamente con
   Supabase; no es un cliente HTTP que invoque la API Express.
4. El adaptador normaliza campos PostgreSQL `snake_case` a `camelCase` para
   mantener una interfaz uniforme con las pantallas.
5. Supabase Row Level Security (RLS) es la autoridad de acceso a los datos.
   Las comprobaciones de la interfaz mejoran el flujo de uso, pero nunca
   sustituyen las políticas de base de datos.

Al agregar o modificar una operación de datos, revisar las pantallas que la
consumen, el adaptador, el esquema real de Supabase y las políticas RLS
relacionadas. Mantener el contrato `{ data: ... }` y el formato de error
`err.response.data.error` que esperan las pantallas, salvo que se haga una
migración coherente en todos los consumidores.

### API Express y Prisma complementarios

`server/` contiene código Express con JWT y Prisma, cuyo esquema usa SQLite.
El cliente de producción inspeccionado no lo consume: las llamadas de
`client/src/lib/api.js` operan sobre Supabase. No tratar el modelo Prisma como
la definición vigente de la base de producción ni trasladar una funcionalidad
a ese backend suponiendo que la SPA empezará a utilizarlo automáticamente.

Los scripts raíz `npm run dev`, `npm run setup`, `npm run db:setup` y
`npm run db:studio` pertenecen al flujo local/complementario, no son comandos
de despliegue de producción. En particular, `server/prisma/seed.js` borra
registros existentes de sus tablas antes de insertar datos de demostración.
Nunca ejecutar `npm run setup`, `npm run db:setup`, `npm run db:seed` ni el seed
contra una base de producción o contra una base que contenga información que
deba conservarse.

El proxy `/api` de `client/vite.config.js` apunta al servidor local Express;
no demuestra que el cliente web en producción utilice esa API.

### Despliegue web y Android

- `client/vercel.json` configura Vite como aplicación SPA y reescribe las rutas
  a `index.html`.
- `client/src/main.jsx` registra el service worker cuando el navegador lo
  soporta.
- La configuración Capacitor está en `client/capacitor.config.json`; la app
  Android usa el identificador `com.soma.app`.
- Los recordatorios dependen de `@capacitor/local-notifications` y solo se
  programan en plataforma nativa. En la web no se deben describir como
  notificaciones web.
- El proyecto Android y los recursos de marca se encuentran en
  `client/android/`, `client/resources/` y `client/public/`.

## 3. Rutas y navegación del cliente

El router está definido en `client/src/App.jsx` y usa `HashRouter`.

### Rutas públicas

- `/login`
- `/register`
- `/forgot-password`

### Rutas de paciente

Todas las rutas `/patient` están protegidas para el rol `PATIENT`.

- `/patient`: dashboard y formulario diario principal.
- `/patient/new`: ruta de compatibilidad que redirige al dashboard; el
  formulario no está en una página separada.
- `/patient/history`: calendario, entradas, gráfico y análisis de hábitos.
- `/patient/profile`: perfil, hábitos, profesionales vinculados y recordatorios
  Android.
- `/patient/profile/edit`: edición de perfil.
- `/patient/breathing`: ejercicio guiado de respiración.

La experiencia móvil de paciente tiene navegación de pestañas y gesto
horizontal entre inicio, historial y perfil; en pantallas mayores utiliza
navegación lateral.

### Rutas de psicólogo

Todas las rutas `/psych` están protegidas para el rol `PSYCHOLOGIST`.

- `/psych`: redirige a `/psych/patients`.
- `/psych/patients`: pacientes aceptados.
- `/psych/patients/:id`: ficha analítica del paciente.
- `/psych/requests`: solicitudes de vinculación.
- `/psych/settings`: configuración profesional.

No añadir una ruta basándose solamente en que exista un componente con ese
nombre. Verificar que el componente esté importado y alcanzable desde la
navegación.

## 4. Datos del producto y reglas que deben preservarse

La definición y evolución del esquema de producción están en los scripts SQL
de Supabase bajo `client/`. Los nombres de tabla y columnas que consume el
cliente son la referencia principal; el esquema de Prisma/SQLite es distinto.

### Tablas principales de Supabase

- **`profiles`**: perfil asociado a `auth.users`; contiene nombre, rol,
  `invite_code`, avatar y campos de relación heredados.
- **`patient_psychologists`**: relación muchos-a-muchos entre paciente y
  profesional, con estados `PENDING` y `ACCEPTED`. Es la relación actual para
  múltiples profesionales por paciente.
- **`journal_entries`**: entrada diaria del paciente: `mood_score`,
  `content`, `entry_date`, `completed_habits`, `habit_data` y marcas de tiempo.
- **`habits`**: hábitos configurables por paciente, con icono, orden, unidad y
  modalidad de seguimiento.
- **`session_notes`**: notas privadas escritas por psicólogo para un paciente,
  con título, contenido y fecha de sesión.
- **`therapy_goals`**: objetivos asociados a paciente y profesional.
- **`appointments`**: citas asociadas a un profesional y, opcionalmente, a un
  paciente. Hay código de componente/API, pero comprobar su integración real
  antes de considerarlo una función visible: `AppointmentCalendar.jsx` no
  tiene un consumidor importador en la interfaz revisada.

### Diario y fechas

- La escala real de ánimo es entera de **1 a 10**, no de 1 a 5.
- Se permite como máximo una entrada por paciente y fecha (`entry_date`).
- `entry_date` representa el día al que corresponde la experiencia; `created_at`
  registra el momento técnico de creación. No intercambiar estos conceptos.
- Las fechas de registro usan el día local y la lógica/migraciones actuales
  hacen referencia a `America/Argentina/Buenos_Aires`.
- La interfaz y el adaptador permiten crear entradas para hoy y hasta siete
  días atrás, inclusive. La edición y eliminación también se describen en la
  interfaz como una ventana de siete días. Las políticas RLS desplegadas deben
  coincidir con esta regla; verificar el estado real de producción antes de
  modificarla.
- La fecha de una entrada creada es inmutable en la base de datos según la
  migración móvil. Si se cambia la lógica de fechas, contemplar zona horaria,
  fecha de experiencia, restricción de una entrada diaria, UI y RLS en conjunto.
- El registro incluye texto libre y datos de hábitos; la implementación activa
  no utiliza etiquetas de diario como el modelo antiguo.
- El campo `flagged_for_session` se conserva en el esquema legado y el
  adaptador; el cliente actual guarda `false` y no ofrece un flujo visible para
  marcar entradas. No recuperarlo como funcionalidad sin una decisión explícita
  y revisar todos los permisos y consumidores.

### Hábitos

Los hábitos pertenecen a un paciente y admiten tres tipos de seguimiento:

- `toggle`: realizado/no realizado.
- `toggle+qty`: realizado y una cantidad.
- `qty`: solo una cantidad.

`habit_data` es un objeto por ID de hábito; puede contener `done`, `qty` y una
aclaración. `completed_habits` mantiene los IDs de hábitos realizados para
consultas y compatibilidad. Si se modifica el formato, actualizar lectura,
escritura, historial, cálculos, gráficos, correlación y limpieza al borrar un
hábito.

### Vinculaciones y privacidad

- El paciente envía una solicitud con un código de invitación; la relación
  comienza en `PENDING`.
- El psicólogo acepta o rechaza. Solo una relación `ACCEPTED` debe habilitar
  acceso a la información clínica del paciente.
- Un paciente puede tener múltiples profesionales en la tabla de relación.
- Al desvincular, las consultas futuras no deben seguir permitiendo el acceso
  mediante campos heredados de `profiles`.
- Las notas de sesión son privadas para el profesional que las escribe y no
  deben exponerse al paciente.
- La vista previa de código usa la función SQL
  `preview_psychologist_by_invite_code`; limita los datos expuestos a la
  identidad del profesional necesaria para confirmar el vínculo.
- Nunca confiar solo en ocultar controles en React. Crear/modificar políticas
  RLS junto con cada cambio de autorización y conservar el principio de mínimo
  privilegio.

## 5. Evolución SQL y migraciones

Los archivos `client/supabase_*.sql` documentan cambios incrementales e
incluyen políticas antiguas, correcciones y migraciones. Entre ellos:

- `supabase_migration.sql`: esquema inicial, tablas, trigger de creación de
  perfiles y políticas.
- `supabase_multiple_psychologists.sql`: relación de paciente con múltiples
  profesionales y políticas asociadas.
- `supabase_unlink_access_migration.sql`: acceso basado en vínculo aceptado y
  retiro de accesos heredados al desvincular.
- `supabase_link_preview_migration.sql`: función de vista previa de identidad
  por código.
- `supabase_mobile_migration.sql`: fecha de entrada, unicidad diaria,
  inmutabilidad de fecha y políticas iniciales de la aplicación móvil.
- `supabase_week_window_migration.sql`: amplía las políticas del diario a la
  ventana de siete días actualmente esperada por la interfaz.
- `supabase_psychologist_habits_read_migration.sql`: lectura profesional de
  hábitos de pacientes aceptados.
- `supabase_requests_migration.sql`, `supabase_rls_fix.sql` y
  `supabase_fix.sql`: cambios y correcciones anteriores de solicitudes,
  autenticación y RLS.

No asumir que todos estos archivos son una secuencia lineal, que todos se
ejecutaron en producción ni que un archivo antiguo refleja la política vigente.
Antes de recomendar o ejecutar SQL:

1. Leer el archivo completo y sus dependencias.
2. Confirmar cuáles políticas y migraciones están aplicadas en el proyecto
   Supabase de destino.
3. Revisar tablas, funciones, triggers, datos existentes y orden de ejecución.
4. Evaluar si la operación es reversible y si puede bloquear o borrar datos.
5. No aplicar cambios contra producción sin autorización explícita.

## 6. Organización del código

```text
client/
├── src/
│   ├── App.jsx                 # Router, tutorial inicial y tema inicial
│   ├── context/AuthContext.jsx # Sesión, perfil, registro y autenticación
│   ├── components/             # Formularios, gráficos, calendario, diálogos
│   ├── pages/auth/              # Login, registro y recuperación
│   ├── pages/patient/           # Flujo de paciente
│   ├── pages/psychologist/      # Flujo de profesional
│   ├── lib/api.js               # Adaptador de acceso a datos Supabase
│   ├── lib/constants.js         # Escala de ánimo, iconos y fechas
│   ├── lib/patientCache.js      # Caché en memoria de datos de paciente
│   ├── lib/reminders.js         # Recordatorios nativos Android
│   ├── lib/supabase.js          # Cliente Supabase y persistencia de sesión
│   └── lib/theme.js             # Aplicación de tema claro/oscuro
├── public/                      # Marca, manifest, robots, sitemap y SW
├── android/                     # Proyecto nativo Capacitor
├── supabase_*.sql               # Esquema, políticas y migraciones
├── vercel.json                  # Configuración de SPA para Vercel
└── package.json                 # Scripts web y Android
server/
├── src/                         # API Express complementaria
└── prisma/                      # Esquema SQLite y seed local
```

`client/src/lib/api.js` es grande y contiene tanto operaciones Supabase como
normalizadores y cálculos analíticos. Antes de crear otro adaptador o cálculo,
buscar primero si existe una operación/utilidad equivalente.

La ficha del psicólogo usa `react-grid-layout`; sus claves de distribución y
visibilidad se almacenan en `localStorage`. Si se renombra o se elimina un
panel, considerar cómo migrar valores guardados para que el tablero no pierda
su distribución ni quede con referencias inválidas.

## 7. Interfaz y convenciones

- Idioma de interfaz: español, con voseo rioplatense en textos y mensajes.
- Paciente: enfoque mobile-first, tono cálido y no estigmatizante.
- Psicólogo: interfaz analítica y orientada a lectura/seguimiento.
- Tailwind CSS es el estilo principal, complementado por
  `client/src/index.css`, `light-theme.css` y `dark-theme.css`.
- Se usan estados/atributos de tema compartidos; revisar ambos temas y ambos
  roles al cambiar colores, fondos, bordes o contrastes.
- Iconos: Lucide React. Gráficos: Recharts.
- Las funciones de página deben mantener estados de carga, estados vacíos,
  errores y confirmación para acciones destructivas.
- Las operaciones Supabase deben propagar errores de forma que la UI pueda
  mostrarlos; no convertir fallos de escritura en respuestas exitosas.
- Mantener accesibilidad existente: etiquetas, controles de teclado, foco,
  nombres accesibles y semántica ARIA.
- Evitar copiar credenciales, tokens o datos clínicos reales en código,
  documentación, logs o fixtures.

## 8. Herramientas y validación para cambios

El uso local es solo para desarrollar y validar versiones. El build web
principal es:

```bash
npm run build --prefix client
```

Para inspeccionar una versión durante desarrollo puede usarse Vite en `client/`
con la configuración Supabase de desarrollo correspondiente. No publicar
valores privados ni reutilizar una base con datos reales para pruebas.

Para Android, los scripts del cliente son `android:sync`, `android:open` y
`android:apk`; requieren el entorno nativo de Android. Los recordatorios deben
probarse en un dispositivo/emulador nativo, pues no son funcionalidad de
notificaciones de escritorio.

Precauciones:

- Revisar `git status` antes y después de validar. `client/dist/` está generado
  por Vite y puede estar versionado; el build reemplaza los nombres hash de los
  assets. No incluir cambios generados accidentalmente: comprobar el proceso de
  release y el diff antes de conservarlos.
- Los scripts `test-signup.js` y `test-supabase.js` son utilidades manuales;
  leer su contenido y confirmar el entorno antes de ejecutarlos.
- No ejecutar semillas, `db:push` ni operaciones SQL de producción como parte
  de una validación ordinaria.
- Si no hay pruebas automatizadas para el flujo modificado, validar al menos
  el build y las rutas/roles/estados afectados; indicar claramente qué no se
  pudo comprobar.

## 9. Guía de trabajo para una IA

Antes de editar:

1. Leer este documento y los archivos relevantes al cambio.
2. Comprobar el estado de Git y no sobrescribir trabajo existente.
3. Buscar la ruta/componente, sus consumidores, las operaciones de datos y la
   política RLS correspondiente.
4. Distinguir el cliente Supabase de producción del backend Express/SQLite
   complementario.
5. Confirmar si la función realmente se muestra y se puede alcanzar desde una
   ruta activa; no inferir que algo es visible por encontrar un archivo.
6. Identificar efectos en paciente y profesional, web y Android, modo claro y
   oscuro, caché, fechas y permisos.

Al implementar:

- Hacer cambios quirúrgicos, completos y coherentes en todas las capas
  afectadas; reutilizar patrones del repositorio.
- No borrar datos, cambiar políticas de producción, ejecutar seeds ni aplicar
  migraciones remotas sin autorización explícita.
- Preservar datos y compatibilidad al modificar nombres, columnas, rutas,
  preferencias locales, formatos o contratos del adaptador.
- No añadir funciones no solicitadas ni resucitar funcionalidades marcadas
  como fuera de alcance.
- Ejecutar la validación más pequeña que cubra el cambio y comunicar resultados
  y límites de validación.

## 10. Mantenimiento obligatorio de este documento

**Cada vez que una IA realice un cambio en la aplicación, debe actualizar
`project.md` en el mismo trabajo para que refleje la nueva realidad del
producto y del código.** Actualizar solo las secciones relevantes: alcance,
flujos, rutas, reglas de datos, arquitectura, seguridad, despliegue,
limitaciones o validación. Si el cambio no altera información documentada,
confirmar que el documento sigue vigente; no dejar instrucciones obsoletas ni
describir como disponible una función que ya no existe.
