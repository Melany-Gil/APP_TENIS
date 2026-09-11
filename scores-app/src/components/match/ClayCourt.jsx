import { useEffect, useId, useRef, useState } from 'react'
import './ClayCourt.css'

// Diagrama ilustrativo: nunca altera ni intenta reconstruir el marcador.
export default function ClayCourt({ match }) {
  const paintId = useId().replace(/:/g, '')
  const root = useRef(null)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (root.current) observer.observe(root.current)
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  const live = match.estado === 'en_vivo' && !match.en_vivo?.pausado_at
  const moving = live && visible && pageVisible && !paused
  return <figure ref={root} className='space-y-2'>
    <div className='clay-court-stage'>
    <svg className={`clay-court ${moving ? 'clay-court-moving' : ''}`} viewBox='0 0 480 240' role='img' aria-label='Diagrama ilustrativo de una cancha de polvo de ladrillo'>
      <defs>
        <linearGradient id={`${paintId}-clay`} x1='0' y1='0' x2='1' y2='1'><stop stopColor='#d88557' /><stop offset='0.55' stopColor='#c1663f' /><stop offset='1' stopColor='#a84b2d' /></linearGradient>
        <radialGradient id={`${paintId}-ball`} cx='30%' cy='25%'><stop stopColor='#ffffcf' /><stop offset='.6' stopColor='#e6ed65' /><stop offset='1' stopColor='#aeb52e' /></radialGradient>
        <pattern id={`${paintId}-net`} width='4' height='5' patternUnits='userSpaceOnUse'><rect width='4' height='5' fill='#123e32' fillOpacity='.6' /><path d='M0 0H4M0 0V5' stroke='#fff5df' strokeOpacity='.6' strokeWidth='.6' /></pattern>
      </defs>
      <rect width='480' height='240' rx='18' fill='#a65133' />
      <rect x='32' y='28' width='416' height='184' fill={`url(#${paintId}-clay)`} stroke='#fff3e4' strokeOpacity='.9' strokeWidth='1.8' />
      <path d='M32 51H448 M32 189H448 M128 51V189 M352 51V189 M128 120H352 M32 116V124 M448 116V124' fill='none' stroke='#fff3e4' strokeWidth='2' />
      <rect x='238' y='20' width='5' height='200' rx='2' fill={`url(#${paintId}-net)`} />
      <path d='M240 20V220' stroke='#fff8eb' strokeWidth='1.5' />
      <g className='clay-player clay-player-left'><ellipse cx='2' cy='7' rx='9' ry='4' fill='#643522' opacity='.22' /><rect x='-5' y='-11' width='10' height='22' rx='5' fill='#164b3d' stroke='#f3f2d9' strokeWidth='1.4' /><path d='M-2 -6V3' stroke='#5e9480' strokeWidth='2' strokeLinecap='round' /></g>
      <g className='clay-player clay-player-right'><ellipse cx='2' cy='7' rx='9' ry='4' fill='#643522' opacity='.22' /><rect x='-5' y='-11' width='10' height='22' rx='5' fill='#faf4e3' stroke='#e3d2b8' strokeWidth='1.4' /></g>
      {match.modalidad === 'dobles' && <><g transform='translate(165 78)'><g className='clay-partner'><rect x='-4' y='-9' width='8' height='18' rx='4' fill='#164b3d' stroke='#f3f2d9' /></g></g><g transform='translate(315 162)'><g className='clay-partner clay-partner-right'><rect x='-4' y='-9' width='8' height='18' rx='4' fill='#faf4e3' /></g></g></>}
      <g className='clay-court-ball'>
        <ellipse className='clay-ball-shadow' cx='2' cy='5' rx='6' ry='3' fill='#512b1c' />
        <g className='clay-ball-height'><circle r='6' fill={`url(#${paintId}-ball)`} /><path d='M-4 -4Q2 0 -3 5' fill='none' stroke='#ffffdf' strokeWidth='.8' /><circle cx='-2' cy='-2.5' r='1.4' fill='#ffffef' opacity='.7' /></g>
      </g>
    </svg>
    </div>
    <figcaption className='flex flex-wrap justify-between gap-2 text-xs' style={{ color: 'var(--text-muted)' }}><span>Polvo de ladrillo · Animación ilustrativa, no seguimiento real.</span>{live && <button type='button' className='underline' aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? 'Activar animación' : 'Pausar animación'}</button>}</figcaption>
  </figure>
}
