import { useEffect, useState } from 'react'
import { matchService } from '../services/matchService'

// Capture a server revision when opening a destructive match action.
export function useMatchClosure(isOpen, match) {
  const matchId = match?.id
  const version = Number(match?.control_version || 0)
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setSnapshot(null)
    setError('')
    if (isOpen && matchId) matchService.getControl(matchId).then(({ data }) => {
      if (!active) return
      if (Number(data.partido.control_version || 0) !== version) {
        setError('El partido cambió. Actualiza la lista antes de continuar.')
        return
      }
      setSnapshot({ expected_revision: data.revision, expected_configuration: data.configuration, expected_control_version: version })
    }).catch(() => {
      if (active) setError('No se pudo verificar el partido. Cierra y vuelve a abrir esta ventana.')
    })
    return () => { active = false }
  }, [isOpen, matchId, version])
  return { snapshot, error }
}
