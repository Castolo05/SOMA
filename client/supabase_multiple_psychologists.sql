-- ============================================================
-- Migración para soportar múltiples psicólogos por paciente
-- ============================================================

-- 1. Crear tabla de relación paciente <-> psicólogo
CREATE TABLE IF NOT EXISTS public.patient_psychologists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, psychologist_id)
);

-- 2. Migrar datos existentes
INSERT INTO public.patient_psychologists (patient_id, psychologist_id, status, created_at, updated_at)
SELECT id as patient_id, psychologist_id, psychologist_status, NOW(), NOW()
FROM public.profiles
WHERE psychologist_id IS NOT NULL AND psychologist_status IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Políticas RLS para la nueva tabla
ALTER TABLE public.patient_psychologists ENABLE ROW LEVEL SECURITY;

-- Un paciente puede ver sus propias vinculaciones
DROP POLICY IF EXISTS "Patients can view their own links" ON public.patient_psychologists;
CREATE POLICY "Patients can view their own links"
  ON public.patient_psychologists FOR SELECT
  USING (auth.uid() = patient_id);

-- Un psicólogo puede ver las vinculaciones hacia él
DROP POLICY IF EXISTS "Psychologists can view links to them" ON public.patient_psychologists;
CREATE POLICY "Psychologists can view links to them"
  ON public.patient_psychologists FOR SELECT
  USING (auth.uid() = psychologist_id);

-- Un paciente puede crear una vinculación (solicitud)
DROP POLICY IF EXISTS "Patients can create links" ON public.patient_psychologists;
CREATE POLICY "Patients can create links"
  ON public.patient_psychologists FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Un psicólogo puede actualizar (aceptar) una vinculación dirigida a él
DROP POLICY IF EXISTS "Psychologists can update their links" ON public.patient_psychologists;
CREATE POLICY "Psychologists can update their links"
  ON public.patient_psychologists FOR UPDATE
  USING (auth.uid() = psychologist_id);

-- Un paciente puede eliminar sus vinculaciones (desvincularse)
DROP POLICY IF EXISTS "Patients can delete their links" ON public.patient_psychologists;
CREATE POLICY "Patients can delete their links"
  ON public.patient_psychologists FOR DELETE
  USING (auth.uid() = patient_id);

-- Un psicólogo puede eliminar vinculaciones hacia él (rechazar/eliminar)
DROP POLICY IF EXISTS "Psychologists can delete links to them" ON public.patient_psychologists;
CREATE POLICY "Psychologists can delete links to them"
  ON public.patient_psychologists FOR DELETE
  USING (auth.uid() = psychologist_id);

-- Permitir al psicólogo ver el nombre y avatar de quien todavía espera
-- aprobación, sin habilitar acceso a sus datos clínicos.
DROP POLICY IF EXISTS "profiles: psychologist views pending patients" ON public.profiles;
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

-- 4. Modificar políticas antiguas en otras tablas si es necesario.
-- Por ejemplo, journal_entries: ahora un psicólogo puede ver las entradas de cualquier paciente
-- que tenga una vinculación 'ACCEPTED' con él.

-- Drop old policies for journal_entries if they exist
DROP POLICY IF EXISTS "Psychologists can view their patients' entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Los psicólogos pueden ver las entradas de sus pacientes" ON public.journal_entries;

CREATE POLICY "Psychologists can view their patients' entries"
  ON public.journal_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_psychologists pp
      WHERE pp.patient_id = journal_entries.patient_id
      AND pp.psychologist_id = auth.uid()
      AND pp.status = 'ACCEPTED'
    )
  );

-- Actualizar therapy_goals y session_notes para que no dependan solo de psychologist_id = user.id
-- therapy_goals y session_notes ya tienen psychologist_id y patient_id, por lo que el dueño es el psicólogo, lo cual está bien.
-- Sin embargo, el paciente necesita ver sus therapy_goals que hizo CUALQUIER psicólogo vinculado.

DROP POLICY IF EXISTS "Patients can view their goals" ON public.therapy_goals;
CREATE POLICY "Patients can view their goals"
  ON public.therapy_goals FOR SELECT
  USING (auth.uid() = patient_id);

-- 5. Eliminar columnas viejas de profiles (opcional, pero mejor hacerlo para evitar confusión)
-- ALTER TABLE public.profiles DROP COLUMN psychologist_id;
-- ALTER TABLE public.profiles DROP COLUMN psychologist_status;
