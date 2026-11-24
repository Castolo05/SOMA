-- ============================================================
-- SOMA — El psicólogo puede gestionar los hábitos del paciente
--        (con un permiso que concede el propio paciente).
--
-- Reglas acordadas:
--  * El paciente activa/desactiva el permiso por cada psicólogo vinculado
--    (patient_psychologists.can_edit_habits). Nace en false.
--  * Con permiso, el psicólogo crea, edita y ARCHIVA hábitos (no borra) de
--    cualquiera de los hábitos del paciente.
--  * Un hábito que el psicólogo creó o modificó queda "asignado" a él
--    (habits.assigned_by): mientras el permiso siga activo, el paciente no
--    puede editarlo ni borrarlo.
--  * Si el paciente revoca el permiso o se desvincula, los hábitos se quedan
--    y vuelven a ser del paciente (la marca se calcula, no se guarda).
--  * Cada cambio del psicólogo queda en habit_change_log, visible para el
--    paciente y para el psicólogo que lo hizo.
-- ============================================================

-- ── 1. Permiso en el vínculo ──────────────────────────────
ALTER TABLE public.patient_psychologists
  ADD COLUMN IF NOT EXISTS can_edit_habits boolean NOT NULL DEFAULT false;

-- El paciente puede cambiar solo esta columna sobre vínculos aceptados.
-- (status y updated_at ya estaban concedidos para el flujo del psicólogo.)
GRANT UPDATE (can_edit_habits) ON TABLE public.patient_psychologists TO authenticated;

DROP POLICY IF EXISTS "Patients can grant habit editing" ON public.patient_psychologists;
CREATE POLICY "Patients can grant habit editing"
  ON public.patient_psychologists FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = patient_id AND status = 'ACCEPTED')
  WITH CHECK ((SELECT auth.uid()) = patient_id AND status = 'ACCEPTED');

-- Solo el paciente concede el permiso: ni el psicólogo al aceptar la
-- solicitud, ni el paciente al crearla (el vínculo siempre nace sin permiso).
CREATE OR REPLACE FUNCTION public.guard_habit_edit_permission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.can_edit_habits := false;
    END IF;
  ELSIF NEW.can_edit_habits IS DISTINCT FROM OLD.can_edit_habits
        AND auth.uid() IS NOT NULL
        AND auth.uid() <> NEW.patient_id THEN
    RAISE EXCEPTION 'Solo el paciente puede cambiar este permiso.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_habit_edit_permission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS patient_psychologists_guard_habit_permission ON public.patient_psychologists;
CREATE TRIGGER patient_psychologists_guard_habit_permission
  BEFORE INSERT OR UPDATE ON public.patient_psychologists
  FOR EACH ROW EXECUTE FUNCTION public.guard_habit_edit_permission();

-- ── 2. Hábitos: archivado y autoría ───────────────────────
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_habits_assigned_by ON public.habits (assigned_by) WHERE assigned_by IS NOT NULL;

-- assigned_by no lo elige el cliente: lo fija el servidor según quién escribe.
--  * escribe el paciente  → NULL (el hábito vuelve a ser suyo)
--  * escribe un psicólogo → su id
--  * SQL de administración (sin auth.uid()) → no se toca
-- El dueño del hábito nunca cambia.
CREATE OR REPLACE FUNCTION public.guard_habit_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'El dueño de un hábito no puede cambiar.' USING ERRCODE = '42501';
  END IF;
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;
  IF v_actor = NEW.user_id THEN
    NEW.assigned_by := NULL;
  ELSE
    NEW.assigned_by := v_actor;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_habit_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS habits_guard_write ON public.habits;
CREATE TRIGGER habits_guard_write
  BEFORE INSERT OR UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.guard_habit_write();

-- ── 3. Registro de cambios del psicólogo ──────────────────
CREATE TABLE IF NOT EXISTS public.habit_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  psychologist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  habit_id uuid,                      -- sin FK: el hábito puede borrarse después
  habit_text text NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'archived', 'restored')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_habit_log_patient ON public.habit_change_log (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_log_psych ON public.habit_change_log (psychologist_id);

ALTER TABLE public.habit_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.habit_change_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.habit_change_log TO authenticated;

DROP POLICY IF EXISTS "habit log: paciente ve el suyo" ON public.habit_change_log;
CREATE POLICY "habit log: paciente ve el suyo"
  ON public.habit_change_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = patient_id);

DROP POLICY IF EXISTS "habit log: psicologo ve lo que hizo" ON public.habit_change_log;
CREATE POLICY "habit log: psicologo ve lo que hizo"
  ON public.habit_change_log FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = psychologist_id);

-- Solo se registran los cambios hechos por un psicólogo (no los del paciente
-- ni los de administración). Los cambios de orden no cuentan.
CREATE OR REPLACE FUNCTION public.log_psychologist_habit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_action text;
  v_details jsonb := '{}'::jsonb;
BEGIN
  IF v_actor IS NULL OR v_actor = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_details := jsonb_build_object('text', NEW.text, 'tracking_type', NEW.tracking_type, 'unit', NEW.unit);
  ELSE
    IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
      v_action := 'archived';
    ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
      v_action := 'restored';
    ELSE
      v_action := 'updated';
    END IF;
    IF NEW.text IS DISTINCT FROM OLD.text THEN
      v_details := v_details || jsonb_build_object('text', jsonb_build_object('from', OLD.text, 'to', NEW.text));
    END IF;
    IF NEW.icon IS DISTINCT FROM OLD.icon THEN
      v_details := v_details || jsonb_build_object('icon', jsonb_build_object('from', OLD.icon, 'to', NEW.icon));
    END IF;
    IF NEW.tracking_type IS DISTINCT FROM OLD.tracking_type THEN
      v_details := v_details || jsonb_build_object('tracking_type', jsonb_build_object('from', OLD.tracking_type, 'to', NEW.tracking_type));
    END IF;
    IF NEW.unit IS DISTINCT FROM OLD.unit THEN
      v_details := v_details || jsonb_build_object('unit', jsonb_build_object('from', OLD.unit, 'to', NEW.unit));
    END IF;
    IF NEW.has_note IS DISTINCT FROM OLD.has_note THEN
      v_details := v_details || jsonb_build_object('has_note', jsonb_build_object('from', OLD.has_note, 'to', NEW.has_note));
    END IF;
    IF v_action = 'updated' AND v_details = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.habit_change_log (patient_id, psychologist_id, habit_id, habit_text, action, details)
  VALUES (NEW.user_id, v_actor, NEW.id, NEW.text, v_action, v_details);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_psychologist_habit_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS habits_log_psychologist_change ON public.habits;
CREATE TRIGGER habits_log_psychologist_change
  AFTER INSERT OR UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.log_psychologist_habit_change();

-- ── 4. Políticas de habits ────────────────────────────────
-- Paciente: lo de siempre, salvo que no puede editar ni borrar los hábitos
-- que le asignó un psicólogo con permiso activo.
DROP POLICY IF EXISTS "habits: paciente CRUD" ON public.habits;

CREATE POLICY "habits: paciente ve"
  ON public.habits FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "habits: paciente crea"
  ON public.habits FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "habits: paciente edita los suyos"
  ON public.habits FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.patient_psychologists AS pp
      WHERE pp.patient_id = habits.user_id
        AND pp.psychologist_id = habits.assigned_by
        AND pp.status = 'ACCEPTED'
        AND pp.can_edit_habits
    )
  )
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "habits: paciente borra los suyos"
  ON public.habits FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.patient_psychologists AS pp
      WHERE pp.patient_id = habits.user_id
        AND pp.psychologist_id = habits.assigned_by
        AND pp.status = 'ACCEPTED'
        AND pp.can_edit_habits
    )
  );

-- Psicólogo con permiso activo: crea y edita (archivar es editar archived_at).
-- No hay política de borrado para el psicólogo.
CREATE POLICY "habits: psicologo crea con permiso"
  ON public.habits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_psychologists AS pp
      WHERE pp.patient_id = habits.user_id
        AND pp.psychologist_id = (SELECT auth.uid())
        AND pp.status = 'ACCEPTED'
        AND pp.can_edit_habits
    )
  );

CREATE POLICY "habits: psicologo edita con permiso"
  ON public.habits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_psychologists AS pp
      WHERE pp.patient_id = habits.user_id
        AND pp.psychologist_id = (SELECT auth.uid())
        AND pp.status = 'ACCEPTED'
        AND pp.can_edit_habits
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patient_psychologists AS pp
      WHERE pp.patient_id = habits.user_id
        AND pp.psychologist_id = (SELECT auth.uid())
        AND pp.status = 'ACCEPTED'
        AND pp.can_edit_habits
    )
  );

-- ── 5. Borrado del paciente, atómico ──────────────────────
-- Borra el hábito (la RLS decide si puede) y lo quita de las entradas del
-- diario en la misma transacción. Devuelve false si no se pudo borrar, por
-- ejemplo porque el hábito está asignado por un psicólogo con permiso activo.
-- SECURITY INVOKER: se aplican las políticas del usuario que llama.
CREATE OR REPLACE FUNCTION public.delete_my_habit(p_habit_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.habits WHERE id = p_habit_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.journal_entries
     SET completed_habits = array_remove(completed_habits, p_habit_id::text)
   WHERE patient_id = (SELECT auth.uid())
     AND completed_habits @> ARRAY[p_habit_id::text];
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_habit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_habit(uuid) TO authenticated;
