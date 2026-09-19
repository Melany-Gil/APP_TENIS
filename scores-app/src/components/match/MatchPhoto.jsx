import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Maximize2 } from 'lucide-react'
import { useMatchRealtime } from '../../hooks/useMatchRealtime'
import { getPhoto, photoUrl } from '../../services/matchPhotoService'
import { PHOTOCALL_SPONSORS } from '../../data/photocallSponsors'
import './matchPhoto.css'

export function partitionSponsors(sponsors = []) {
  const total = sponsors.length
  if (total === 0) return { left: [], right: [] }

  const half = Math.ceil(total / 2)
  const left = sponsors.slice(0, half)
  const right = sponsors.slice(half)

  return { left, right }
}

export function chunkHoneycomb(items = []) {
  const total = items.length
  // Si son más de 16 por lado (más de 32 patrocinadores en total),
  // se activa el modo de alta capacidad con filas alternadas de 4 y 3
  const isDense = total > 16
  const baseCounts = isDense ? [4, 3] : [3, 2]

  const rows = []
  let i = 0
  let rowIdx = 0
  while (i < items.length) {
    const count = baseCounts[rowIdx % baseCounts.length]
    const slice = items.slice(i, i + count)
    rows.push({
      id: `row-${rowIdx}`,
      count: slice.length,
      items: slice,
    })
    i += count
    rowIdx++
  }
  return { rows, isDense }
}




export default function MatchPhoto({ matchId, dark = false }) {
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

  const { left, right } = useMemo(() => partitionSponsors(PHOTOCALL_SPONSORS), [])
  const leftHoneycomb = useMemo(() => chunkHoneycomb(left), [left])
  const rightHoneycomb = useMemo(() => chunkHoneycomb(right), [right])

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

  return (
    <section
      className='match-photocall-card'
      aria-label='Foto del partido'
      style={dark ? { borderColor: 'rgba(255,255,255,.16)' } : undefined}
    >
      <div className='match-photocall-header'>
        <div className='match-photocall-title-wrap'>
          <span className='match-photocall-dot' />
          <h2 className='match-photocall-title'>Foto oficial del partido</h2>
        </div>
        <span className='match-photocall-badge'>
          {photo.momento === 'inicio' ? 'Inicio del encuentro' : 'Final del encuentro'}
        </span>
      </div>

      {failed ? (
        <p className='text-sm py-4 text-center text-slate-300'>
          No se pudo cargar la fotografía.{' '}
          <button className='underline font-semibold' onClick={refresh}>
            Reintentar
          </button>
        </p>
      ) : (
        <>
          {/* Escenario Central: Lateral Izquierdo + Foto + Lateral Derecho */}
          <div className='photocall-stage'>
            {/* Costado Izquierdo */}
            <div className='photocall-flank photocall-flank-left' aria-label='Patrocinadores oficiales'>
              <div className='photocall-flank-tag'>
                <span className='photocall-flank-tag-dot' />
                <span>Patrocinadores ({left.length})</span>
              </div>
              <div className={`photocall-honeycomb ${leftHoneycomb.isDense ? 'photocall-honeycomb-dense' : ''}`}>
                {leftHoneycomb.rows.map((row) => (
                  <div
                    key={`left-${row.id}`}
                    className={`photocall-honeycomb-row photocall-honeycomb-row-${row.count}`}
                  >
                    {row.items.map((sponsor, idx) => (
                      <div
                        key={`left-${row.id}-${idx}`}
                        className='photocall-sponsor-tile photocall-tile-pill'
                        title={sponsor.name}
                      >
                        <img src={sponsor.image} alt={sponsor.name} loading='lazy' decoding='async' />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Centro: Fotografía */}
            <div className='photocall-photo-wrapper'>
              <button
                type='button'
                className='photocall-photo-btn'
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? 'Reducir foto' : 'Ampliar foto'}
              >
                <img
                  src={photoUrl(matchId, photo.version, !expanded)}
                  alt='Jugadores del partido'
                  loading='lazy'
                  decoding='async'
                  onError={() => setFailed(true)}
                  className='photocall-photo-img'
                  style={{ maxHeight: expanded ? '80vh' : 420 }}
                />
                <span className='photocall-photo-caption'>
                  <Maximize2 size={13} /> {expanded ? 'Toca para reducir' : 'Toca para ampliar'}
                </span>
              </button>
            </div>

            {/* Costado Derecho */}
            <div className='photocall-flank photocall-flank-right' aria-label='Patrocinadores oficiales'>
              <div className='photocall-flank-tag photocall-flank-tag-right'>
                <span>Patrocinadores ({right.length})</span>
                <span className='photocall-flank-tag-dot' />
              </div>
              <div className={`photocall-honeycomb ${rightHoneycomb.isDense ? 'photocall-honeycomb-dense' : ''}`}>
                {rightHoneycomb.rows.map((row) => (
                  <div
                    key={`right-${row.id}`}
                    className={`photocall-honeycomb-row photocall-honeycomb-row-${row.count}`}
                  >
                    {row.items.map((sponsor, idx) => (
                      <div
                        key={`right-${row.id}-${idx}`}
                        className='photocall-sponsor-tile photocall-tile-pill'
                        title={sponsor.name}
                      >
                        <img src={sponsor.image} alt={sponsor.name} loading='lazy' decoding='async' />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

          </div>



          <div className='photocall-actions'>
            <button
              type='button'
              className='photocall-download-btn'
              disabled={downloading}
              onClick={handleDownload}
            >
              <Download size={14} /> {downloading ? 'Generando…' : 'Descargar foto original'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
