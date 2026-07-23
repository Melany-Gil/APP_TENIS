export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
      {Icon && (
        <div className='empty-icon'>
          <Icon className='w-7 h-7 text-text-muted' />
        </div>
      )}
      <h3 className='text-sm font-semibold text-text-primary mb-1'>{title}</h3>
      {description && <p className='text-xs text-text-secondary max-w-xs'>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}
