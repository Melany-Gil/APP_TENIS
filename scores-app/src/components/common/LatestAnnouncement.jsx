import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { newsService } from '../../services/newsService'

export default function LatestAnnouncement() {
  const [item, setItem] = useState(null)
  useEffect(() => { let active = true; newsService.getAll().then(r => { if (active) setItem(r.data?.[0] || null) }).catch(() => {}); return () => { active = false } }, [])
  return item ? <aside className='card p-4 border-l-4' style={{ borderLeftColor: 'var(--club-clay)' }}><p className='text-xs font-bold uppercase' style={{ color: 'var(--club-clay)' }}>Aviso del club</p><p className='font-semibold mt-1 break-words'>{item.titulo}</p><Link to='/anuncios' className='text-sm underline mt-2 inline-block'>Ver avisos</Link></aside> : null
}
