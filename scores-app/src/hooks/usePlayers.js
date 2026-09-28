import { useState, useEffect } from 'react'
import { playerService } from '../services/playerService'

export function usePlayers(filters = {}) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    playerService
      .getAll(filters)
      .then((res) => setPlayers(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  return { players, loading, error }
}

export function usePlayer(id, tick = 0) {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { setPlayer(null); setLoading(Boolean(id)); setError(null) }, [id])

  useEffect(() => {
    if (!id) return
    let active = true
    setError(null)
    playerService
      .getById(id)
      .then((res) => { if (active) setPlayer(res.data) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, tick])

  return { player, loading, error }
}
