import { useEffect, useMemo, useState } from 'react'

export function useMatchTimer(liveState, status) {
  const [now, setNow] = useState(Date.now())
  const startedAt = liveState?.iniciado_at ? new Date(liveState.iniciado_at).getTime() : null
  const pausedAt = liveState?.pausado_at ? new Date(liveState.pausado_at).getTime() : null
  const finishedAt = liveState?.finalizado_at ? new Date(liveState.finalizado_at).getTime() : null
  const pauseSeconds = Number(liveState?.segundos_pausa || 0)
  const isPaused = Boolean(pausedAt)
  const isStopped = status === 'finalizado' || status === 'cancelado' || Boolean(finishedAt)

  useEffect(() => {
    if (!startedAt || isPaused || isStopped) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, isPaused, isStopped])

  return useMemo(() => {
    if (!startedAt) return { seconds: 0, formatted: '00:00', isPaused, isStopped }
    const reference = finishedAt || pausedAt || now
    const seconds = Math.max(0, Math.floor((reference - startedAt) / 1000) - pauseSeconds)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const rest = seconds % 60
    const formatted = hours
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    return { seconds, formatted, isPaused, isStopped }
  }, [finishedAt, isPaused, isStopped, now, pauseSeconds, pausedAt, startedAt])
}
