# MICE — Guardar IDs en `th_solicitud_mice`



## 1. Supabase (una vez)



Ejecuta en **SQL Editor**:



1. `database/migrations/013_mice_fk_catalogos.sql`

2. `database/migrations/015_cliente_id_mice.sql`



Luego: **Settings → API → Reload schema**.



## 2. Qué columnas son la fuente de verdad



| Campo en BD | Catálogo / tabla | Ejemplo |

|-------------|------------------|---------|

| `estado_codigo` | `td_estados.codigo` | `abierto`, `en_cotizacion` |

| `probabilidad_codigo` | `td_probabilidades.codigo` | `alta`, `media` |

| `sector_id` | `td_sectores.id` | `12` |

| `moneda_cotizacion` | `td_monedas.codigo` | `COP` |

| `responsable_id` | `auth.users` / `td_profiles` | UUID |

| `cliente_id` | `raw.xmart_clientes_zeppelin.id` | `12345` |

| `tiqueteador_user_id` | `td_profiles` | UUID |

| `th_solicitud_mice_servicios` | `td_servicios.id` | `SRV-01` |

| `th_solicitud_mice_destinos` | `td_pais_destino` + `td_ciudades_destino` | IDs numéricos |

| `th_solicitud_mice_lugares` | `td_lugares.id` | `1`, `2` |



## 3. App (ya configurada)



Al **guardar** una solicitud MICE, el frontend envía:



- `estado_codigo`

- `probabilidad_codigo`

- `sector_id`

- `cliente_id`

- `tiqueteador_user_id`

- `moneda_cotizacion`

- Tablas hijas: servicios, destinos, lugares



Los desplegables del formulario usan el **código o id** como valor interno.



## 4. Verificar en Supabase



```sql

select

  mzp,

  cliente_id,

  estado_codigo,

  sector_id,

  probabilidad_codigo,

  moneda_cotizacion,

  tiqueteador_user_id

from th_solicitud_mice

order by created_at desc

limit 5;

```



Tras editar y guardar en la app, `cliente_id`, `estado_codigo`, `sector_id` y `probabilidad_codigo` deben tener valor.



## 5. Cliente



Migración `015_cliente_id_mice.sql`: solo `cliente_id` (FK → `raw.xmart_clientes_zeppelin`). El nombre se resuelve al leer desde el esquema `raw`, no se guarda en cabecera.

