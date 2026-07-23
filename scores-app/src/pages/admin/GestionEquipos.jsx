import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { teamService } from '../../services/teamService'
import { playerService } from '../../services/playerService'
import { categoriaService } from '../../services/categoriaService'
import { confirm } from '../../utils/confirm'
import useUIStore from '../../store/useUIStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function GestionEquipos() {
  const [equipos, setEquipos] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [categorias, setCategorias] = useState([])
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
    Promise.all([
      teamService.getAll(),
      playerService.getAll({ deporte: 'padel' }),
      categoriaService.getAll({ deporte: 'padel' }),
    ])
      .then(([e, j, c]) => {
        setEquipos(e.data || [])
        setJugadores(j.data || [])
        setCategorias(c.data || [])
      })
      .catch(() => addToast({ type: 'error', title: 'Error al cargar datos' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    reset({})
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (equipo) => {
    setEditing(equipo)
    reset({
      nombre: equipo.nombre,
      jugador1_id: equipo.jugador1?.id || '',
      jugador2_id: equipo.jugador2?.id || '',
      categoria_id: equipo.categoria?.id || '',
    })
    setShowForm(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await teamService.update(editing.id, data)
        addToast({ type: 'success', title: 'Equipo actualizado' })
      } else {
        await teamService.create(data)
        addToast({ type: 'success', title: 'Equipo creado' })
      }
      setShowForm(false)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDelete = async (equipo) => {
    const ok = await confirm({
      title: 'Eliminar pareja',
      message: `Esta acción eliminará permanentemente la pareja "${equipo.nombre}" y no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
      requireText: equipo.nombre,
    })
    if (!ok) return
    try {
      await teamService.remove(equipo.id)
      addToast({ type: 'success', title: 'Equipo eliminado' })
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
            Equipos de Pádel
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {equipos.length} pareja{equipos.length !== 1 ? 's' : ''} registrada
            {equipos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
          Nueva pareja
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className='card p-5 animate-fade-up'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Editar pareja' : 'Nueva pareja'}
            </h2>
            <button onClick={() => setShowForm(false)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='sm:col-span-2'>
              <Input
                label='Nombre de la pareja *'
                placeholder='García / López'
                error={errors.nombre?.message}
                {...register('nombre', { required: 'Requerido' })}
              />
            </div>

            <div className='form-group'>
              <label className='form-label'>Jugador 1 *</label>
              <select
                className='form-input'
                {...register('jugador1_id', { required: 'Requerido' })}
              >
                <option value=''>Seleccionar jugador</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} {j.apellido}
                  </option>
                ))}
              </select>
              {errors.jugador1_id && <p className='form-error'>{errors.jugador1_id.message}</p>}
            </div>

            <div className='form-group'>
              <label className='form-label'>Jugador 2 *</label>
              <select
                className='form-input'
                {...register('jugador2_id', { required: 'Requerido' })}
              >
                <option value=''>Seleccionar jugador</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nombre} {j.apellido}
                  </option>
                ))}
              </select>
              {errors.jugador2_id && <p className='form-error'>{errors.jugador2_id.message}</p>}
            </div>

            <div className='form-group'>
              <label className='form-label'>Categoría</label>
              <select className='form-input' {...register('categoria_id')}>
                <option value=''>Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className='sm:col-span-2 flex gap-3 pt-2'>
              <Button type='submit' loading={isSubmitting}>
                {editing ? 'Guardar cambios' : 'Crear pareja'}
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
        ) : equipos.length === 0 ? (
          <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>
            No hay equipos registrados
          </p>
        ) : (
          equipos.map((e, i) => (
            <div
              key={e.id}
              className='list-row'
              style={{
                borderBottom: i < equipos.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <div className='flex -space-x-2 shrink-0'>
                {[e.jugador1, e.jugador2].map((j, idx) => (
                  <div
                    key={idx}
                    className='w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2'
                    style={{
                      backgroundColor: 'var(--color-brand-dim)',
                      color: 'var(--color-brand)',
                      borderColor: 'var(--bg-card)',
                    }}
                  >
                    {j?.nombre?.charAt(0)}
                    {j?.apellido?.charAt(0)}
                  </div>
                ))}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                  {e.nombre}
                </p>
                <div className='flex items-center gap-2 mt-0.5'>
                  <span className='badge-padel'>Pádel</span>
                  {e.categoria && (
                    <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                      {e.categoria.nombre}
                    </span>
                  )}
                </div>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                <button onClick={() => openEdit(e)} className='btn-ghost p-2'>
                  <Pencil className='w-4 h-4' />
                </button>
                <button
                  onClick={() => handleDelete(e)}
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
