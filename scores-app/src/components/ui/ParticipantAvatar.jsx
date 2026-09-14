import Avatar from './Avatar'

export default function ParticipantAvatar({ team, player, name, size = 'xs' }) {
  if (!team)
    return (
      <Avatar
        src={player?.foto}
        name={name || [player?.nombre, player?.apellido].filter(Boolean).join(' ')}
        size={size}
      />
    )
  return (
    <span
      className='inline-flex items-center shrink-0 isolate'
      aria-label={`Integrantes de ${team.nombre || name || 'la pareja'}`}
    >
      {[team.jugador1, team.jugador2].map((p, i) => (
        <span
          key={p?.id || i}
          className={
            i
              ? '-ml-2 mt-2 relative z-10 rounded-full ring-2 ring-[var(--bg-primary)]'
              : 'relative rounded-full ring-2 ring-[var(--bg-primary)]'
          }
        >
          <Avatar
            src={p?.foto}
            name={p ? [p.nombre, p.apellido].filter(Boolean).join(' ') : `Integrante ${i + 1}`}
            size={size}
          />
        </span>
      ))}
    </span>
  )
}
