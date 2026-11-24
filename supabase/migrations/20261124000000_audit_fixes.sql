-- ============================================================
-- SOMA — Correcciones de la auditoría de seguridad (2026-11-24)
--
--  1. Código de invitación: más largo, con vencimiento y renovación
--     automática, revocable, con límite de intentos de búsqueda y sin
--     devolver el email del profesional.
--  2. Perfiles: la contraparte solo ve columnas no sensibles
--     (sin teléfono, fecha de nacimiento ni código de invitación).
--  3. patient_psychologists: solo vincula PACIENTE → PSICÓLOGO.
--  4. Citas: el paciente ya no lee las notas privadas del psicólogo.
--  5. avatar_url: formato y tamaño validados en la base.
--  6. toggle_therapy_goal atómico (sin leer y escribir en dos pasos).
--
-- NO cambia: el alta pública de psicólogos (handle_new_user sigue tomando
-- el rol de user_metadata, decisión explícita del equipo).
-- ============================================================

-- ── 1. Código de invitación ───────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_code_expires_at timestamptz;

-- Los códigos actuales siguen valiendo 7 días desde esta migración.
UPDATE public.profiles
   SET invite_code_expires_at = now() + interval '7 days'
 WHERE invite_code IS NOT NULL
   AND invite_code_expires_at IS NULL;

-- 12 caracteres hexadecimales (48 bits) de gen_random_uuid(), que es CSPRNG.
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
$$;
REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;

-- Devuelve el código vigente del psicólogo que llama; si venció (o no existe)
-- genera uno nuevo por 7 días. Los pacientes ya vinculados no se ven afectados:
-- el vínculo vive en patient_psychologists, no depende del código.
CREATE OR REPLACE FUNCTION public.get_my_invite_code()
RETURNS TABLE (code text, expires_at timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  SELECT p.invite_code, p.invite_code_expires_at
    INTO v_code, v_exp
    FROM public.profiles AS p
   WHERE p.id = v_uid AND p.role = 'PSYCHOLOGIST'
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_code IS NULL OR v_exp IS NULL OR v_exp <= now() THEN
    v_code := public.generate_invite_code();
    v_exp := now() + interval '7 days';
    UPDATE public.profiles
       SET invite_code = v_code, invite_code_expires_at = v_exp
     WHERE id = v_uid;
  END IF;

  RETURN QUERY SELECT v_code, v_exp;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_invite_code() TO authenticated;

-- Renovación manual: revoca de inmediato un código que se filtró.
CREATE OR REPLACE FUNCTION public.regenerate_my_invite_code()
RETURNS TABLE (code text, expires_at timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := public.generate_invite_code();
  v_exp timestamptz := now() + interval '7 days';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET invite_code = v_code, invite_code_expires_at = v_exp
   WHERE id = v_uid AND role = 'PSYCHOLOGIST';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT v_code, v_exp;
END;
$$;
REVOKE ALL ON FUNCTION public.regenerate_my_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_my_invite_code() TO authenticated;

-- Registro de búsquedas por código, para limitar la fuerza bruta.
CREATE TABLE IF NOT EXISTS public.invite_code_lookups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  looked_up_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invite_lookups_user_time
  ON public.invite_code_lookups (user_id, looked_up_at);
ALTER TABLE public.invite_code_lookups ENABLE ROW LEVEL SECURITY;  -- sin políticas: solo las funciones
REVOKE ALL ON TABLE public.invite_code_lookups FROM PUBLIC, anon, authenticated;

-- Cambia el tipo de retorno (se quita el email): hay que recrearla.
DROP FUNCTION IF EXISTS public.preview_psychologist_by_invite_code(text);
CREATE FUNCTION public.preview_psychologist_by_invite_code(p_invite_code text)
RETURNS TABLE (id uuid, name text, avatar_url text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_recent integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.invite_code_lookups
   WHERE user_id = v_uid AND looked_up_at < now() - interval '1 day';

  SELECT count(*) INTO v_recent
    FROM public.invite_code_lookups
   WHERE user_id = v_uid AND looked_up_at > now() - interval '10 minutes';
  IF v_recent >= 15 THEN
    RAISE EXCEPTION 'Demasiados intentos. Probá de nuevo en unos minutos.' USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.invite_code_lookups (user_id) VALUES (v_uid);

  RETURN QUERY
    SELECT p.id, p.name, p.avatar_url
      FROM public.profiles AS p
     WHERE p.role = 'PSYCHOLOGIST'
       AND p.invite_code = upper(btrim(p_invite_code))
       AND p.invite_code_expires_at > now()
     LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.preview_psychologist_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_psychologist_by_invite_code(text) TO authenticated;

-- Renovación en segundo plano si la base tiene pg_cron habilitado. Si no, la
-- renovación ocurre al abrir la app (get_my_invite_code) y los códigos
-- vencidos dejan de funcionar igual (la búsqueda exige invite_code_expires_at).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'soma-rotate-invite-codes',
      '0 3 * * *',
      $job$
        UPDATE public.profiles
           SET invite_code = public.generate_invite_code(),
               invite_code_expires_at = now() + interval '7 days'
         WHERE role = 'PSYCHOLOGIST'
           AND (invite_code_expires_at IS NULL OR invite_code_expires_at <= now())
      $job$
    );
  END IF;
END;
$$;

-- ── 2. Perfiles: columnas visibles para la contraparte ────
-- Los permisos por columna valen para todas las filas, así que el cliente
-- ya no puede leer teléfono, nacimiento ni código de invitación ni siquiera
-- de su propia fila con SELECT: los datos propios salen de get_my_profile().
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, role, avatar_url, first_name, last_name, specialization, created_at, updated_at)
  ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  first_name text,
  last_name text,
  birth_date date,
  phone text,
  specialization text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.name, p.role, p.first_name, p.last_name, p.birth_date,
         p.phone, p.specialization, p.avatar_url
    FROM public.profiles AS p
   WHERE p.id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ── 3. Vínculos: solo paciente → psicólogo ────────────────
CREATE OR REPLACE FUNCTION public.validate_patient_psychologist_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.patient_id AND role = 'PATIENT') THEN
    RAISE EXCEPTION 'Solo una cuenta de paciente puede solicitar un vínculo.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.psychologist_id AND role = 'PSYCHOLOGIST') THEN
    RAISE EXCEPTION 'El vínculo debe ser con una cuenta de profesional.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_patient_psychologist_roles() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS patient_psychologists_validate_roles ON public.patient_psychologists;
CREATE TRIGGER patient_psychologists_validate_roles
  BEFORE INSERT ON public.patient_psychologists
  FOR EACH ROW EXECUTE FUNCTION public.validate_patient_psychologist_roles();

-- ── 4. Citas: el paciente no ve las notas del psicólogo ───
DROP POLICY IF EXISTS "appointments: paciente ve las suyas" ON public.appointments;

CREATE OR REPLACE FUNCTION public.patient_upcoming_appointments()
RETURNS TABLE (
  id uuid,
  psychologist_id uuid,
  title text,
  "date" timestamptz,
  duration integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id, a.psychologist_id, a.title, a."date", a.duration
    FROM public.appointments AS a
   WHERE a.patient_id = (SELECT auth.uid())
     AND a."date" >= now()
   ORDER BY a."date";
$$;
REVOKE ALL ON FUNCTION public.patient_upcoming_appointments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patient_upcoming_appointments() TO authenticated;

-- ── 5. Avatar: formato y tamaño ───────────────────────────
-- Admite: data URL de imagen (lo que genera la app), icono "icon:<Animal>" y
-- la foto de Google (https://*.googleusercontent.com). NOT VALID: no revisa
-- filas existentes pero sí toda escritura nueva. Para validar el histórico:
--   ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_avatar_url_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_url_check CHECK (
  avatar_url IS NULL
  OR (
    char_length(avatar_url) <= 150000
    AND (
      avatar_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
      OR avatar_url ~ '^icon:(Cat|Dog|Rabbit|Bird|Snail|Turtle|Fish|Rat)$'
      OR avatar_url ~ '^https://[a-z0-9-]+\.googleusercontent\.com/[^[:space:]]*$'
    )
  )
) NOT VALID;

-- handle_new_user: la foto de OAuth solo se guarda si cumple el formato
-- (si no, el CHECK haría fallar el registro). Código nuevo de 12 caracteres.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_birth_date DATE;
  v_phone TEXT;
  v_specialization TEXT;
  v_invite TEXT;
  v_invite_exp TIMESTAMPTZ;
  v_avatar TEXT;
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'PATIENT');
  v_first_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'firstName'), '');
  v_last_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'lastName'), '');
  v_birth_date := NULLIF(NEW.raw_user_meta_data ->> 'birthDate', '')::DATE;
  v_phone := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), '');
  v_specialization := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'specialization'), '');
  v_avatar := NULLIF(COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'), '');
  IF v_avatar IS NOT NULL AND v_avatar !~ '^https://[a-z0-9-]+\.googleusercontent\.com/[^[:space:]]*$' THEN
    v_avatar := NULL;
  END IF;
  v_name := COALESCE(
    NULLIF(BTRIM(CONCAT_WS(' ', v_first_name, v_last_name)), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(NEW.email, '@', 1),
    'Usuario'
  );

  IF v_role = 'PSYCHOLOGIST' THEN
    IF v_first_name IS NULL
      OR v_last_name IS NULL
      OR v_birth_date IS NULL
      OR v_phone IS NULL
      OR v_specialization IS NULL THEN
      RAISE EXCEPTION 'Faltan datos obligatorios del perfil profesional.';
    END IF;
    v_invite := public.generate_invite_code();
    v_invite_exp := now() + interval '7 days';
  ELSE
    v_invite := NULL;
    v_invite_exp := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, name, role, invite_code, invite_code_expires_at, first_name, last_name,
    birth_date, phone, specialization, avatar_url
  )
  VALUES (
    NEW.id, v_name, v_role, v_invite, v_invite_exp, v_first_name, v_last_name,
    v_birth_date, v_phone, v_specialization, v_avatar
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ── 6. Objetivos: alternar "completado" de forma atómica ──
-- SECURITY INVOKER: la RLS de therapy_goals sigue aplicando.
CREATE OR REPLACE FUNCTION public.toggle_therapy_goal(p_goal_id uuid)
RETURNS SETOF public.therapy_goals
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.therapy_goals
     SET completed = NOT COALESCE(completed, false)
   WHERE id = p_goal_id
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.toggle_therapy_goal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_therapy_goal(uuid) TO authenticated;
