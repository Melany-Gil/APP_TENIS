import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { tournamentService } from '../../services/tournamentService'
import { formatDate } from '../../utils/formatDate'
export default function TournamentDirectory() {
  const [items, setItems] = useState([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    tournamentService
      .getAll({ deporte: 'tenis' })
      .then((r) => {
        if (active) {
          setItems(r.data)
          setError('')
        }
      })
      .catch((e) => {
        if (active) setError(e.message || 'No se pudieron cargar los torneos')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [retry])
  if (error)
    return (
      <div role='alert'>
        {error}{' '}
        <button className='underline' onClick={() => setRetry((v) => v + 1)}>
          Reintentar
        </button>
      </div>
    )
  if (loading) return <p role='status'>Cargando torneos…</p>
  return (
    <div className='grid sm:grid-cols-2 gap-4'>
      {!items.length && <p>Aún no hay torneos publicados.</p>}
      {items.map((t) => (
        <Link key={t.id} to={`/torneo/${t.id}`} className='card p-5 block space-y-3'>
          <span className='badge-brand'>
            {t.modalidad === 'dobles' ? 'Dobles' : 'Individual'} · {t.estado.replace('_', ' ')}
          </span>
          <h2 className='font-bold text-lg'>{t.nombre}</h2>
          <p className='text-sm text-[var(--text-secondary)]'>
            {t.categoria?.nombre || 'Todas las categorías'} ·{' '}
            {t.fecha_inicio ? formatDate(t.fecha_inicio) : 'Fecha por definir'}
          </p>
          <p className='text-sm'>
            {t.partidos_count} partidos · {t.inscripciones_count || 0} inscripciones
          </p>
          <span className='text-sm font-semibold text-[var(--color-brand)]'>Ver torneo →</span>
        </Link>
      ))}
    </div>
  )
}
