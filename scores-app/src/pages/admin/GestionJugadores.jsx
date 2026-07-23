import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import { playerService } from '../../services/playerService'
import { confirm } from '../../utils/confirm'
import useUIStore from '../../store/useUIStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const DEPORTES = ['tenis', 'padel', 'ambos']

export default function GestionJugadores() {
  const [jugadores, setJugadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const fetchAll = () => {
    setLoading(true)
    playerService
      .getAll()
      .then((response) => setJugadores(response.data || []))
      .catch(() => addToast({ type: 'error', title: 'Error al cargar datos' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    reset({ deporte: 'tenis' })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (jugador) => {
    setEditing(jugador)
    reset({
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      deporte: jugador.deporte,
    })
    setShowForm(true)
  }

  const onSubmit = async (data) => {
    try {
      const payload = {
        nombre: data.nombre,
        apellido: data.apellido,
        deporte: data.deporte,
      }
      if (editing) {
        await playerService.update(editing.id, payload)
        addToast({ type: 'success', title: 'Jugador actualizado' })
      } else {
        await playerService.create(payload)
        addToast({ type: 'success', title: 'Jugador creado' })
      }
      setShowForm(false)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDelete = async (jugador) => {
    const ok = await confirm({
      title: 'Eliminar jugador',
      message: `Esta acción eliminará permanentemente a ${jugador.nombre} ${jugador.apellido} y no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
      requireText: `${jugador.nombre} ${jugador.apellido}`,
    })
    if (!ok) return
    try {
      await playerService.remove(jugador.id)
      addToast({ type: 'success', title: 'Jugador eliminado' })
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const filtered = jugadores.filter((j) =>
    `${j.nombre} ${j.apellido}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='space-y-6 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Jugadores
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {jugadores.length} jugador{jugadores.length !== 1 ? 'es' : ''} registrado
            {jugadores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
          Nuevo jugador
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className='card p-5 animate-fade-up'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Editar jugador' : 'Nuevo jugador'}
            </h2>
            <button onClick={() => setShowForm(false)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <Input
              label='Nombre *'
              placeholder='Carlos'
              error={errors.nombre?.message}
              {...register('nombre', { required: 'Requerido' })}
            />
            <Input
              label='Apellido *'
              placeholder='García'
              error={errors.apellido?.message}
              {...register('apellido', { required: 'Requerido' })}
            />
            <div className='form-group'>
              <label className='form-label'>Deporte *</label>
              <select className='form-input' {...register('deporte', { required: 'Requerido' })}>
                <option value=''>Seleccionar</option>
                {DEPORTES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className='sm:col-span-2 flex gap-3 pt-2'>
              <Button type='submit' loading={isSubmitting}>
                {editing ? 'Guardar cambios' : 'Crear jugador'}
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador */}
      <div className='relative'>
        <Search
          className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          className='form-input pl-10'
          placeholder='Buscar jugador...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className='card overflow-hidden'>
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => <div key={i} className='skeleton h-16 m-3 rounded-lg' />)
        ) : filtered.length === 0 ? (
          <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>
            No se encontraron jugadores
          </p>
        ) : (
          filtered.map((j, i) => (
            <div
              key={j.id}
              className='list-row'
              style={{
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <div
                className='w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0'
                style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
              >
                {j.nombre?.charAt(0)}
                {j.apellido?.charAt(0)}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                  {j.nombre} {j.apellido}
                </p>
                <div className='flex items-center gap-2 mt-0.5'>
                  <span
                    className={
                      j.deporte === 'tenis'
                        ? 'badge-atp'
                        : j.deporte === 'padel'
                          ? 'badge-padel'
                          : 'badge-brand'
                    }
                  >
                    {j.deporte}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                <button onClick={() => openEdit(j)} className='btn-ghost p-2'>
                  <Pencil className='w-4 h-4' />
                </button>
                <button
                  onClick={() => handleDelete(j)}
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
