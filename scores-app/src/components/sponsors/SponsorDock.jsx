import { useEffect, useState } from 'react'
import { SPONSORS } from '../../data/sponsors'

export default function SponsorDock() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (reducedMotion || SPONSORS.length < 2) return
    const timer = window.setInterval(() => setActiveIndex(index => (index + 1) % SPONSORS.length), 9000)
    return () => window.clearInterval(timer)
  }, [reducedMotion])
  const sponsor = SPONSORS[activeIndex]
  if (!sponsor) return null
  return (
    <aside className='sponsor-dock is-minimized' style={{ '--dock-accent': sponsor.accent }} aria-label='Patrocinador destacado'>
      <div className='sponsor-dock-pill' style={{ cursor: 'default' }}>
        <img src={sponsor.image} alt='' aria-hidden='true' loading='lazy' decoding='async' />
        <span className='sponsor-dock-pill-copy'>
          <span>Patrocinado por</span>
          <strong>{sponsor.name}</strong>
        </span>
      </div>
    </aside>
  )
}
