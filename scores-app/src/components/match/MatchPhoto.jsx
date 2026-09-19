import { useCallback, useEffect, useState } from 'react'
import { Download, Maximize2 } from 'lucide-react'
import { useMatchRealtime } from '../../hooks/useMatchRealtime'
import { getPhoto, photoUrl } from '../../services/matchPhotoService'
import { PHOTOCALL_SPONSORS } from '../../data/photocallSponsors'
import { getParticipantName } from '../../utils/matchParticipants'
import './matchPhoto.css'

export default function MatchPhoto({ matchId, match, dark = false }) {
  const [photo, setPhoto] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const refresh = useCallback(() => {
    getPhoto(matchId)
      .then((response) => {
        setPhoto(response.data)
        setFailed(false)
      })
      .catch(() => {})
  }, [matchId])

  useEffect(() => {
    let active = true
    setPhoto(null)
    setExpanded(false)
    setFailed(false)
    const load = () =>
      getPhoto(matchId)
        .then((r) => {
          if (active) setPhoto(r.data)
        })
        .catch(() => {})
    load()
    const interval = setInterval(load, 60000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [matchId])

  useMatchRealtime(
    useCallback(
      (event) => {
        if (event.action === 'photo' && Number(event.matchId) === Number(matchId)) refresh()
      },
      [refresh, matchId],
    ),
  )

  const handleDownload = async () => {
    if (!photo || downloading) return
    setDownloading(true)
    try {
      const response = await fetch(photoUrl(matchId, photo.version, false))
      if (!response.ok) throw new Error('No se pudo descargar')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.download = `partido-${matchId}.webp`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      // Fallback a enlace directo
      const link = document.createElement('a')
      link.download = `partido-${matchId}.webp`
      link.href = photoUrl(matchId, photo.version, false)
      link.target = '_blank'
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  if (!photo) return null

  const marker = match?.marcador_actual
  const sets = marker?.sets || []
  const finished = match?.estado === 'finalizado'
  return (
    <section className='match-photocall-card' aria-label='Foto del partido' data-dark={dark || undefined}>
      <header className='match-photocall-header'>
        <div><span className='photocall-kicker'>CLUB UNIÓN · TENIS</span><h2 className='match-photocall-title'>Foto oficial del partido</h2></div>
        <span className='match-photocall-badge'>{photo.momento === 'inicio' ? 'Foto de inicio' : 'Foto de cierre'}</span>
      </header>
      <div className='photocall-photo-wrapper'>
        {failed ? <p role='status'>No se pudo cargar la fotografía. <button onClick={refresh}>Reintentar</button></p> :
          <button type='button' className='photocall-photo-btn' onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Reducir foto' : 'Ampliar foto'}>
            <img src={photoUrl(matchId, photo.version, !expanded)} alt='Jugadores del partido' loading='lazy' decoding='async' onError={() => setFailed(true)} className='photocall-photo-img' style={expanded ? { maxHeight: '80vh' } : undefined} />
            <span className='photocall-expand' aria-hidden='true'><Maximize2 size={15} /></span>
          </button>}
      </div>
      {match && <div className='photocall-score'>
        <div className='photocall-score-meta'><span>{match.torneo?.nombre || 'Encuentro de tenis'}</span><strong>{finished ? 'Resultado final' : match.estado === 'cancelado' ? 'Cancelado' : match.estado === 'en_vivo' ? 'Marcador actual' : 'Programado'}</strong></div>
        <table aria-label='Marcador de la foto'>
          <thead><tr><th>Jugador / pareja</th>{sets.map((set, i) => <th key={i}>{set.type === 'match_tiebreak' ? 'STB' : `S${i + 1}`}</th>)}{!finished && marker && <th>Pts</th>}</tr></thead>
          <tbody>{[1, 2].map((side, i) => <tr key={side}><th scope='row'>{getParticipantName(match, side)}</th>{sets.map((set, index) => <td key={index}>{set.games?.[i] ?? '—'}{set.type !== 'match_tiebreak' && set.tiebreak?.some(Boolean) && <sup>{set.tiebreak[i]}</sup>}</td>)}{!finished && marker && <td>{marker.displayPoints?.[i] ?? '—'}</td>}</tr>)}</tbody>
        </table>
        {!marker && <p className='photocall-score-note'>Marcador no disponible</p>}
        {!finished && marker && <p className='photocall-score-note'>Marcador actual, no necesariamente el del momento de la foto.</p>}
      </div>}
      <div className='photocall-sponsors' aria-label='Patrocinadores oficiales'>
        {PHOTOCALL_SPONSORS.map(sponsor => <div className='photocall-logo' key={sponsor.image} title={sponsor.name}><img src={sponsor.image} alt={sponsor.name} loading='eager' decoding='async' /></div>)}
      </div>
      <div className='photocall-actions'><button type='button' className='photocall-download-btn' disabled={downloading} onClick={handleDownload}><Download size={14} /> {downloading ? 'Descargando…' : 'Descargar foto original'}</button></div>
    </section>
  )
}
