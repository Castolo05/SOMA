-- Permite a psicólogos consultar hábitos de pacientes con vínculo aceptado.
-- Necesario para mostrar los nombres correctos en las entradas de diario.
DROP POLICY IF EXISTS "habits: psychologist views accepted patients" ON public.habits;
CREATE POLICY "habits: psychologist views accepted patients"
  ON public.habits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_psychologists pp
      WHERE pp.patient_id = habits.user_id
        AND pp.psychologist_id = auth.uid()
        AND pp.status = 'ACCEPTED'
    )
  );
