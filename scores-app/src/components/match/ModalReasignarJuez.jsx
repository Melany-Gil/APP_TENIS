import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Search, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react'
import { userService } from '../../services/userService'
import { matchService } from '../../services/matchService'
import useUIStore from '../../store/useUIStore'
import { getParticipantName } from '../../utils/matchParticipants'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export default function ModalReasignarJuez({ isOpen, onClose, match, onSuccess }) {
  const { addToast } = useUIStore()
  const [judges, setJudges] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const initialJudgeId = match?.juez?.id ?? match?.juez_id
  const [selectedJudgeId, setSelectedJudgeId] = useState(initialJudgeId ? String(initialJudgeId) : '')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useDialogFocus(isOpen, onClose, saving)

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !match) return
    const jId = match?.juez?.id ?? match?.juez_id
    setSelectedJudgeId(jId ? String(jId) : '')
    setSearch('')
    setError('')
    setLoading(true)

    userService.getJudges()
      .then((res) => {
        setJudges(res.data || [])
      })
      .catch((err) => {
        setError(err.message || 'No se pudieron cargar los jueces disponibles')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, match])

  const filteredJudges = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return judges
    return judges.filter((j) => {
      const full = `${j.nombre || ''} ${j.apellido || ''} ${j.usuario || ''}`.toLowerCase()
      return full.includes(q)
    })
  }, [judges, search])

  if (!isOpen || !match) return null

  const handleSave = async (e) => {
    e?.preventDefault?.()
    if (saving || loading) return
    setSaving(true)
    setError('')

    try {
      const judgeIdToSend = selectedJudgeId ? Number(selectedJudgeId) : null
      const res = await matchService.reassignJudge(match.id, judgeIdToSend, match.control_version)
      addToast({
        type: 'success',
        title: 'Juez reasignado',
        message: judgeIdToSend
          ? 'El juez del partido se actualizó correctamente.'
          : 'Se retiró la asignación del juez.',
      })
      if (onSuccess) onSuccess(res.data)
      onClose()
    } catch (err) {
      setError(err.message || 'Error al reasignar juez')
    } finally {
      setSaving(false)
    }
  }

  const p1 = getParticipantName(match, 1) || 'Lado 1'
  const p2 = getParticipantName(match, 2) || 'Lado 2'
  const courtDisplayName = match.cancha?.nombre || match.cancha_nombre || 'Cancha por definir'
  const currentJudgeName = match.juez
    ? `${match.juez.nombre || ''} ${match.juez.apellido || ''}`.trim()
    : `${match.juez_nombre || ''} ${match.juez_apellido || ''}`.trim()

  const modalContent = (
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in'
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onClose()}
      role='dialog'
      ref={dialogRef}
      tabIndex={-1}
      aria-label='Reasignar juez de cancha'
      aria-modal='true'
    >
      <div
        className='w-full rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in'
        style={{
          maxWidth: '520px',
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b' style={{ borderColor: 'var(--border-color)' }}>
          <div className='flex items-center gap-2.5 min-w-0'>
            <div className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0' style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}>
              <UserCheck size={20} />
            </div>
            <div className='min-w-0'>
              <h2 className='text-base font-bold truncate leading-tight' style={{ color: 'var(--text-primary)' }}>
                Reasignar Juez de Cancha
              </h2>
              <p className='text-xs truncate' style={{ color: 'var(--text-muted)' }}>
                {courtDisplayName} · {p1} vs {p2}
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
          {error && (
            <div className='p-3 rounded-lg text-xs flex items-center gap-2' style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <AlertCircle size={16} className='shrink-0' />
              <span>{error}</span>
            </div>
          )}

          {/* Juez actual */}
          <div className='p-3 rounded-xl flex items-center justify-between text-xs' style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Juez actualmente asignado:</span>
            <span className='font-bold' style={{ color: 'var(--text-primary)' }}>
              {currentJudgeName || 'Ninguno (Sin asignar)'}
            </span>
          </div>

          {/* Search box */}
          <div className='relative'>
            <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]' />
            <input
              type='text'
              placeholder='Buscar juez por nombre, apellido o usuario…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='form-input pl-9 text-sm'
              disabled={loading || saving}
            />
          </div>

          {/* Judge options list */}
          <div className='space-y-1.5 max-h-56 overflow-y-auto pr-1'>
            {loading ? (
              <p className='text-center py-6 text-xs text-[var(--text-muted)]'>Cargando jueces disponibles…</p>
            ) : filteredJudges.length === 0 ? (
              <p className='text-center py-6 text-xs text-[var(--text-muted)]'>No se encontraron jueces con ese criterio.</p>
            ) : (
              <>
                {/* Opción desasignar */}
                <label
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                    selectedJudgeId === ''
                      ? 'border-[var(--color-brand)] bg-[var(--color-brand-dim)]'
                      : 'border-[var(--border-color)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <input
                    type='radio'
                    name='judge_selection'
                    value=''
                    checked={selectedJudgeId === ''}
                    onChange={() => setSelectedJudgeId('')}
                    disabled={saving}
                    className='accent-[var(--color-brand)]'
                  />
                  <div className='min-w-0 flex-1'>
                    <span className='text-xs font-semibold block text-[var(--text-primary)]'>
                      Sin juez asignado
                    </span>
                    <span className='text-[11px] text-[var(--text-muted)] block'>
                      Un director deberá asignar un juez antes de que este pueda marcarlo
                    </span>
                  </div>
                </label>

                {filteredJudges.map((judge) => {
                  const isCurrent = Number(initialJudgeId) === Number(judge.id)
                  const isSelected = selectedJudgeId === String(judge.id)
                  const roleLabel = judge.rol === 'juez_director' ? 'Director' : judge.rol === 'admin' ? 'Admin' : 'Juez'

                  return (
                    <label
                      key={judge.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                        isSelected
                          ? 'border-[var(--color-brand)] bg-[var(--color-brand-dim)]'
                          : 'border-[var(--border-color)] hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <input
                        type='radio'
                        name='judge_selection'
                        value={String(judge.id)}
                        checked={isSelected}
                        onChange={() => setSelectedJudgeId(String(judge.id))}
                        disabled={saving}
                        className='accent-[var(--color-brand)]'
                      />
                      <div className='min-w-0 flex-1 flex items-center justify-between gap-2'>
                        <div className='min-w-0'>
                          <span className='text-xs font-semibold block truncate text-[var(--text-primary)]'>
                            {judge.nombre} {judge.apellido}
                            {isCurrent && <span className='ml-1.5 text-[10px] text-[var(--color-brand)] font-normal'>(Actual)</span>}
                          </span>
                          <span className='text-[11px] text-[var(--text-muted)] block truncate'>
                            {judge.usuario ? `@${judge.usuario}` : ''}
                          </span>
                        </div>
                        <span
                          className='text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0'
                          style={{
                            backgroundColor:
                              judge.rol === 'juez_director'
                                ? 'rgba(234, 179, 8, 0.15)'
                                : judge.rol === 'admin'
                                ? 'rgba(147, 51, 234, 0.15)'
                                : 'rgba(59, 130, 246, 0.15)',
                            color:
                              judge.rol === 'juez_director'
                                ? '#eab308'
                                : judge.rol === 'admin'
                                ? '#a855f7'
                                : '#3b82f6',
                          }}
                        >
                          {roleLabel}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </>
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
            disabled={loading || saving}
          >
            {saving ? 'Guardando…' : 'Confirmar Reasignación'}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null
}
