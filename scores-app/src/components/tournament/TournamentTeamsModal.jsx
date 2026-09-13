import { useEffect, useMemo, useState } from 'react'
import ActionDialog from '../common/ActionDialog'
import { teamService } from '../../services/teamService'
import { tournamentService } from '../../services/tournamentService'
export default function TournamentTeamsModal({ tournament, enrolledTeamIds, onClose, onSuccess }) {
  const [teams, setTeams] = useState([]),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    teamService
      .getAll({ deporte: tournament.deporte })
      .then((r) => {
        if (active) {
          setTeams(
            r.data.filter(
              (t) =>
                t.activo &&
                (!tournament.categoria?.id ||
                  Number(t.categoria?.id) === Number(tournament.categoria.id))
            )
          )
          setError('')
        }
      })
      .catch((e) => {
        if (active) setError(e.message || 'No se pudieron cargar las parejas')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tournament.id, retry])
  const categories = [...new Set(teams.map((t) => t.categoria?.nombre).filter(Boolean))]
  const filtered = useMemo(
    () =>
      teams.filter(
        (t) =>
          (!category || t.categoria?.nombre === category) &&
          [
            t.nombre,
            t.jugador1?.nombre,
            t.jugador1?.apellido,
            t.jugador2?.nombre,
            t.jugador2?.apellido,
          ]
            .join(' ')
            .toLocaleLowerCase('es')
            .includes(search.toLocaleLowerCase('es'))
      ),
    [teams, search, category]
  )
  const eligible = filtered
    .filter((t) => !enrolledTeamIds.has(Number(t.id)))
    .map((t) => Number(t.id))
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await tournamentService.inscribirEquiposBulk(tournament.id, selected)
      onSuccess()
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudo guardar. Puedes reintentar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <ActionDialog title='Inscribir parejas' onClose={onClose} busy={busy}>
      <p className='text-sm'>{tournament.nombre} · las parejas siguen disponibles en el club.</p>
      {error && (
        <p role='alert' className='text-red-600'>
          {error}{' '}
          <button onClick={() => setRetry((v) => v + 1)} className='underline'>
            Reintentar carga
          </button>
        </p>
      )}
      <div className='grid gap-3 sm:grid-cols-2'>
        <input
          aria-label='Buscar parejas'
          className='form-input'
          placeholder='Pareja o jugador'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label='Categoría de parejas'
          className='form-input'
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value=''>Todas las categorías</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <button
        disabled={busy || loading}
        className='text-sm underline'
        onClick={() =>
          setSelected((v) =>
            eligible.every((id) => v.includes(id))
              ? v.filter((id) => !eligible.includes(id))
              : [...new Set([...v, ...eligible])]
          )
        }
      >
        Seleccionar / quitar filtradas
      </button>
      <div className='max-h-[45dvh] overflow-y-auto space-y-2'>
        {loading ? (
          <p>Cargando…</p>
        ) : (
          filtered.map((t) => (
            <label
              key={t.id}
              className='flex gap-3 items-center rounded-xl border border-[var(--border-color)] p-3'
            >
              <input
                type='checkbox'
                disabled={busy || enrolledTeamIds.has(Number(t.id))}
                checked={selected.includes(Number(t.id)) || enrolledTeamIds.has(Number(t.id))}
                onChange={(e) =>
                  setSelected((v) =>
                    e.target.checked ? [...v, Number(t.id)] : v.filter((id) => id !== Number(t.id))
                  )
                }
              />
              <span className='min-w-0 break-words text-sm'>
                <strong>{t.nombre}</strong>
                <small className='block'>
                  {t.categoria?.nombre} {enrolledTeamIds.has(Number(t.id)) ? '· Ya inscrita' : ''}
                </small>
              </span>
            </label>
          ))
        )}
      </div>
      <button
        className='btn-primary px-4 py-2'
        disabled={busy || !selected.length || selected.length > 200}
        onClick={save}
      >
        {busy ? 'Guardando…' : `Inscribir ${selected.length} parejas`}
      </button>
      <p className='text-xs'>
        Hasta 200 por envío. La selección se confirma completa o no se guarda.
      </p>
    </ActionDialog>
  )
}
