import { cn } from '../../utils/cn'

export default function Skeleton({ className = '' }) {
  return <div className={cn('skeleton', className)} />
}

export function MatchCardSkeleton() {
  return (
    <div className='card p-4 space-y-3'>
      <div className='flex justify-between'>
        <Skeleton className='h-3 w-32' />
        <Skeleton className='h-3 w-12' />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-5 w-5 rounded-full' />
            <Skeleton className='h-3 w-28' />
          </div>
          <Skeleton className='h-5 w-14' />
        </div>
      ))}
    </div>
  )
}
