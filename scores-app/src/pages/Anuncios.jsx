import { useEffect, useState } from 'react'
import { newsService } from '../services/newsService'
import { getMediaUrl } from '../utils/getMediaUrl'
import { formatDate } from '../utils/formatDate'

export default function Anuncios() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const load = () => { setLoading(true); setError(''); newsService.getAll().then(r => setItems(r.data || [])).catch(() => setError('No se pudieron cargar los avisos.')).finally(() => setLoading(false)) }
  useEffect(load, [])
  const visible = items.filter(a => (!filter || a.tipo === filter) && `${a.titulo} ${a.contenido}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  return <div className='space-y-5'>
    <h1 className='text-2xl font-bold'>Avisos del club</h1>
    <div className='flex flex-wrap gap-3'><label className='flex-1 min-w-0 text-sm'>Buscar<input className='form-input mt-1' value={query} onChange={e => setQuery(e.target.value)} /></label><label className='text-sm'>Tipo<select className='form-input mt-1' value={filter} onChange={e => setFilter(e.target.value)}><option value=''>Todos</option>{['noticia','evento','resultado','aviso'].map(t => <option key={t} value={t}>{t}</option>)}</select></label></div>
    {error && <p role='alert'>{error} <button className='underline' onClick={load}>Reintentar</button></p>}
    {loading ? <div className='skeleton h-44' /> : !visible.length && !error ? <p>No hay avisos en esta selección.</p> : <div className='grid md:grid-cols-2 gap-4'>{visible.map(a => <article key={a.id} className='card p-5 space-y-3 min-w-0'>
      {a.imagen_url && <img src={getMediaUrl(a.imagen_url)} alt={a.titulo} loading='lazy' decoding='async' className='w-full aspect-video object-contain rounded-lg' />}
      <p className='text-xs capitalize' style={{ color: 'var(--text-muted)' }}>{a.tipo} · {formatDate(a.created_at)}</p>
      <h2 className='font-bold text-lg break-words'>{a.titulo}</h2><p className='text-base whitespace-pre-wrap break-words'>{a.contenido}</p>
    </article>)}</div>}
  </div>
}
