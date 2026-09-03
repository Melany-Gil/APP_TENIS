import { useState } from 'react'
import { Link } from 'react-router-dom'
import MatchCard from '../components/match/MatchCard'
import { MatchCardSkeleton } from '../components/ui/Skeleton'
import LiveBadge from '../components/match/LiveBadge'
import EmptyState from '../components/common/EmptyState'
import Tabs from '../components/ui/Tabs'
import { useMatches } from '../hooks/useMatches'
import { Radio, Tv } from 'lucide-react'

const TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'tenis', label: 'Tenis' },
  { value: 'padel', label: 'Pádel' },
]

export default function Live() {
  const [tab, setTab] = useState('all')
  const { matches, loading } = useMatches({ estado: 'en_vivo' })
  const filtered = tab === 'all' ? matches : matches.filter((m) => m.deporte === tab)

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2 mb-0.5'>
            <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
              En Vivo
            </h1>
            <LiveBadge />
          </div>
          <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
            {loading
              ? '...'
              : `${matches.length} partido${matches.length !== 1 ? 's' : ''} en directo`}
          </p>
        </div>
        <Link to='/pantalla' className='btn-secondary px-3 py-2 text-sm' title='Abrir vista para pantalla o TV'>
          <Tv className='w-4 h-4' /> <span className='hidden sm:inline'>Vista pantalla</span>
        </Link>
      </div>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      <div className='space-y-3'>
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => <MatchCardSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map((m) => <MatchCard key={m.id} match={m} />)
        ) : (
          <EmptyState
            icon={Radio}
            title='Sin partidos en vivo'
            description='No hay partidos en este momento.'
          />
        )}
      </div>
    </div>
  )
}
