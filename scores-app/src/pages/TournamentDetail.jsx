import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { tournamentService } from '../services/tournamentService'
import { matchService } from '../services/matchService'
import useAuthStore from '../store/useAuthStore'
import { useMatchRealtime } from '../hooks/useMatchRealtime'
import TournamentTeamsModal from '../components/tournament/TournamentTeamsModal'
import TournamentMatches from '../components/tournament/TournamentMatches'
import { confirm } from '../utils/confirm'
export default function TournamentDetail() {
  const { id } = useParams(),
    admin = useAuthStore((s) => s.user?.rol === 'admin')
  const [t, setT] = useState(null),
    [tab, setTab] = useState('matches'),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [tick, setTick] = useState(0),
    [adding, setAdding] = useState(false),
    [removing, setRemoving] = useState(false)
  const refresh = () => setTick((v) => v + 1),
    timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  useMatchRealtime(
    useCallback(() => {
      if (!timer.current)
        timer.current = setTimeout(() => {
          timer.current = null
          setTick((v) => v + 1)
        }, 1500)
    }, [])
  )
  useEffect(() => {
    let active = true
    setBusy(true)
    setError('')
    Promise.all([
      tournamentService.getById(id),
      tab === 'teams'
        ? tournamentService.getInscripciones(id)
        : tab === 'standings'
          ? tournamentService.getStandings(id)
          : matchService.getAll({ torneo_id: id }),
    ])
      .then(([meta, content]) => {
        if (active) {
          setT(meta.data)
          setData(content.data)
        }
      })
      .catch((e) => {
        if (active) setError(e.message || 'No se pudo cargar el torneo')
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [id, tab, tick])
  const remove = async (team) => {
    if (
      !(await confirm({
        title: 'Retirar inscripción',
        message: `¿Retirar a ${team.nombre}? No elimina la pareja ni sus jugadores.`,
        confirmLabel: 'Retirar',
      }))
    )
      return
    setRemoving(true)
    try {
      await tournamentService.removeInscripcion(id, team.equipo_id)
      refresh()
    } catch (e) {
      setError(e.message || 'No se pudo retirar')
    } finally {
      setRemoving(false)
    }
  }
  return (
    <section className='space-y-5 min-w-0'>
      <div className='flex justify-between gap-3'>
        <Link to='/tennis' className='btn-ghost text-sm'>
          ← Volver a tenis
        </Link>
        <button className='btn-ghost text-sm' disabled={busy} onClick={refresh}>
          Actualizar
        </button>
      </div>
      {error && (
        <p role='alert' className='card p-4 text-red-600'>
          {error}
        </p>
      )}
      {t && (
        <>
          <header className='card p-5 space-y-2'>
            <p className='text-sm text-[var(--color-brand)]'>
              {t.modalidad === 'dobles' ? 'Dobles' : 'Individual'} ·{' '}
              {t.categoria?.nombre || 'Todas las categorías'}
            </p>
            <h1 className='text-2xl font-bold break-words'>{t.nombre}</h1>
            <p className='text-sm'>
              {t.estado.replace('_', ' ')} · {t.sistema.replaceAll('_', ' ')}
            </p>
            <p className='text-xs'>
              La organización programa los partidos. Inscribir parejas no genera cruces
              automáticamente.
            </p>
          </header>
          <div className='flex flex-wrap gap-2' aria-label='Secciones del torneo'>
            {[
              ['matches', 'Partidos'],
              ...(t.modalidad === 'dobles' ? [['teams', 'Parejas inscritas']] : []),
              ['standings', 'Posiciones'],
            ].map(([v, l]) => (
              <button
                key={v}
                className={
                  tab === v ? 'btn-primary px-3 py-2 text-sm' : 'btn-secondary px-3 py-2 text-sm'
                }
                aria-pressed={tab === v}
                onClick={() => {
                  setTab(v)
                  setData(null)
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </>
      )}
      {busy && (
        <p role='status' className='text-sm'>
          Actualizando…
        </p>
      )}
      {!busy && data && tab === 'matches' && <TournamentMatches matches={data} loading={false} />}
      {!busy && data && tab === 'teams' && (
        <div className='space-y-4'>
          {admin && t?.modalidad === 'dobles' && (
            <button className='btn-primary px-4 py-2' onClick={() => setAdding(true)}>
              Agregar parejas
            </button>
          )}
          <p className='text-sm'>{data.total_parejas} parejas inscritas</p>
          {data.categorias.map((c) => (
            <section className='card p-4 space-y-3' key={c.categoria_id || 'none'}>
              <h2 className='font-bold'>{c.categoria_nombre}</h2>
              {c.parejas.map((p) => (
                <div
                  className='border-t border-[var(--border-color)] pt-3 flex flex-wrap gap-3 justify-between'
                  key={p.equipo_id}
                >
                  <div className='min-w-0'>
                    <Link className='font-semibold text-sm break-words' to={`/team/${p.equipo_id}`}>
                      {p.nombre}
                    </Link>
                    <p className='text-xs text-[var(--text-secondary)]'>
                      {[p.jugador1, p.jugador2]
                        .filter(Boolean)
                        .map((j) => `${j.nombre} ${j.apellido || ''}`)
                        .join(' / ')}
                    </p>
                    <p className='text-xs mt-1'>
                      {p.pj} jugados · {p.pg} ganados · {p.pp} perdidos
                    </p>
                  </div>
                  {admin && (
                    <button
                      className='btn-ghost text-xs'
                      disabled={removing}
                      onClick={() => remove(p)}
                    >
                      Retirar
                    </button>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      {!busy && data && tab === 'standings' && <Standings data={data} />}
      {adding && (
        <TournamentTeamsModal
          tournament={t}
          enrolledTeamIds={new Set((data?.inscripciones_raw || []).map((r) => Number(r.equipo_id)))}
          onClose={() => setAdding(false)}
          onSuccess={refresh}
        />
      )}
    </section>
  )
}
function Standings({ data }) {
  const [group, setGroup] = useState('')
  const keys = data.nombres_grupos || [],
    selected = keys.includes(group) ? group : ''
  const tables = keys.length
    ? (selected ? [selected] : keys).map((k) => [k, data.grupos[k]])
    : [['Balance general', data.tabla_general || []]]
  return (
    <div className='space-y-4'>
      <p className='text-xs text-[var(--text-secondary)]'>
        Balance orientativo: 2 puntos por victoria y 1 por derrota. No define clasificados ni
        sustituye el reglamento o los desempates de la organización.
      </p>
      {keys.length > 1 && (
        <select
          aria-label='Grupo de posiciones'
          className='form-input'
          value={selected}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value=''>Todos los grupos y categorías</option>
          {keys.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      )}
      {tables.map(([name, rows]) => (
        <section key={name} className='card p-4 min-w-0'>
          <h2 className='font-bold mb-3'>{name}</h2>
          {!rows.length ? (
            <p className='text-sm'>Aún no hay participantes con resultados.</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm text-left'>
                <caption className='sr-only'>
                  {name}: partidos jugados, ganados, perdidos y puntos
                </caption>
                <thead>
                  <tr>
                    {['Participante', 'PJ', 'PG', 'PP', 'PTS'].map((h) => (
                      <th className='p-2' key={h} scope='col'>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className='border-t border-[var(--border-color)]'>
                      <th scope='row' className='p-2 font-medium min-w-[110px]'>
                        {r.participante.nombre}
                      </th>
                      {[r.pj, r.pg, r.pp, r.puntos].map((v, i) => (
                        <td className='p-2 tabular-nums' key={i}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
      <p className='text-xs'>
        PJ: jugados · PG: ganados · PP: perdidos · PTS: puntos. Solo cuentan partidos finalizados
        con ganador; los cancelados se excluyen.
      </p>
    </div>
  )
}
