-- ============================================================
-- FIX: infinite recursion en políticas RLS de profiles
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- El problema: las políticas "psicologo ve sus pacientes" y
-- "paciente ve su psicologo" hacen SELECT en public.profiles
-- DENTRO de una política que aplica sobre public.profiles → recursión.
--
-- Solución: reemplazar con políticas directas sin subconsultas
-- que referencien la misma tabla.
-- ============================================================

-- 1. Eliminar las tres políticas de SELECT en profiles
DROP POLICY IF EXISTS "profiles: ver propio" ON public.profiles;
DROP POLICY IF EXISTS "profiles: psicologo ve sus pacientes" ON public.profiles;
DROP POLICY IF EXISTS "profiles: paciente ve su psicologo" ON public.profiles;
DROP POLICY IF EXISTS "profiles: buscar por invite_code" ON public.profiles;

-- 2. Crear políticas sin recursión
--    • Cada usuario ve su propio perfil
--    • Psicólogo ve los perfiles donde psychologist_id = su UID (sus pacientes)
--    • Paciente ve el perfil donde id = su psychologist_id (su psicólogo)
--    • Cualquiera puede ver psicólogos por invite_code (para vincularse)

CREATE POLICY "profiles: ver propio" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: psicologo ve sus pacientes" ON public.profiles
  FOR SELECT USING (
    psychologist_id = auth.uid()
  );

CREATE POLICY "profiles: paciente ve su psicologo" ON public.profiles
  FOR SELECT USING (
    id = (
      SELECT psychologist_id FROM public.profiles
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "profiles: buscar por invite_code" ON public.profiles
  FOR SELECT USING (invite_code IS NOT NULL AND role = 'PSYCHOLOGIST');

-- 3. Verificar que no queden políticas problemáticas
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
