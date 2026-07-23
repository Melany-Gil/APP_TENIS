import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react'
import { categoriaService } from '../../services/categoriaService'
import useUIStore from '../../store/useUIStore'
import { confirm } from '../../utils/confirm'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'

const DEPORTE_TABS = [
  { value: 'todos', label: 'Todas' },
  { value: 'tenis', label: 'Tenis' },
  { value: 'padel', label: 'Pádel' },
  { value: 'ambos', label: 'Ambos' },
]

export default function GestionCategorias() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('todos')
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const fetchAll = () => {
    setLoading(true)
    categoriaService
      .getAll()
      .then((r) => setCategorias(r.data || []))
      .catch(() => addToast({ type: 'error', title: 'Error al cargar categorías' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    reset({ deporte: 'tenis', orden: categorias.length + 1 })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (cat) => {
    setEditing(cat)
    reset({ nombre: cat.nombre, deporte: cat.deporte, orden: cat.orden })
    setShowForm(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await categoriaService.update(editing.id, data)
        addToast({ type: 'success', title: 'Categoría actualizada' })
      } else {
        await categoriaService.create(data)
        addToast({ type: 'success', title: 'Categoría creada' })
      }
      setShowForm(false)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDelete = async (cat) => {
    const ok = await confirm({
      title: 'Eliminar categoría',
      message: `Esta acción eliminará permanentemente la categoría "${cat.nombre}". No se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await categoriaService.remove(cat.id)
      addToast({ type: 'success', title: 'Categoría eliminada' })
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const filtered = tab === 'todos' ? categorias : categorias.filter((c) => c.deporte === tab)

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Categorías
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            Niveles de juego del club ({categorias.length} categorías)
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
          Nueva categoría
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className='card p-5 animate-fade-up'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <button onClick={() => setShowForm(false)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className='form-group'>
              <label className='form-label'>Nombre *</label>
              <input
                className={`form-input ${errors.nombre ? 'error' : ''}`}
                placeholder='Categoría A'
                {...register('nombre', { required: 'Requerido' })}
              />
              {errors.nombre && <p className='form-error'>{errors.nombre.message}</p>}
            </div>

            <div className='form-group'>
              <label className='form-label'>Deporte</label>
              <select className='form-input' {...register('deporte')}>
                <option value='tenis'>Tenis</option>
                <option value='padel'>Pádel</option>
                <option value='ambos'>Ambos</option>
              </select>
            </div>

            <div className='form-group'>
              <label className='form-label'>Orden</label>
              <input
                type='number'
                className='form-input'
                placeholder='1'
                {...register('orden', { min: 1 })}
              />
            </div>

            <div className='sm:col-span-3 flex gap-3'>
              <Button type='submit' loading={isSubmitting}>
                {editing ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <Tabs tabs={DEPORTE_TABS} activeTab={tab} onChange={setTab} />

      {/* Lista */}
      <div className='card overflow-hidden'>
        {loading ? (
          Array(5)
            .fill(0)
            .map((_, i) => <div key={i} className='skeleton h-12 m-3 rounded-lg' />)
        ) : filtered.length === 0 ? (
          <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>
            No hay categorías en esta sección
          </p>
        ) : (
          filtered
            .sort((a, b) => a.orden - b.orden)
            .map((cat, i, arr) => (
              <div
                key={cat.id}
                className='flex items-center gap-3 px-4 py-3'
                style={{
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}
              >
                <GripVertical className='w-4 h-4 shrink-0' style={{ color: 'var(--text-muted)' }} />

                <div
                  className='w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0'
                  style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
                >
                  {cat.orden}
                </div>

                <div className='flex-1 min-w-0'>
                  <span className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                    {cat.nombre}
                  </span>
                </div>

                <span
                  className={
                    cat.deporte === 'tenis'
                      ? 'badge-atp'
                      : cat.deporte === 'padel'
                        ? 'badge-padel'
                        : 'badge-brand'
                  }
                >
                  {cat.deporte}
                </span>

                <div className='flex items-center gap-1 shrink-0'>
                  <button onClick={() => openEdit(cat)} className='btn-ghost p-2'>
                    <Pencil className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
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
