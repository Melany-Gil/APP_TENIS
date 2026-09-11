import { useEffect, useRef, useState } from 'react'
import './ClayCourt.css'

// Diagrama ilustrativo: nunca altera ni intenta reconstruir el marcador.
export default function ClayCourt({ match }) {
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
    <svg className={`clay-court ${moving ? 'clay-court-moving' : ''}`} viewBox='0 0 480 240' role='img' aria-label='Diagrama ilustrativo de una cancha de polvo de ladrillo'>
      <rect width='480' height='240' rx='14' fill='#a6492b' />
      <rect x='32' y='28' width='416' height='184' fill='#c5643f' stroke='#fff3e4' strokeWidth='2' />
      <path d='M32 51H448 M32 189H448 M128 51V189 M352 51V189 M128 120H352 M32 116V124 M448 116V124' fill='none' stroke='#fff3e4' strokeWidth='2' />
      <path d='M240 17V223' stroke='#faf5eb' strokeWidth='3' strokeDasharray='4 2' />
      <circle cx='50' cy='120' r='7' fill='#143e31' stroke='white' strokeWidth='2' />
      <circle cx='430' cy='120' r='7' fill='#143e31' stroke='white' strokeWidth='2' />
      {match.modalidad === 'dobles' && <><circle cx='165' cy='75' r='6' fill='#143e31' stroke='white' strokeWidth='2' /><circle cx='315' cy='165' r='6' fill='#143e31' stroke='white' strokeWidth='2' /></>}
      <g className='clay-court-ball'><circle r='5' fill='#e7ee67' stroke='#fffbd5' strokeWidth='1' /></g>
    </svg>
    <figcaption className='flex flex-wrap justify-between gap-2 text-xs' style={{ color: 'var(--text-muted)' }}><span>Polvo de ladrillo · Animación ilustrativa, no seguimiento real.</span>{live && <button type='button' className='underline' aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? 'Activar animación' : 'Pausar animación'}</button>}</figcaption>
  </figure>
}
