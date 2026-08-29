import { ArrowUpRight, Handshake, MessageCircle, Sparkles } from 'lucide-react'
import { SPONSORS } from '../data/sponsors'

const WHATSAPP_URL =
  'https://wa.me/573003118969?text=Hola%2C%20quiero%20informaci%C3%B3n%20para%20ser%20patrocinador%20del%20torneo%20de%20tenis%20del%20Club%20Uni%C3%B3n.'

export default function Sponsors() {
  return (
    <div className='sponsor-directory animate-fade-up'>
      <section className='sponsor-directory-hero'>
        <div className='sponsor-directory-hero-copy'>
          <span className='sponsor-directory-kicker'>
            <Handshake aria-hidden='true' />
            Nuestros aliados
          </span>
          <h1>Marcas que juegan el torneo con nosotros.</h1>
          <p>
            Reconocemos a las empresas y profesionales que impulsan el deporte y hacen posible
            cada encuentro del Subcomité de Tenis del Club Unión.
          </p>
          <a href={WHATSAPP_URL} target='_blank' rel='noopener noreferrer' className='sponsor-whatsapp-cta'>
            <MessageCircle aria-hidden='true' />
            ¿Quieres ser patrocinador?
            <ArrowUpRight className='sponsor-whatsapp-arrow' aria-hidden='true' />
          </a>
        </div>

        <div className='sponsor-directory-hero-mark' aria-hidden='true'>
          <Sparkles />
          <span>{SPONSORS.length}</span>
          <small>aliados</small>
        </div>
      </section>

      <section aria-labelledby='sponsor-directory-title'>
        <div className='sponsor-directory-heading'>
          <div>
            <span>Comunidad que suma</span>
            <h2 id='sponsor-directory-title'>Conoce a nuestros patrocinadores</h2>
          </div>
          <p>Presentados en el orden oficial del torneo.</p>
        </div>

        <div className='sponsor-directory-grid'>
          {SPONSORS.map((sponsor, index) => (
            <article
              key={sponsor.image}
              className='sponsor-directory-card'
              style={{ '--card-accent': sponsor.accent }}
            >
              <div className='sponsor-directory-image'>
                <img
                  src={sponsor.image}
                  alt={`Patrocinador: ${sponsor.name}`}
                  loading={index < 4 ? 'eager' : 'lazy'}
                />
              </div>
              <div className='sponsor-directory-card-footer'>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{sponsor.name}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className='sponsor-directory-contact'>
        <div>
          <span>Únete a esta comunidad</span>
          <h2>Tu marca también puede hacer parte del próximo punto.</h2>
        </div>
        <a href={WHATSAPP_URL} target='_blank' rel='noopener noreferrer'>
          <MessageCircle aria-hidden='true' />
          Hablar por WhatsApp
        </a>
      </section>
    </div>
  )
}
