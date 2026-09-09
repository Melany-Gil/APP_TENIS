import { useCallback, useEffect, useState } from 'react'
import { useMatchRealtime } from '../../hooks/useMatchRealtime'
import { getPhoto, photoUrl } from '../../services/matchPhotoService'

export default function MatchPhoto({ matchId, dark = false }) {
  const [photo, setPhoto] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [failed, setFailed] = useState(false)
  const refresh = useCallback(() => {
    getPhoto(matchId).then(response => { setPhoto(response.data); setFailed(false) }).catch(() => {})
  }, [matchId])
  useEffect(() => {
    let active = true
    setPhoto(null); setExpanded(false); setFailed(false)
    const load = () => getPhoto(matchId).then(r => { if (active) setPhoto(r.data) }).catch(() => {})
    load()
    const interval = setInterval(load, 60000)
    return () => { active = false; clearInterval(interval) }
  }, [matchId])
  useMatchRealtime(useCallback(event => {
    if (event.action === 'photo' && Number(event.matchId) === Number(matchId)) refresh()
  }, [refresh, matchId]))
  if (!photo) return null
  return <section className='card p-4 my-4' aria-label='Foto del partido' style={dark ? { background: 'rgba(255,255,255,.04)', color: '#fff', borderColor: 'rgba(255,255,255,.12)' } : { color: 'var(--text-primary)' }}>
    <h2 className='font-bold mb-2'>Foto del partido · {photo.momento === 'inicio' ? 'Inicio' : 'Final'}</h2>
    {failed ? <p className='text-sm'>No se pudo cargar la fotografía. <button className='underline' onClick={refresh}>Reintentar</button></p> : <button className='block w-full' onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Reducir foto' : 'Ampliar foto'}>
      <img src={photoUrl(matchId, photo.version, !expanded)} alt='Jugadores del partido' loading='lazy' decoding='async' onError={() => setFailed(true)} className='rounded-xl w-full object-contain' style={{ maxHeight: expanded ? '75vh' : 280 }} />
      <span className='text-xs opacity-70'>{expanded ? 'Toca para reducir' : 'Toca para ampliar'}</span>
    </button>}
  </section>
}
