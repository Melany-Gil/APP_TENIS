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
  const [playerCategoryId, setPlayerCategoryId] = useState('')
  const [playerOrder, setPlayerOrder] = useState('ranking')
  const debouncedPlayer = useDebounce(playerSearch.trim(), 350)

  useEffect(() => {
    categoriaService
      .getAll({ deporte: 'tenis' })
      .then((response) => {
        const loadedCategories = response.data || []
        setCategories(loadedCategories)
        setPlayerCategoryId((current) => current || String(loadedCategories[0]?.id || ''))
      })
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
  const { players, loading: lp } = usePlayers({
    deporte: 'tenis',
    ...(playerCategoryId && { categoria_id: playerCategoryId }),
  })
  const sortedPlayers = useMemo(() => {
    const byName = (a, b) =>
      `${a.apellido || ''} ${a.nombre || ''}`.localeCompare(
        `${b.apellido || ''} ${b.nombre || ''}`,
        'es'
      )

    return [...players].sort((a, b) => {
      if (playerOrder === 'ranking') {
        return (
          (a.stats?.ranking || Number.MAX_SAFE_INTEGER) -
            (b.stats?.ranking || Number.MAX_SAFE_INTEGER) || byName(a, b)
        )
      }
      if (playerOrder === 'alphabetical_desc') return byName(b, a)
      return byName(a, b)
    })
  }, [players, playerOrder])
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
          <div className='card p-4 space-y-3'>
            <div>
              <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                Estadísticas por categoría
              </p>
              <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                Puntos de clasificación: 3 para el ganador y 0 para el perdedor si no cede sets; 2 y
                1, respectivamente, si el perdedor gana al menos un set.
              </p>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <select
                className='form-input'
                value={playerCategoryId}
                onChange={(event) => setPlayerCategoryId(event.target.value)}
                aria-label='Filtrar estadísticas por categoría'
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nombre}
                  </option>
                ))}
              </select>
              <select
                className='form-input'
                value={playerOrder}
                onChange={(event) => setPlayerOrder(event.target.value)}
                aria-label='Ordenar jugadores'
              >
                <option value='ranking'>Ranking</option>
                <option value='alphabetical'>Alfabético A–Z</option>
                <option value='alphabetical_desc'>Alfabético Z–A</option>
              </select>
            </div>
          </div>
          {lp ? (
            Array(4)
              .fill(0)
              .map((_, i) => <div key={i} className='skeleton h-16 rounded-xl' />)
          ) : sortedPlayers.length > 0 ? (
            sortedPlayers.map((p) => (
              <PlayerCard key={p.id} player={p} categoryId={playerCategoryId} />
            ))
          ) : (
            <p className='card p-8 text-center text-sm' style={{ color: 'var(--text-muted)' }}>
              Aún no hay partidos finalizados en esta categoría.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
