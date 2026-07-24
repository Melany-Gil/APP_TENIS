import { useState, useEffect, useCallback, useRef } from 'react'
import { matchService } from '../services/matchService'

export function useMatches(filters = {}) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)
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
  }, [fetch])

  useEffect(() => {
    if (filters.estado !== 'en_vivo') return undefined

    const refresh = () => {
      if (document.visibilityState === 'visible') fetch({ silent: true })
    }
    const intervalId = window.setInterval(refresh, 5000)
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

  const fetch = useCallback(
    async ({ silent = false } = {}) => {
      if (!id) return
      try {
        if (!silent) setLoading(true)
        const res = await matchService.getById(id)
        setMatch(res.data)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id]
  )

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    if (match?.estado !== 'en_vivo') return undefined
    const intervalId = window.setInterval(() => fetch({ silent: true }), 5000)
    return () => window.clearInterval(intervalId)
  }, [fetch, match?.estado])

  return { match, loading, error, refetch: fetch }
}
