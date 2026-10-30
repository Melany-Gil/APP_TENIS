import { Link } from 'react-router-dom'
import { Clock, Shuffle, Trophy, Users } from 'lucide-react'

const sections = [
  {
    title: 'Parejas y sorteo', icon: Shuffle,
    text: 'Participan 14 parejas. Se sortean los enfrentamientos, no los integrantes. Con dos canchas, cada pareja juega dos partidos contra rivales diferentes: 14 encuentros en siete turnos. Una pareja no puede jugar en ambas canchas a la vez.',
  },
  {
    title: '20 minutos, hasta dos sets', icon: Clock,
    text: 'El tiempo tiene prioridad. Al cumplirse los 20 minutos termina el partido, aunque el primer set esté incompleto. Si se completan los dos sets antes, el encuentro termina. No se juega un tercer set ni un supertiebreak de definición. Se reservan cinco minutos entre turnos para la rotación.',
  },
  {
    title: 'Puntuación y registro', icon: Users,
    text: 'Se juega por juegos, con punto de oro en 40–40. Al terminar, la persona encargada registra los juegos de cada pareja en cada set y el motivo de cierre: tiempo o dos sets completos. Si no se inició el segundo set, queda sin registrar. No es necesario marcar punto a punto ni completar artificialmente un set al agotarse el tiempo.',
  },
  {
    title: 'El premio es al mejor disfraz', icon: Trophy,
    text: 'Los resultados de los partidos no definen un campeón deportivo ni una clasificación para el premio. El mejor disfraz se elige mediante votación pública en la plataforma, abierta también a personas que no participan en el torneo.',
  },
]

export default function PadelReglamento() {
  return (
    <div className='reglamento-page'>
      <article className='reglamento-sheet' aria-label='Reglamento interno del torneo flash de pádel'>
        <div className='reglamento-watermark' aria-hidden='true' />
        <div className='reglamento-content'>
          <header className='space-y-4'>
            <div className='flex items-center justify-between gap-6'>
              <img src='/branding/legal-branding.png' alt='Legal Branding' className='w-32 sm:w-40 h-16 object-contain' />
              <img src='/branding/escudo-club-union.png' alt='Club Unión' className='w-16 h-16 object-contain' />
            </div>
            <p className='reglamento-kicker'>CLUB UNIÓN · PÁDEL</p>
            <h1 className='text-2xl sm:text-3xl font-bold'>Reglamento interno · Torneo Flash</h1>
            <p className='text-sm text-[var(--text-secondary)]'>Formato de integración y concurso de disfraces.</p>
            <div className='flex flex-wrap gap-2 text-xs'>
              {['14 parejas', '2 canchas', '20 minutos', 'Mejor disfraz'].map(label => <span key={label} className='badge-brand'>{label}</span>)}
            </div>
          </header>
          <div className='reglamento-cards-2'>
            {sections.map(({title, text, icon: Icon}) => (
              <section key={title} className='reglamento-box'>
                <h2 className='font-bold flex items-center gap-2 mb-3'><Icon size={18} className='shrink-0' />{title}</h2>
                <p>{text}</p>
              </section>
            ))}
          </div>
          <section className='reglamento-chapter'>
            <h2 className='reglamento-chapter-title'>Votación por disfraz</h2>
            <ul className='reglamento-list mt-3'>
              <li>La organización abre y cierra la votación. Cada pareja debe tener su foto publicada antes de la apertura.</li>
              <li>Se admite un voto por navegador y por número de teléfono en cada evento. No necesitas una cuenta: se solicita nombre y teléfono.</li>
              <li>El teléfono es declarado, no se verifica por SMS. Este control limita duplicados, pero no acredita la identidad de una persona.</li>
              <li>El nombre y el teléfono no se muestran públicamente; solo los administradores pueden consultar el registro.</li>
              <li>Los conteos permanecen ocultos hasta el cierre y la publicación de resultados. El voto enviado no se puede cambiar.</li>
              <li>En caso de empate en el primer lugar, se define por aplausómetro entre las parejas empatadas. La organización registra la decisión antes de publicar al ganador.</li>
            </ul>
          </section>
          <section className='reglamento-callout'>
            <h2 className='font-bold mb-2'>Programación del evento</h2>
            <p>Consulta los horarios, la pausa y las canchas en la programación publicada. La creación del evento no requiere asignar las canchas físicas: inicialmente se identifican como Pádel 1 y Pádel 2.</p>
          </section>
          <footer className='reglamento-footer'>
            <span>Legal Branding · Club Unión</span>
            <Link className='underline' to='/padel/flash'>Ver torneo flash</Link>
          </footer>
        </div>
      </article>
    </div>
  )
}
