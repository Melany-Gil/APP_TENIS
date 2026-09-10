import { useCallback, useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useMatchRealtime } from '../../hooks/useMatchRealtime'
import { matchService } from '../../services/matchService'

const ROWS = [
  ['Total de puntos ganados', 'puntos_ganados'],
  ['Saques directos (aces)', 'aces'],
  ['Dobles faltas cometidas', 'dobles_faltas'],
  ['Primeros saques válidos', 'porcentaje_primer_servicio', '%'],
  ['Puntos ganados al primer saque', 'puntos_primer_servicio_ganados'],
  ['Puntos ganados al segundo saque', 'puntos_segundo_servicio_ganados'],
  ['Tiros ganadores', 'tiros_ganadores'],
  ['Errores no forzados cometidos', 'errores_no_forzados'],
]

export default function MatchStats({ matchId, player1, player2, initialStats = null }) {
  const [stats, setStats] = useState(initialStats)
  const [totalSets, setTotalSets] = useState(0)
  const [selectedSet, setSelectedSet] = useState(null)
  const [loading, setLoading] = useState(!initialStats)
  const [hasCorrections, setHasCorrections] = useState(false)

  const loadStats = useCallback(({ silent = false } = {}) => {
    if (!matchId) return
    if (!silent) setLoading(true)
    matchService.getStats(matchId, selectedSet)
      .then((response) => {
        setStats(response.data?.estadisticas || null)
        setTotalSets(Number(response.data?.total_sets || 0))
        setHasCorrections(Boolean(response.data?.tiene_correcciones))
      })
      .catch(() => setStats(null))
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [matchId, selectedSet])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useMatchRealtime(useCallback((event) => {
    if (event.matchId === null || Number(event.matchId) === Number(matchId)) {
      loadStats({ silent: true })
    }
  }, [loadStats, matchId]))

  if (loading) return <div className='skeleton h-44 rounded-xl' />
  if (!stats || (!stats.jugador1?.puntos_ganados && !stats.jugador2?.puntos_ganados)) {
    return (
      <div className='text-center py-8' style={{ color: 'var(--text-muted)' }}>
        <BarChart3 className='w-7 h-7 mx-auto mb-2 opacity-40' />
        <p className='text-sm'>Aún no hay estadísticas disponibles.</p>
        {hasCorrections && <p className='text-xs mt-2'>El marcador contiene una corrección supervisada; no se generan estadísticas de puntos que no fueron registrados.</p>}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {hasCorrections && <p className='text-xs rounded-lg p-3 bg-amber-500/10'>Este marcador tiene correcciones supervisadas. Las estadísticas conservan los puntos registrados y pueden no coincidir con los games corregidos.</p>}
      <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Solo incluye acciones confirmadas por el servidor. Los aces y errores dependen de los motivos registrados por el juez. El porcentaje de primeros saques se calcula sobre los puntos con servicio registrado.</p>
      {totalSets > 1 && (
        <div className='flex gap-1.5 flex-wrap'>
          <FilterButton active={selectedSet === null} onClick={() => setSelectedSet(null)}>Partido</FilterButton>
          {Array.from({ length: totalSets }, (_, index) => (
            <FilterButton key={index} active={selectedSet === index + 1} onClick={() => setSelectedSet(index + 1)}>
              Set {index + 1}
            </FilterButton>
          ))}
        </div>
      )}

      <div className='grid grid-cols-[minmax(120px,1fr)_64px_64px] gap-2 text-xs font-bold pb-1' style={{ color: 'var(--text-muted)' }}>
        <span />
        <span className='text-center truncate'>{shortName(player1)}</span>
        <span className='text-center truncate'>{shortName(player2)}</span>
      </div>
      {ROWS.map(([label, key, suffix = '']) => (
        <div key={key} className='grid grid-cols-[minmax(120px,1fr)_64px_64px] gap-2 items-center py-2.5 text-sm' style={{ borderTop: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <strong className='text-center' style={{ color: 'var(--club-green)' }}>{stats.jugador1[key] ?? 0}{suffix}</strong>
          <strong className='text-center' style={{ color: 'var(--club-clay)' }}>{stats.jugador2[key] ?? 0}{suffix}</strong>
        </div>
      ))}
    </div>
  )
}

function FilterButton({ active, onClick, children }) {
  return (
    <button type='button' onClick={onClick} className='px-3 py-1.5 rounded-full text-xs font-semibold' style={{ backgroundColor: active ? 'var(--color-brand-dim)' : 'var(--bg-hover)', color: active ? 'var(--color-brand)' : 'var(--text-muted)' }}>
      {children}
    </button>
  )
}

const shortName = (value) => String(value || 'Jugador').split(' ')[0]
