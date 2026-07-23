import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { sedeService } from '../../services/sedeService'
import useUIStore from '../../store/useUIStore'
import { confirm } from '../../utils/confirm'
import Button from '../../components/ui/Button'

const DEPORTES = ['tenis', 'padel', 'ambos']
const SUPERFICIES = ['Cemento', 'Arcilla', 'Cesped Artificial', 'Madera', 'Sintetico']

export default function GestionSedes() {
  const [sedes, setSedes] = useState([])
  const [canchas, setCanchas] = useState({}) // { sedeId: [canchas] }
  const [expanded, setExpanded] = useState({}) // { sedeId: bool }
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCancha, setShowCancha] = useState(null) // sedeId al que agregar cancha
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const {
    register: regC,
    handleSubmit: handleC,
    reset: resetC,
    formState: { isSubmitting: isSubmittingC },
  } = useForm()

  const fetchSedes = async () => {
    setLoading(true)
    try {
      const res = await sedeService.getAll()
      setSedes(res.data || [])
    } catch {
      addToast({ type: 'error', title: 'Error al cargar sedes' })
    } finally {
      setLoading(false)
    }
  }

  const fetchCanchas = async (sedeId) => {
    try {
      const res = await sedeService.getCanchasBySede(sedeId)
      setCanchas((prev) => ({ ...prev, [sedeId]: res.data || [] }))
    } catch {
      setCanchas((prev) => ({ ...prev, [sedeId]: [] }))
    }
  }

  useEffect(() => {
    fetchSedes()
  }, [])

  const toggleExpand = (sedeId) => {
    setExpanded((prev) => ({ ...prev, [sedeId]: !prev[sedeId] }))
    if (!canchas[sedeId]) fetchCanchas(sedeId)
  }

  const onSubmitSede = async (data) => {
    try {
      await sedeService.create(data)
      addToast({ type: 'success', title: 'Sede creada' })
      setShowForm(false)
      fetchSedes()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const onSubmitCancha = async (data) => {
    try {
      await sedeService.createCancha(showCancha, data)
      addToast({ type: 'success', title: 'Cancha agregada' })
      setShowCancha(null)
      fetchCanchas(showCancha)
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDeleteSede = async (sede) => {
    const ok = await confirm({
      title: 'Eliminar sede',
      message: `Esta acción eliminará permanentemente la sede "${sede.nombre}" junto con todas sus canchas. No se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
      requireText: sede.nombre,
    })
    if (!ok) return
    try {
      await sedeService.remove(sede.id)
      addToast({ type: 'success', title: 'Sede eliminada' })
      fetchSedes()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Sedes y Canchas
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {sedes.length} sede{sedes.length !== 1 ? 's' : ''} registrada
            {sedes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => {
            reset({ ciudad: 'Cucuta' })
            setShowForm(true)
          }}
          leftIcon={<Plus className='w-4 h-4' />}
        >
          Nueva sede
        </Button>
      </div>

      {/* Formulario nueva sede */}
      {showForm && (
        <div className='card p-5 animate-fade-up'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              Nueva sede
            </h2>
            <button onClick={() => setShowForm(false)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>
          <form
            onSubmit={handleSubmit(onSubmitSede)}
            className='grid grid-cols-1 sm:grid-cols-2 gap-4'
          >
            <div className='form-group'>
              <label className='form-label'>Nombre *</label>
              <input
                className={`form-input ${errors.nombre ? 'error' : ''}`}
                placeholder='Sede Principal'
                {...register('nombre', { required: 'Requerido' })}
              />
              {errors.nombre && <p className='form-error'>{errors.nombre.message}</p>}
            </div>
            <div className='form-group'>
              <label className='form-label'>Ciudad</label>
              <input className='form-input' placeholder='Cucuta' {...register('ciudad')} />
            </div>
            <div className='sm:col-span-2 form-group'>
              <label className='form-label'>Dirección</label>
              <input
                className='form-input'
                placeholder='Cra 7 # 12-45'
                {...register('direccion')}
              />
            </div>
            <div className='sm:col-span-2 flex gap-3'>
              <Button type='submit' loading={isSubmitting}>
                Crear sede
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario nueva cancha */}
      {showCancha && (
        <div className='card p-5 animate-fade-up' style={{ borderColor: 'var(--color-brand)' }}>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              Agregar cancha — {sedes.find((s) => s.id === showCancha)?.nombre}
            </h2>
            <button onClick={() => setShowCancha(null)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>
          <form
            onSubmit={handleC(onSubmitCancha)}
            className='grid grid-cols-1 sm:grid-cols-3 gap-4'
          >
            <div className='form-group'>
              <label className='form-label'>Nombre *</label>
              <input
                className='form-input'
                placeholder='Cancha 1'
                {...regC('nombre', { required: 'Requerido' })}
              />
            </div>
            <div className='form-group'>
              <label className='form-label'>Deporte</label>
              <select className='form-input' {...regC('deporte')}>
                {DEPORTES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className='form-group'>
              <label className='form-label'>Superficie</label>
              <select className='form-input' {...regC('superficie')}>
                {SUPERFICIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className='sm:col-span-3 flex gap-3'>
              <Button type='submit' loading={isSubmittingC}>
                Agregar cancha
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowCancha(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de sedes */}
      {loading ? (
        Array(2)
          .fill(0)
          .map((_, i) => <div key={i} className='skeleton h-20 rounded-xl' />)
      ) : sedes.length === 0 ? (
        <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>
          No hay sedes registradas
        </p>
      ) : (
        sedes.map((sede) => (
          <div key={sede.id} className='card overflow-hidden'>
            {/* Header sede */}
            <div className='flex items-center gap-3 px-4 py-3'>
              <div
                className='w-9 h-9 rounded-lg flex items-center justify-center shrink-0'
                style={{ backgroundColor: 'var(--color-brand-dim)' }}
              >
                <MapPin className='w-4 h-4' style={{ color: 'var(--color-brand)' }} />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='font-semibold text-sm' style={{ color: 'var(--text-primary)' }}>
                  {sede.nombre}
                </p>
                <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
                  {sede.ciudad}
                  {sede.direccion ? ` — ${sede.direccion}` : ''}
                </p>
              </div>
              <div className='flex items-center gap-1'>
                <button
                  onClick={() => {
                    resetC({ deporte: 'ambos', superficie: 'Cemento' })
                    setShowCancha(sede.id)
                  }}
                  className='btn-ghost p-2 text-xs flex items-center gap-1'
                  style={{ color: 'var(--color-brand)' }}
                >
                  <Plus className='w-3.5 h-3.5' /> Cancha
                </button>
                <button
                  onClick={() => handleDeleteSede(sede)}
                  className='btn-ghost p-2'
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 className='w-4 h-4' />
                </button>
                <button onClick={() => toggleExpand(sede.id)} className='btn-ghost p-2'>
                  {expanded[sede.id] ? (
                    <ChevronUp className='w-4 h-4' />
                  ) : (
                    <ChevronDown className='w-4 h-4' />
                  )}
                </button>
              </div>
            </div>

            {/* Canchas expandidas */}
            {expanded[sede.id] && (
              <div style={{ borderTop: '1px solid var(--border-color)' }}>
                {!canchas[sede.id] ? (
                  <p className='text-xs text-center py-3' style={{ color: 'var(--text-muted)' }}>
                    Cargando...
                  </p>
                ) : canchas[sede.id].length === 0 ? (
                  <p className='text-xs text-center py-3' style={{ color: 'var(--text-muted)' }}>
                    Sin canchas registradas
                  </p>
                ) : (
                  canchas[sede.id].map((c, i) => (
                    <div
                      key={c.id}
                      className='flex items-center gap-3 px-4 py-2.5'
                      style={{
                        borderBottom:
                          i < canchas[sede.id].length - 1
                            ? '1px solid var(--border-color)'
                            : 'none',
                        backgroundColor: 'var(--bg-hover)',
                      }}
                    >
                      <div className='flex-1'>
                        <span
                          className='text-sm font-medium'
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {c.nombre}
                        </span>
                        <span className='text-xs ml-2' style={{ color: 'var(--text-muted)' }}>
                          {c.deporte} · {c.superficie}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
