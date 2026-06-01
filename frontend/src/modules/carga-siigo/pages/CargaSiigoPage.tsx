import { useRef, useState } from 'react'
import PageTitle from '@/components/ui/PageTitle'

type UploadState = 'idle' | 'loading' | 'done' | 'error'

export default function CargaSiigoPage() {
  const [state, setState]       = useState<UploadState>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      setErrorMsg('Solo se permiten archivos Excel (.xlsx, .xls) o CSV.')
      setState('error')
      return
    }
    setFileName(file.name)
    setState('loading')
    setErrorMsg(null)
    // Simulación de procesamiento — aquí irá la lógica real de extracción
    setTimeout(() => setState('done'), 800)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const reset = () => {
    setState('idle')
    setFileName(null)
    setErrorMsg(null)
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-5 lg:px-6 py-8 sm:py-10">
      <div className="mb-6">
        <PageTitle>Carga Siigo</PageTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cargue un archivo exportado de Siigo para extraer y procesar sus datos.
          El archivo no se almacena en el sistema.
        </p>
      </div>

      <div className="max-w-2xl">
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => state === 'idle' && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16
            transition-colors cursor-pointer
            ${state === 'idle'
              ? 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5'
              : state === 'error'
                ? 'border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-500/5 cursor-default'
                : state === 'done'
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-500/5 cursor-default'
                  : 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-500/5 cursor-default'
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleInputChange}
            className="hidden"
          />

          {state === 'idle' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Arrastre un archivo aquí o{' '}
                  <span className="text-indigo-600 dark:text-indigo-400">haga clic para seleccionar</span>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Formatos aceptados: .xlsx, .xls, .csv
                </p>
              </div>
            </>
          )}

          {state === 'loading' && (
            <>
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Procesando <span className="text-indigo-600 dark:text-indigo-400">{fileName}</span>…
              </p>
            </>
          )}

          {state === 'done' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Archivo procesado correctamente
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{fileName}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Cargar otro archivo
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Error al procesar</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Intentar de nuevo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
