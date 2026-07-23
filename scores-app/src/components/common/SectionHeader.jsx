export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className='flex items-center justify-between mb-4'>
      <div>
        <h2 className='section-title'>{title}</h2>
        {subtitle && <p className='section-subtitle mt-0.5'>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
