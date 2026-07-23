import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { tournamentService } from '../../services/tournamentService'
import { confirm } from '../../utils/confirm'
import useUIStore from '../../store/useUIStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { formatDate } from '../../utils/formatDate'

const DEPORTES = ['tenis', 'padel', 'ambos']
const ESTADOS = [
  { value: 'proximo', label: 'Próximo' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
]
const ESTADO_BADGE = {
  proximo: 'badge-brand',
  en_curso: 'badge-live',
  finalizado: 'badge-atp',
  cancelado: 'badge',
}

export default function GestionTorneos() {
  const [torneos, setTorneos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const fetchAll = () => {
    setLoading(true)
    tournamentService
      .getAll()
      .then((response) => setTorneos(response.data || []))
      .catch(() => addToast({ type: 'error', title: 'Error al cargar datos' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    reset({ estado: 'proximo', deporte: 'tenis' })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (torneo) => {
    setEditing(torneo)
    reset({
      nombre: torneo.nombre,
      deporte: torneo.deporte,
      fecha_inicio: torneo.fecha_inicio?.split('T')[0] || '',
      fecha_fin: torneo.fecha_fin?.split('T')[0] || '',
      estado: torneo.estado,
    })
    setShowForm(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await tournamentService.update(editing.id, data)
        addToast({ type: 'success', title: 'Torneo actualizado' })
      } else {
        await tournamentService.create(data)
        addToast({ type: 'success', title: 'Torneo creado' })
      }
      setShowForm(false)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDelete = async (torneo) => {
    const ok = await confirm({
      title: 'Eliminar torneo',
      message: `Esta acción eliminará permanentemente el torneo "${torneo.nombre}". No se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
      requireText: torneo.nombre,
    })
    if (!ok) return
    try {
      await tournamentService.remove(torneo.id)
      addToast({ type: 'success', title: 'Torneo eliminado' })
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  return (
    <div className='space-y-6 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Torneos
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {torneos.length} torneo{torneos.length !== 1 ? 's' : ''} registrado
            {torneos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
          Nuevo torneo
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className='card p-5 animate-fade-up'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Editar torneo' : 'Nuevo torneo'}
            </h2>
            <button onClick={() => setShowForm(false)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='sm:col-span-2'>
              <Input
                label='Nombre *'
                placeholder='Copa Club Norte 2025'
                error={errors.nombre?.message}
                {...register('nombre', { required: 'Requerido' })}
              />
            </div>

            <div className='form-group'>
              <label className='form-label'>Deporte *</label>
              <select className='form-input' {...register('deporte', { required: true })}>
                {DEPORTES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className='form-group'>
              <label className='form-label'>Estado</label>
              <select className='form-input' {...register('estado')}>
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label='Fecha inicio *'
              type='date'
              error={errors.fecha_inicio?.message}
              {...register('fecha_inicio', { required: 'Requerido' })}
            />
            <Input
              label='Fecha fin *'
              type='date'
              error={errors.fecha_fin?.message}
              {...register('fecha_fin', { required: 'Requerido' })}
            />

            <div className='sm:col-span-2 flex gap-3 pt-2'>
              <Button type='submit' loading={isSubmitting}>
                {editing ? 'Guardar cambios' : 'Crear torneo'}
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className='card overflow-hidden'>
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => <div key={i} className='skeleton h-16 m-3 rounded-lg' />)
        ) : torneos.length === 0 ? (
          <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>
            No hay torneos registrados
          </p>
        ) : (
          torneos.map((t, i) => (
            <div
              key={t.id}
              className='list-row'
              style={{
                borderBottom: i < torneos.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                  {t.nombre}
                </p>
                <div className='flex items-center gap-2 mt-0.5'>
                  <span className={ESTADO_BADGE[t.estado] || 'badge'}>
                    {ESTADOS.find((e) => e.value === t.estado)?.label || t.estado}
                  </span>
                  <span className={t.deporte === 'tenis' ? 'badge-atp' : 'badge-padel'}>
                    {t.deporte}
                  </span>
                  {t.fecha_inicio && (
                    <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                      {formatDate(t.fecha_inicio)} → {formatDate(t.fecha_fin)}
                    </span>
                  )}
                </div>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                <button onClick={() => openEdit(t)} className='btn-ghost p-2'>
                  <Pencil className='w-4 h-4' />
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className='btn-ghost p-2'
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
