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

export function usePlayer(id) {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    playerService
      .getById(id)
      .then((res) => setPlayer(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { player, loading, error }
}
