import * as XLSX from 'xlsx'
import type { AnticipoRow } from '../services/anticiposService'

export function exportarAnticiposExcel(rows: AnticipoRow[]) {
  const data = rows.map(r => ({
    Factura: r.factura,
    Fecha: r.fecha ?? '',
    'Oficina de venta': r.nomofiventa ?? '',
    Cliente: r.nomcliente ?? '',
    Producto: r.producto ?? '',
    'Pasajeros / Evento': r.nompasajeros ?? '',
    Observación: r.observacion_fact ?? '',
    'Descripción ítem': r.descripcion_item ?? '',
    'Total con impuestos': r.total_con_impuestos ?? 0,
  }))

  const sheet = XLSX.utils.json_to_sheet(data)
  sheet['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 22 },
    { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 18 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Anticipos')

  const fecha = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `anticipos_${fecha}.xlsx`)
}
