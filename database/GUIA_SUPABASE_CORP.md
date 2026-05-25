# Guía Supabase — Solicitud Corporativo

## Error: «La tabla de seguimientos no está disponible»

La bitácora de **Seguimiento** usa la tabla `th_solicitud_seguimientos` (tras migración 009; antes `solicitud_seguimientos`). Hay que crearla una vez en Supabase.

### Pasos

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **SQL Editor**.
2. **New query** → pega el contenido completo de:
   - `database/migrations/008_solicitud_corp_seguimiento.sql`
3. Pulsa **Run** (debe terminar sin error en rojo).
4. Ejecutar también `009_nomenclatura_td_th_itd.sql` si usas nombres `td_` / `th_`.
5. Al final deberías ver una fila de verificación: `th_solicitud_seguimientos`.
5. Ve a **Project Settings → API → Reload schema** (o espera ~1 minuto).
6. En la app Zeppelin: **F5** y abre de nuevo **Solicitud Corp** → pestaña **Seguimiento**.

### Si falla el script

| Mensaje | Qué hacer |
|--------|-----------|
| `relation "solicitudes" / "th_solicitud_corporativos" does not exist` | La tabla principal Corp no está creada; créala antes, ejecuta 009 (y 010 si aplica), o revisa el nombre en Table Editor. |
| `permission denied` | Ejecuta el SQL con el rol del proyecto (SQL Editor usa permisos de admin). |
| Sigue el error en la app tras Run OK | **Reload schema** en API y recarga con F5. |

### Migraciones relacionadas (orden sugerido)

| Archivo | Para qué |
|---------|----------|
| `007_log_auditoria_generico.sql` | Pestaña **Historial de cambios** |
| `008_solicitud_corp_seguimiento.sql` | Pestaña **Seguimiento** (chat) |

MICE usa tablas distintas (`solicitud_mice_seguimientos`); no sustituye a la 008.
