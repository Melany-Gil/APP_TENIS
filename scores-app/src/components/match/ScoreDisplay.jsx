import { cn } from '../../utils/cn'

export default function ScoreDisplay({ sets, isWinner, isLive }) {
  if (!sets?.length) return <span className='text-text-muted text-sm'>vs</span>
  const displaySets = Array.from({ length: 3 }, (_, index) => sets[index] ?? '/')

  return (
    <div
      className='flex items-center gap-1.5'
      aria-label={`Marcador por sets: ${displaySets.join(', ')}`}
    >
      {displaySets.map((score, index) => (
        <span
          key={index}
          className={cn(
            'score-number text-base min-w-[1.25rem] text-center',
            isLive && index === sets.length - 1
              ? 'text-text-primary'
              : isWinner
                ? 'text-text-primary'
                : 'text-text-secondary'
          )}
        >
          {score}
        </span>
      ))}
    </div>
  )
}
