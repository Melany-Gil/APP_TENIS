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
      <rect y='4' width='480' height='236' rx='16' fill='#653626' />
      <rect width='480' height='234' rx='14' fill='#984529' />
      <rect x='32' y='26' width='416' height='184' fill={`url(#${paintId}-clay)`} stroke='#fff3e4' strokeWidth='2' />
      <path d='M32 51H448 M32 189H448 M128 51V189 M352 51V189 M128 120H352 M32 116V124 M448 116V124' fill='none' stroke='#fff3e4' strokeWidth='2' />
      <path d='M243 22L253 16V219L243 226Z' fill='#502719' opacity='.2' />
      <path d='M240 17L247 7V213L240 223Z' fill={`url(#${paintId}-net)`} stroke='#f5ead6' strokeWidth='1' />
      <path d='M247 7V213' stroke='#fff8eb' strokeWidth='2.5' />
      <circle cx='50' cy='120' r='7' fill='#143e31' stroke='white' strokeWidth='2' />
      <circle cx='430' cy='120' r='7' fill='#143e31' stroke='white' strokeWidth='2' />
      {match.modalidad === 'dobles' && <><circle cx='165' cy='75' r='6' fill='#143e31' stroke='white' strokeWidth='2' /><circle cx='315' cy='165' r='6' fill='#143e31' stroke='white' strokeWidth='2' /></>}
      <g className='clay-court-ball'><ellipse cx='3' cy='6' rx='7' ry='3' fill='#582f1e' opacity='.3' /><circle r='6' fill={`url(#${paintId}-ball)`} /><path d='M-4 -4Q2 0 -3 5' fill='none' stroke='#ffffdf' strokeWidth='.8' /></g>
    </svg>
    </div>
    <figcaption className='flex flex-wrap justify-between gap-2 text-xs' style={{ color: 'var(--text-muted)' }}><span>Polvo de ladrillo · Animación ilustrativa, no seguimiento real.</span>{live && <button type='button' className='underline' aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? 'Activar animación' : 'Pausar animación'}</button>}</figcaption>
  </figure>
}
