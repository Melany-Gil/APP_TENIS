import { cn } from '../../utils/cn'

export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={cn('tabs', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn('tab-item', activeTab === tab.value && 'active')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
