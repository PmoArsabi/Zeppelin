import { useRef, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import PageTitle from '@/components/ui/PageTitle'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import CustomSelect from '@/components/ui/CustomSelect'
import { parsearExcelSiigo } from '../lib/parsearExcelSiigo'
import { cargarSiigo, existenDatosMes, fetchLogCargas } from '../services/cargaSiigoService'
import type { TipoDocumentoSiigo, ResultadoParseo } from '../types/siigo'
import { TIPO_LABELS, MESES } from '../types/siigo'
import { formatDateDDMMYYYY } from '@/lib/formatDate'

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i)

type Paso = 'config' | 'preview' | 'confirmando' | 'done'

type LogEntry = {
  id: string
  tipo_documento: TipoDocumentoSiigo
  mes: number
  anio: number
  filas_insertadas: number
  sobreescribio: boolean
  created_at: string
}

function fmtMoneda(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}

export default function CargaSiigoPage() {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [paso, setPaso]                 = useState<Paso>('config')
  const [tipo, setTipo]                 = useState<TipoDocumentoSiigo | ''>('')
  const [mes, setMes]                   = useState<number>(new Date().getMonth() + 1)
  const [anio, setAnio]                 = useState<number>(ANIO_ACTUAL)
  const [fileName, setFileName]         = useState<string | null>(null)
  const [parseo, setParseo]             = useState<ResultadoParseo | null>(null)
  const [hayPrevios, setHayPrevios]     = useState(false)
  const [parsing, setParsing]           = useState(false)
  const [guardando, setGuardando]       = useState(false)
  const [resultMsg, setResultMsg]       = useState<string | null>(null)
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)
  const [log, setLog]                   = useState<LogEntry[]>([])
  const [loadingLog, setLoadingLog]     = useState(false)
  const [tabActiva, setTabActiva]       = useState<'carga' | 'historial'>('carga')

  const cargarLog = useCallback(async () => {
    setLoadingLog(true)
    const { data } = await fetchLogCargas()
    setLog(data as LogEntry[])
    setLoadingLog(false)
  }, [])

  const resetear = () => {
    setPaso('config')
    setFileName(null)
    setParseo(null)
    setHayPrevios(false)
    setErrorMsg(null)
    setResultMsg(null)
    setFiltroVista('todos')
    setPagina(1)
  }

  const handleFile = async (file: File) => {
    if (!tipo) { setErrorMsg('Seleccione el tipo de documento antes de cargar el archivo.'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx') { setErrorMsg('Solo se permiten archivos Excel (.xlsx).'); return }

    setFileName(file.name)
    setErrorMsg(null)
    setParsing(true)

    const buffer = await file.arrayBuffer()
    const resultado = parsearExcelSiigo(buffer, tipo as TipoDocumentoSiigo)
    setParseo(resultado)

    const previos = await existenDatosMes(tipo as TipoDocumentoSiigo, mes, anio)
    setHayPrevios(previos)

    setParsing(false)
    setPaso('preview')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleConfirmar = async () => {
    if (!parseo || !tipo || !user) return
    if (parseo.errores.length > 0) { setErrorMsg('Corrija los errores antes de confirmar.'); return }

    setGuardando(true)
    setPaso('confirmando')
    const { insertadas, sobreescribio, error } = await cargarSiigo(
      tipo as TipoDocumentoSiigo, mes, anio, parseo.filas, user.id
    )
    setGuardando(false)

    if (error) {
      setErrorMsg(`Error al guardar: ${error}`)
      setPaso('preview')
      return
    }

    setResultMsg(
      `${insertadas} registros cargados correctamente para ${MESES.find(m => m.value === mes)?.label} ${anio}.` +
      (sobreescribio ? ' Se sobreescribieron los datos anteriores del mismo período.' : '')
    )
    setPaso('done')
    cargarLog()
  }

  const tipoOptions = Object.entries(TIPO_LABELS).map(([v, l]) => ({ value: v, label: l }))
  const mesOptions = MESES.map(m => ({ value: String(m.value), label: m.label }))
  const anioOptions = ANIOS.map(a => ({ value: String(a), label: String(a) }))

  const hayErrores = (parseo?.errores.length ?? 0) > 0
  const [filasPorPagina, setFilasPorPagina] = useState(20)
  const [pagina, setPagina] = useState(1)
  const [filtroVista, setFiltroVista] = useState<'todos' | 'errores' | 'ignorados'>('todos')

  // Filas a mostrar según filtro activo
  const filasVista = (() => {
    if (!parseo) return []
    if (filtroVista === 'errores') return parseo.filasConError.map(f => ({ ...f.fila!, _nroFila: f.nroFila, _errores: f.errores }))
    if (filtroVista === 'ignorados') return parseo.filasIgnoradas.map(f => ({
      grupo: null, cuenta: null, subcuenta: null, auxiliar: null, subauxil: null,
      nit: null, sucursal: null, dig_verificacion: null,
      descripcion: f.descripcion ?? `(fila ${f.nroFila} — ${f.motivo === 'total' ? 'total' : 'vacía'})`,
      ult_mov: null, saldo_anterior: null, debitos: null, creditos: null, nuevo_saldo: null,
      _nroFila: f.nroFila, _errores: [] as typeof parseo.errores,
    }))
    return parseo.filas.map((f, i) => ({ ...f, _nroFila: i + 8, _errores: [] as typeof parseo.errores }))
  })()

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10 min-w-0">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <PageTitle>Carga Siigo</PageTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cargue archivos exportados de Siigo. Los datos se almacenan por mes y año, sobreescribiendo el período si ya existe.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 mb-6">
        {(['carga', 'historial'] as const).map(tab => (
          <button key={tab} type="button"
            onClick={() => { setTabActiva(tab); if (tab === 'historial') cargarLog() }}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors
              ${tabActiva === tab
                ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            {tab === 'carga' ? 'Nueva carga' : 'Historial'}
          </button>
        ))}
      </div>

      {tabActiva === 'carga' && (
        <div className="space-y-5">
          {/* Paso 1: Configuración */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              1. Configuración
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tipo de documento *</label>
                <CustomSelect
                  value={tipo}
                  onChange={v => { setTipo(v as TipoDocumentoSiigo); resetear() }}
                  options={tipoOptions}
                  placeholder="Seleccionar tipo..."
                  disabled={paso === 'confirmando'}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mes *</label>
                <CustomSelect
                  value={String(mes)}
                  onChange={v => { setMes(Number(v)); resetear() }}
                  options={mesOptions}
                  disabled={paso === 'confirmando'}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Año *</label>
                <CustomSelect
                  value={String(anio)}
                  onChange={v => { setAnio(Number(v)); resetear() }}
                  options={anioOptions}
                  disabled={paso === 'confirmando'}
                />
              </div>
            </div>
          </div>

          {/* Paso 2: Upload */}
          {paso === 'config' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-5 space-y-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                2. Archivo
              </p>
              {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => tipo && inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-14 px-8
                  transition-colors
                  ${tipo
                    ? 'cursor-pointer border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5'
                    : 'cursor-not-allowed border-slate-200 dark:border-slate-800 opacity-50'
                  }`}
              >
                <input ref={inputRef} type="file" accept=".xlsx" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} className="hidden" />
                {parsing ? (
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {tipo ? 'Arrastre el archivo o haga clic para seleccionar' : 'Seleccione primero el tipo de documento'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Solo archivos .xlsx exportados de Siigo</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Paso 3: Preview */}
          {(paso === 'preview' || paso === 'confirmando') && parseo && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  3. Vista previa — {fileName}
                </p>
                <button type="button" onClick={resetear} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline">
                  Cambiar archivo
                </button>
              </div>

              {/* Badges / filtros de vista */}
              <div className="flex flex-wrap gap-2">
                <button type="button"
                  onClick={() => setFiltroVista('todos')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                    ${filtroVista === 'todos'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'}`}>
                  {parseo.filas.length} registros
                </button>
                {parseo.filasIgnoradas.length > 0 && (
                  <button type="button"
                    onClick={() => { setFiltroVista(filtroVista === 'ignorados' ? 'todos' : 'ignorados'); setPagina(1) }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                      ${filtroVista === 'ignorados'
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {parseo.filasIgnoradas.length} ignorados
                  </button>
                )}
                {hayErrores && (
                  <button type="button"
                    onClick={() => { setFiltroVista(filtroVista === 'errores' ? 'todos' : 'errores'); setPagina(1) }}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all
                      ${filtroVista === 'errores'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20'}`}>
                    {parseo.errores.length} errores
                  </button>
                )}
              </div>

              {hayPrevios && !hayErrores && (
                <Alert variant="info">
                  Ya existen datos para <strong>{MESES.find(m => m.value === mes)?.label} {anio}</strong> en {TIPO_LABELS[tipo as TipoDocumentoSiigo]}.
                  Al confirmar se eliminarán y reemplazarán completamente.
                </Alert>
              )}

              {hayErrores && filtroVista !== 'errores' && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Haga clic en <strong>{parseo.errores.length} errores</strong> para ver las filas con problemas.
                </p>
              )}

              {/* Tabla preview */}
              {filasVista.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-[11px] min-w-225">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left">
                        <th className="px-3 py-2 font-semibold text-slate-400 whitespace-nowrap">#</th>
                        {['Grupo','Cuenta','Subcuenta','Aux.','Subaux.','NIT','Descripción','Últ. Mov.','Saldo Ant.','Débitos','Créditos','Nuevo Saldo'].map(h => (
                          <th key={h} className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filasVista.slice((pagina - 1) * filasPorPagina, pagina * filasPorPagina).map((f, i) => {
                        const tieneError = filtroVista === 'errores' && f._errores.length > 0
                        const esIgnorada = filtroVista === 'ignorados'
                        return (
                          <tr key={i} className={`
                            ${tieneError ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}
                            ${esIgnorada ? 'bg-slate-50/60 dark:bg-slate-800/30 opacity-70' : ''}
                            hover:bg-slate-50/80 dark:hover:bg-slate-800/40
                          `}>
                            <td className="px-3 py-1.5 text-slate-400 tabular-nums">{f._nroFila}</td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{f.grupo ?? '—'}</td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{f.cuenta ?? '—'}</td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{f.subcuenta ?? '—'}</td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{f.auxiliar ?? '—'}</td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{f.subauxil ?? '—'}</td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">{f.nit ?? '—'}</td>
                            <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-48 truncate" title={f.descripcion ?? ''}>
                              {f.descripcion ?? '—'}
                              {tieneError && (
                                <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                                  {f._errores.map((e, j) => <span key={j} className="block">{e.columna}: {e.mensaje}</span>)}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{f.ult_mov ? formatDateDDMMYYYY(f.ult_mov) : '—'}</td>
                            <td className={`px-3 py-1.5 text-right tabular-nums whitespace-nowrap ${(f.saldo_anterior ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>{fmtMoneda(f.saldo_anterior)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">{fmtMoneda(f.debitos)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">{fmtMoneda(f.creditos)}</td>
                            <td className={`px-3 py-1.5 text-right tabular-nums whitespace-nowrap font-medium ${(f.nuevo_saldo ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtMoneda(f.nuevo_saldo)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {(() => {
                    const totalPaginas = Math.ceil(filasVista.length / filasPorPagina)
                    const inicio = (pagina - 1) * filasPorPagina + 1
                    const fin = Math.min(pagina * filasPorPagina, filasVista.length)
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t border-slate-100 dark:border-slate-800">
                        {/* Info + navegación */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button"
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                            disabled={pagina === 1}
                            className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400
                              hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            ← Anterior
                          </button>
                          <span className="text-[10px] text-slate-400">
                            {inicio}–{fin} de {filasVista.length}{' '}
                            {filtroVista === 'todos' ? 'registros' : filtroVista === 'errores' ? 'con errores' : 'ignorados'}
                            {totalPaginas > 1 && ` · Pág. ${pagina}/${totalPaginas}`}
                          </span>
                          <button type="button"
                            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                            disabled={pagina === totalPaginas}
                            className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400
                              hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Siguiente →
                          </button>
                        </div>
                        {/* Filas por página */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400">Filas:</span>
                          {[20, 50, 100, 200].map(n => (
                            <button key={n} type="button"
                              onClick={() => { setFilasPorPagina(n); setPagina(1) }}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors
                                ${filasPorPagina === n
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {!hayErrores && (
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={resetear} disabled={guardando}>Cancelar</Button>
                  <Button onClick={handleConfirmar} loading={guardando} disabled={guardando}>
                    {hayPrevios ? 'Sobreescribir y cargar' : 'Confirmar carga'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Paso 4: Resultado */}
          {paso === 'done' && resultMsg && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">{resultMsg}</p>
              </div>
              <Button variant="secondary" onClick={resetear}>Cargar otro archivo</Button>
            </div>
          )}
        </div>
      )}

      {/* Tab Historial */}
      {tabActiva === 'historial' && (
        <div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden">
            {loadingLog ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : log.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-16">Sin cargas registradas.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-left">
                    {['Fecha','Tipo','Período','Registros','Sobreescribió'].map(h => (
                      <th key={h} className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {log.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDateDDMMYYYY(l.created_at)}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{TIPO_LABELS[l.tipo_documento]}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{MESES.find(m => m.value === l.mes)?.label} {l.anio}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{l.filas_insertadas}</td>
                      <td className="px-4 py-2.5">
                        {l.sobreescribio
                          ? <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">Sí</span>
                          : <span className="text-slate-400">No</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
