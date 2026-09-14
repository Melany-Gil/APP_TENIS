import { useState } from 'react'
import { confirm } from '../../utils/confirm'

// Uses existing authorized endpoints; failures remain visible and are never reported as success.
export default function BulkDelete({
  records,
  remove,
  onComplete,
  warning,
  label = (r) => r.nombre || `#${r.id}`,
  disabled = false,
}) {
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const visible = records.filter((r) => selected.includes(r.id))
  const run = async () => {
    const snapshot = [...visible]
    if (!snapshot.length || busy) return
    if (
      !(await confirm({
        title: `Eliminar ${snapshot.length} registros`,
        message: `${warning}\n\nSeleccionados: ${snapshot.map(label).join(', ')}`,
        danger: true,
        confirmLabel: 'Eliminar seleccionados',
        requireText: 'ELIMINAR',
      }))
    )
      return
    setBusy(true)
    setResult(null)
    const failed = []
    let deleted = 0
    try {
      for (const record of snapshot) {
        try {
          await remove(record.id)
          deleted++
        } catch (error) {
          failed.push({
            id: record.id,
            name: label(record),
            message: error.message || 'No se pudo eliminar. Actualiza antes de reintentar.',
          })
        }
      }
      setSelected(failed.map((r) => r.id))
      setResult({ deleted, failed })
      onComplete?.()
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className='card p-3 space-y-3'>
      <summary className='cursor-pointer font-semibold text-sm'>
        Selección múltiple · {visible.length} seleccionados
      </summary>
      <p className='text-xs text-[var(--text-muted)]'>
        Selecciona registros de la lista actual. Revisa la confirmación antes de eliminar.
      </p>
      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          className='btn-ghost text-xs'
          disabled={busy || disabled}
          onClick={() => setSelected(records.map((r) => r.id))}
        >
          Seleccionar visibles ({records.length})
        </button>
        <button
          type='button'
          className='btn-ghost text-xs'
          disabled={busy}
          onClick={() => setSelected([])}
        >
          Limpiar selección
        </button>
      </div>
      <div className='max-h-60 overflow-y-auto space-y-1'>
        {records.map((r) => (
          <label
            key={r.id}
            className='flex gap-3 items-center min-h-11 text-sm rounded-xl px-2 hover:bg-[var(--bg-secondary)]'
          >
            <input
              type='checkbox'
              className='w-5 h-5 shrink-0 accent-green-700'
              disabled={busy || disabled}
              checked={selected.includes(r.id)}
              onChange={(e) =>
                setSelected((old) =>
                  e.target.checked ? [...old, r.id] : old.filter((id) => id !== r.id)
                )
              }
            />
            <span className='break-words min-w-0'>{label(r)}</span>
          </label>
        ))}
      </div>
      <button
        type='button'
        className='btn-secondary text-red-600 w-full sm:w-auto'
        disabled={busy || disabled || !visible.length}
        onClick={run}
      >
        {busy ? 'Eliminando…' : `Eliminar seleccionados (${visible.length})`}
      </button>
      {result && (
        <div role='status' className='text-sm space-y-2'>
          <p>
            {result.deleted} eliminados · {result.failed.length} no eliminados.
          </p>
          {result.failed.map((r) => (
            <p key={r.id} className='text-red-600'>
              {r.name}: {r.message}
            </p>
          ))}
        </div>
      )}
    </details>
  )
}
