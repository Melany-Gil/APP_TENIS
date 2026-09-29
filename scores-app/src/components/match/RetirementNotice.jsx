import { getParticipantName } from '../../utils/matchParticipants'

export function RetirementBadge() {
  return (
    <span className='inline-flex rounded-full px-2 py-1 text-[10px] font-semibold border border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-secondary)]'>
      Retirado del torneo
    </span>
  )
}

export default function RetirementNotice({ match }) {
  const sides = [1, 2].filter((s) => match?.retiros?.[`jugador${s}`])
  if (!sides.length) return null
  return (
    <div
      className='rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-3 text-xs space-y-1'
      aria-label='Retiros del torneo'
    >
      {sides.map((s) => (
        <p key={s} className='break-words'>
          <strong>{getParticipantName(match, s)}</strong> ·{' '}
          {match.modalidad === 'dobles' ? 'Pareja retirada del torneo' : 'Retirado del torneo'}
        </p>
      ))}
    </div>
  )
}
