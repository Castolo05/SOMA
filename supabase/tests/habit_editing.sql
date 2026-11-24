-- ============================================================
-- SOMA — Pruebas: el psicólogo gestiona los hábitos del paciente.
-- Requiere la migración 20261125000000_psychologist_habit_editing.sql.
--
-- Corren en una transacción que termina en ROLLBACK, contra una base LOCAL o
-- una rama de pruebas (nunca producción):
--   psql "$DB_URL" -f supabase/tests/habit_editing.sql
-- ============================================================
\set ON_ERROR_STOP on
BEGIN;

-- ── Datos de prueba ───────────────────────────────────────
-- psi1 (a1) y psi2 (a2): psicólogos vinculados con pac1 (b1). pac2 (b2): sin vínculos.
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'psi1@test.local',
   '{"role":"PSYCHOLOGIST","firstName":"Uno","lastName":"Psi","birthDate":"1980-01-01","phone":"111","specialization":"Psicólogo/a"}'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'psi2@test.local',
   '{"role":"PSYCHOLOGIST","firstName":"Dos","lastName":"Psi","birthDate":"1981-01-01","phone":"222","specialization":"Psicólogo/a"}'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pac1@test.local', '{"name":"Pac Uno"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pac2@test.local', '{"name":"Pac Dos"}');

INSERT INTO public.patient_psychologists (patient_id, psychologist_id, status) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'ACCEPTED'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'ACCEPTED');

-- Un hábito propio del paciente, anterior a cualquier permiso.
INSERT INTO public.habits (id, user_id, text, "order")
VALUES ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000000b1', 'Beber agua', 0);

-- ── 1. El permiso nace en false y solo lo concede el paciente ──
DO $$
DECLARE v_flag boolean; v_rows integer;
BEGIN
  SELECT can_edit_habits INTO v_flag FROM public.patient_psychologists
   WHERE patient_id = '00000000-0000-0000-0000-0000000000b1' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';
  IF v_flag IS NOT FALSE THEN RAISE EXCEPTION 'FAIL: el permiso debería nacer en false'; END IF;

  -- Un paciente que intenta crear el vínculo ya con permiso: se fuerza a false.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.patient_psychologists (patient_id, psychologist_id, status, can_edit_habits)
  VALUES ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'PENDING', true);
  RESET ROLE;
  SELECT can_edit_habits INTO v_flag FROM public.patient_psychologists
   WHERE patient_id = '00000000-0000-0000-0000-0000000000b2' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';
  IF v_flag IS NOT FALSE THEN RAISE EXCEPTION 'FAIL: el vínculo nuevo no debe nacer con permiso'; END IF;

  -- El psicólogo no puede darse el permiso a sí mismo ni al aceptar la solicitud.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.patient_psychologists SET status = 'ACCEPTED', can_edit_habits = true
     WHERE patient_id = '00000000-0000-0000-0000-0000000000b2' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';
    RAISE EXCEPTION 'FAIL: el psicólogo pudo concederse el permiso al aceptar';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- esperado
  END;
  UPDATE public.patient_psychologists SET can_edit_habits = true
   WHERE patient_id = '00000000-0000-0000-0000-0000000000b1' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL: el psicólogo actualizó un vínculo ya aceptado'; END IF;
  SELECT can_edit_habits INTO v_flag FROM public.patient_psychologists
   WHERE patient_id = '00000000-0000-0000-0000-0000000000b1' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';
  IF v_flag IS NOT FALSE THEN RAISE EXCEPTION 'FAIL: el permiso cambió sin el paciente'; END IF;

  -- El paciente sí puede concederlo.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE public.patient_psychologists SET can_edit_habits = true
   WHERE patient_id = '00000000-0000-0000-0000-0000000000b1' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'FAIL: el paciente no pudo conceder el permiso'; END IF;
END $$;

-- ── 2. Sin permiso no se puede escribir; con permiso, sí ──
DO $$
DECLARE v_assigned uuid; v_habit uuid; v_logged integer;
BEGIN
  -- psi2 no tiene permiso: no puede crear.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.habits (user_id, text) VALUES ('00000000-0000-0000-0000-0000000000b1', 'No debería');
    RAISE EXCEPTION 'FAIL: un psicólogo sin permiso creó un hábito';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- esperado
  END;
  RESET ROLE;

  -- psi1 tiene permiso: crea.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.habits (user_id, text, tracking_type, unit, "order", assigned_by)
  VALUES ('00000000-0000-0000-0000-0000000000b1', 'Caminar', 'qty', 'min', 1,
          '00000000-0000-0000-0000-0000000000a2')   -- intenta falsear la autoría
  RETURNING id, assigned_by INTO v_habit, v_assigned;
  RESET ROLE;
  IF v_assigned <> '00000000-0000-0000-0000-0000000000a1' THEN RAISE EXCEPTION 'FAIL: assigned_by debe fijarlo el servidor'; END IF;

  SELECT count(*) INTO v_logged FROM public.habit_change_log
   WHERE habit_id = v_habit AND action = 'created' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';
  IF v_logged <> 1 THEN RAISE EXCEPTION 'FAIL: la creación no quedó en el registro'; END IF;

  PERFORM set_config('test.habit_id', v_habit::text, true);
END $$;

-- ── 3. El paciente no toca el hábito asignado mientras haya permiso ──
DO $$
DECLARE v_habit uuid := current_setting('test.habit_id')::uuid; v_rows integer; v_text text; v_deleted boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE public.habits SET text = 'Cambiado por el paciente' WHERE id = v_habit;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  SELECT delete_my_habit INTO v_deleted FROM public.delete_my_habit(v_habit);
  RESET ROLE;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL: el paciente editó un hábito asignado'; END IF;
  IF v_deleted IS NOT FALSE THEN RAISE EXCEPTION 'FAIL: el paciente borró un hábito asignado'; END IF;
  SELECT text INTO v_text FROM public.habits WHERE id = v_habit;
  IF v_text <> 'Caminar' THEN RAISE EXCEPTION 'FAIL: el hábito asignado cambió'; END IF;
END $$;

-- ── 4. El psicólogo edita y archiva, pero no borra ni mueve de dueño ──
DO $$
DECLARE v_habit uuid := current_setting('test.habit_id')::uuid; v_rows integer; v_arch timestamptz; v_logged integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  -- También puede editar el hábito propio del paciente (queda asignado a él).
  UPDATE public.habits SET text = 'Beber 2 litros de agua'
   WHERE id = '00000000-0000-0000-0000-00000000d001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'FAIL: el psicólogo no pudo editar un hábito del paciente'; END IF;

  UPDATE public.habits SET archived_at = now() WHERE id = v_habit;

  DELETE FROM public.habits WHERE id = v_habit;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'FAIL: el psicólogo borró un hábito'; END IF;

  BEGIN
    UPDATE public.habits SET user_id = '00000000-0000-0000-0000-0000000000b2' WHERE id = v_habit;
    RAISE EXCEPTION 'FAIL: se pudo cambiar el dueño de un hábito';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- esperado
  END;
  RESET ROLE;

  SELECT archived_at INTO v_arch FROM public.habits WHERE id = v_habit;
  IF v_arch IS NULL THEN RAISE EXCEPTION 'FAIL: el hábito no quedó archivado'; END IF;

  SELECT count(*) INTO v_logged FROM public.habit_change_log
   WHERE habit_id = v_habit AND action = 'archived';
  IF v_logged <> 1 THEN RAISE EXCEPTION 'FAIL: el archivado no quedó en el registro'; END IF;
  SELECT count(*) INTO v_logged FROM public.habit_change_log
   WHERE habit_id = '00000000-0000-0000-0000-00000000d001' AND action = 'updated'
     AND details -> 'text' ->> 'to' = 'Beber 2 litros de agua';
  IF v_logged <> 1 THEN RAISE EXCEPTION 'FAIL: la edición no quedó en el registro con el detalle'; END IF;
END $$;

-- ── 5. Visibilidad del registro ──
DO $$
DECLARE v_patient integer; v_other_patient integer; v_psi1 integer; v_psi2 integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_patient FROM public.habit_change_log;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_other_patient FROM public.habit_change_log;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_psi1 FROM public.habit_change_log;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_psi2 FROM public.habit_change_log;
  RESET ROLE;
  IF v_patient < 3 THEN RAISE EXCEPTION 'FAIL: el paciente no ve los cambios de sus hábitos (%)', v_patient; END IF;
  IF v_other_patient <> 0 THEN RAISE EXCEPTION 'FAIL: otro paciente ve registros ajenos'; END IF;
  IF v_psi1 < 3 THEN RAISE EXCEPTION 'FAIL: el psicólogo no ve sus propios cambios'; END IF;
  IF v_psi2 <> 0 THEN RAISE EXCEPTION 'FAIL: otro psicólogo ve cambios que no hizo'; END IF;
END $$;

-- ── 6. Al revocar el permiso, los hábitos vuelven a ser del paciente ──
DO $$
DECLARE v_habit uuid := current_setting('test.habit_id')::uuid; v_rows integer; v_assigned uuid; v_deleted boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE public.patient_psychologists SET can_edit_habits = false
   WHERE patient_id = '00000000-0000-0000-0000-0000000000b1' AND psychologist_id = '00000000-0000-0000-0000-0000000000a1';

  -- Ahora puede editar el hábito que había asignado el psicólogo...
  UPDATE public.habits SET text = 'Caminar 30 min' WHERE id = v_habit;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'FAIL: tras revocar, el paciente no pudo editar'; END IF;
  SELECT assigned_by INTO v_assigned FROM public.habits WHERE id = v_habit;
  IF v_assigned IS NOT NULL THEN RAISE EXCEPTION 'FAIL: al editar el paciente, assigned_by debe limpiarse'; END IF;

  -- ...y borrar, quitándolo de sus entradas.
  INSERT INTO public.journal_entries (patient_id, mood_score, completed_habits)
  VALUES ('00000000-0000-0000-0000-0000000000b1', 6, ARRAY[v_habit::text]);
  SELECT delete_my_habit INTO v_deleted FROM public.delete_my_habit(v_habit);
  IF v_deleted IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: tras revocar, el paciente no pudo borrar'; END IF;
  IF EXISTS (SELECT 1 FROM public.journal_entries WHERE completed_habits @> ARRAY[v_habit::text]) THEN
    RAISE EXCEPTION 'FAIL: el hábito borrado sigue en las entradas del diario';
  END IF;
  RESET ROLE;

  -- Sin permiso, psi1 vuelve a quedar fuera.
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.habits (user_id, text) VALUES ('00000000-0000-0000-0000-0000000000b1', 'Ya no');
    RAISE EXCEPTION 'FAIL: el psicólogo creó un hábito tras la revocación';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;  -- esperado
  END;
  RESET ROLE;
END $$;

SELECT 'OK: todas las comprobaciones de edición de hábitos pasaron' AS resultado;
ROLLBACK;
