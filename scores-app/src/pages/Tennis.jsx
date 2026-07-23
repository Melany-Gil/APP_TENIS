import { useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import MatchCard from '../components/match/MatchCard'
import PlayerCard from '../components/player/PlayerCard'
import { MatchCardSkeleton } from '../components/ui/Skeleton'
import SectionHeader from '../components/common/SectionHeader'
import Tabs from '../components/ui/Tabs'
import { useMatches } from '../hooks/useMatches'
import { usePlayers } from '../hooks/usePlayers'
import { useDebounce } from '../hooks/useDebounce'
import { categoriaService } from '../services/categoriaService'

const VIEW_TABS = [
  { value: 'results', label: 'Resultados' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'players', label: 'Jugadores' },
]

export default function Tennis() {
  const [view, setView] = useState('results')
  const [playerSearch, setPlayerSearch] = useState('')
  const [date, setDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const debouncedPlayer = useDebounce(playerSearch.trim(), 350)

  useEffect(() => {
    categoriaService
      .getAll({ deporte: 'tenis' })
      .then((response) => setCategories(response.data || []))
      .catch(() => setCategories([]))
  }, [])

  const { matches: live, loading: ll } = useMatches({ estado: 'en_vivo', deporte: 'tenis' })
  const historyFilters = useMemo(
    () => ({
      estado: 'finalizado',
      deporte: 'tenis',
      ...(debouncedPlayer && { jugador: debouncedPlayer }),
      ...(date && { fecha: date }),
      ...(categoryId && { categoria_id: categoryId }),
    }),
    [categoryId, date, debouncedPlayer]
  )
  const { matches: finished, loading: lf } = useMatches(historyFilters)
  const { matches: upcoming } = useMatches({ estado: 'programado', deporte: 'tenis' })
  const { players, loading: lp } = usePlayers({ deporte: 'tenis' })
  const hasFilters = Boolean(playerSearch || date || categoryId)

  const clearFilters = () => {
    setPlayerSearch('')
    setDate('')
    setCategoryId('')
  }

  return (
    <div className='space-y-5 animate-fade-up'>
      <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
        Tenis
      </h1>
      <Tabs tabs={VIEW_TABS} activeTab={view} onChange={setView} />

      {view === 'results' && (
        <div className='space-y-6'>
          {live.length > 0 && (
            <section>
              <SectionHeader title='En Vivo' subtitle={`${live.length} partidos`} />
              <div className='space-y-3'>
                {live.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}
          <section>
            <SectionHeader
              title='Historial de partidos'
              subtitle={`${finished.length} resultado${finished.length === 1 ? '' : 's'}`}
            />
            <div className='card p-4 mb-4'>
              <div className='flex items-center justify-between gap-3 mb-3'>
                <div className='flex items-center gap-2'>
                  <SlidersHorizontal className='w-4 h-4' style={{ color: 'var(--color-brand)' }} />
                  <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                    Buscar resultados
                  </span>
                </div>
                {hasFilters && (
                  <button
                    type='button'
                    onClick={clearFilters}
                    className='btn-ghost text-xs flex items-center gap-1 px-2 py-1'
                  >
                    <X className='w-3.5 h-3.5' />
                    Limpiar
                  </button>
                )}
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                <div className='relative'>
                  <Search
                    className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4'
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    className='form-input pl-10'
                    value={playerSearch}
                    onChange={(event) => setPlayerSearch(event.target.value)}
                    placeholder='Nombre del jugador'
                    aria-label='Buscar por jugador'
                  />
                </div>
                <input
                  type='date'
                  className='form-input'
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label='Buscar por fecha'
                />
                <select
                  className='form-input'
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  aria-label='Buscar por categoría'
                >
                  <option value=''>Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className='space-y-3'>
              {lf ? (
                Array(2)
                  .fill(0)
                  .map((_, i) => <MatchCardSkeleton key={i} />)
              ) : finished.length > 0 ? (
                finished.map((m) => <MatchCard key={m.id} match={m} />)
              ) : (
                <p className='card p-8 text-center text-sm' style={{ color: 'var(--text-muted)' }}>
                  No hay partidos que coincidan con la búsqueda.
                </p>
              )}
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

      {view === 'players' && (
        <div className='space-y-3'>
          {lp
            ? Array(4)
                .fill(0)
                .map((_, i) => <div key={i} className='skeleton h-16 rounded-xl' />)
            : players.map((p) => <PlayerCard key={p.id} player={p} />)}
        </div>
      )}
    </div>
  )
}
