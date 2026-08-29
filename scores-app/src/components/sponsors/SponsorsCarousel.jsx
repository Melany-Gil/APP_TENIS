import { ChevronLeft, ChevronRight, Hand } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const AUTOPLAY_DELAY = 5600

const SPONSORS = [
  { name: 'Propiedad Legal Inmobiliaria', image: '/sponsors/72.png', accent: '#171717' },
  { name: 'Coascon Ingeniería y Construcción', image: '/sponsors/73.png', accent: '#ff6935' },
  { name: 'Soluciones Dentales', image: '/sponsors/74.png', accent: '#15358e' },
  { name: 'Legal Branding', image: '/sponsors/75.png', accent: '#202b42' },
  { name: 'Supermercados Más x Menos', image: '/sponsors/4.png', accent: '#2d5688' },
  { name: 'Gente Útil', image: '/sponsors/6.png', accent: '#123ca3' },
  { name: 'Metrollantas', image: '/sponsors/12.png', accent: '#173874' },
  { name: 'Actúa Legal', image: '/sponsors/15.png', accent: '#161616' },
  { name: 'Induleche', image: '/sponsors/19.png', accent: '#ed4b12' },
  { name: 'Choconato Artesanal', image: '/sponsors/23.png', accent: '#694335' },
  { name: 'Cajasan', image: '/sponsors/27.png', accent: '#313f91' },
  { name: 'DIRECTV', image: '/sponsors/32.png', accent: '#159dd2' },
  { name: 'Toscano Producciones', image: '/sponsors/33.png', accent: '#171717' },
  { name: 'Ricuras Marly', image: '/sponsors/34.png', accent: '#2258a4' },
  { name: 'Santur Consultores de Viajes', image: '/sponsors/36.png', accent: '#447ff0' },
  { name: 'Caviisalud', image: '/sponsors/38.png', accent: '#304b19' },
  { name: 'Sandra Quintero Fisioterapia', image: '/sponsors/40.png', accent: '#d9aa27' },
  { name: 'Avicampo', image: '/sponsors/41.png', accent: '#ff891f' },
  { name: 'Porci Campo', image: '/sponsors/42.png', accent: '#bd202b' },
  { name: 'Mercagán Parrilla', image: '/sponsors/44.png', accent: '#bc2028' },
  { name: 'Clínica de la Rodilla', image: '/sponsors/52.png', accent: '#315fa2' },
  { name: 'Laboratorio Bolívar', image: '/sponsors/53.png', accent: '#f36b1c' },
  { name: 'Montessori Jardín Infantil', image: '/sponsors/58.png', accent: '#2a8294' },
  { name: 'SYS Ingeniería y Servicios', image: '/sponsors/59.png', accent: '#18bd9b' },
  { name: 'Tila María Jaimes', image: '/sponsors/62.png', accent: '#35b7b8' },
  { name: 'Hybrid Farma', image: '/sponsors/70.png', accent: '#11b6d0' },
]

function circularOffset(index, activeIndex, total) {
  let offset = index - activeIndex
  if (offset > total / 2) offset -= total
  if (offset < -total / 2) offset += total
  return offset
}

export default function SponsorsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const pointerStart = useRef(null)
  const total = SPONSORS.length

  const goTo = useCallback(
    (index) => {
      setActiveIndex((index + total) % total)
    },
    [total],
  )

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

    const timer = window.setTimeout(goNext, AUTOPLAY_DELAY)
    return () => window.clearTimeout(timer)
  }, [activeIndex, goNext, isPaused, prefersReducedMotion])

  const visibleSponsors = useMemo(
    () =>
      SPONSORS.map((sponsor, index) => ({
        ...sponsor,
        index,
        offset: circularOffset(index, activeIndex, total),
      })).filter(({ offset }) => Math.abs(offset) <= 2),
    [activeIndex, total],
  )

  const handlePointerDown = (event) => {
    if (event.target.closest('button')) return
    pointerStart.current = event.clientX
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerUp = (event) => {
    if (pointerStart.current === null) return
    const distance = event.clientX - pointerStart.current
    pointerStart.current = null

    if (Math.abs(distance) < 44) return
    if (distance > 0) goPrevious()
    else goNext()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goPrevious()
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goNext()
    }
  }

  const activeSponsor = SPONSORS[activeIndex]

  return (
    <section
      className='sponsors-section'
      style={{ '--sponsor-accent': activeSponsor.accent }}
      aria-labelledby='sponsors-title'
    >
      <div className='sponsors-heading'>
        <div>
          <span className='sponsors-kicker'>Patrocinadores</span>
          <h2 id='sponsors-title'>Aliados que hacen posible cada punto.</h2>
        </div>
        <p>Marcas y profesionales que creen en el deporte y acompañan al Club Unión.</p>
      </div>

      <div
        className='sponsors-stage'
        role='region'
        aria-roledescription='carrusel'
        aria-label='Patrocinadores del torneo'
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false)
        }}
      >
        <div className='sponsors-ambient' aria-hidden='true' />

        {visibleSponsors.map((sponsor) => {
          const distance = Math.abs(sponsor.offset)
          const isActive = sponsor.offset === 0

          return (
            <button
              type='button'
              key={sponsor.image}
              className='sponsor-slide'
              data-active={isActive}
              data-distance={distance}
              style={{
                '--slide-shift': `${sponsor.offset * 73}%`,
                '--slide-accent': sponsor.accent,
                zIndex: 4 - distance,
              }}
              aria-label={
                isActive
                  ? `Patrocinador actual: ${sponsor.name}`
                  : `Mostrar patrocinador ${sponsor.name}`
              }
              aria-current={isActive ? 'true' : undefined}
              onClick={() => goTo(sponsor.index)}
            >
              <img
                src={sponsor.image}
                alt={`Patrocinador: ${sponsor.name}`}
                loading={distance > 1 ? 'lazy' : 'eager'}
                draggable='false'
              />
              <span className='sr-only'>{sponsor.name}</span>
            </button>
          )
        })}

        <button
          type='button'
          className='sponsor-arrow sponsor-arrow-left'
          aria-label='Patrocinador anterior'
          onClick={goPrevious}
        >
          <ChevronLeft aria-hidden='true' />
        </button>
        <button
          type='button'
          className='sponsor-arrow sponsor-arrow-right'
          aria-label='Siguiente patrocinador'
          onClick={goNext}
        >
          <ChevronRight aria-hidden='true' />
        </button>
      </div>

      <div className='sponsors-controls'>
        <div className='sponsors-counter' aria-live='polite' aria-atomic='true'>
          <span>{String(activeIndex + 1).padStart(2, '0')}</span>
          <span className='sponsors-counter-divider' />
          <span>{String(total).padStart(2, '0')}</span>
        </div>

        <div className='sponsors-progress' aria-hidden='true'>
          <span
            key={activeIndex}
            className={`sponsors-progress-fill ${isPaused ? 'is-paused' : ''}`}
            style={{ animationDuration: `${AUTOPLAY_DELAY}ms` }}
          />
        </div>

        <span className='sponsors-hint'>
          <Hand aria-hidden='true' />
          Desliza o usa las flechas
        </span>
      </div>
    </section>
  )
}
