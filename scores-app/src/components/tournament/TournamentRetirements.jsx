import { useEffect, useState, useMemo } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  History,
  UserMinus,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  Users,
  CheckCircle2,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { tournamentService } from '../../services/tournamentService'
import ParticipantAvatar from '../ui/ParticipantAvatar'
import ModalRetiroParticipante from './ModalRetiroParticipante'
import ModalAuditoriaParticipacion from './ModalAuditoriaParticipacion'
import useAuthStore from '../../store/useAuthStore'

const formatGroupName = (grupo) => {
  if (!grupo) return ''
  const trimmed = String(grupo).trim()
  return /^grupo\b/i.test(trimmed) ? trimmed : `Grupo ${trimmed}`
}

export default function TournamentRetirements({ tournamentId, onChange }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'admin'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos') // 'todos' | 'en_grupo' | 'sin_grupo' | 'retirados'
  const [revision, setRevision] = useState(0)

  // Selección directa por lista desplegable
  const [selectedParticipantKey, setSelectedParticipantKey] = useState('')

  // Control de expansión tipo Home
  const [isListExpanded, setIsListExpanded] = useState(false)
  const INITIAL_CARD_COUNT = 4

  // Modales
  const [selectedAction, setSelectedAction] = useState(null)
  const [showAuditModal, setShowAuditModal] = useState(false)

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      tournamentService.getRetirementParticipants(tournamentId),
      tournamentService.getRetirements(tournamentId),
      tournamentService.getRetirementAudit(tournamentId),
    ])
      .then(([p, s, a]) => {
        if (active) {
          setData({ participants: p.data || [], states: s.data || {}, audit: a.data || [] })
          setLoading(false)
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message || 'No se pudo cargar la información de participación')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [tournamentId, revision, isAdmin])

  const retiredPairsSet = useMemo(() => {
    return new Set(data?.states?.parejas?.map(Number) || [])
  }, [data?.states])

  const retiredPlayersSet = useMemo(() => {
    return new Set(data?.states?.jugadores?.map(Number) || [])
  }, [data?.states])

  const isRetired = (p) => {
    if (p.tipo === 'pareja') return retiredPairsSet.has(Number(p.participante_id))
    return retiredPlayersSet.has(Number(p.participante_id))
  }

  const getParticipantVersion = (p) => {
    const s = data?.states?.estados?.find(
      (e) => e.tipo === p.tipo && Number(e.participante_id) === Number(p.participante_id)
    )
    return Number(s?.version || 0)
  }

  // Categorías presentes
  const availableCategories = useMemo(() => {
    if (!data?.participants) return []
    const map = new Map()
    for (const p of data.participants) {
      if (p.categoria_id && p.categoria_nombre) {
        map.set(String(p.categoria_id), p.categoria_nombre)
      }
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }))
  }, [data?.participants])

  // Contadores
  const totalCount = data?.participants?.length || 0
  const retiredCount = useMemo(() => {
    if (!data?.participants) return 0
    return data.participants.filter(isRetired).length
  }, [data?.participants, retiredPairsSet, retiredPlayersSet])

  const inGroupCount = useMemo(() => {
    if (!data?.participants) return 0
    return data.participants.filter((p) => !isRetired(p) && Boolean(p.grupo)).length
  }, [data?.participants, retiredPairsSet, retiredPlayersSet])

  const unassignedCount = useMemo(() => {
    if (!data?.participants) return 0
    return data.participants.filter((p) => !isRetired(p) && !p.grupo).length
  }, [data?.participants, retiredPairsSet, retiredPlayersSet])

  // Filtrado
  const filteredParticipants = useMemo(() => {
    if (!data?.participants) return []
    return data.participants.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = (p.nombre || '').toLowerCase().includes(q)
        const matchJ1 = `${p.jugador1?.nombre || ''} ${p.jugador1?.apellido || ''}`
          .toLowerCase()
          .includes(q)
        const matchJ2 = `${p.jugador2?.nombre || ''} ${p.jugador2?.apellido || ''}`
          .toLowerCase()
          .includes(q)
        if (!matchName && !matchJ1 && !matchJ2) return false
      }

      if (categoryFilter && String(p.categoria_id) !== String(categoryFilter)) {
        return false
      }

      const retired = isRetired(p)
      const hasGroup = Boolean(p.grupo)
      if (statusFilter === 'en_grupo' && (retired || !hasGroup)) return false
      if (statusFilter === 'sin_grupo' && (retired || hasGroup)) return false
      if (statusFilter === 'retirados' && !retired) return false

      return true
    })
  }, [data?.participants, search, categoryFilter, statusFilter, retiredPairsSet, retiredPlayersSet])

  const handleOpenRetire = (p) => {
    setSelectedAction({
      participant: p,
      isRetiring: true,
      version: getParticipantVersion(p),
    })
  }

  const handleOpenReactivate = (p) => {
    if (p.tipo === 'pareja' && [p.jugador1?.id, p.jugador2?.id].some(id => retiredPlayersSet.has(Number(id)))) {
      setError('Reactiva primero al jugador retirado de esta pareja. Puedes buscarlo por su nombre en esta lista.')
      return
    }
    setSelectedAction({
      participant: p,
      isRetiring: false,
      version: getParticipantVersion(p),
    })
  }

  const handleActionSuccess = () => {
    setSelectedAction(null)
    setRevision((v) => v + 1)
    onChange?.()
  }

  // Participantes agrupados para la lista desplegable
  const categoriesWithParticipants = useMemo(() => {
    if (!data?.participants) return []
    const map = new Map()
    for (const p of data.participants) {
      const catName = p.categoria_nombre || 'Sin categoría'
      if (!map.has(catName)) {
        map.set(catName, [])
      }
      map.get(catName).push(p)
    }
    return Array.from(map.entries()).map(([catName, list]) => ({
      catName,
      list: list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')),
    }))
  }, [data?.participants])

  const selectedParticipant = useMemo(() => {
    if (!selectedParticipantKey || !data?.participants) return null
    return data.participants.find(
      (p) => `${p.tipo}:${p.participante_id}` === selectedParticipantKey
    )
  }, [selectedParticipantKey, data?.participants])

  const visibleParticipants = useMemo(() => {
    if (isListExpanded) return filteredParticipants
    return filteredParticipants.slice(0, INITIAL_CARD_COUNT)
  }, [filteredParticipants, isListExpanded, INITIAL_CARD_COUNT])

  const renderParticipantCard = (p, isFeatured = false) => {
    const retired = isRetired(p)
    const playersText = [p.jugador1, p.jugador2]
      .filter(Boolean)
      .map((j) => `${j.nombre} ${j.apellido || ''}`.trim())
      .join(' · ')

    return (
      <article
        key={`${p.tipo}:${p.participante_id}${isFeatured ? ':featured' : ''}`}
        className={`card p-3.5 border rounded-2xl transition-all flex flex-col justify-between gap-2.5 ${
          isFeatured
            ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/[0.04] ring-1 ring-[var(--color-brand)]/20 shadow-xs'
            : retired
            ? 'border-amber-500/40 bg-amber-500/[0.03]'
            : 'border-[var(--border-color)] hover:border-[var(--color-brand)]/40 hover:shadow-xs'
        }`}
      >
        {/* Cabecera de la tarjeta: Avatar, Nombre y Estado */}
        <div className='flex items-start justify-between gap-2.5'>
          <div className='flex items-center gap-2.5 min-w-0'>
            <ParticipantAvatar
              team={p.tipo === 'pareja' ? p : null}
              player={p.tipo === 'jugador' ? p : null}
              size='xs'
            />
            <div className='min-w-0'>
              <h3 className='font-bold text-sm text-[var(--text-primary)] truncate' title={p.nombre}>
                {p.nombre}
              </h3>
              {playersText && (
                <p className='text-xs text-[var(--text-secondary)] truncate' title={playersText}>
                  {playersText}
                </p>
              )}
            </div>
          </div>

          {/* Badge de Estado */}
          {retired ? (
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'>
              <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />
              Retirado
            </span>
          ) : p.grupo ? (
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
              En competencia
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/25'>
              <span className='w-1.5 h-1.5 rounded-full bg-slate-400' />
              Inscrito (Sin grupo)
            </span>
          )}
        </div>

        {/* Etiquetas de Categoría, Grupo y Estadísticas */}
        <div className='flex items-center gap-1.5 flex-wrap text-[11px] pt-1 border-t border-[var(--border-color)]/60'>
          {p.categoria_nombre && (
            <span className='px-2 py-0.5 rounded-md font-semibold bg-[var(--color-brand)]/10 text-[var(--color-brand)] border border-[var(--color-brand)]/20'>
              {p.categoria_nombre}
            </span>
          )}

          {/* Grupo */}
          {retired ? (
            <span className='px-2 py-0.5 rounded-md font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'>
              Cupo liberado del grupo
            </span>
          ) : p.grupo ? (
            <span className='px-2 py-0.5 rounded-md font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1'>
              <Layers className='w-3 h-3' />
              {formatGroupName(p.grupo)}
            </span>
          ) : (
            <span className='px-2 py-0.5 rounded-md font-medium bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-color)]/50'>
              Sin grupo asignado
            </span>
          )}

          {/* Estadísticas de partidos */}
          <span className='px-2 py-0.5 rounded-md font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)]'>
            {p.pj == null ? 'Historial por partido' : `${p.pj} PJ (${p.pg} PG - ${p.pp} PP)`}
          </span>
        </div>

        {/* Si está retirado, mostrar información del último motivo registrado */}
        {retired && p.ultimo_motivo && (
          <div className='rounded-xl p-2 bg-[var(--bg-card)] border border-amber-500/30 text-xs space-y-0.5'>
            <div className='flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-semibold'>
              <span>Motivo del retiro:</span>
              {p.ultimo_actor && (
                <span className='text-[10px] text-[var(--text-muted)] font-normal'>
                  Por {p.ultimo_actor}
                </span>
              )}
            </div>
            <p className='text-[var(--text-primary)] italic text-[11px] whitespace-pre-wrap'>
              "{p.ultimo_motivo}"
            </p>
          </div>
        )}

        {/* Botón de Acción */}
        <div className='flex items-center justify-end gap-2 pt-1 border-t border-[var(--border-color)]'>
          {retired ? (
            <button
              type='button'
              onClick={() => handleOpenReactivate(p)}
              className='btn-secondary text-xs px-3 py-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1.5'
              title='Reactivar participación en este torneo'
            >
              <RefreshCw className='w-3.5 h-3.5' />
              Reactivar en torneo
            </button>
          ) : (
            <button
              type='button'
              onClick={() => handleOpenRetire(p)}
              className='btn-secondary text-xs px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:border-amber-500/40 flex items-center gap-1.5'
              title={
                p.grupo
                  ? 'Retirar del torneo y liberar su cupo en el grupo'
                  : 'Retirar del torneo (inscripción sin grupo)'
              }
            >
              <UserMinus className='w-3.5 h-3.5' />
              Retirar del torneo
            </button>
          )}
        </div>
      </article>
    )
  }

  if (!isAdmin) {
    return (
      <div className='card p-6 text-center space-y-2 border border-red-500/20 bg-red-500/5 rounded-2xl'>
        <ShieldAlert className='w-8 h-8 mx-auto text-red-500' />
        <h3 className='font-bold text-sm text-[var(--text-primary)]'>Acceso Restringido</h3>
        <p className='text-xs text-[var(--text-muted)]'>
          La gestión de participación y retiros solo está disponible para administradores del torneo.
        </p>
      </div>
    )
  }

  return (
    <section className='space-y-3.5 min-w-0'>
      {/* Cabecera compacta con diseño original */}
      <header className='card p-3.5 sm:p-4 bg-[var(--bg-hover)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-3 min-w-0'>
          <div className='p-2 rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] shrink-0'>
            <ShieldCheck className='w-5 h-5 sm:w-6 sm:h-6' />
          </div>
          <div className='min-w-0'>
            <h2 className='font-bold text-base sm:text-lg text-[var(--text-primary)] truncate'>
              Participación y Retiros
            </h2>
            <p className='text-xs text-[var(--text-secondary)] truncate'>
              Libera cupos en el grupo sin perder partidos ni estadísticas
            </p>
          </div>
        </div>

        <button
          type='button'
          onClick={() => setShowAuditModal(true)}
          className='btn-secondary px-3 py-1.5 text-xs flex items-center justify-center gap-1.5 rounded-xl shrink-0 self-start sm:self-center'
          title='Ver bitácora de auditoría'
        >
          <History className='w-3.5 h-3.5 text-[var(--color-brand)]' />
          <span>Auditoría de Retiros</span>
          {data?.audit?.length > 0 && (
            <span className='px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--color-brand)]/20 text-[var(--color-brand)]'>
              {data.audit.length}
            </span>
          )}
        </button>
      </header>

      {/* Métricas KPI compactas (2 columnas en móvil, 4 en desktop) */}
      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
        <div className='card p-2.5 sm:p-3 border border-[var(--border-color)] flex items-center gap-2.5'>
          <div className='p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0'>
            <Users className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10px] sm:text-xs text-[var(--text-secondary)] truncate'>Inscritos</p>
            <p className='text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight'>
              {totalCount}
            </p>
          </div>
        </div>

        <div className='card p-2.5 sm:p-3 border border-[var(--border-color)] flex items-center gap-2.5'>
          <div className='p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0'>
            <Layers className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10px] sm:text-xs text-[var(--text-secondary)] truncate'>En grupos</p>
            <p className='text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 leading-tight'>
              {inGroupCount}
            </p>
          </div>
        </div>

        <div className='card p-2.5 sm:p-3 border border-[var(--border-color)] flex items-center gap-2.5'>
          <div className='p-1.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 shrink-0'>
            <AlertCircle className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10px] sm:text-xs text-[var(--text-secondary)] truncate'>Sin grupo</p>
            <p className='text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400 leading-tight'>
              {unassignedCount}
            </p>
          </div>
        </div>

        <div className='card p-2.5 sm:p-3 border border-[var(--border-color)] flex items-center gap-2.5'>
          <div className='p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0'>
            <UserMinus className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <p className='text-[10px] sm:text-xs text-[var(--text-secondary)] truncate'>Retiradas</p>
            <p className='text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 leading-tight'>
              {retiredCount}
            </p>
          </div>
        </div>
      </div>

      {/* 1. Selector Rápido en Lista Desplegable (Limpio, nativo y sin buscador intrusivo) */}
      <div className='card p-3 sm:p-3.5 space-y-2.5 border border-[var(--border-color)] bg-[var(--bg-hover)]/30 rounded-2xl'>
        <div className='flex items-center justify-between gap-2'>
          <label
            htmlFor='quick-participant-select'
            className='text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5'
          >
            <Users className='w-4 h-4 text-[var(--color-brand)]' />
            <span>Seleccionar participante en la lista desplegable</span>
          </label>
          {selectedParticipantKey && (
            <button
              type='button'
              onClick={() => setSelectedParticipantKey('')}
              className='text-[11px] text-[var(--color-brand)] hover:underline flex items-center gap-1 font-semibold'
            >
              <X className='w-3.5 h-3.5' /> Limpiar selección
            </button>
          )}
        </div>

        <div className='relative'>
          <select
            id='quick-participant-select'
            className='form-input w-full text-xs sm:text-sm py-2.5 pl-3 pr-8 rounded-xl bg-[var(--bg-card)] border-[var(--border-color)] font-medium cursor-pointer shadow-xs focus:ring-2 focus:ring-[var(--color-brand)]/20'
            value={selectedParticipantKey}
            onChange={(e) => setSelectedParticipantKey(e.target.value)}
          >
            <option value=''>Selecciona entre {totalCount} participantes</option>
            {categoriesWithParticipants.map(({ catName, list }) => (
              <optgroup key={catName} label={`CATEGORÍA: ${catName.toUpperCase()}`}>
                {list.map((p) => {
                  const retired = isRetired(p)
                  const groupTag = retired
                    ? 'Cupo liberado'
                    : p.grupo
                    ? formatGroupName(p.grupo)
                    : 'Sin grupo asignado'
                  const statusTag = retired
                    ? '❌ Retirado'
                    : p.grupo
                    ? '✓ En competencia'
                    : '⏳ Inscrito (Sin grupo)'
                  return (
                    <option
                      key={`${p.tipo}:${p.participante_id}`}
                      value={`${p.tipo}:${p.participante_id}`}
                    >
                      {p.nombre} · {groupTag} · {statusTag}
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Tarjeta del participante seleccionado en la desplegable */}
        {selectedParticipant && (
          <div className='pt-2 space-y-1.5'>
            <div className='flex items-center justify-between text-[11px] font-semibold text-[var(--color-brand)]'>
              <span className='flex items-center gap-1'>
                <CheckCircle2 className='w-3.5 h-3.5' /> Participante seleccionado:
              </span>
              <span className='text-[10px] text-[var(--text-muted)] font-normal'>Listo para gestionar</span>
            </div>
            {renderParticipantCard(selectedParticipant, true)}
          </div>
        )}
      </div>

      {/* Barra de Filtros compacta y sencilla */}
      <div className='card p-3 space-y-2.5 border border-[var(--border-color)]'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
          {/* Buscador */}
          <div className='relative sm:col-span-2'>
            <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' />
            <input
              type='text'
              className='form-input w-full pl-8 pr-7 text-xs py-1.5 rounded-xl'
              placeholder='Buscar pareja o jugador…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type='button'
                onClick={() => setSearch('')}
                className='absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            )}
          </div>

          {/* Categoría */}
          <div>
            <select
              aria-label='Filtrar por categoría'
              className='form-input w-full text-xs py-1.5 rounded-xl'
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value=''>Todas las categorías</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pestañas de estado compactas */}
        <div className='flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[var(--border-color)]/60 text-xs'>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <button
              type='button'
              onClick={() => setStatusFilter('todos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors text-xs ${
                statusFilter === 'todos'
                  ? 'bg-[var(--color-brand)] text-white shadow-xs'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              type='button'
              onClick={() => setStatusFilter('en_grupo')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors text-xs ${
                statusFilter === 'en_grupo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              En grupos ({inGroupCount})
            </button>
            <button
              type='button'
              onClick={() => setStatusFilter('sin_grupo')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors text-xs ${
                statusFilter === 'sin_grupo'
                  ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-xs'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sin grupo ({unassignedCount})
            </button>
            <button
              type='button'
              onClick={() => setStatusFilter('retirados')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors text-xs ${
                statusFilter === 'retirados'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Retiradas ({retiredCount})
            </button>
          </div>

          <span className='text-[var(--text-muted)] text-[11px]'>
            {filteredParticipants.length} mostradas
          </span>
        </div>
      </div>

      {/* Manejo de errores */}
      {error && (
        <div role='alert' className='card p-3 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl'>
          {error}
        </div>
      )}

      {/* Listado de Tarjetas: Diseño limpio y estructurado que gustaba */}
      {loading ? (
        <div className='card p-6 text-center text-xs text-[var(--text-muted)] rounded-2xl'>
          <RefreshCw className='w-4 h-4 mx-auto animate-spin mb-1.5 text-[var(--color-brand)]' />
          Cargando participantes…
        </div>
      ) : !filteredParticipants.length ? (
        <div className='card p-8 text-center space-y-1.5 text-[var(--text-muted)] border border-[var(--border-color)] rounded-2xl'>
          <AlertCircle className='w-6 h-6 mx-auto opacity-40' />
          <p className='font-semibold text-xs text-[var(--text-primary)]'>No hay participantes coincidentes</p>
          <p className='text-[11px]'>Prueba ajustando los filtros o la búsqueda.</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {/* Cabecera del bloque de tarjetas con contador y botón para expandir/recoger */}
          <div className='flex items-center justify-between text-xs px-1'>
            <span className='font-semibold text-[var(--text-primary)]'>
              Tarjetas de participantes{' '}
              <span className='text-[var(--text-muted)] font-normal'>
                ({isListExpanded
                  ? `${filteredParticipants.length} en total`
                  : `mostrando ${visibleParticipants.length} de ${filteredParticipants.length}`})
              </span>
            </span>

            {filteredParticipants.length > INITIAL_CARD_COUNT && (
              <button
                type='button'
                onClick={() => setIsListExpanded(!isListExpanded)}
                className='text-xs font-semibold text-[var(--color-brand)] hover:underline flex items-center gap-1'
              >
                {isListExpanded ? (
                  <>
                    <span>Recoger</span>
                    <ChevronUp className='w-3.5 h-3.5' />
                  </>
                ) : (
                  <>
                    <span>Ver todas</span>
                    <ChevronDown className='w-3.5 h-3.5' />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Rejilla de tarjetas */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
            {visibleParticipants.map((p) => renderParticipantCard(p, false))}
          </div>

          {/* Botón inferior grande estilo Inicio para Recoger / Ver más */}
          {filteredParticipants.length > INITIAL_CARD_COUNT && (
            <button
              type='button'
              onClick={() => setIsListExpanded(!isListExpanded)}
              className='w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-primary)] hover:border-[var(--color-brand)] shadow-xs'
            >
              {isListExpanded ? (
                <>
                  <span>Recoger lista de participantes</span>
                  <ChevronUp className='w-4 h-4 text-[var(--color-brand)]' />
                </>
              ) : (
                <>
                  <span>
                    Ver más participantes (+{filteredParticipants.length - INITIAL_CARD_COUNT} restantes)
                  </span>
                  <ChevronDown className='w-4 h-4 text-[var(--color-brand)]' />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Modal de Acción (Retirar o Reactivar) */}
      {selectedAction && (
        <ModalRetiroParticipante
          isOpen={Boolean(selectedAction)}
          onClose={() => setSelectedAction(null)}
          participant={selectedAction.participant}
          tournamentId={tournamentId}
          isRetiring={selectedAction.isRetiring}
          currentVersion={selectedAction.version}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Modal de Auditoría */}
      {showAuditModal && (
        <ModalAuditoriaParticipacion
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          audit={data?.audit || []}
        />
      )}
    </section>
  )
}
