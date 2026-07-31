import { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import PageTitle from '@/components/ui/PageTitle'
import { ChartPieIcon } from '@/modules/icons'
import { fetchMisInformes, type InformePowerbi } from '../services/informesPowerbiService'

function InformeCard({ informe }: { informe: InformePowerbi }) {
  return (
    <a
      href={informe.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800
                 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md
                 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
    >
      <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        {informe.imagen ? (
          <img src={informe.imagen} alt={informe.nombre} className="w-full h-full object-cover" />
        ) : (
          <span className="text-indigo-300 dark:text-indigo-700">
            <ChartPieIcon />
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {informe.nombre}
        </p>
        {informe.descripcion && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {informe.descripcion}
          </p>
        )}
      </div>
    </a>
  )
}

export default function InformesPowerbiListPage() {
  const [informes, setInformes] = useState<InformePowerbi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMisInformes().then(({ data, error }) => {
      if (cancelled) return
      setInformes(data)
      setError(error)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <PageTitle>Informes PowerBI</PageTitle>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
        Reportes disponibles según tu rol y unidad asignada.
      </p>

      {error && <Alert variant="error" className="mb-5">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : informes.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800">
          <p className="text-slate-500 dark:text-slate-400">No tienes informes asignados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {informes.map(informe => (
            <InformeCard key={informe.id} informe={informe} />
          ))}
        </div>
      )}
    </div>
  )
}
