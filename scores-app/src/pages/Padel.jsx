import { useState, useEffect } from 'react'
import MatchCard from '../components/match/MatchCard'
import TeamCard from '../components/team/TeamCard'
import SectionHeader from '../components/common/SectionHeader'
import Tabs from '../components/ui/Tabs'
import { useMatches } from '../hooks/useMatches'
import { teamService } from '../services/teamService'

const VIEW_TABS = [
  { value: 'results', label: 'Resultados' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'teams', label: 'Parejas' },
]

export default function Padel() {
  const [view, setView] = useState('results')
  const [teams, setTeams] = useState([])

  const { matches: live } = useMatches({ estado: 'en_vivo', deporte: 'padel' })
  const { matches: finished } = useMatches({ estado: 'finalizado', deporte: 'padel' })
  const { matches: upcoming } = useMatches({ estado: 'programado', deporte: 'padel' })

  useEffect(() => {
    teamService
      .getAll()
      .then((r) => setTeams(r.data || []))
      .catch(() => {})
  }, [])

  return (
    <div className='space-y-5 animate-fade-up'>
      <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
        Pádel
      </h1>
      <Tabs tabs={VIEW_TABS} activeTab={view} onChange={setView} />

      {view === 'results' && (
        <div className='space-y-6'>
          {live.length > 0 && (
            <section>
              <SectionHeader title='En Vivo' />
              <div className='space-y-3'>
                {live.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}
          <section>
            <SectionHeader title='Últimos resultados' />
            <div className='space-y-3'>
              {finished.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
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

      {view === 'teams' && (
        <div className='space-y-3'>
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  )
}
