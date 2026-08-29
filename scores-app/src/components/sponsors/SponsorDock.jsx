import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SPONSORS } from '../../data/sponsors'

const ROTATION_DELAY = 9000

export default function SponsorDock({ defaultMinimized = false }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMinimized, setIsMinimized] = useState(() => {
    if (defaultMinimized) return true
    return window.matchMedia('(max-width: 900px)').matches
  })

  const total = SPONSORS.length
  const activeSponsor = SPONSORS[activeIndex]

  const goPrevious = useCallback(() => {
    setActiveIndex((current) => (current - 1 + total) % total)
  }, [total])

  const goNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % total)
  }, [total])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return undefined
    const timer = window.setTimeout(goNext, ROTATION_DELAY)
    return () => window.clearTimeout(timer)
  }, [activeIndex, goNext, isPaused, prefersReducedMotion])

  if (isMinimized) {
    return (
      <aside
        className='sponsor-dock is-minimized'
        style={{ '--dock-accent': activeSponsor.accent }}
        aria-label='Patrocinador destacado'
      >
        <button
          type='button'
          className='sponsor-dock-pill'
          onClick={() => setIsMinimized(false)}
          aria-label={`Mostrar patrocinador ${activeSponsor.name}`}
        >
          <img src={activeSponsor.image} alt='' aria-hidden='true' />
          <span className='sponsor-dock-pill-copy'>
            <span>Patrocinado por</span>
            <strong>{activeSponsor.name}</strong>
          </span>
          <Maximize2 aria-hidden='true' />
        </button>
      </aside>
    )
  }

  return (
    <aside
      className='sponsor-dock'
      style={{ '--dock-accent': activeSponsor.accent }}
      aria-label='Patrocinador destacado'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
      }}
    >
      <div className='sponsor-dock-card'>
        <div className='sponsor-dock-header'>
          <span>
            <i aria-hidden='true' />
            Patrocinador destacado
          </span>
          <button
            type='button'
            onClick={() => setIsMinimized(true)}
            aria-label='Minimizar patrocinador'
          >
            <Minimize2 aria-hidden='true' />
          </button>
        </div>

        <Link to='/sponsors' className='sponsor-dock-image' aria-label='Ver todos los patrocinadores'>
          <img src={activeSponsor.image} alt={`Patrocinador: ${activeSponsor.name}`} />
        </Link>

        <div className='sponsor-dock-footer'>
          <Link to='/sponsors' className='sponsor-dock-name'>
            <span>Conoce a nuestros aliados</span>
            <strong aria-live='polite'>{activeSponsor.name}</strong>
          </Link>
          <div className='sponsor-dock-arrows'>
            <button type='button' onClick={goPrevious} aria-label='Patrocinador anterior'>
              <ChevronLeft aria-hidden='true' />
            </button>
            <button type='button' onClick={goNext} aria-label='Siguiente patrocinador'>
              <ChevronRight aria-hidden='true' />
            </button>
          </div>
        </div>

        <span
          key={activeIndex}
          className={`sponsor-dock-progress ${isPaused ? 'is-paused' : ''}`}
          style={{ animationDuration: `${ROTATION_DELAY}ms` }}
          aria-hidden='true'
        />
      </div>
    </aside>
  )
}
