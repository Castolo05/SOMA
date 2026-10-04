-- Revocar el acceso al desvincularse de un psicólogo.
-- Ejecutar una vez en Supabase Dashboard → SQL Editor, después de
-- supabase_multiple_psychologists.sql.

-- El campo heredado puede conservar una relación que ya fue eliminada
-- de patient_psychologists. Limpiar únicamente relaciones no aceptadas.
UPDATE public.profiles p
SET psychologist_id = NULL,
    psychologist_status = NULL
WHERE p.psychologist_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.patient_psychologists pp
    WHERE pp.patient_id = p.id
      AND pp.psychologist_id = p.psychologist_id
      AND pp.status = 'ACCEPTED'
  );

-- Los permisos de perfiles y entradas deben derivarse solo de una
-- vinculación aceptada, nunca del campo heredado psychologist_id.
DROP POLICY IF EXISTS "profiles: psicologo ve sus pacientes" ON public.profiles;
DROP POLICY IF EXISTS "profiles: paciente ve su psicologo" ON public.profiles;
DROP POLICY IF EXISTS "profiles: psychologist views accepted patients" ON public.profiles;
DROP POLICY IF EXISTS "profiles: patient views accepted psychologist" ON public.profiles;
DROP POLICY IF EXISTS "profiles: psychologist views pending patients" ON public.profiles;

CREATE POLICY "profiles: psychologist views accepted patients"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_psychologists pp
      WHERE pp.patient_id = profiles.id
        AND pp.psychologist_id = auth.uid()
        AND pp.status = 'ACCEPTED'
    )
  );

CREATE POLICY "profiles: patient views accepted psychologist"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_psychologists pp
      WHERE pp.patient_id = auth.uid()
        AND pp.psychologist_id = profiles.id
        AND pp.status = 'ACCEPTED'
    )
  );

CREATE POLICY "profiles: psychologist views pending patients"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_psychologists pp
      WHERE pp.patient_id = profiles.id
        AND pp.psychologist_id = auth.uid()
        AND pp.status = 'PENDING'
    )
  );

DROP POLICY IF EXISTS "journal: psicologo lee entradas de sus pacientes" ON public.journal_entries;
DROP POLICY IF EXISTS "Psychologists can view their patients' entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Los psicólogos pueden ver las entradas de sus pacientes" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: psychologist views accepted patients entries" ON public.journal_entries;

CREATE POLICY "journal: psychologist views accepted patients entries"
  ON public.journal_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.patient_psychologists pp
      WHERE pp.patient_id = journal_entries.patient_id
        AND pp.psychologist_id = auth.uid()
        AND pp.status = 'ACCEPTED'
    )
  );
