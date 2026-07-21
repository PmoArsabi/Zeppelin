-- =============================================================================
-- Facturas excluidas: soporte de excluir_venta + tipo_exclusion
--
-- Prerrequisito (ya ejecutado por el equipo):
--   ALTER TABLE raw.xmart_informe_acumulado_bks RENAME COLUMN anticipo TO excluir_venta;
--   -- y columna nueva: tipo_exclusion
--
-- Este script recrea las funciones que referenciaban la columna renombrada y
-- agrega la función de exclusión con tipo (anticipo | negociacion | otro).
-- Ejecutar en Supabase → SQL Editor.
-- =============================================================================

-- Normaliza tipo_exclusion a los valores permitidos
ALTER TABLE raw.xmart_informe_acumulado_bks
  DROP CONSTRAINT IF EXISTS xmart_informe_acumulado_bks_tipo_exclusion_chk;
ALTER TABLE raw.xmart_informe_acumulado_bks
  ADD CONSTRAINT xmart_informe_acumulado_bks_tipo_exclusion_chk
  CHECK (tipo_exclusion IS NULL OR tipo_exclusion IN ('anticipo', 'negociacion', 'otro'));

-- -----------------------------------------------------------------------------
-- Estado de exclusión por factura (base usada por MICE y por el detalle)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mice_get_facturas_anticipo(text[]);
CREATE FUNCTION public.mice_get_facturas_anticipo(numeros text[])
RETURNS TABLE (
  factura text,
  existe boolean,
  tiene_linea_elegible boolean,
  anticipo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    entrada.numero AS factura,
    EXISTS (
      SELECT 1 FROM raw.xmart_informe_acumulado_bks i
      WHERE upper(btrim(i.factura::text)) = entrada.numero
    ) AS existe,
    EXISTS (
      SELECT 1
      FROM raw.xmart_informe_acumulado_bks i
      JOIN raw.xmart_clasificacion_producto c
        ON c.clasificacion = i.producto AND c.aplica_venta = 'SI'
      WHERE upper(btrim(i.factura::text)) = entrada.numero
    ) AS tiene_linea_elegible,
    COALESCE((
      SELECT bool_or(i.excluir_venta)
      FROM raw.xmart_informe_acumulado_bks i
      WHERE upper(btrim(i.factura::text)) = entrada.numero
    ), false) AS anticipo
  FROM (
    SELECT DISTINCT upper(btrim(n)) AS numero
    FROM unnest(numeros) AS n
  ) AS entrada;
$$;

-- Trazabilidad de exclusiones/liberaciones
CREATE TABLE IF NOT EXISTS public.log_exclusion_facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factura text NOT NULL,
  excluir boolean NOT NULL,
  tipo_exclusion text,
  autor text,
  observacion text,
  fecha timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.log_exclusion_facturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS log_exclusion_facturas_select ON public.log_exclusion_facturas;
CREATE POLICY log_exclusion_facturas_select ON public.log_exclusion_facturas
  FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------------------------------
-- Excluir / liberar una factura con tipo y observación
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mice_set_factura_exclusion(
  p_factura text,
  p_excluir boolean,
  p_tipo text DEFAULT NULL,
  p_autor text DEFAULT NULL,
  p_observacion text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_factura text := upper(btrim(p_factura));
  v_afectadas integer;
BEGIN
  IF p_excluir AND (p_tipo IS NULL OR p_tipo NOT IN ('anticipo', 'negociacion', 'otro')) THEN
    RAISE EXCEPTION 'Tipo de exclusión inválido. Use anticipo, negociacion u otro.';
  END IF;
  IF NOT p_excluir AND (p_observacion IS NULL OR btrim(p_observacion) = '') THEN
    RAISE EXCEPTION 'La observación es obligatoria al liberar una factura.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM raw.xmart_informe_acumulado_bks i
    WHERE upper(btrim(i.factura::text)) = v_factura
  ) THEN
    RAISE EXCEPTION 'La factura % no existe en el informe acumulado.', v_factura;
  END IF;

  UPDATE raw.xmart_informe_acumulado_bks i
  SET excluir_venta = p_excluir,
      tipo_exclusion = CASE WHEN p_excluir THEN p_tipo ELSE NULL END
  WHERE upper(btrim(i.factura::text)) = v_factura
    AND EXISTS (
      SELECT 1 FROM raw.xmart_clasificacion_producto c
      WHERE c.clasificacion = i.producto AND c.aplica_venta = 'SI'
    );

  GET DIAGNOSTICS v_afectadas = ROW_COUNT;
  IF v_afectadas = 0 THEN
    RAISE EXCEPTION 'La factura % no tiene líneas con producto clasificado como venta.', v_factura;
  END IF;

  INSERT INTO public.log_exclusion_facturas (factura, excluir, tipo_exclusion, autor, observacion)
  VALUES (v_factura, p_excluir, CASE WHEN p_excluir THEN p_tipo ELSE 'liberacion' END, p_autor, p_observacion);

  -- Log histórico usado por reportería (una fila por basket de la factura)
  INSERT INTO raw.xmart_logs_anticipos (
    id,
    fecha,
    autor,
    basketid,
    factura,
    observacion,
    tipo_exclusion
  )
  SELECT
    gen_random_uuid(),
    now(),
    p_autor,
    b.basketid,
    v_factura,
    COALESCE(
      NULLIF(btrim(p_observacion), ''),
      CASE WHEN p_excluir
        THEN 'Se excluyó como ' || p_tipo
        ELSE 'Se liberó la factura'
      END
    ),
    CASE WHEN p_excluir THEN p_tipo ELSE 'liberacion' END
  FROM (
    SELECT DISTINCT i.basketid
    FROM raw.xmart_informe_acumulado_bks i
    WHERE upper(btrim(i.factura::text)) = v_factura
  ) AS b;
END;
$$;

-- Compatibilidad: la firma anterior sigue funcionando (marca como anticipo)
DROP FUNCTION IF EXISTS public.mice_set_factura_anticipo(text, boolean, text, text);
CREATE FUNCTION public.mice_set_factura_anticipo(
  p_factura text,
  p_anticipo boolean,
  p_autor text DEFAULT NULL,
  p_observacion text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.mice_set_factura_exclusion(p_factura, p_anticipo, 'anticipo', p_autor, p_observacion);
$$;

-- -----------------------------------------------------------------------------
-- Búsqueda para el modal de exclusión
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.anticipos_buscar_factura(text);
CREATE FUNCTION public.anticipos_buscar_factura(p_texto text)
RETURNS TABLE (
  factura text,
  tiene_linea_elegible boolean,
  anticipo boolean,
  tipo_exclusion text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    upper(btrim(i.factura::text)) AS factura,
    bool_or(c.clasificacion IS NOT NULL) AS tiene_linea_elegible,
    bool_or(i.excluir_venta) AS anticipo,
    max(i.tipo_exclusion) AS tipo_exclusion
  FROM raw.xmart_informe_acumulado_bks i
  LEFT JOIN raw.xmart_clasificacion_producto c
    ON c.clasificacion = i.producto AND c.aplica_venta = 'SI'
  WHERE upper(btrim(i.factura::text)) LIKE upper(btrim(p_texto)) || '%'
  GROUP BY upper(btrim(i.factura::text))
  ORDER BY 1
  LIMIT 20;
$$;

-- -----------------------------------------------------------------------------
-- Listado de facturas excluidas
-- El valor se lee de i.total_con_ta y se expone como total_con_impuestos
-- (nombre que espera el frontend).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.anticipos_listado();
CREATE FUNCTION public.anticipos_listado()
RETURNS TABLE (
  fecha text,
  nomofiventa text,
  nomcliente text,
  factura text,
  producto text,
  nompasajeros text,
  observacion_fact text,
  descripcion_item text,
  total_con_impuestos numeric,
  tipo_exclusion text,
  mzp text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    i.fecha::text,
    i.nomofiventa::text,
    i.nomcliente::text,
    upper(btrim(i.factura::text)) AS factura,
    i.producto::text,
    i.nompasajeros::text,
    i.observacion_fact::text,
    i.descripcion_item::text,
    coalesce(i.total_con_ta, 0)::numeric,
    i.tipo_exclusion::text,
    (
      SELECT s.mzp::text
      FROM public.th_solicitud_mice_documentos d
      JOIN public.th_solicitud_mice s ON s.id = d.solicitud_id
      WHERE d.tipo = 'factura'
        AND upper(btrim(d.numero::text)) = upper(btrim(i.factura::text))
      ORDER BY d.created_at DESC NULLS LAST
      LIMIT 1
    ) AS mzp
  FROM raw.xmart_informe_acumulado_bks i
  WHERE i.excluir_venta IS TRUE
  ORDER BY upper(btrim(i.factura::text)), i.fecha;
$$;

REVOKE ALL ON FUNCTION public.mice_get_facturas_anticipo(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mice_set_factura_exclusion(text, boolean, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mice_set_factura_anticipo(text, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anticipos_buscar_factura(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anticipos_listado() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mice_get_facturas_anticipo(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mice_set_factura_exclusion(text, boolean, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mice_set_factura_anticipo(text, boolean, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.anticipos_buscar_factura(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.anticipos_listado() TO authenticated, service_role;

COMMENT ON FUNCTION public.mice_set_factura_exclusion(text, boolean, text, text, text) IS
  'Excluye (o libera) las líneas elegibles de una factura con tipo anticipo|negociacion|otro.';

NOTIFY pgrst, 'reload schema';

-- Fin 018
