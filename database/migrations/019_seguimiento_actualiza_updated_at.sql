-- =============================================================================
-- Zeppelin — Registrar un seguimiento cuenta como gestión de la solicitud
-- Ejecutar en Supabase → SQL Editor
--
-- Contexto: la alerta "+Nd sin actividad" del listado MICE se calcula con
-- th_solicitud_mice.updated_at. Ese campo solo cambiaba al editar la cabecera;
-- al escribir en la bitácora (th_solicitud_mice_seguimientos) no se tocaba,
-- porque el trigger legacy solicitud_mice_seguimientos_sync_text (que de rebote
-- lo actualizaba) se eliminó al limpiar la columna de texto de la cabecera.
--
-- Este trigger vuelve a marcar la solicitud como gestionada al agregar un
-- seguimiento.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.touch_solicitud_mice_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.th_solicitud_mice
  SET updated_at = now()
  WHERE id = NEW.solicitud_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS th_solicitud_mice_seguimientos_touch ON public.th_solicitud_mice_seguimientos;
CREATE TRIGGER th_solicitud_mice_seguimientos_touch
  AFTER INSERT ON public.th_solicitud_mice_seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.touch_solicitud_mice_updated_at();

COMMENT ON FUNCTION public.touch_solicitud_mice_updated_at() IS
  'Actualiza th_solicitud_mice.updated_at cuando se registra un seguimiento (última gestión).';

-- Alinea registros existentes: si el último seguimiento es más reciente que
-- updated_at, esa es la fecha real de última gestión.
UPDATE public.th_solicitud_mice s
SET updated_at = u.ultima_gestion
FROM (
  SELECT
    h.solicitud_id,
    max(h.created_at) AS ultima_gestion
  FROM public.th_solicitud_mice_seguimientos h
  GROUP BY h.solicitud_id
) u
WHERE s.id = u.solicitud_id
  AND u.ultima_gestion > s.updated_at;

-- Fin 019
