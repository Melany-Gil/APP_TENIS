import { useCallback, useEffect, useState } from 'react'
import { Clock3, Radio, Trophy } from 'lucide-react'
import { SPONSORS } from '../data/sponsors'
import { useMatchTimer } from '../hooks/useMatchTimer'
import { matchService } from '../services/matchService'
import { getParticipantName } from '../utils/matchParticipants'

const REFRESH_MS = 10000
const SCREEN_SPONSOR = SPONSORS.find((sponsor) => sponsor.name === 'Induleche')

export default function Pantalla() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(new Date())

  const load = useCallback(() => {
    matchService.getAll({ estado: 'en_vivo', orden: 'asc' })
      .then((response) => setMatches(response.data || []))
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

  const sponsor = SCREEN_SPONSOR

  return (
    <main className='fixed inset-0 overflow-auto text-white' style={{ background: 'radial-gradient(circle at top left, #174b34 0, #0d251b 34%, #07110d 76%)' }}>
      <header className='sticky top-0 z-10 flex items-center justify-between gap-4 px-4 sm:px-7 py-3 backdrop-blur-xl' style={{ backgroundColor: 'rgba(7,17,13,.9)', borderBottom: '1px solid rgba(139,203,96,.2)' }}>
        <div className='flex items-center gap-3 min-w-0'>
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
          <div className='flex items-center gap-2 mb-5'>
            <span className='relative flex w-3 h-3'><span className='absolute inset-0 rounded-full bg-orange-500 animate-ping' /><span className='relative w-3 h-3 rounded-full bg-orange-500' /></span>
            <h1 className='font-black text-xl'>Partidos en vivo</h1>
            <span className='rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold'>{matches.length}</span>
          </div>

          {loading ? (
            <div className='grid md:grid-cols-2 gap-4'>{[1, 2].map((item) => <div key={item} className='h-56 rounded-3xl bg-white/5 animate-pulse' />)}</div>
          ) : matches.length ? (
            <div className='grid md:grid-cols-2 gap-4'>
              {matches.map((match) => <ScreenMatch key={match.id} match={match} />)}
            </div>
          ) : (
            <div className='min-h-[55vh] rounded-3xl flex flex-col items-center justify-center text-center bg-white/5 border border-white/10'>
              <Radio className='w-10 h-10 text-white/30 mb-3' />
              <p className='font-bold text-lg'>No hay partidos en vivo</p>
              <p className='text-sm text-white/50 mt-1'>La pantalla se actualizará automáticamente.</p>
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

function ScreenMatch({ match }) {
  const marker = match.marcador_actual
  const { formatted, isPaused } = useMatchTimer(match.en_vivo, match.estado)
  const p1 = getParticipantName(match, 1) || 'Por definir'
  const p2 = getParticipantName(match, 2) || 'Por definir'
  const sets = marker?.sets || []
  const visibleSets = Math.max(3, sets.length)

  return (
    <article className='rounded-3xl overflow-hidden border border-white/10 bg-black/20 shadow-2xl'>
      <div className='h-1' style={{ background: 'linear-gradient(90deg,#8bcb60,#c65d32)' }} />
      <div className='p-4 sm:p-5'>
        <div className='flex items-center justify-between gap-3 mb-4'>
          <div>
            <p className='text-xs uppercase tracking-wider font-bold text-lime-300'>{match.categoria?.nombre || 'Tenis'}</p>
            <p className='text-xs text-white/45 mt-1'>{match.cancha?.nombre || 'Cancha por confirmar'}</p>
          </div>
          <span className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-mono font-bold'>
            <Clock3 className='w-3 h-3' /> {formatted}{isPaused ? ' · PAUSA' : ''}
          </span>
        </div>
        <ScreenPlayer name={p1} side='jugador1' index={0} marker={marker} visibleSets={visibleSets} />
        <div className='h-px bg-white/10 my-2' />
        <ScreenPlayer name={p2} side='jugador2' index={1} marker={marker} visibleSets={visibleSets} />
      </div>
    </article>
  )
}

function ScreenPlayer({ name, side, index, marker, visibleSets }) {
  return (
    <div className='grid items-center gap-2 py-2' style={{ gridTemplateColumns: `minmax(110px,1fr) repeat(${visibleSets},36px) 48px` }}>
      <div className='flex items-center gap-2 min-w-0'>
        <span className='w-2.5 h-2.5 rounded-full shrink-0' style={{ backgroundColor: marker?.server === side ? '#c65d32' : 'transparent' }} />
        <strong className='truncate text-sm sm:text-base'>{name}</strong>
        {marker?.winner === side && <Trophy className='w-4 h-4 text-amber-400 shrink-0' />}
      </div>
      {Array.from({ length: visibleSets }, (_, setIndex) => (
        <strong key={setIndex} className='text-center rounded-lg py-1.5 bg-white/5 text-white/80'>
          {marker?.sets?.[setIndex]?.games?.[index] ?? '/'}
        </strong>
      ))}
      <strong className='text-center rounded-xl py-2 text-lg bg-lime-300/15 text-lime-200'>{marker?.displayPoints?.[index] ?? '0'}</strong>
    </div>
  )
}
