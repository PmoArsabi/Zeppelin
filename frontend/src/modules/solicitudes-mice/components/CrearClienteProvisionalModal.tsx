import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Props {
  onCancel: () => void
  onCreate: (nombre: string) => Promise<string | null>
}

export default function CrearClienteProvisionalModal({ onCancel, onCreate }: Props) {
  const [nombre, setNombre] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!nombre.trim()) {
      setError('Ingrese el nombre del cliente.')
      return
    }
    setSaving(true)
    setError(null)
    const err = await onCreate(nombre.trim())
    setSaving(false)
    if (err) setError(err)
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={saving ? undefined : onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-2xl p-6 animate-fade-in">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1.5">
          Cliente provisional
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Úselo solo si el cliente aún no está registrado en Xmart. Antes de cerrar la solicitud
          deberá reemplazarlo por el cliente real.
        </p>
        <Input
          autoFocus
          placeholder="Nombre del cliente"
          value={nombre}
          onChange={e => { setNombre(e.target.value); if (error) setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          disabled={saving}
        />
        {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{error}</p>}
        <div className="flex gap-3 mt-5">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creando...' : 'Crear'}
          </Button>
        </div>
      </div>
    </div>
  )
}
