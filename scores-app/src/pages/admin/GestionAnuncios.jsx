import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { newsService } from '../../services/newsService'
import useUIStore from '../../store/useUIStore'
import { confirm } from '../../utils/confirm'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import { formatRelative } from '../../utils/formatDate'

const TIPOS = [
  { value: 'noticia', label: 'Noticia' },
  { value: 'evento', label: 'Evento' },
  { value: 'resultado', label: 'Resultado' },
  { value: 'aviso', label: 'Aviso' },
]

const TIPO_BADGE = {
  noticia: 'badge-atp',
  evento: 'badge-padel',
  resultado: 'badge-brand',
  aviso: 'badge-live',
}

const FILTER_TABS = [
  { value: 'todos', label: 'Todos' },
  { value: 'noticia', label: 'Noticias' },
  { value: 'evento', label: 'Eventos' },
  { value: 'resultado', label: 'Resultados' },
  { value: 'aviso', label: 'Avisos' },
]

export default function GestionAnuncios() {
  const [anuncios, setAnuncios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterTab, setFilterTab] = useState('todos')
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const fetchAll = () => {
    setLoading(true)
    newsService
      .getAll()
      .then((r) => setAnuncios(r.data || []))
      .catch(() => addToast({ type: 'error', title: 'Error al cargar anuncios' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    reset({ tipo: 'noticia' })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (anuncio) => {
    setEditing(anuncio)
    reset({ titulo: anuncio.titulo, contenido: anuncio.contenido, tipo: anuncio.tipo })
    setShowForm(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        // El backend solo tiene create y delete, no update
        // Borramos y recreamos como workaround
        await newsService.remove(editing.id)
        await newsService.create(data)
        addToast({ type: 'success', title: 'Anuncio actualizado' })
      } else {
        await newsService.create(data)
        addToast({ type: 'success', title: 'Anuncio creado' })
      }
      setShowForm(false)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDelete = async (anuncio) => {
    const ok = await confirm({
      title: 'Eliminar anuncio',
      message: `Esta acción eliminará permanentemente "${anuncio.titulo}" y no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await newsService.remove(anuncio.id)
      addToast({ type: 'success', title: 'Anuncio eliminado' })
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const filtered = filterTab === 'todos' ? anuncios : anuncios.filter((a) => a.tipo === filterTab)

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Anuncios del club
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {anuncios.length} publicación{anuncios.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
          Nuevo anuncio
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className='card p-5 animate-fade-up'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Editar anuncio' : 'Nuevo anuncio'}
            </h2>
            <button onClick={() => setShowForm(false)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='sm:col-span-2 form-group'>
                <label className='form-label'>Título *</label>
                <input
                  className={`form-input ${errors.titulo ? 'error' : ''}`}
                  placeholder='Título del anuncio'
                  {...register('titulo', { required: 'El título es requerido' })}
                />
                {errors.titulo && <p className='form-error'>{errors.titulo.message}</p>}
              </div>

              <div className='form-group'>
                <label className='form-label'>Tipo</label>
                <select className='form-input' {...register('tipo')}>
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='form-group'>
              <label className='form-label'>Contenido *</label>
              <textarea
                className={`form-input resize-none ${errors.contenido ? 'error' : ''}`}
                rows={4}
                placeholder='Escribe el contenido del anuncio...'
                {...register('contenido', { required: 'El contenido es requerido' })}
              />
              {errors.contenido && <p className='form-error'>{errors.contenido.message}</p>}
            </div>

            <div className='flex gap-3'>
              <Button type='submit' loading={isSubmitting}>
                {editing ? 'Guardar cambios' : 'Publicar anuncio'}
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <Tabs tabs={FILTER_TABS} activeTab={filterTab} onChange={setFilterTab} />

      {/* Lista */}
      <div className='space-y-3'>
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => <div key={i} className='skeleton h-24 rounded-xl' />)
        ) : filtered.length === 0 ? (
          <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>
            No hay anuncios en esta categoría
          </p>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className='card p-4'>
              <div className='flex items-start gap-3'>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className={TIPO_BADGE[a.tipo] || 'badge'}>
                      {TIPOS.find((t) => t.value === a.tipo)?.label || a.tipo}
                    </span>
                    <span className='text-xs' style={{ color: 'var(--text-muted)' }}>
                      {formatRelative(a.created_at)}
                    </span>
                  </div>
                  <h3 className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                    {a.titulo}
                  </h3>
                  <p
                    className='text-xs mt-1 line-clamp-2'
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {a.contenido}
                  </p>
                </div>
                <div className='flex items-center gap-1 shrink-0'>
                  <button onClick={() => openEdit(a)} className='btn-ghost p-2'>
                    <Pencil className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className='btn-ghost p-2'
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
