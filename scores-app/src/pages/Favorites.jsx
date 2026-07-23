import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Trash2 } from 'lucide-react'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/common/EmptyState'
import useFavoritesStore from '../store/useFavoritesStore'

const TABS = [
  { value: 'jugadores', label: 'Jugadores' },
  { value: 'equipos', label: 'Parejas' },
  { value: 'partidos', label: 'Partidos' },
]

export default function Favorites() {
  const [tab, setTab] = useState('jugadores')
  const { jugadores, equipos, partidos, toggleJugador, toggleEquipo, togglePartido } =
    useFavoritesStore()

  const tabsWithCount = TABS.map((t) => {
    const count =
      t.value === 'jugadores'
        ? jugadores.length
        : t.value === 'equipos'
          ? equipos.length
          : partidos.length
    return { ...t, label: `${t.label}${count ? ` (${count})` : ''}` }
  })

  return (
    <div className='space-y-5 animate-fade-up'>
      <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
        Favoritos
      </h1>
      <Tabs tabs={tabsWithCount} activeTab={tab} onChange={setTab} />

      {tab === 'jugadores' &&
        (jugadores.length === 0 ? (
          <EmptyState
            icon={Star}
            title='Sin jugadores favoritos'
            description='Explora jugadores y guárdalos aquí.'
          />
        ) : (
          <div className='space-y-3'>
            {jugadores.map((j) => (
              <div key={j.id} className='card p-4 flex items-center gap-3'>
                <Link to={`/player/${j.id}`} className='flex-1 flex items-center gap-3'>
                  <span className='text-xl'>{j.country?.flag}</span>
                  <div>
                    <p className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>
                      {j.nombre} {j.apellido}
                    </p>
                    <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                      {j.categoria?.nombre}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => toggleJugador(j)}
                  className='p-2 rounded-lg transition-all'
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            ))}
          </div>
        ))}

      {tab === 'equipos' &&
        (equipos.length === 0 ? (
          <EmptyState
            icon={Star}
            title='Sin parejas favoritas'
            description='Explora parejas de pádel y guárdalas aquí.'
          />
        ) : (
          <div className='space-y-3'>
            {equipos.map((e) => (
              <div key={e.id} className='card p-4 flex items-center gap-3'>
                <Link to={`/team/${e.id}`} className='flex-1'>
                  <p className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>
                    {e.nombre}
                  </p>
                </Link>
                <button
                  onClick={() => toggleEquipo(e)}
                  className='p-2 rounded-lg transition-all'
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            ))}
          </div>
        ))}

      {tab === 'partidos' &&
        (partidos.length === 0 ? (
          <EmptyState
            icon={Star}
            title='Sin partidos guardados'
            description='Guarda partidos desde cualquier sección.'
          />
        ) : (
          <div className='space-y-3'>
            {partidos.map((p) => {
              const p1 =
                p.deporte === 'padel'
                  ? p.equipo1?.nombre
                  : `${p.jugador1?.nombre || ''} ${p.jugador1?.apellido || ''}`.trim()
              const p2 =
                p.deporte === 'padel'
                  ? p.equipo2?.nombre
                  : `${p.jugador2?.nombre || ''} ${p.jugador2?.apellido || ''}`.trim()
              return (
                <div key={p.id} className='card p-4 flex items-center gap-3'>
                  <Link to={`/match/${p.id}`} className='flex-1'>
                    <p className='font-medium text-sm' style={{ color: 'var(--text-primary)' }}>
                      {p1} vs {p2}
                    </p>
                    <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
                      {p.torneo?.nombre} · {p.ronda}
                    </p>
                  </Link>
                  <button
                    onClick={() => togglePartido(p)}
                    className='p-2 rounded-lg transition-all'
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}
