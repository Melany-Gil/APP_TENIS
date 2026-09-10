import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, Users, User, ArrowRight, AlertCircle, Check } from 'lucide-react'
import { matchService } from '../../services/matchService'
import { teamService } from '../../services/teamService'
import { playerService } from '../../services/playerService'
import { categoriaService } from '../../services/categoriaService'
import useUIStore from '../../store/useUIStore'
import { getParticipantName } from '../../utils/matchParticipants'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export default function ModalSustitucionParticipante({ isOpen, onClose, match, onSuccess }) {
  const { addToast } = useUIStore()
  const [side, setSide] = useState(1) // 1 o 2
  const [categories, setCategories] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')
  const dialogRef = useDialogFocus(isOpen, onClose, saving)
  const [detachSource, setDetachSource] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  const isDoubles = useMemo(() => {
    if (!match) return false
    return Boolean(
      match.modalidad === 'dobles' || match.equipo1?.id || match.equipo2?.id ||
      match.deporte === 'padel' ||
      match.torneo_modalidad === 'dobles'
    )
  }, [match])

  useEffect(() => {
    if (!isOpen || !match) return
    setSide(1)
    const initialCatId = match.categoria?.id ?? match.categoria_id
    setCategoryFilter(initialCatId ? String(initialCatId) : 'todas')
    setSearch('')
    setSelectedId(null)
    setDetachSource(false)
    setError('')
    setLoading(true)

    const sport = match.deporte || 'tenis'

    Promise.all([
      categoriaService.getAll({ deporte: sport }).catch(() => ({ data: [] })),
      isDoubles
        ? teamService.getAll({ deporte: sport, activo: true })
        : playerService.getAll({ deporte: sport, activo: true }),
    ])
      .then(([catRes, itemsRes]) => {
        setCategories(catRes.data || [])
        setItems(itemsRes.data || [])
      })
      .catch((err) => {
        setError(err.message || 'Error al cargar los participantes disponibles')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, match, isDoubles])

  // Identificador actual del otro lado (para no permitir duplicar el mismo participante en ambos lados)
  const otherSideId = useMemo(() => {
    if (!match) return null
    if (isDoubles) {
      return side === 1 ? (match.equipo2?.id ?? match.equipo2_id) : (match.equipo1?.id ?? match.equipo1_id)
    }
    return side === 1 ? (match.jugador2?.id ?? match.jugador2_id) : (match.jugador1?.id ?? match.jugador1_id)
  }, [match, side, isDoubles])

  // Filtrado reactivo por categoría y búsqueda (sin escribir texto libre)
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      // Excluir el que ya está en el otro lado
      if (otherSideId && Number(item.id) === Number(otherSideId)) return false

      // Filtrar por categoría si no es 'todas'
      if (categoryFilter && categoryFilter !== 'todas') {
        if (Number(item.categoria?.id ?? item.categoria_id) !== Number(categoryFilter)) return false
      }

      // Filtrar por texto de búsqueda
      if (!q) return true

      if (isDoubles) {
        const teamName = item.nombre || ''
        const j1 = `${item.jugador1?.nombre || ''} ${item.jugador1?.apellido || ''}`
        const j2 = `${item.jugador2?.nombre || ''} ${item.jugador2?.apellido || ''}`
        const target = `${teamName} ${j1} ${j2}`.toLowerCase()
        return target.includes(q)
      } else {
        const playerName = `${item.nombre || ''} ${item.apellido || ''} ${item.usuario || ''}`.toLowerCase()
        return playerName.includes(q)
      }
    })
  }, [items, otherSideId, categoryFilter, search, isDoubles])

  // Participante seleccionado
  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((it) => Number(it.id) === Number(selectedId)) || null
  }, [items, selectedId])

  if (!isOpen || !match) return null

  const currentParticipantName = getParticipantName(match, side) || `Lado ${side}`

  const handleSave = async () => {
    if (saving || loading) return
    if (!selectedId) {
      setError('Por favor selecciona un participante de la lista')
      return
    }
    setSaving(true)
    setError('')

    try {
      const payload = { lado: side, participante_id: Number(selectedId), expected_control_version: match.control_version, desvincular_origen: detachSource }
      const res = await matchService.substitute(match.id, payload)
      addToast({
        type: 'success',
        title: 'Sustitución exitosa',
        message: `Se ha sustituido al ${side === 1 ? 'Lado 1' : 'Lado 2'} por el participante seleccionado.`,
      })
      if (onSuccess) onSuccess(res.data)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al realizar la sustitución')
    } finally {
      setSaving(false)
    }
  }

  const modalContent = (
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in'
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onClose()}
      role='dialog'
      ref={dialogRef}
      tabIndex={-1}
      aria-label='Sustituir participante'
      aria-modal='true'
    >
      <div
        className='w-full rounded-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-in'
        style={{
          maxWidth: '580px',
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b' style={{ borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-2.5 min-w-0'>
            <div
              className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0'
              style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
            >
              <Users size={20} />
            </div>
            <div className='min-w-0'>
              <h2 className='text-base font-bold truncate leading-tight' style={{ color: 'var(--text-primary)' }}>
                Sustituir {isDoubles ? 'Pareja' : 'Jugador'}
              </h2>
              <p className='text-xs truncate' style={{ color: 'var(--text-muted)' }}>
                {match.deporte?.toUpperCase()} · {match.categoria?.nombre || match.categoria_nombre || 'Categoría general'}
              </p>
            </div>
          </div>
          <button
            type='button'
            className='btn-ghost p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            onClick={onClose}
            disabled={saving}
            aria-label='Cerrar'
          >
            <X size={19} />
          </button>
        </div>

        {/* Content */}
        <div className='p-5 overflow-y-auto space-y-4 flex-1'>
          <p className='text-xs text-[var(--text-muted)]'>Solo se permite sustituir antes del inicio y con un registro activo de la misma categoría y deporte. No se trasladarán estadísticas a otro jugador.</p>
          {match[`origen_partido${side}`]?.id && (
            <label className='flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 text-xs'>
              <input type='checkbox' checked={detachSource} onChange={(e) => setDetachSource(e.target.checked)} />
              Confirmo que este lado dejará de depender del ganador del partido de origen.
            </label>
          )}
          {error && (
            <div className='p-3 rounded-lg text-xs flex items-center gap-2' style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <AlertCircle size={16} className='shrink-0' />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Lado */}
          <div>
            <label className='form-label mb-1.5 block text-xs font-semibold' style={{ color: 'var(--text-muted)' }}>
              ¿A qué lado deseas sustituir?
            </label>
            <div className='grid grid-cols-2 gap-2'>
              <button
                type='button'
                onClick={() => { setSide(1); setSelectedId(null); setDetachSource(false) }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  side === 1
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-dim)] ring-1 ring-[var(--color-brand)]'
                    : 'border-[var(--border-color)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <span className='text-[10px] uppercase tracking-wider font-bold block' style={{ color: 'var(--color-brand)' }}>
                  Lado 1
                </span>
                <strong className='text-xs block truncate mt-0.5' style={{ color: 'var(--text-primary)' }}>
                  {getParticipantName(match, 1) || 'Lado 1'}
                </strong>
              </button>
              <button
                type='button'
                onClick={() => { setSide(2); setSelectedId(null); setDetachSource(false) }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  side === 2
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-dim)] ring-1 ring-[var(--color-brand)]'
                    : 'border-[var(--border-color)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <span className='text-[10px] uppercase tracking-wider font-bold block' style={{ color: 'var(--color-brand)' }}>
                  Lado 2
                </span>
                <strong className='text-xs block truncate mt-0.5' style={{ color: 'var(--text-primary)' }}>
                  {getParticipantName(match, 2) || 'Lado 2'}
                </strong>
              </button>
            </div>
          </div>

          {/* Comparación visual */}
          <div className='p-3 rounded-xl flex items-center justify-between gap-3' style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className='min-w-0 flex-1'>
              <span className='text-[10px] uppercase tracking-wider block' style={{ color: 'var(--text-muted)' }}>
                Actual (Lado {side}):
              </span>
              <span className='text-xs font-semibold block truncate line-through opacity-70' style={{ color: 'var(--text-primary)' }}>
                {currentParticipantName}
              </span>
            </div>
            <ArrowRight size={18} className='text-[var(--color-brand)] shrink-0' />
            <div className='min-w-0 flex-1 text-right'>
              <span className='text-[10px] uppercase tracking-wider block' style={{ color: 'var(--color-brand)' }}>
                Reemplazo:
              </span>
              <span className='text-xs font-bold block truncate' style={{ color: selectedItem ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {selectedItem ? (isDoubles ? selectedItem.nombre : `${selectedItem.nombre} ${selectedItem.apellido}`) : 'Selecciona de la lista'}
              </span>
            </div>
          </div>

          {/* Filtros: Categoría y Buscador */}
          <div className='grid sm:grid-cols-2 gap-2.5 pt-1'>
            <div>
              <label className='form-label mb-1 text-[11px] block'>Filtrar por Categoría</label>
              <select
                className='form-input text-xs'
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value)
                  setSelectedId(null)
                }}
                disabled={loading || saving}
              >
                <option value='todas'>Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='form-label mb-1 text-[11px] block'>
                {isDoubles ? 'Buscar por apellidos / pareja' : 'Buscar por nombre o usuario'}
              </label>
              <div className='relative'>
                <Search size={15} className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' />
                <input
                  type='text'
                  placeholder={isDoubles ? 'Ej. Gómez, Martínez…' : 'Ej. Carlos, @juan…'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='form-input pl-9 text-xs'
                  disabled={loading || saving}
                />
              </div>
            </div>
          </div>

          {/* Lista de selección controlada (sin escritura libre) */}
          <div className='space-y-1.5 max-h-52 overflow-y-auto pr-1 border-t pt-2' style={{ borderColor: 'var(--border-color)' }}>
            {loading ? (
              <p className='text-center py-6 text-xs text-[var(--text-muted)]'>Cargando registros disponibles…</p>
            ) : filteredItems.length === 0 ? (
              <p className='text-center py-6 text-xs text-[var(--text-muted)]'>
                No se encontraron {isDoubles ? 'parejas' : 'jugadores'} con ese filtro.
              </p>
            ) : (
              filteredItems.map((item) => {
                const isSelected = Number(selectedId) === Number(item.id)

                if (isDoubles) {
                  const j1 = `${item.jugador1?.nombre || ''} ${item.jugador1?.apellido || ''}`.trim()
                  const j2 = `${item.jugador2?.nombre || ''} ${item.jugador2?.apellido || ''}`.trim()

                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'border-[var(--color-brand)] bg-[var(--color-brand-dim)]'
                          : 'border-[var(--border-color)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <strong className='text-xs truncate block' style={{ color: 'var(--text-primary)' }}>
                            {item.nombre || `${item.j1_apellido || ''} / ${item.j2_apellido || ''}`}
                          </strong>
                          {item.categoria_nombre && (
                            <span className='text-[10px] px-1.5 py-0.5 rounded font-medium bg-[var(--bg-primary)] text-[var(--text-muted)]'>
                              {item.categoria_nombre}
                            </span>
                          )}
                        </div>
                        <p className='text-[11px] truncate mt-0.5' style={{ color: 'var(--text-muted)' }}>
                          {j1} & {j2}
                        </p>
                      </div>
                      {isSelected && (
                        <div className='w-6 h-6 rounded-full flex items-center justify-center shrink-0' style={{ backgroundColor: 'var(--color-brand)', color: '#000' }}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                } else {
                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'border-[var(--color-brand)] bg-[var(--color-brand-dim)]'
                          : 'border-[var(--border-color)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <strong className='text-xs truncate block' style={{ color: 'var(--text-primary)' }}>
                            {item.nombre} {item.apellido}
                          </strong>
                          {item.categoria_nombre && (
                            <span className='text-[10px] px-1.5 py-0.5 rounded font-medium bg-[var(--bg-primary)] text-[var(--text-muted)]'>
                              {item.categoria_nombre}
                            </span>
                          )}
                        </div>
                        {item.country_name && (
                          <span className='text-[10px] text-[var(--text-muted)] block mt-0.5'>
                            {item.country_flag || ''} {item.country_name}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className='w-6 h-6 rounded-full flex items-center justify-center shrink-0' style={{ backgroundColor: 'var(--color-brand)', color: '#000' }}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                }
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-2 px-5 py-3.5 border-t' style={{ borderColor: 'var(--border-color)' }}>
          <button
            type='button'
            className='btn-ghost text-xs px-4 py-2'
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type='button'
            className='btn-primary text-xs px-5 py-2'
            onClick={handleSave}
            disabled={!selectedId || saving || loading}
          >
            {saving ? 'Guardando…' : 'Confirmar Sustitución'}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}
