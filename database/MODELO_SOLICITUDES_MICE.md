# Modelo de datos — Solicitud MICE

Basado en **`control de cotizaciones MICE.xlsx`** (hoja `Hoja1`, 268 registros, 21 columnas).

## Columnas Excel → base de datos

| Excel | Columna DB | Tipo | Notas |
|-------|------------|------|--------|
| AÑO | `anio` | smallint | Ej. 2025 |
| RESPONSABLE | `responsable_nombre` + `responsable_id` | text + uuid | Usuario de la app |
| CLIENTE | `cliente` | text | Catálogo `Cliente` |
| SECTOR | `sector` | text | Catálogo `sectores_mice` (28 valores del Excel) |
| MZP | `mzp` | text | Ej. MZP117 |
| NOMBRE | `nombre` | text | Nombre del evento |
| INICIO | `inicio` | **text** | Fecha o texto libre ("Febrero/Marzo") |
| FIN | `fin` | **text** | Igual que INICIO |
| ESTADO | `estado` | text | Solo 3 valores en el Excel |
| VALOR COTIZADO | `valor_cotizado` | numeric | Enteros grandes en COP |
| UTILIDAD PROYECTADA | `utilidad_proyectada` | numeric | Opcional |
| FECHA DE LA SOLICITUD | `fecha_solicitud` | date | |
| FECHA DE ENTREGA | `fecha_entrega` | date | Opcional |
| SERVICIOS | `servicios` | text | Texto libre con "+" |
| PAX | `pax` | integer | |
| LUGAR | `lugar` | text | Ej. "Internacional" |
| PAIS DESTINO | `pais_destino` | text | |
| CIUDAD DESTINO | `ciudad_destino` | text | |
| TIQUETEADOR ASIGNADO | `tiqueteador_asignado` | text | |
| PROBABILIDAD | `probabilidad` | text | Baja / Media / Alta / N/A |
| SEGUIMIENTO | `seguimiento` | text | Bitácora larga |

## Valores reales del Excel

**Estado** (único uso en 268 filas):

- `Cerrado` (122)
- `No adjudicado - No ganado` (85)
- `Cancelado` (61)

**Probabilidad**:

- `Media` (75), `Alta` (40), `Baja` (27), `N/A` (3)

**Inicio / Fin**: ~93% fechas, ~1,5% texto descriptivo, resto vacío → por eso son `text`, no `date`.

## Importación futura desde Excel

Script o Edge Function que lea filas y mapee columnas A–U; normalizar `ALTA` → `Alta` y trim en responsable/cliente.

## Evolución opcional

- Tabla `solicitudes_mice_seguimiento_historial` si el seguimiento pasa a varias entradas con fecha.
- FK `cliente_id` si unifican catálogo de clientes MICE.
