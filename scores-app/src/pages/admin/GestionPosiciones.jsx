import { useState, useEffect } from 'react'
import { Trophy, RefreshCw } from 'lucide-react'
import { tournamentService } from '../../services/tournamentService'
import { matchService } from '../../services/matchService'
import useUIStore from '../../store/useUIStore'

export default function GestionPosiciones() {
  const [torneos, setTorneos] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [posiciones, setPosiciones] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingTorn, setLoadingTorn] = useState(true)
  const { addToast } = useUIStore()

  useEffect(() => {
    tournamentService
      .getAll()
      .then((r) => {
        const activos = (r.data || []).filter(
          (t) => t.estado === 'en_curso' || t.estado === 'finalizado'
        )
        setTorneos(activos)
        if (activos.length > 0) setSelectedId(String(activos[0].id))
      })
      .catch(() => addToast({ type: 'error', title: 'Error al cargar torneos' }))
      .finally(() => setLoadingTorn(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    calcularPosiciones(selectedId)
  }, [selectedId])

  const calcularPosiciones = async (torneoId) => {
    setLoading(true)
    try {
      const res = await matchService.getAll({ torneo_id: torneoId, estado: 'finalizado' })
      const partidos = res.data || []

      const tabla = {}

      partidos.forEach((p) => {
        const isPadel = p.deporte === 'padel'
        const id1 = isPadel ? p.equipo1?.id : p.jugador1?.id
        const id2 = isPadel ? p.equipo2?.id : p.jugador2?.id
        const nom1 = isPadel
          ? p.equipo1?.nombre
          : `${p.jugador1?.nombre || ''} ${p.jugador1?.apellido || ''}`.trim()
        const nom2 = isPadel
          ? p.equipo2?.nombre
          : `${p.jugador2?.nombre || ''} ${p.jugador2?.apellido || ''}`.trim()

        if (!id1 || !id2) return

        if (!tabla[id1]) tabla[id1] = { id: id1, nombre: nom1, pj: 0, pg: 0, pp: 0, pts: 0 }
        if (!tabla[id2]) tabla[id2] = { id: id2, nombre: nom2, pj: 0, pg: 0, pp: 0, pts: 0 }

        tabla[id1].pj++
        tabla[id2].pj++

        if (p.ganador === 'jugador1') {
          tabla[id1].pg++
          tabla[id1].pts += 3
          tabla[id2].pp++
        } else if (p.ganador === 'jugador2') {
          tabla[id2].pg++
          tabla[id2].pts += 3
          tabla[id1].pp++
        }
      })

      const sorted = Object.values(tabla).sort(
        (a, b) => b.pts - a.pts || b.pg - a.pg || a.pp - b.pp
      )

      setPosiciones(sorted.map((row, i) => ({ ...row, pos: i + 1 })))
    } catch (err) {
      addToast({ type: 'error', title: 'Error al calcular posiciones', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const torneo = torneos.find((t) => String(t.id) === selectedId)

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Tabla de posiciones
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            Calculada a partir de los partidos finalizados
          </p>
        </div>
        {selectedId && (
          <button
            onClick={() => calcularPosiciones(selectedId)}
            className='btn-ghost flex items-center gap-2 text-sm'
          >
            <RefreshCw className='w-4 h-4' />
            Actualizar
          </button>
        )}
      </div>

      {/* Selector de torneo */}
      <div className='form-group'>
        <label className='form-label'>Torneo</label>
        {loadingTorn ? (
          <div className='skeleton h-10 rounded-lg' />
        ) : torneos.length === 0 ? (
          <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
            No hay torneos en curso o finalizados
          </p>
        ) : (
          <select
            className='form-input'
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {torneos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} ({t.estado === 'en_curso' ? 'En curso' : 'Finalizado'})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        Array(4)
          .fill(0)
          .map((_, i) => <div key={i} className='skeleton h-12 rounded-lg' />)
      ) : posiciones.length === 0 ? (
        <div className='card p-12 text-center'>
          <Trophy className='w-10 h-10 mx-auto mb-3' style={{ color: 'var(--text-muted)' }} />
          <p className='text-sm font-medium' style={{ color: 'var(--text-primary)' }}>
            Sin posiciones aún
          </p>
          <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
            Las posiciones se calculan cuando hay partidos finalizados en este torneo
          </p>
        </div>
      ) : (
        <div className='card overflow-hidden'>
          {/* Header */}
          <div
            className='grid grid-cols-6 px-4 py-2 text-xs font-semibold uppercase tracking-wide'
            style={{
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <span>#</span>
            <span className='col-span-2'>Participante</span>
            <span className='text-center'>PJ</span>
            <span className='text-center'>PG</span>
            <span className='text-center font-bold' style={{ color: 'var(--color-brand)' }}>
              PTS
            </span>
          </div>

          {posiciones.map((row, i) => (
            <div
              key={row.id}
              className='grid grid-cols-6 items-center px-4 py-3'
              style={{
                borderBottom: i < posiciones.length - 1 ? '1px solid var(--border-color)' : 'none',
                backgroundColor:
                  row.pos === 1 ? 'rgba(var(--color-brand-rgb), 0.05)' : 'transparent',
              }}
            >
              <span
                className='text-sm font-bold'
                style={{ color: row.pos <= 3 ? 'var(--color-brand)' : 'var(--text-muted)' }}
              >
                {row.pos === 1 ? '🥇' : row.pos === 2 ? '🥈' : row.pos === 3 ? '🥉' : row.pos}
              </span>
              <span
                className='col-span-2 text-sm font-medium truncate'
                style={{ color: 'var(--text-primary)' }}
              >
                {row.nombre}
              </span>
              <span className='text-center text-sm' style={{ color: 'var(--text-secondary)' }}>
                {row.pj}
              </span>
              <span className='text-center text-sm' style={{ color: 'var(--text-secondary)' }}>
                {row.pg}
              </span>
              <span
                className='text-center text-sm font-bold'
                style={{ color: 'var(--color-brand)' }}
              >
                {row.pts}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
