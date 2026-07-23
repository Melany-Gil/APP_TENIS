import { useState } from 'react'
import MatchCard from '../components/match/MatchCard'
import { MatchCardSkeleton } from '../components/ui/Skeleton'
import LiveBadge from '../components/match/LiveBadge'
import EmptyState from '../components/common/EmptyState'
import Tabs from '../components/ui/Tabs'
import { useMatches } from '../hooks/useMatches'
import { Radio } from 'lucide-react'

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
      <div className='flex items-center gap-3'>
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
