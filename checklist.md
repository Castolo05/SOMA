# Checklist real de cumplimiento actual — SOMA

Este checklist refleja lo que sí está implementado en el código y la configuración actuales del proyecto, verificables en el repo.

## SEO y metadatos
- [x] La app tiene idioma definido en español con `lang="es"` en `client/index.html`.
- [x] Tiene `title` custom: `SOMA — Tu espacio seguro`.
- [x] Tiene meta description definida.
- [x] Tiene `canonical` configurado a la URL pública `https://soma-app.vercel.app/`.
- [x] Tiene Open Graph y Twitter Cards definidos.
- [x] Tiene favicon custom (`/logo-light.png`).
- [x] Tiene schema JSON-LD de tipo `WebApplication`.
- [x] Tiene `robots.txt` y `sitemap.xml` en `client/public`.
- [x] Ahora existen archivos `llm.txt` y `humans.txt` públicos y accesibles.
- [x] Hay páginas legales de Privacy Policy y Términos disponibles desde el sitio.

## Indexación y rastreo
- [x] `robots.txt` existe y apunta al sitemap público.
- [x] `sitemap.xml` existe.
- [x] El `meta name="robots"` tiene `index, follow`.
- [ ] No hay `noindex` ni bloqueos de crawler aplicados por la app.

## Stack y arquitectura
- [x] El cliente usa React 18 + Vite + Tailwind CSS + React Router (documentado en `README.md`).
- [x] La app usa Supabase para autenticación y datos.
- [x] La aplicación backend/frontend está dividida en `client` y `server`.
- [x] Hay `manifest.webmanifest` y metadata PWA móvil en `client/index.html`.
- [x] Las páginas de autenticación, paciente, psicólogo, legal y 404 se cargan bajo demanda mediante lazy loading y code splitting.
- [x] Los avatares se cargan de forma diferida (`loading="lazy"`) y usan decodificación asíncrona.

## Autenticación y acceso
- [x] Hay flujo de login, registro y recuperación de contraseña.
- [x] Hay `ProtectedRoute` para redirigir usuarios no autenticados.
- [x] La app valida el rol del usuario (`PATIENT` / profesional) para proteger rutas.
- [x] La sesión se maneja con Supabase Auth y perfiles en tabla `profiles`.
- [x] Hay logout implementado en la UI.
- [ ] No hay evidencia de 2FA, rate limiting ni límites de intentos en la auth actual.

## Funcionalidades del paciente
- [x] Registro e inicio de sesión de paciente.
- [x] Diario personal con estado de ánimo, notas y hábitos.
- [x] Historial y visualización de evolución emocional.
- [x] Perfil del usuario con edición y preferencias.
- [x] Tema visual/dark mode.
- [x] Recordatorios para Android/Capacitor.
- [x] Ruta de respiración / breathing.
- [x] Página 404 custom.
- [x] Tutorial de bienvenida en primera visita.

## Funcionalidades del psicólogo
- [x] Gestión de pacientes vinculados.
- [x] Revisión de historial, ánimo y hábitos registrados por cada paciente.
- [x] Notas privadas de sesión.
- [x] Calendario de citas y agenda.
- [x] Solicitudes de pacientes vinculados.
- [x] Configuración del perfil del psicólogo.

## UX y estado visual
- [x] Hay diseño adaptativo con estilos y layout para mobile/desktop.
- [x] Hay loading state al cargar la sesión protegida.
- [x] Hay modales de confirmación para acciones críticas.
- [x] Hay feedback visual con alertas nativas y mensajes de error del backend.
- [x] Hay una página de agradecimiento/custom success state para registro y recuperación de contraseña.

## Contenido y confianza
- [x] El README del proyecto describe claramente el objetivo, usuarios y arquitectura.
- [x] El sitio presenta una identidad visual propia y branding de SOMA.
- [x] Hay una página de contacto visible desde el frontend.
- [x] Hay banner de cookies y política de cookies visible con consentimiento del usuario.
- [x] Hay soporte de analytics opcional configurado con `VITE_GA_ID` y activado sólo si el usuario acepta cookies.

## Seguridad y cumplimiento técnico
- [x] El proyecto mantiene políticas de acceso en Supabase y no expone el backend como una API abierta genérica en el frontend.
- [x] Hay `ProtectedRoute` y control de acceso por rol en el cliente.
- [x] El código usa Supabase en lugar de credenciales hardcodeadas en el frontend.
- [x] Vercel entrega CSP y headers HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy y Permissions-Policy.
- [ ] No hay evidencia de rate limiting ni 2FA.
- [x] La carga de avatares limita los tipos a JPG/PNG/WebP y el tamaño a 2 MB, con errores accesibles en paciente y profesional.
- [ ] No hay evidencia de sanitización adicional para contenido dinámico fuera del escape por defecto de React.
- [x] Hay páginas legales de privacidad, términos y cookies vinculadas desde la interfaz.

## Aplicación móvil
- [x] Hay versión Android basada en Capacitor.
- [x] Se menciona soporte de notificaciones locales en el dispositivo.
- [x] La app puede ejecutarse como app móvil y web.

## Resumen final
Lo que sí cumple hoy la app SOMA en este repo es: SEO básico funcional, metadatos y sitemap, autenticación con Supabase, rutas protegidas, registro y seguimiento clínico del paciente, herramientas para psicólogos, calendario, perfil y temas, plus PWA/móvil. Lo que aún no está cubierto es principalmente el lado legal, la seguridad avanzada y la parte de analytics/marketing.
