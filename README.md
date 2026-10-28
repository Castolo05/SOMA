# SOMA

SOMA es una plataforma de bienestar emocional en producción que permite a las personas llevar un registro de su ánimo y compartir su evolución con profesionales de salud mental. La experiencia ofrece herramientas de seguimiento entre sesiones y un espacio de análisis para psicólogos.

## Experiencia del paciente

- Registro e inicio de sesión.
- Diario personal con estado de ánimo, notas y hábitos.
- Historial y visualización de la evolución emocional.
- Vinculación con profesionales mediante código de invitación.
- Perfil, preferencias y tema visual.
- Recordatorios en el dispositivo Android.

## Experiencia del psicólogo

- Gestión de solicitudes y pacientes vinculados.
- Revisión del historial, ánimo y hábitos registrados por cada paciente.
- Gráficos y filtros para explorar la evolución en distintos períodos.
- Notas privadas de sesión y objetivos terapéuticos.
- Calendario para organizar citas.

## Plataforma

- **Cliente web:** React 18, Vite, Tailwind CSS y React Router.
- **Datos y autenticación:** Supabase.
- **Visualizaciones:** Recharts.
- **Aplicación Android:** Capacitor y notificaciones en el dispositivo.

La aplicación web utiliza Supabase para autenticación y acceso a los datos. El código fuente del cliente está en [`client/`](./client/).

### Recuperación de contraseña

El cliente envía el correo con Supabase Auth y actualiza la contraseña desde el enlace temporal de recuperación. En el proyecto de Supabase, agregá en **Authentication → URL Configuration → Redirect URLs** la URL de producción de la aplicación terminada en `/#/reset-password` (y, para desarrollo local, `http://localhost:5173/#/reset-password`). La aplicación desplegada también debe tener configuradas las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para ese mismo proyecto.

## Datos y privacidad

Los datos del diario son personales. La lectura por parte de un profesional depende de que exista una vinculación autorizada entre las cuentas. Las notas de sesión del psicólogo son privadas y no se muestran al paciente.

El esquema y las políticas de acceso de Supabase viven en [`supabase/migrations/`](./supabase/migrations/): `20261028000000_baseline.sql` reproduce la base de producción y cada cambio nuevo se agrega como otra migración con fecha. Los scripts anteriores quedan en [`supabase/legacy/`](./supabase/legacy/) solo como historial. Las políticas de la base de datos deben conservar las restricciones de acceso por usuario y por vínculo.

## Android

El cliente incluye una versión Android basada en Capacitor. Además de las funciones disponibles en la aplicación web, puede programar recordatorios en el dispositivo para completar el diario.
