import { useState, useEffect, useMemo } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { padelFlashService } from '../services/padelFlashService'
import ActionDialog from '../components/common/ActionDialog'
import MatchCard from '../components/match/MatchCard'
import TeamCard from '../components/team/TeamCard'
import SectionHeader from '../components/common/SectionHeader'
import Tabs from '../components/ui/Tabs'
import TournamentDirectory from '../components/tournament/TournamentDirectory'
import { useMatches } from '../hooks/useMatches'
import { teamService } from '../services/teamService'

const VIEW_TABS = [
  { value: 'tournaments', label: 'Torneos' },
  { value: 'results', label: 'Resultados' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'teams', label: 'Parejas' },
]

export default function Padel() {
  const { user } = useAuthStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [flashEvents, setFlashEvents] = useState([])
  const [flashError, setFlashError] = useState('')
  const [flashLoading, setFlashLoading] = useState(true)
  const [flashRetry, setFlashRetry] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') || searchParams.get('view') || 'tournaments'
  const initialTab = VIEW_TABS.some(t => t.value === rawTab) ? rawTab : 'tournaments'
  const [view, setView] = useState(initialTab)
  const [teams, setTeams] = useState([])
  const [teamQuery, setTeamQuery] = useState('')
  const [teamCategory, setTeamCategory] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setFlashLoading(true)
    setFlashError('')
    padelFlashService.list().then(r => { if (active) setFlashEvents(r.data || []) })
      .catch(() => { if (active) setFlashError('No se pudieron cargar los torneos flash.') })
      .finally(() => { if (active) setFlashLoading(false) })
    return () => { active = false }
  }, [flashRetry])
  const teamCategories = useMemo(() => [...new Map(teams.filter(t => t.categoria?.id).map(t => [String(t.categoria.id), t.categoria.nombre])).entries()], [teams])
  const visibleTeams = useMemo(() => {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const query = normalize(teamQuery.trim())
    return teams.filter(t => (!teamCategory || String(t.categoria?.id) === teamCategory) && normalize([t.nombre, t.jugador1?.nombre, t.jugador1?.apellido, t.jugador2?.nombre, t.jugador2?.apellido].join(' ')).includes(query))
  }, [teams, teamQuery, teamCategory])

  const { matches: live } = useMatches({ estado: 'en_vivo', deporte: 'padel' })
  const { matches: finished } = useMatches({ estado: 'finalizado', deporte: 'padel' })
  const { matches: upcoming } = useMatches({ estado: 'programado', deporte: 'padel' })

  useEffect(() => {
    const t = searchParams.get('tab') || searchParams.get('view')
    if (t && VIEW_TABS.some(tab => tab.value === t) && t !== view) {
      setView(t)
    }
  }, [searchParams])

  const handleTabChange = (nextTab) => {
    setView(nextTab)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', nextTab)
      return next
    }, { replace: true })
  }

  useEffect(() => {
    let active = true
    setTeamsLoading(true)
    setTeamError('')
    teamService
      .getAll({ deporte: 'padel' })
      .then((r) => { if (active) setTeams(r.data || []) })
      .catch(() => { if (active) setTeamError('No se pudieron cargar las parejas.') })
      .finally(() => { if (active) setTeamsLoading(false) })
    return () => { active = false }
  }, [retry])

  if (searchParams.has('evento') || searchParams.has('vista') || searchParams.has('pantalla'))
    return <Navigate to={`/padel/flash?${searchParams.toString()}`} replace />
  return (
    <div className='space-y-5 animate-fade-up'>
      <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
        Pádel
      </h1>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-sm text-[var(--text-secondary)]'>Torneos, parejas y resultados.</p>
        {user?.rol === 'admin' && <button className='btn-primary' onClick={() => setCreateOpen(true)}>Crear torneo de pádel</button>}
      </div>
      {createOpen && <ActionDialog title='Formato del torneo de pádel' onClose={() => setCreateOpen(false)}>
        <div className='grid gap-3 sm:grid-cols-2'>
          <Link className='card-hover p-5 block space-y-2' to='/admin/torneos?deporte=padel&nuevo=1'><strong className='block'>Torneo convencional</strong><span className='text-sm'>Grupos, eliminatorias y resultados deportivos. Configura el sistema de competencia.</span></Link>
          <Link className='card-hover p-5 block space-y-2' to='/padel/flash?nuevo=1'><strong className='block'>Torneo Flash</strong><span className='text-sm'>14 parejas, encuentros de 20 minutos y premio al mejor disfraz por votación.</span></Link>
        </div>
      </ActionDialog>}
      <Tabs tabs={VIEW_TABS} activeTab={view} onChange={handleTabChange} />
      {view === 'tournaments' && <div className='space-y-6'>
        <section className='space-y-3' aria-label='Torneos flash'>
          <h2 className='font-bold'>Formato Flash</h2>
          {flashError ? <p role='alert'>{flashError} <button className='underline' onClick={() => setFlashRetry(n => n + 1)}>Reintentar</button></p> : flashLoading ? <p role='status'>Cargando torneos flash…</p> : <div className='grid gap-4 sm:grid-cols-2'>
            {flashEvents.map(event => <Link key={event.id} to={`/padel/flash?evento=${event.id}`} className='card-hover p-5 space-y-3 block'>
              <span className='badge-brand'>Flash · Disfraces</span><h3 className='font-bold text-lg'>{event.nombre}</h3>
              <p className='text-sm text-[var(--text-secondary)]'>{event.fecha} · 20 minutos por partido</p><span className='text-sm font-semibold'>Ver torneo →</span>
            </Link>)}
            {!flashEvents.length && <p className='text-sm text-[var(--text-secondary)]'>No hay torneos flash publicados.</p>}
          </div>}
        </section>
        <section className='space-y-3' aria-label='Torneos convencionales'><h2 className='font-bold'>Torneos convencionales</h2><TournamentDirectory deporte='padel' /></section>
      </div>}

      {view === 'results' && (
        <div className='space-y-6'>
          {live.length > 0 && (
            <section>
              <SectionHeader title='En Vivo' />
              <div className='space-y-3'>
                {live.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}
          <section>
            <SectionHeader title='Últimos resultados' />
            <div className='space-y-3'>
              {finished.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        </div>
      )}

      {view === 'upcoming' && (
        <div className='space-y-3'>
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

      {view === 'teams' && (
        <div className='space-y-3'>
          <div className='card p-4 grid gap-3 sm:grid-cols-2'>
            <input className='form-input' aria-label='Buscar pareja de pádel' placeholder='Pareja o integrante…' value={teamQuery} onChange={e => setTeamQuery(e.target.value)} />
            <select className='form-input' aria-label='Categoría de pádel' value={teamCategory} onChange={e => setTeamCategory(e.target.value)}>
              <option value=''>Todas las categorías</option>
              {teamCategories.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
            </select>
          </div>
          {teamError ? <div role='alert' className='card p-4'>{teamError} <button className='underline' onClick={() => setRetry(n => n + 1)}>Reintentar</button></div> : teamsLoading ? <p role='status'>Cargando parejas…</p> : visibleTeams.length === 0 ? <p className='card p-4'>No hay parejas que coincidan con la búsqueda.</p> : visibleTeams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  )
}
