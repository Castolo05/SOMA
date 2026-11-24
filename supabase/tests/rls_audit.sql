-- ============================================================
-- SOMA — Pruebas de seguridad de la base (RLS, permisos y funciones).
--
-- Cómo correrlas, contra una base LOCAL o de pruebas (nunca producción):
--   supabase start && supabase db reset
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" -f supabase/tests/rls_audit.sql
--
-- Todo corre en una transacción que termina en ROLLBACK. Si una comprobación
-- falla, el script se corta con "FAIL: ...".
-- ============================================================
\set ON_ERROR_STOP on
BEGIN;

-- ── Datos de prueba ───────────────────────────────────────
-- psi = psicólogo vinculado; pac1 = su paciente; pac2 = paciente sin vínculo.
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'psi@test.local',
   '{"role":"PSYCHOLOGIST","firstName":"Pia","lastName":"Psi","birthDate":"1980-01-01","phone":"111","specialization":"Psicólogo/a"}'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pac1@test.local', '{"name":"Pac Uno"}'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pac2@test.local', '{"name":"Pac Dos"}');

INSERT INTO public.patient_psychologists (patient_id, psychologist_id, status)
VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'ACCEPTED');

INSERT INTO public.appointments (psychologist_id, patient_id, title, date, notes)
VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
        'Sesión', now() + interval '2 days', 'NOTA PRIVADA DEL PSICÓLOGO');

INSERT INTO public.therapy_goals (id, psychologist_id, patient_id, text, completed)
VALUES ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1',
        '00000000-0000-0000-0000-0000000000b1', 'Meta', false);

-- ── 1. Código de invitación: formato, vencimiento y renovación ──
DO $$
DECLARE v_code text; v_new text; v_exp timestamptz; v_found integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT code, expires_at INTO v_code, v_exp FROM public.get_my_invite_code();
  IF v_code !~ '^[0-9A-F]{12}$' THEN RAISE EXCEPTION 'FAIL: el código no tiene 12 caracteres hex: %', v_code; END IF;
  IF v_exp <= now() + interval '6 days' THEN RAISE EXCEPTION 'FAIL: el código debería durar ~7 días'; END IF;

  -- Mientras no vence, devuelve el mismo.
  SELECT code INTO v_new FROM public.get_my_invite_code();
  IF v_new <> v_code THEN RAISE EXCEPTION 'FAIL: el código cambió antes de vencer'; END IF;

  -- Un paciente encuentra al psicólogo con el código vigente.
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_found FROM public.preview_psychologist_by_invite_code(v_code);
  IF v_found <> 1 THEN RAISE EXCEPTION 'FAIL: el código vigente no encontró al psicólogo'; END IF;

  -- Vencido: ya no sirve, y el psicólogo recibe uno nuevo.
  RESET ROLE;
  UPDATE public.profiles SET invite_code_expires_at = now() - interval '1 minute'
   WHERE id = '00000000-0000-0000-0000-0000000000a1';
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_found FROM public.preview_psychologist_by_invite_code(v_code);
  IF v_found <> 0 THEN RAISE EXCEPTION 'FAIL: un código vencido sigue funcionando'; END IF;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT code INTO v_new FROM public.get_my_invite_code();
  IF v_new = v_code THEN RAISE EXCEPTION 'FAIL: no se renovó el código vencido'; END IF;

  -- Renovación manual: el anterior queda revocado.
  v_code := v_new;
  SELECT code INTO v_new FROM public.regenerate_my_invite_code();
  IF v_new = v_code THEN RAISE EXCEPTION 'FAIL: regenerate devolvió el mismo código'; END IF;
  RESET ROLE;
END $$;

-- ── 2. Límite de intentos de búsqueda por código ──
DO $$
DECLARE i integer; v_blocked boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  FOR i IN 1..20 LOOP
    BEGIN
      PERFORM * FROM public.preview_psychologist_by_invite_code('000000000000');
    EXCEPTION WHEN SQLSTATE '54000' THEN
      v_blocked := true;
      EXIT;
    END;
  END LOOP;
  RESET ROLE;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: no hay límite de intentos de búsqueda'; END IF;
END $$;

-- ── 3. Perfiles: la contraparte no lee teléfono, nacimiento ni código ──
DO $$
DECLARE v_blocked boolean := false; v_name text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT name INTO v_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a1';
  IF v_name IS NULL THEN RAISE EXCEPTION 'FAIL: el paciente no ve a su psicólogo vinculado'; END IF;

  BEGIN
    PERFORM phone FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a1';
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: el paciente pudo leer profiles.phone'; END IF;

  v_blocked := false;
  BEGIN
    PERFORM invite_code FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a1';
  EXCEPTION WHEN insufficient_privilege THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: el paciente pudo leer profiles.invite_code'; END IF;

  -- Los datos propios salen de get_my_profile().
  IF (SELECT count(*) FROM public.get_my_profile()) <> 1 THEN RAISE EXCEPTION 'FAIL: get_my_profile() no devolvió la fila propia'; END IF;
  RESET ROLE;
END $$;

-- ── 4. Vínculos: solo paciente → psicólogo ──
DO $$
DECLARE v_blocked boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.patient_psychologists (patient_id, psychologist_id, status)
    VALUES ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', 'PENDING');
  EXCEPTION WHEN check_violation THEN v_blocked := true;
  END;
  RESET ROLE;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: un paciente pudo vincularse con otro paciente'; END IF;
END $$;

-- ── 5. Citas: el paciente no ve las notas privadas ──
DO $$
DECLARE v_direct integer; v_rpc integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_direct FROM public.appointments;
  SELECT count(*) INTO v_rpc FROM public.patient_upcoming_appointments();
  RESET ROLE;
  IF v_direct <> 0 THEN RAISE EXCEPTION 'FAIL: el paciente lee la tabla appointments (con notes)'; END IF;
  IF v_rpc <> 1 THEN RAISE EXCEPTION 'FAIL: el paciente no ve su cita próxima por la función'; END IF;
END $$;

-- ── 6. Avatar: solo formatos permitidos ──
DO $$
DECLARE v_blocked boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.profiles SET avatar_url = 'https://evil.example/track.png' WHERE id = '00000000-0000-0000-0000-0000000000b1';
  EXCEPTION WHEN check_violation THEN v_blocked := true;
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'FAIL: se aceptó un avatar con URL externa'; END IF;

  UPDATE public.profiles SET avatar_url = 'icon:Cat' WHERE id = '00000000-0000-0000-0000-0000000000b1';
  UPDATE public.profiles SET avatar_url = 'data:image/jpeg;base64,/9j/4AAQ' WHERE id = '00000000-0000-0000-0000-0000000000b1';
  RESET ROLE;
END $$;

-- ── 7. Objetivos: alternar completado ──
DO $$
DECLARE v_done boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT completed INTO v_done FROM public.toggle_therapy_goal('00000000-0000-0000-0000-00000000c001');
  IF v_done IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: toggle_therapy_goal no marcó la meta'; END IF;
  SELECT completed INTO v_done FROM public.toggle_therapy_goal('00000000-0000-0000-0000-00000000c001');
  IF v_done IS NOT FALSE THEN RAISE EXCEPTION 'FAIL: toggle_therapy_goal no desmarcó la meta'; END IF;
  RESET ROLE;
END $$;

SELECT 'OK: todas las comprobaciones de seguridad pasaron' AS resultado;
ROLLBACK;
