-- Agrega a la misma consulta de factura los códigos de cliente y todos sus
-- ítems. El detalle viaja en la respuesta inicial para que abrir el ojo no
-- genere una segunda consulta.

DROP FUNCTION IF EXISTS public.mice_get_facturas_anticipo_detalle(text[]);

CREATE FUNCTION public.mice_get_facturas_anticipo_detalle(numeros text[])
RETURNS TABLE (
  factura text,
  existe boolean,
  tiene_linea_elegible boolean,
  anticipo boolean,
  total_con_ta numeric,
  codclientes text[],
  detalle jsonb
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
  resumen AS (
    SELECT
      upper(btrim(informe.factura::text)) AS factura,
      coalesce(sum(informe.total_con_ta), 0)::numeric AS total_con_ta,
      array_remove(
        array_agg(DISTINCT nullif(btrim(informe.codcliente::text), '')),
        NULL
      ) AS codclientes,
      jsonb_agg(
        jsonb_build_object(
          'factura', upper(btrim(informe.factura::text)),
          'fecha', informe.fecha,
          'codcliente', informe.codcliente,
          'nomcliente', informe.nomcliente,
          'producto', informe.producto,
          'total_con_ta', coalesce(informe.total_con_ta, 0)
        )
        ORDER BY informe.fecha, informe.producto
      ) AS detalle
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
      WHEN estado.existe THEN coalesce(resumen.total_con_ta, 0)
      ELSE NULL
    END AS total_con_ta,
    coalesce(resumen.codclientes, ARRAY[]::text[]) AS codclientes,
    coalesce(resumen.detalle, '[]'::jsonb) AS detalle
  FROM estados AS estado
  LEFT JOIN resumen
    ON resumen.factura = upper(btrim(estado.factura::text));
$$;

REVOKE ALL ON FUNCTION public.mice_get_facturas_anticipo_detalle(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mice_get_facturas_anticipo_detalle(text[])
  TO authenticated, service_role;

COMMENT ON FUNCTION public.mice_get_facturas_anticipo_detalle(text[]) IS
  'Estado, total, clientes e items de facturas asociadas al cierre MICE.';
