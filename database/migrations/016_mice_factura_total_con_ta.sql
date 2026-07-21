-- Extiende la consulta de facturas del cierre sin duplicar la lógica de
-- mice_get_facturas_anticipo. Devuelve en una sola llamada la suma del valor
-- registrado en raw.xmart_informe_acumulado_bks para cada factura.

CREATE OR REPLACE FUNCTION public.mice_get_facturas_anticipo_detalle(numeros text[])
RETURNS TABLE (
  factura text,
  existe boolean,
  tiene_linea_elegible boolean,
  anticipo boolean,
  total_con_ta numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH estados AS (
    SELECT *
    FROM public.mice_get_facturas_anticipo($1)
  ),
  totales AS (
    SELECT
      upper(btrim(informe.factura::text)) AS factura,
      coalesce(sum(informe.total_con_ta), 0)::numeric AS total_con_ta
    FROM raw.xmart_informe_acumulado_bks AS informe
    WHERE upper(btrim(informe.factura::text)) = ANY (
      ARRAY(
        SELECT upper(btrim(entrada.numero))
        FROM unnest($1) AS entrada(numero)
      )
    )
    GROUP BY upper(btrim(informe.factura::text))
  )
  SELECT
    estado.factura::text,
    estado.existe,
    estado.tiene_linea_elegible,
    estado.anticipo,
    CASE
      WHEN estado.existe THEN coalesce(total.total_con_ta, 0)
      ELSE NULL
    END AS total_con_ta
  FROM estados AS estado
  LEFT JOIN totales AS total
    ON total.factura = upper(btrim(estado.factura::text));
$$;

REVOKE ALL ON FUNCTION public.mice_get_facturas_anticipo_detalle(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mice_get_facturas_anticipo_detalle(text[])
  TO authenticated, service_role;

COMMENT ON FUNCTION public.mice_get_facturas_anticipo_detalle(text[]) IS
  'Estado de anticipo y suma de total_con_ta por factura para el cierre MICE.';
