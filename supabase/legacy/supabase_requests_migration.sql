-- Migration para agregar estado de vinculación (solicitudes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS psychologist_status TEXT;

-- Los pacientes que ya estaban vinculados pasan a estado ACCEPTED automáticamente
UPDATE public.profiles 
SET psychologist_status = 'ACCEPTED' 
WHERE psychologist_id IS NOT NULL AND psychologist_status IS NULL;
