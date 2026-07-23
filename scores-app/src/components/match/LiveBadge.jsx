export default function LiveBadge({ time, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} style={{ color: 'var(--color-live)' }}>
      <span className='live-dot' />
      <span className='text-[10px] font-extrabold tracking-[0.12em]'>EN VIVO</span>
      {time && <span className='text-[10px] text-text-secondary'>{time}</span>}
    </div>
  )
}
