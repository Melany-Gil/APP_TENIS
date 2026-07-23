import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, History, Radio, Trophy } from 'lucide-react'
import { useState, useEffect } from 'react'
import MatchCard from '../components/match/MatchCard'
import { MatchCardSkeleton } from '../components/ui/Skeleton'
import SectionHeader from '../components/common/SectionHeader'
import { useMatches } from '../hooks/useMatches'
import { newsService } from '../services/newsService'
import { formatRelative } from '../utils/formatDate'

export default function Home() {
  const { matches: live, loading: ll } = useMatches({ estado: 'en_vivo' })
  const { matches: upcoming, loading: lu } = useMatches({ estado: 'programado' })
  const { matches: finished } = useMatches({ estado: 'finalizado' })
  const [news, setNews] = useState([])

  useEffect(() => {
    newsService
      .getAll()
      .then((r) => setNews(r.data?.slice(0, 4) || []))
      .catch(() => {})
  }, [])

  return (
    <div className='space-y-8 animate-fade-up'>
      <section className='hero-panel'>
        <div className='relative z-10 max-w-2xl'>
          <span className='hero-kicker'>
            <Trophy className='w-3.5 h-3.5' />
            Club Unión · Bucaramanga
          </span>
          <h1 className='text-3xl sm:text-5xl font-extrabold tracking-[-0.05em] leading-[1.08] mt-5 max-w-xl'>
            El torneo del club, punto a punto.
          </h1>
          <p className='text-sm sm:text-base leading-relaxed mt-4 max-w-xl text-white/70'>
            Consulta marcadores en vivo, próximos encuentros y resultados de todas las categorías.
          </p>

          <div className='flex flex-wrap gap-2.5 mt-7'>
            <Link
              to={live.length > 0 ? '/live' : '/tennis'}
              className='inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold'
              style={{ backgroundColor: 'var(--club-green-light)', color: 'var(--club-green-dark)' }}
            >
              <Radio className='w-4 h-4' />
              {live.length > 0 ? 'Ver partidos en vivo' : 'Explorar partidos'}
            </Link>
            <Link
              to='/tennis'
              className='inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold text-white'
              style={{
                backgroundColor: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.14)',
              }}
            >
              Ver historial
              <ChevronRight className='w-4 h-4' />
            </Link>
          </div>

          <div className='flex flex-wrap gap-2.5 mt-8'>
            <HeroStat
              icon={Radio}
              value={ll ? '—' : live.length}
              label='En vivo'
              accent='var(--club-clay)'
            />
            <HeroStat
              icon={CalendarDays}
              value={lu ? '—' : upcoming.length}
              label='Próximos'
              accent='var(--club-green-light)'
            />
            <HeroStat
              icon={History}
              value={finished.length}
              label='Resultados'
              accent='var(--club-white)'
            />
          </div>
        </div>
      </section>

      {(ll || live.length > 0) && (
        <section>
          <SectionHeader
            title='En vivo ahora'
            subtitle={!ll ? `${live.length} partido${live.length !== 1 ? 's' : ''} en directo` : ''}
            action={
              <Link
                to='/live'
                className='flex items-center gap-1 text-xs font-medium'
                style={{ color: 'var(--color-brand)' }}
              >
                Ver todos <ChevronRight className='w-3.5 h-3.5' />
              </Link>
            }
          />
          <div className='space-y-3'>
            {ll
              ? Array(2)
                  .fill(0)
                  .map((_, i) => <MatchCardSkeleton key={i} />)
              : live.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {finished[0] && (
        <section>
          <SectionHeader title='Último resultado' />
          <MatchCard match={finished[0]} />
        </section>
      )}

      {news.length > 0 && (
        <section>
          <SectionHeader title='Anuncios del club' />
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {news.map((n) => (
              <NewsCard key={n.id} article={n} />
            ))}
          </div>
        </section>
      )}

      {(lu || upcoming.length > 0) && (
        <section>
          <SectionHeader
            title='Próximos partidos'
            action={
              <Link
                to='/tennis'
                className='flex items-center gap-1 text-xs font-medium'
                style={{ color: 'var(--color-brand)' }}
              >
                Ver todos <ChevronRight className='w-3.5 h-3.5' />
              </Link>
            }
          />
          <div className='space-y-3'>
            {lu
              ? Array(2)
                  .fill(0)
                  .map((_, i) => <MatchCardSkeleton key={i} />)
              : upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function HeroStat({ icon: Icon, value, label, accent }) {
  return (
    <div className='hero-stat'>
      <div className='flex items-center gap-2'>
        <Icon className='w-3.5 h-3.5' style={{ color: accent }} />
        <span className='text-xl font-extrabold tracking-[-0.04em] text-white'>{value}</span>
      </div>
      <p className='text-[10px] font-semibold text-white/55 mt-1'>{label}</p>
    </div>
  )
}

function NewsCard({ article }) {
  const tipos = {
    noticia: { label: 'Noticia', class: 'badge-atp' },
    evento: { label: 'Evento', class: 'badge-padel' },
    resultado: { label: 'Resultado', class: 'badge-brand' },
    aviso: { label: 'Aviso', class: 'badge-live' },
  }
  const tipo = tipos[article.tipo] || tipos.noticia

  return (
    <div className='card-hover p-4'>
      <div className='flex items-center gap-2 mb-2'>
        <span className={tipo.class}>{tipo.label}</span>
      </div>
      <h3 className='text-sm font-medium leading-snug' style={{ color: 'var(--text-primary)' }}>
        {article.titulo}
      </h3>
      <p className='text-[10px] mt-2' style={{ color: 'var(--text-muted)' }}>
        {formatRelative(article.created_at)}
      </p>
    </div>
  )
}
