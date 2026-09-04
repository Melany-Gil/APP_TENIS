import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Clock3, Maximize2, Radio, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import MatchStats from '../components/match/MatchStats'
import { SPONSORS } from '../data/sponsors'
import { useMatchRealtime } from '../hooks/useMatchRealtime'
import { useMatchTimer } from '../hooks/useMatchTimer'
import { matchService } from '../services/matchService'
import { getParticipantName } from '../utils/matchParticipants'
import Avatar from '../components/ui/Avatar'

const REFRESH_MS = 30000
const SCREEN_SPONSOR = SPONSORS.find((sponsor) => sponsor.name === 'Induleche')

const getLocalDate = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Pantalla() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(new Date())
  const [focusedMatchId, setFocusedMatchId] = useState(null)

  const load = useCallback(() => {
    const today = getLocalDate()
    Promise.all([
      matchService.getAll({ estado: 'en_vivo', orden: 'asc' }),
      matchService.getAll({ estado: 'finalizado', fecha: today, orden: 'desc' }),
    ])
      .then(([liveResponse, finishedResponse]) => {
        const combined = [...(liveResponse.data || []), ...(finishedResponse.data || [])]
        setMatches(Array.from(new Map(combined.map((match) => [Number(match.id), match])).values()))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const matchesTimer = window.setInterval(load, REFRESH_MS)
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000)
    return () => {
      window.clearInterval(matchesTimer)
      window.clearInterval(clockTimer)
    }
  }, [load])

  useMatchRealtime(useCallback(() => load(), [load]))

  useEffect(() => {
    if (focusedMatchId && !matches.some((match) => Number(match.id) === Number(focusedMatchId))) {
      setFocusedMatchId(null)
    }
  }, [focusedMatchId, matches])

  const sponsor = SCREEN_SPONSOR
  const focusedMatch = matches.find((match) => Number(match.id) === Number(focusedMatchId))
  const liveMatches = matches.filter((match) => match.estado === 'en_vivo')
  const finishedMatches = matches.filter((match) => match.estado === 'finalizado')

  return (
    <main className='fixed inset-0 overflow-auto text-white' style={{ background: 'radial-gradient(circle at top left, #174b34 0, #0d251b 34%, #07110d 76%)' }}>
      <header className='sticky top-0 z-10 flex items-center justify-between gap-4 px-4 sm:px-7 py-3 backdrop-blur-xl' style={{ backgroundColor: 'rgba(7,17,13,.9)', borderBottom: '1px solid rgba(139,203,96,.2)' }}>
        <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
          <Link
            to='/'
            className='w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 inline-flex items-center justify-center shrink-0 transition-colors'
            aria-label='Regresar a la página principal'
          >
            <ArrowLeft className='w-5 h-5' />
          </Link>
          <img src='/branding/subcomite-tenis-club-union.png' alt='Subcomité de Tenis Club Unión' className='w-12 h-12 object-contain shrink-0' />
          <div className='min-w-0'>
            <p className='font-black truncate'>Marcadores Club Unión</p>
            <p className='text-xs text-white/55'>Subcomité de Tenis · Bucaramanga</p>
          </div>
        </div>
        <div className='flex items-center gap-4 shrink-0'>
          <a href='https://www.instagram.com/legal.branding' target='_blank' rel='noreferrer' className='hidden sm:block' aria-label='Instagram de Legal Branding'>
            <img src='/branding/legal-branding.png' alt='Legal Branding' className='h-10 w-auto object-contain brightness-0 invert opacity-80' />
          </a>
          <div className='text-right font-mono'>
            <p className='text-lg sm:text-2xl font-black tabular-nums'>{clock.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
            <p className='hidden sm:block text-[11px] text-white/50 capitalize'>{clock.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      </header>

      <div className='grid lg:grid-cols-[minmax(0,1fr)_260px] min-h-[calc(100vh-73px)]'>
        <section className='p-4 sm:p-7'>
          <div className='flex items-center justify-between gap-3 mb-5'>
            <div className='flex items-center gap-2 min-w-0'>
              {focusedMatch ? <Trophy className='w-5 h-5 text-lime-300 shrink-0' /> : <span className='relative flex w-3 h-3 shrink-0'><span className='absolute inset-0 rounded-full bg-orange-500 animate-ping' /><span className='relative w-3 h-3 rounded-full bg-orange-500' /></span>}
              <h1 className='font-black text-xl truncate'>{focusedMatch ? 'Detalle del partido' : 'Jornada de hoy'}</h1>
            </div>
            {focusedMatch && (
              <button
                type='button'
                onClick={() => setFocusedMatchId(null)}
                className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs sm:text-sm font-bold transition-colors shrink-0'
              >
                <ArrowLeft className='w-4 h-4' /> Todos
              </button>
            )}
          </div>

          {loading ? (
            <div className='grid md:grid-cols-2 gap-4'>{[1, 2].map((item) => <div key={item} className='h-56 rounded-3xl bg-white/5 animate-pulse' />)}</div>
          ) : focusedMatch ? (
            <ScreenMatch match={focusedMatch} featured onBack={() => setFocusedMatchId(null)} />
          ) : matches.length ? (
            <div className='space-y-8'>
              <MatchGroup
                title='Partidos en vivo'
                matches={liveMatches}
                emptyText='No hay partidos en vivo en este momento.'
                onFocus={setFocusedMatchId}
                live
              />
              <MatchGroup
                title='Resultados de hoy'
                matches={finishedMatches}
                emptyText='Todavía no hay partidos finalizados hoy.'
                onFocus={setFocusedMatchId}
              />
            </div>
          ) : (
            <div className='min-h-[55vh] rounded-3xl flex flex-col items-center justify-center text-center bg-white/5 border border-white/10'>
              <Radio className='w-10 h-10 text-white/30 mb-3' />
              <p className='font-bold text-lg'>No hay partidos registrados hoy</p>
              <p className='text-sm text-white/50 mt-1'>Los partidos en vivo y sus resultados aparecerán automáticamente.</p>
            </div>
          )}
        </section>

        <aside className='lg:hidden mx-4 mb-4 rounded-2xl border border-white/10 bg-white/5 p-3'>
          <div key={`mobile-${sponsor.image}`} className='flex items-center gap-3 animate-fade-up'>
            <div className='h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-white p-1.5' style={{ boxShadow: `0 0 24px ${sponsor.accent}44` }}>
              <img src={sponsor.image} alt={sponsor.name} className='h-full w-full rounded-lg object-contain' />
            </div>
            <div className='min-w-0'>
              <p className='text-[9px] uppercase tracking-[.2em] text-white/45'>Patrocinador oficial</p>
              <p className='mt-1 truncate font-black'>{sponsor.name}</p>
            </div>
          </div>
        </aside>

        <aside className='hidden lg:flex flex-col items-center justify-center p-6 text-center' style={{ backgroundColor: 'rgba(255,255,255,.035)', borderLeft: '1px solid rgba(255,255,255,.08)' }}>
          <p className='uppercase tracking-[.22em] text-[10px] text-white/45 mb-6'>Patrocinador oficial</p>
          <div key={sponsor.image} className='w-full animate-fade-up'>
            <div className='aspect-square rounded-3xl bg-white p-3 flex items-center justify-center shadow-2xl' style={{ boxShadow: `0 0 44px ${sponsor.accent}55` }}>
              <img src={sponsor.image} alt={sponsor.name} className='w-full h-full object-contain rounded-2xl' />
            </div>
            <p className='font-black mt-5 text-lg'>{sponsor.name}</p>
          </div>
        </aside>
      </div>
    </main>
  )
}

function MatchGroup({ title, matches, emptyText, onFocus, live = false }) {
  return (
    <section>
      <div className='mb-4 flex items-center gap-2'>
        {live ? (
          <span className='relative flex w-2.5 h-2.5 shrink-0'><span className='absolute inset-0 rounded-full bg-orange-500 animate-ping' /><span className='relative w-2.5 h-2.5 rounded-full bg-orange-500' /></span>
        ) : (
          <Trophy className='w-4 h-4 text-amber-300' />
        )}
        <h2 className='font-black text-lg'>{title}</h2>
        <span className='rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold'>{matches.length}</span>
      </div>
      {matches.length ? (
        <div className='grid md:grid-cols-2 gap-4'>
          {matches.map((match) => (
            <ScreenMatch key={match.id} match={match} onFocus={() => onFocus(match.id)} />
          ))}
        </div>
      ) : (
        <div className='rounded-2xl border border-white/10 bg-white/[.035] px-5 py-6 text-sm text-white/45'>{emptyText}</div>
      )}
    </section>
  )
}

function ScreenMatch({ match, onFocus, onBack, featured = false }) {
  const marker = match.marcador_actual
  const { formatted, isPaused } = useMatchTimer(match.en_vivo, match.estado)
  const p1 = getParticipantName(match, 1) || 'Por definir'
  const p2 = getParticipantName(match, 2) || 'Por definir'
  const sets = marker?.sets || []
  const visibleSets = Math.max(3, sets.length)
  const isFinished = match.estado === 'finalizado'

  return (
    <article className={`rounded-3xl overflow-hidden border border-white/10 bg-black/20 shadow-2xl ${featured ? 'min-h-[55vh] flex flex-col justify-center' : ''}`}>
      <div className='h-1' style={{ background: 'linear-gradient(90deg,#8bcb60,#c65d32)' }} />
      <div className={featured ? 'p-5 sm:p-8 lg:p-10' : 'p-4 sm:p-5'}>
        <div className='flex flex-col items-start justify-between gap-3 mb-4 sm:flex-row sm:items-center'>
          <div>
            <p className='text-xs uppercase tracking-wider font-bold text-lime-300'>{match.categoria?.nombre || 'Tenis'}</p>
            <p className='text-xs text-white/45 mt-1'>{match.cancha?.nombre || 'Cancha por confirmar'}</p>
          </div>
          <div className='flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end'>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-bold ${isFinished ? 'bg-amber-300/15 text-amber-200' : 'bg-white/10'}`}>
              {isFinished ? <Trophy className='w-3 h-3' /> : <Clock3 className='w-3 h-3' />}
              {isFinished ? `FINALIZADO · ${formatted}` : `${formatted}${isPaused ? ' · PAUSA' : ''}`}
            </span>
            {onFocus && (
              <button type='button' onClick={onFocus} className='h-9 rounded-full bg-white/10 hover:bg-white/15 inline-flex items-center justify-center gap-2 px-3 transition-colors' aria-label='Ver este partido a detalle'>
                <Maximize2 className='w-4 h-4' />
                <span className='text-xs font-bold'>Ver a detalle</span>
              </button>
            )}
          </div>
        </div>
        <ScreenPlayer name={p1} photo={match.jugador1?.foto} side='jugador1' index={0} marker={marker} visibleSets={visibleSets} featured={featured} />
        <div className='h-px bg-white/10 my-2' />
        <ScreenPlayer name={p2} photo={match.jugador2?.foto} side='jugador2' index={1} marker={marker} visibleSets={visibleSets} featured={featured} />
        {featured && (
          <>
            <section
              className='mt-7 rounded-2xl border border-white/10 bg-white/[.045] p-4 sm:p-5'
              style={{
                '--text-muted': 'rgba(255,255,255,.52)',
                '--text-secondary': 'rgba(255,255,255,.78)',
                '--border-color': 'rgba(255,255,255,.1)',
                '--club-green': '#bef264',
                '--club-clay': '#fdba74',
                '--color-brand': '#bef264',
                '--color-brand-dim': 'rgba(190,242,100,.13)',
                '--bg-hover': 'rgba(255,255,255,.08)',
              }}
            >
              <div className='mb-4 flex items-center justify-between gap-3'>
                <div>
                  <p className='text-[10px] font-bold uppercase tracking-[.18em] text-white/40'>Comparativo</p>
                  <h2 className='mt-1 text-lg font-black text-white'>Estadísticas de los jugadores</h2>
                </div>
                <span className='rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/55'>En tiempo real</span>
              </div>
              <MatchStats matchId={match.id} player1={p1} player2={p2} />
            </section>
            <div className='mt-5 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-sm text-white/55'>
              <div className='flex flex-wrap gap-x-5 gap-y-2'>
                <span><strong className='text-white/80'>Formato:</strong> mejor de {match.formato?.mejor_de_sets || 3} sets</span>
                <span><strong className='text-white/80'>Modalidad:</strong> {match.deporte === 'padel' ? 'Pádel' : 'Tenis'}</span>
                {match.notas && <span><strong className='text-white/80'>Nota:</strong> {match.notas}</span>}
              </div>
              <button type='button' onClick={onBack} className='inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-4 py-2 font-bold text-white transition-colors'>
                <ArrowLeft className='w-4 h-4' /> Regresar a partidos
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

function ScreenPlayer({ name, photo, side, index, marker, visibleSets, featured }) {
  return (
    <div className='grid items-center gap-2 py-2 overflow-x-auto' style={{ gridTemplateColumns: `minmax(${featured ? '180px' : '110px'},1fr) repeat(${visibleSets},${featured ? '52px' : '36px'}) ${featured ? '68px' : '48px'}` }}>
      <div className='flex items-center gap-2 min-w-0'>
        <span className='w-2.5 h-2.5 rounded-full shrink-0' style={{ backgroundColor: marker?.server === side ? '#c65d32' : 'transparent' }} />
        <Avatar src={photo} name={name} size={featured ? 'md' : 'xs'} className='border-white/15' />
        <strong className={`truncate ${featured ? 'text-lg sm:text-2xl lg:text-3xl' : 'text-sm sm:text-base'}`}>{name}</strong>
        {marker?.winner === side && <Trophy className='w-4 h-4 text-amber-400 shrink-0' />}
      </div>
      {Array.from({ length: visibleSets }, (_, setIndex) => (
        <strong key={setIndex} className='text-center rounded-lg py-1.5 bg-white/5 text-white/80'>
          {marker?.sets?.[setIndex]?.games?.[index] ?? '/'}
        </strong>
      ))}
      <strong className={`text-center rounded-xl py-2 bg-lime-300/15 text-lime-200 ${featured ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>{marker?.displayPoints?.[index] ?? '0'}</strong>
    </div>
  )
}
