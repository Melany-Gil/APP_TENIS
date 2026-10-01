import { useEffect } from 'react'
import { matchRealtimeService } from '../services/matchRealtimeService'

export function useMatchRealtime(callback, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    return matchRealtimeService.subscribe(callback)
  }, [callback, enabled])
}
