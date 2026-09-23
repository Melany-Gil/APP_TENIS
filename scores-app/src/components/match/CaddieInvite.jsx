import { Link } from 'react-router-dom'
import { ArrowUpRight, Star } from 'lucide-react'
import './caddies.css'
export default function CaddieInvite({ matchId }) {
  return (
    <Link
      to={`/caddies?vista=jugador${matchId ? `&partido=${matchId}` : ''}`}
      className='caddie-invite'
    >
      <span className='caddie-eyebrow'>
        <Star size={14} fill='currentColor' /> Tu experiencia cuenta
      </span>
      <h2>
        Fuera del marcador,
        <br />
        tu opinión también juega.
      </h2>
      <p>Cuéntanos cómo te atendió tu caddie y ayúdanos a mejorar cada encuentro.</p>
      <div className='caddie-invite-action'>
        <span>
          Valorar a mi caddie <ArrowUpRight size={18} />
        </span>
        <small>
          3 preguntas
          <br />
          Sin mostrar tu nombre
        </small>
      </div>
    </Link>
  )
}
