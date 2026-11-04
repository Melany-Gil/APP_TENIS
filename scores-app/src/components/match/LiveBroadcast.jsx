import { useEffect, useId, useRef, useState } from 'react'
import { ExternalLink, Maximize2, Minimize2, Radio } from 'lucide-react'
import { useMatches } from '../../hooks/useMatches'
import MatchCard from './MatchCard'
import './LiveBroadcast.css'

let sdk
function loadPlayer() {
  if (window.Twitch?.Player) return Promise.resolve(window.Twitch)
  if (sdk) return sdk
  sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timer = setTimeout(() => fail(), 15000)
    const fail = () => {
      clearTimeout(timer)
      script.remove()
      sdk = null
      reject(new Error('Twitch no respondió'))
    }
    script.src = 'https://player.twitch.tv/js/embed/v1.js'
    script.async = true
    script.onload = () => { clearTimeout(timer); window.Twitch?.Player ? resolve(window.Twitch) : fail() }
    script.onerror = fail
    document.head.appendChild(script)
  })
  return sdk
}
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone:'America/Bogota', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())

export default function LiveBroadcast() {
  const playerId = `twitch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const root = useRef(null), mount = useRef(null), area = useRef(null)
  const [status, setStatus] = useState('checking'), [retry, setRetry] = useState(0)
  const [expanded, setExpanded] = useState(false), [width, setWidth] = useState(640)
  const [date, setDate] = useState(today)
  const { matches, loading, error, refetch } = useMatches({ fecha:date, orden:'asc' })
  const daily = matches.filter(m => ['programado','en_vivo','finalizado'].includes(m.estado))
  const [section, setSection] = useState('all')
  const shown = daily.filter(m => section === 'all' || m.estado === section)
  useEffect(() => {
    const tick = () => { setDate(today()); if (!document.hidden) refetch({silent:true}) }
    const timer = setInterval(tick, 60000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [refetch])
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(area.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    let active = true, player, listeners = []
    const host = mount.current
    setStatus('checking')
    const timeout = setTimeout(() => { if (active) setStatus('unavailable') }, 20000)
    loadPlayer().then(Twitch => {
      if (!active) return
      player = new Twitch.Player(playerId, { channel:'legalbranding', parent:[window.location.hostname], width:'100%', height:'100%', autoplay:true, muted:true })
      const listen = (event, state) => {
        const callback = () => { if (active) { clearTimeout(timeout); setStatus(state) } }
        player.addEventListener(event, callback)
        listeners.push([event,callback])
      }
      listen(Twitch.Player.ONLINE, 'online')
      listen(Twitch.Player.OFFLINE, 'offline')
      listen(Twitch.Player.PLAYING, 'online')
      host.querySelector('iframe')?.setAttribute('title', 'Transmisión de Legal Branding en Twitch')
    }).catch(() => { if (active) { clearTimeout(timeout); setStatus('unavailable') } })
    return () => {
      active = false
      clearTimeout(timeout)
      for (const [event, callback] of listeners) player?.removeEventListener?.(event, callback)
      try { player?.pause() } catch { /* The iframe may already be detached. */ }
      host.replaceChildren()
    }
  }, [retry, playerId])
  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const exit = () => { setExpanded(false); if (document.fullscreenElement === root.current) document.exitFullscreen?.().catch(() => {}) }
    const key = e => { if (e.key === 'Escape') exit() }
    const change = () => { if (!document.fullscreenElement) setExpanded(false) }
    document.addEventListener('keydown', key)
    document.addEventListener('fullscreenchange', change)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', change) }
  }, [expanded])
  const toggle = async () => {
    if (expanded) {
      if (document.fullscreenElement === root.current) await document.exitFullscreen().catch(() => {})
      setExpanded(false)
    } else {
      setExpanded(true)
      try { await root.current.requestFullscreen?.() } catch { /* Expanded view remains available on iOS. */ }
    }
  }
  const playerWidth = Math.max(400, width), playerHeight = Math.max(300, playerWidth * 9 / 16)
  return <section ref={root} className={`broadcast ${expanded ? 'broadcast-expanded' : ''}`} aria-label='Legal Branding TV'>
    <header className='broadcast-heading'>
      <div><span className='broadcast-kicker'><Radio size={14} /> LEGAL BRANDING TV</span><h2>{status === 'online' ? 'En directo desde el club' : 'La jornada del club'}</h2></div>
      <button className='btn-secondary' onClick={toggle} aria-label={expanded ? 'Salir de pantalla completa' : 'Ampliar transmisión y jornada'}>{expanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>
    </header>
    <div ref={area} className={`broadcast-stage ${status === 'online' ? 'is-online' : ''}`} style={status === 'online' ? {height:playerHeight * width / playerWidth} : undefined}>
      <div className='broadcast-player' aria-hidden={status !== 'online'} inert={status !== 'online' ? true : undefined} style={{ width:playerWidth, height:playerHeight, transform:`scale(${width / playerWidth})`, visibility:status === 'online' ? 'visible' : 'hidden' }}><div id={playerId} ref={mount} className='broadcast-mount'/></div>
      {status !== 'online' && <div className='broadcast-offline'>
        <span className='broadcast-date'>{new Date(`${date}T12:00:00-05:00`).toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'})}</span>
        <h3>Partidos de hoy</h3>
        <p role='status'>{status === 'checking' ? 'Conectando con Twitch…' : status === 'offline' ? 'Volveremos aquí cuando comience la transmisión.' : 'No se pudo conectar con Twitch. La jornada sigue disponible.'}</p>
        {status === 'unavailable' && <button className='btn-secondary' onClick={() => setRetry(n => n+1)}>Reintentar transmisión</button>}
      </div>}
    </div>
    <div className='broadcast-links'><span>{status === 'online' ? 'Transmisión en vivo' : status === 'offline' ? 'Canal desconectado' : 'Legal Branding · Twitch'}</span><a href='https://www.twitch.tv/legalbranding' target='_blank' rel='noreferrer'>Abrir Twitch <ExternalLink size={14}/></a></div>
    <div className='broadcast-daily'>
      <div className='broadcast-filters' aria-label='Filtrar jornada'>{[['all','Toda la jornada'],['programado','Programación'],['finalizado','Resultados']].map(([value,label]) => <button key={value} aria-pressed={section===value} onClick={() => setSection(value)}>{label}</button>)}</div>
      {error ? <p role='alert'>{error} <button className='underline' onClick={() => refetch()}>Reintentar</button></p> : loading ? <p role='status'>Cargando jornada…</p> : shown.length ? shown.map(match => <MatchCard key={match.id} match={match}/>) : <p className='broadcast-empty'>{section === 'finalizado' ? 'Todavía no hay resultados de hoy.' : section === 'programado' ? 'No hay partidos pendientes para hoy.' : 'No hay partidos registrados para hoy.'}</p>}
    </div>
  </section>
}
