import { useState, useMemo } from 'react'
import { Calendar, Filter, Search, X } from 'lucide-react'
import MatchCard from '../match/MatchCard'
import { MatchCardSkeleton } from '../ui/Skeleton'
import { cn } from '../../utils/cn'

export default function TournamentMatches({ matches, loading, groups = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Extract all unique categories from matches or groups
  const detectedCategories = useMemo(() => {
    const cats = new Set()
    matches.forEach((m) => {
      if (m.categoria?.nombre) {
        cats.add(m.categoria?.nombre.trim())
      } else if (m.grupo && m.grupo.includes(' - ')) {
        cats.add(m.grupo.split(' - ')[0].trim())
      }
    })
    return Array.from(cats).sort()
  }, [matches])

  // Extract available groups, optionally filtered by selectedCategory
  const availableGroups = useMemo(() => {
    const set = new Set()
    matches.forEach((m) => {
      if (!m.grupo) return
      if (selectedCategory !== 'all') {
        const cat =
          m.categoria?.nombre || (m.grupo.includes(' - ') ? m.grupo.split(' - ')[0].trim() : '')
        if (cat !== selectedCategory && !m.grupo.startsWith(`${selectedCategory} -`)) return
      }
      set.add(m.grupo.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  }, [matches, selectedCategory])

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedCategory !== 'all') {
        const cat =
          m.categoria?.nombre ||
          (m.grupo && m.grupo.includes(' - ') ? m.grupo.split(' - ')[0].trim() : '')
        if (cat !== selectedCategory && !m.grupo?.startsWith(`${selectedCategory} -`)) return false
      }
      if (selectedGroup !== 'all' && m.grupo !== selectedGroup) return false
      if (selectedStatus !== 'all' && m.estado !== selectedStatus) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const p1 = (
          m.equipo1?.nombre || `${m.jugador1?.nombre || ''} ${m.jugador1?.apellido || ''}`
        ).toLowerCase()
        const p2 = (
          m.equipo2?.nombre || `${m.jugador2?.nombre || ''} ${m.jugador2?.apellido || ''}`
        ).toLowerCase()
        if (!p1.includes(query) && !p2.includes(query)) return false
      }
      return true
    })
  }, [matches, selectedCategory, selectedGroup, selectedStatus, searchQuery])

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedGroup !== 'all' ||
    selectedStatus !== 'all' ||
    Boolean(searchQuery.trim())

  const clearFilters = () => {
    setSelectedCategory('all')
    setSelectedGroup('all')
    setSelectedStatus('all')
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className='space-y-3'>
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {/* Filters Card */}
      <div className='card p-4 space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <Filter className='w-4 h-4 text-[var(--color-brand)]' />
            <span
              className='text-xs font-semibold uppercase tracking-wider'
              style={{ color: 'var(--text-primary)' }}
            >
              Filtrar partidos ({filteredMatches.length})
            </span>
          </div>
          {hasActiveFilters && (
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

        <div
          className={cn(
            'grid gap-3',
            detectedCategories.length > 1
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-3'
          )}
        >
          {/* Search by player/team */}
          <div className='relative'>
            <Search
              className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4'
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type='text'
              className='form-input pl-9 text-xs'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label='Buscar jugador o pareja'
              placeholder='Buscar jugador o pareja...'
            />
          </div>

          {/* Category filter if multiple */}
          {detectedCategories.length > 1 && (
            <select
              className='form-input text-xs'
              aria-label='Categoría de partidos'
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setSelectedGroup('all')
              }}
            >
              <option value='all'>Todas las categorías</option>
              {detectedCategories.map((c) => (
                <option key={c} value={c}>
                  Categoría: {c}
                </option>
              ))}
            </select>
          )}

          {/* Group filter */}
          <select
            className='form-input text-xs'
            aria-label='Grupo de partidos'
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value='all'>Todos los grupos</option>
            {availableGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className='form-input text-xs'
            aria-label='Estado de partidos'
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value='all'>Todos los estados</option>
            <option value='en_vivo'>En vivo</option>
            <option value='programado'>Programados</option>
            <option value='finalizado'>Finalizados</option>
          </select>
        </div>
      </div>

      {/* Matches list */}
      {filteredMatches.length > 0 ? (
        <div className='space-y-3'>
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className='card p-10 text-center'>
          <Calendar className='w-10 h-10 mx-auto mb-2 text-[var(--text-muted)]' />
          <p className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>
            No se encontraron partidos
          </p>
          <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
            {hasActiveFilters
              ? 'Prueba cambiando o limpiando los filtros seleccionados.'
              : 'Aún no hay partidos programados para este torneo.'}
          </p>
        </div>
      )}
    </div>
  )
}
