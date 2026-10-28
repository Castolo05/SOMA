-- ============================================================
-- SOMA — Endurecimiento de permisos (perfiles y vinculaciones)
-- Ejecutar en Supabase Dashboard → SQL Editor, después de
-- supabase_link_preview_migration.sql y supabase_unlink_access_migration.sql.
-- ============================================================

-- 1. Perfiles: cada persona solo puede editar sus datos personales.
--    El rol, el código de invitación y los campos de vinculación heredados
--    quedan fuera del alcance del cliente.
REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, avatar_url, phone) ON TABLE public.profiles TO authenticated;

-- El trigger handle_new_user (SECURITY DEFINER) crea el perfil al registrarse;
-- el cliente no necesita insertar perfiles ni elegir su rol.
DROP POLICY IF EXISTS "profiles: insertar propio" ON public.profiles;
REVOKE INSERT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- 2. Perfiles: no exponer a todos los psicólogos. La búsqueda por código
--    se hace con preview_psychologist_by_invite_code().
DROP POLICY IF EXISTS "profiles: buscar por invite_code" ON public.profiles;

-- 3. Vinculaciones: el paciente solo puede crear solicitudes pendientes;
--    la aceptación queda exclusivamente en manos del psicólogo.
DROP POLICY IF EXISTS "Patients can create links" ON public.patient_psychologists;
CREATE POLICY "Patients can create links"
  ON public.patient_psychologists FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = patient_id
    AND status = 'PENDING'
    AND patient_id <> psychologist_id
  );

-- 4. Funciones SECURITY DEFINER que no deben invocarse desde la API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_psychologist_id() FROM PUBLIC, anon;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.prevent_journal_entry_date_change() SET search_path = public;

-- 5. Políticas heredadas duplicadas (idénticas a las vigentes).
DROP POLICY IF EXISTS "Psychologists can view their patients' entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Patients can view their goals" ON public.therapy_goals;
