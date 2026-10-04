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

## Datos y privacidad

Los datos del diario son personales. La lectura por parte de un profesional depende de que exista una vinculación autorizada entre las cuentas. Las notas de sesión del psicólogo son privadas y no se muestran al paciente.

Los cambios de esquema y políticas de acceso de Supabase se mantienen en los archivos SQL de [`client/`](./client/). Las políticas de la base de datos deben conservar las restricciones de acceso por usuario y por vínculo.

Para habilitar el registro de profesionales y guardar sus datos de perfil, ejecutá [`client/supabase_psychologist_registration_migration.sql`](./client/supabase_psychologist_registration_migration.sql) en el editor SQL de Supabase después de las migraciones existentes.

## Android

El cliente incluye una versión Android basada en Capacitor. Además de las funciones disponibles en la aplicación web, puede programar recordatorios en el dispositivo para completar el diario.
