import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import './TennisAtmosphere.css'
export const useAtmosphere = create(
  persist((set) => ({ paused: false, toggle: () => set((s) => ({ paused: !s.paused })) }), {
    name: 'tennis-motion',
  })
)
export function MotionToggle() {
  const { paused, toggle } = useAtmosphere()
  return (
    <button className='btn-ghost text-xs px-3 py-2' aria-pressed={paused} onClick={toggle}>
      {paused ? 'Activar fondo animado' : 'Pausar fondo animado'}
    </button>
  )
}
export default function TennisAtmosphere() {
  const paused = useAtmosphere((s) => s.paused),
    [hidden, setHidden] = useState(document.hidden)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return (
    <div className={`tennis-atmosphere ${paused || hidden ? 'is-paused' : ''}`} aria-hidden='true'>
      <div className='tennis-atmosphere-ball' />
    </div>
  )
}
