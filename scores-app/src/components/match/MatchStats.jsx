import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [view, setView] = useState('chart')
  const sequence = useRef(0)

  const loadStats = useCallback(({ silent = false } = {}) => {
    if (!matchId) return
    const version = ++sequence.current
    if (!silent) setLoading(true)
    matchService.getStats(matchId, selectedSet)
      .then((response) => {
        if (version !== sequence.current) return
        setStats(response.data?.estadisticas || null)
        setTotalSets(Number(response.data?.total_sets || 0))
        setHasCorrections(Boolean(response.data?.tiene_correcciones))
      })
      .catch(() => { if (version === sequence.current) setStats(null) })
      .finally(() => {
        if (version === sequence.current) setLoading(false)
      })
  }, [matchId, selectedSet])

  useEffect(() => {
    loadStats()
    return () => { sequence.current++ }
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
        {selectedSet !== null && <FilterButton active={false} onClick={() => setSelectedSet(null)}>Volver al partido completo</FilterButton>}
        {hasCorrections && <p className='text-xs mt-2'>El marcador contiene una corrección supervisada; no se generan estadísticas de puntos que no fueron registrados.</p>}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {hasCorrections && <p className='text-xs rounded-lg p-3 bg-amber-500/10'>Este marcador tiene correcciones supervisadas. Las estadísticas conservan los puntos registrados y pueden no coincidir con los games corregidos.</p>}
      <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Solo incluye acciones confirmadas por el servidor. Los aces y errores dependen de los motivos registrados por el juez. El porcentaje de primeros saques se calcula sobre los puntos con servicio registrado.</p>
      <div className='flex flex-wrap gap-2' role='group' aria-label='Vista de estadísticas'>
        <FilterButton active={view === 'chart'} onClick={() => setView('chart')}>Comparación gráfica</FilterButton>
        <FilterButton active={view === 'table'} onClick={() => setView('table')}>Tabla de datos</FilterButton>
      </div>
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

      {view === 'chart' ? <div className='space-y-5'>
        <div className='grid grid-cols-2 gap-4 text-xs font-bold'>
          <span style={{ color: 'var(--club-green)' }}>{player1}</span>
          <span className='text-right' style={{ color: 'var(--club-clay)' }}>{player2}</span>
        </div>
        <p className='text-xs' style={{ color: 'var(--text-muted)' }}>Cada fila compara ambos lados en la misma escala. En faltas y errores, un valor menor es mejor. Los motivos no registrados no se pueden deducir.</p>
        {ROWS.map(([label, key, suffix = '']) => {
          const a = stats.jugador1?.[key]
          const b = stats.jugador2?.[key]
          const scale = suffix === '%' ? 100 : Math.max(Number(a) || 0, Number(b) || 0, 1)
          return <div key={key} className='space-y-2'>
            <p className='text-sm font-medium text-center'>{label}</p>
            <div className='grid grid-cols-2 gap-3'>
              {[a, b].map((value, index) => <div key={index}>
                <p className={`text-sm font-bold mb-1 ${index ? 'text-right' : ''}`}>{value == null ? '—' : `${value}${suffix}`}</p>
                <div className='h-2 rounded-full overflow-hidden' style={{ backgroundColor: 'var(--bg-hover)' }} aria-hidden='true'>
                  <div className='h-full rounded-full transition-all duration-300' style={{ width: `${Math.min(100, Math.max(0, Number(value) || 0) / scale * 100)}%`, backgroundColor: index ? 'var(--club-clay)' : 'var(--club-green)' }} />
                </div>
              </div>)}
            </div>
          </div>
        })}
      </div> : <>
      <div className='grid grid-cols-[minmax(120px,1fr)_64px_64px] gap-2 text-xs font-bold pb-1' style={{ color: 'var(--text-muted)' }}>
        <span />
        <span className='text-center break-words'>{player1}</span>
        <span className='text-center break-words'>{player2}</span>
      </div>
      {ROWS.map(([label, key, suffix = '']) => (
        <div key={key} className='grid grid-cols-[minmax(120px,1fr)_64px_64px] gap-2 items-center py-2.5 text-sm' style={{ borderTop: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <strong className='text-center' style={{ color: 'var(--club-green)' }}>{stats.jugador1?.[key] == null ? '—' : `${stats.jugador1[key]}${suffix}`}</strong>
          <strong className='text-center' style={{ color: 'var(--club-clay)' }}>{stats.jugador2?.[key] == null ? '—' : `${stats.jugador2[key]}${suffix}`}</strong>
        </div>
      ))}
      </>}
    </div>
  )
}

function FilterButton({ active, onClick, children }) {
  return (
    <button type='button' aria-pressed={active} onClick={onClick} className='px-3 py-1.5 rounded-full text-xs font-semibold' style={{ backgroundColor: active ? 'var(--color-brand-dim)' : 'var(--bg-hover)', color: active ? 'var(--color-brand)' : 'var(--text-muted)' }}>
      {children}
    </button>
  )
}
