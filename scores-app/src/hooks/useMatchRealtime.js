import { useEffect } from 'react'
import { matchRealtimeService } from '../services/matchRealtimeService'

export function useMatchRealtime(callback) {
  useEffect(() => matchRealtimeService.subscribe(callback), [callback])
}
