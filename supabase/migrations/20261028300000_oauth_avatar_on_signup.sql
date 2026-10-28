-- ============================================================
-- SOMA — Usuarios de Google: el perfil toma la foto de la cuenta.
-- Solo agrega avatar_url al trigger handle_new_user; el resto no cambia.
-- ============================================================

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
  v_avatar TEXT;
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'PATIENT');
  v_first_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'firstName'), '');
  v_last_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'lastName'), '');
  v_birth_date := NULLIF(NEW.raw_user_meta_data ->> 'birthDate', '')::DATE;
  v_phone := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), '');
  v_specialization := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'specialization'), '');
  -- Google (y otros proveedores OAuth) envían la foto como avatar_url o picture
  v_avatar := NULLIF(COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'), '');
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
    v_invite := UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
  ELSE
    v_invite := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, name, role, invite_code, first_name, last_name, birth_date, phone, specialization, avatar_url
  )
  VALUES (
    NEW.id, v_name, v_role, v_invite, v_first_name, v_last_name,
    v_birth_date, v_phone, v_specialization, v_avatar
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;
