import { useState, useEffect, useCallback, useRef } from 'react'
import { matchService } from '../services/matchService'
import { useMatchRealtime } from './useMatchRealtime'

export function useMatches(filters = {}) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)
  const refreshTimer = useRef(null)
  const key = JSON.stringify(filters)

  const fetch = useCallback(
    async ({ silent = false } = {}) => {
      const requestId = ++requestIdRef.current
      try {
        if (!silent) setLoading(true)
        setError(null)
        const res = await matchService.getAll(JSON.parse(key))
        if (requestId !== requestIdRef.current) return
        setMatches(res.data || [])
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setError(err.message || 'Error al cargar partidos')
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [key]
  )

  useEffect(() => {
    fetch()
    return () => {
      ++requestIdRef.current
      clearTimeout(refreshTimer.current)
      refreshTimer.current = null
    }
  }, [fetch])

  useMatchRealtime(useCallback(() => {
    if (document.visibilityState !== 'visible' || refreshTimer.current !== null) return
    // Coalesce bursts without dropping changes that add/remove a match from filters.
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      if (document.visibilityState === 'visible') fetch({ silent: true })
    }, 250)
  }, [fetch]))

  useEffect(() => {
    if (filters.estado !== 'en_vivo') return undefined

    const refresh = () => {
      if (document.visibilityState === 'visible') fetch({ silent: true })
    }
    const intervalId = window.setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [fetch, filters.estado])

  return { matches, loading, error, refetch: fetch }
}

export function useMatch(id) {
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)
  const refreshTimer = useRef(null)

  const fetch = useCallback(
    async ({ silent = false } = {}) => {
      if (!id) return
      const requestId = ++requestIdRef.current
      try {
        if (!silent) setLoading(true)
        const res = await matchService.getById(id)
        if (requestId !== requestIdRef.current) return
        setMatch(res.data)
        setError(null)
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setError(err.message)
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    setMatch(null)
    fetch()
    return () => {
      ++requestIdRef.current
      clearTimeout(refreshTimer.current)
      refreshTimer.current = null
    }
  }, [fetch])

  useMatchRealtime(useCallback((event) => {
    if (event.matchId == null || Number(event.matchId) === Number(id)) {
      if (document.visibilityState !== 'visible' || refreshTimer.current !== null) return
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null
        if (document.visibilityState === 'visible') fetch({ silent: true })
      }, 250)
    }
  }, [fetch, id]))

  useEffect(() => {
    if (match?.estado !== 'en_vivo') return undefined
    const refresh = () => { if (document.visibilityState === 'visible') fetch({ silent: true }) }
    const intervalId = window.setInterval(refresh, 30000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(intervalId); document.removeEventListener('visibilitychange', refresh) }
  }, [fetch, match?.estado])

  return { match, loading, error, refetch: fetch }
}
