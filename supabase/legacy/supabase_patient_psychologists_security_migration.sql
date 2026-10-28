-- Endurecer la aceptación de solicitudes de vinculación.
-- Ejecutar en Supabase SQL Editor después de supabase_multiple_psychologists.sql.

DROP POLICY IF EXISTS "Psychologists can update their links" ON public.patient_psychologists;
CREATE POLICY "Psychologists can update their links"
  ON public.patient_psychologists FOR UPDATE
  USING (
    auth.uid() = psychologist_id
    AND status = 'PENDING'
  )
  WITH CHECK (
    auth.uid() = psychologist_id
    AND status = 'ACCEPTED'
  );

REVOKE UPDATE ON TABLE public.patient_psychologists FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status, updated_at) ON TABLE public.patient_psychologists TO authenticated;
