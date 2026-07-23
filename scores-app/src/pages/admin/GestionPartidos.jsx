import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, X, Radio } from 'lucide-react'
import { matchService } from '../../services/matchService'
import { playerService } from '../../services/playerService'
import { teamService } from '../../services/teamService'
import { categoriaService } from '../../services/categoriaService'
import { confirm } from '../../utils/confirm'
import useUIStore from '../../store/useUIStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import LiveBadge from '../../components/match/LiveBadge'
import { formatDate, formatTime } from '../../utils/formatDate'

const ESTADOS = [
  { value: 'programado', label: 'Programado' },
  { value: 'en_vivo', label: 'En vivo' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
]
const FILTER_TABS = [
  { value: 'todos', label: 'Todos' },
  { value: 'en_vivo', label: 'En vivo' },
  { value: 'programado', label: 'Programados' },
  { value: 'finalizado', label: 'Finalizados' },
]

export default function GestionPartidos() {
  const [partidos, setPartidos] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [equipos, setEquipos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMarcador, setShowMarcador] = useState(null)
  const [editing, setEditing] = useState(null)
  const [filterTab, setFilterTab] = useState('todos')
  const { addToast } = useUIStore()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()
  const {
    register: regM,
    handleSubmit: handleM,
    reset: resetM,
    formState: { isSubmitting: isSubmittingM },
  } = useForm()

  const selectedDeporte = watch('deporte') || 'tenis'
  const categoriasDisponibles = categorias.filter(
    (categoria) => categoria.deporte === selectedDeporte || categoria.deporte === 'ambos'
  )

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      matchService.getAll(),
      playerService.getAll(),
      teamService.getAll(),
      categoriaService.getAll(),
    ])
      .then(([p, j, e, c]) => {
        setPartidos(p.data || [])
        setJugadores(j.data || [])
        setEquipos(e.data || [])
        setCategorias(c.data || [])
      })
      .catch(() => addToast({ type: 'error', title: 'Error al cargar datos' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    reset({ deporte: 'tenis', categoria_id: '', estado: 'programado' })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (partido) => {
    setEditing(partido)
    reset({
      deporte: partido.deporte,
      categoria_id: partido.categoria?.id || '',
      estado: partido.estado,
      fecha_inicio: partido.fecha_inicio ? partido.fecha_inicio.slice(0, 16) : '',
      jugador1_id: partido.jugador1?.id || '',
      jugador2_id: partido.jugador2?.id || '',
      equipo1_id: partido.equipo1?.id || '',
      equipo2_id: partido.equipo2?.id || '',
    })
    setShowForm(true)
  }

  const openMarcador = (partido) => {
    setShowMarcador(partido)
    const setsData = {}
    partido.sets?.forEach((s) => {
      setsData[`set_${s.numero_set}_j1`] = s.games_j1
      setsData[`set_${s.numero_set}_j2`] = s.games_j2
    })
    resetM({ estado: partido.estado, ganador: partido.ganador || '', ...setsData })
  }

  const onSubmit = async (data) => {
    try {
      const payload = {
        deporte: data.deporte,
        categoria_id: data.categoria_id,
        estado: data.estado,
        fecha_inicio: data.fecha_inicio,
        jugador1_id: data.jugador1_id,
        jugador2_id: data.jugador2_id,
        equipo1_id: data.equipo1_id,
        equipo2_id: data.equipo2_id,
      }
      if (data.deporte === 'padel') {
        delete payload.jugador1_id
        delete payload.jugador2_id
      } else {
        delete payload.equipo1_id
        delete payload.equipo2_id
      }
      if (editing) {
        await matchService.update(editing.id, payload)
        addToast({ type: 'success', title: 'Partido actualizado' })
      } else {
        await matchService.create(payload)
        addToast({ type: 'success', title: 'Partido creado' })
      }
      setShowForm(false)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const onMarcador = async (data) => {
    try {
      const sets = []
      for (let i = 1; i <= 3; i += 1) {
        const rawJ1 = data[`set_${i}_j1`]
        const rawJ2 = data[`set_${i}_j2`]
        const isBlank = rawJ1 === '' && rawJ2 === ''
        if (isBlank) continue
        if (rawJ1 === '' || rawJ2 === '') {
          throw new Error(`Completa ambos puntajes del set ${i}`)
        }
        sets.push({
          numero_set: i,
          games_j1: Number.parseInt(rawJ1, 10),
          games_j2: Number.parseInt(rawJ2, 10),
          completado: data[`set_${i}_completado`] === 'true',
        })
      }
      if (!sets.length) throw new Error('Ingresa al menos un set')
      await matchService.updateMarcador(showMarcador.id, {
        estado: data.estado,
        ganador: data.ganador || null,
        sets,
      })
      addToast({ type: 'success', title: 'Marcador actualizado' })
      setShowMarcador(null)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const handleDelete = async (partido) => {
    const ok = await confirm({
      title: 'Eliminar partido',
      message:
        'Esta acción eliminará permanentemente el partido junto con su marcador. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await matchService.remove(partido.id)
      addToast({ type: 'success', title: 'Partido eliminado' })
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const filtered = partidos.filter((p) => (filterTab === 'todos' ? true : p.estado === filterTab))

  return (
    <div className='space-y-6 animate-fade-up'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Partidos
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {partidos.length} partido{partidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
          Nuevo partido
        </Button>
      </div>

      {/* Formulario nuevo/editar */}
      {showForm && (
        <div className='card p-5 animate-fade-up'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Editar partido' : 'Nuevo partido'}
            </h2>
            <button onClick={() => setShowForm(false)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='form-group'>
              <label className='form-label'>Deporte *</label>
              <select className='form-input' {...register('deporte', { required: true })}>
                <option value='tenis'>Tenis</option>
                <option value='padel'>Pádel</option>
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

            <div className='form-group'>
              <label className='form-label'>Categoría *</label>
              <select
                className='form-input'
                {...register('categoria_id', { required: 'Selecciona una categoría' })}
              >
                <option value=''>Seleccionar</option>
                {categoriasDisponibles.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
              {errors.categoria_id && <p className='form-error'>{errors.categoria_id.message}</p>}
            </div>

            <Input
              label='Fecha y hora *'
              type='datetime-local'
              error={errors.fecha_inicio?.message}
              {...register('fecha_inicio', { required: 'Selecciona la fecha y hora' })}
            />

            {/* Participantes según deporte */}
            {selectedDeporte === 'tenis' ? (
              <>
                <div className='form-group'>
                  <label className='form-label'>Jugador 1</label>
                  <select
                    className='form-input'
                    {...register('jugador1_id', {
                      required: selectedDeporte === 'tenis' ? 'Selecciona un jugador' : false,
                    })}
                  >
                    <option value=''>Seleccionar</option>
                    {jugadores.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nombre} {j.apellido}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='form-group'>
                  <label className='form-label'>Jugador 2</label>
                  <select
                    className='form-input'
                    {...register('jugador2_id', {
                      required: selectedDeporte === 'tenis' ? 'Selecciona un jugador' : false,
                    })}
                  >
                    <option value=''>Seleccionar</option>
                    {jugadores.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nombre} {j.apellido}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className='form-group'>
                  <label className='form-label'>Equipo 1</label>
                  <select
                    className='form-input'
                    {...register('equipo1_id', {
                      required: selectedDeporte === 'padel' ? 'Selecciona un equipo' : false,
                    })}
                  >
                    <option value=''>Seleccionar</option>
                    {equipos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='form-group'>
                  <label className='form-label'>Equipo 2</label>
                  <select
                    className='form-input'
                    {...register('equipo2_id', {
                      required: selectedDeporte === 'padel' ? 'Selecciona un equipo' : false,
                    })}
                  >
                    <option value=''>Seleccionar</option>
                    {equipos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className='sm:col-span-2 flex gap-3'>
              <Button type='submit' loading={isSubmitting}>
                {editing ? 'Guardar cambios' : 'Crear partido'}
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Marcador en vivo */}
      {showMarcador && (
        <div
          className='card p-5 animate-fade-up'
          style={{ borderColor: 'var(--color-live)', borderWidth: '1px' }}
        >
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <LiveBadge />
              <h2 className='text-base font-semibold' style={{ color: 'var(--text-primary)' }}>
                Actualizar marcador
              </h2>
            </div>
            <button onClick={() => setShowMarcador(null)} className='btn-ghost p-1'>
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleM(onMarcador)} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='form-group'>
                <label className='form-label'>Estado</label>
                <select className='form-input' {...regM('estado')}>
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='form-group'>
                <label className='form-label'>Ganador</label>
                <select className='form-input' {...regM('ganador')}>
                  <option value=''>Sin ganador</option>
                  <option value='jugador1'>Jugador / Equipo 1</option>
                  <option value='jugador2'>Jugador / Equipo 2</option>
                </select>
              </div>
            </div>

            {/* Sets */}
            <div>
              <p className='form-label mb-2'>Sets</p>
              <div className='space-y-2'>
                {[1, 2, 3].map((num) => (
                  <div key={num} className='flex items-center gap-3'>
                    <span
                      className='text-xs font-medium w-12 shrink-0'
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Set {num}
                    </span>
                    <input
                      type='number'
                      min='0'
                      max='7'
                      placeholder={num === 3 ? '/' : '0'}
                      className='form-input w-20 text-center'
                      {...regM(`set_${num}_j1`)}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>–</span>
                    <input
                      type='number'
                      min='0'
                      max='7'
                      placeholder={num === 3 ? '/' : '0'}
                      className='form-input w-20 text-center'
                      {...regM(`set_${num}_j2`)}
                    />
                    <div className='form-group flex-row items-center gap-2 m-0'>
                      <input
                        type='checkbox'
                        id={`comp_${num}`}
                        value='true'
                        className='rounded'
                        {...regM(`set_${num}_completado`)}
                      />
                      <label
                        htmlFor={`comp_${num}`}
                        className='text-xs cursor-pointer'
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Completado
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='flex gap-3'>
              <Button type='submit' loading={isSubmittingM}>
                Guardar marcador
              </Button>
              <Button type='button' variant='secondary' onClick={() => setShowMarcador(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <Tabs tabs={FILTER_TABS} activeTab={filterTab} onChange={setFilterTab} />

      {/* Lista */}
      <div className='card overflow-hidden'>
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => <div key={i} className='skeleton h-16 m-3 rounded-lg' />)
        ) : filtered.length === 0 ? (
          <p className='text-center py-12 text-sm' style={{ color: 'var(--text-muted)' }}>
            No hay partidos en esta categoría
          </p>
        ) : (
          filtered.map((p, i) => {
            const isPadel = p.deporte === 'padel'
            const p1 = isPadel
              ? p.equipo1?.nombre
              : `${p.jugador1?.nombre || ''} ${p.jugador1?.apellido || ''}`.trim()
            const p2 = isPadel
              ? p.equipo2?.nombre
              : `${p.jugador2?.nombre || ''} ${p.jugador2?.apellido || ''}`.trim()

            return (
              <div
                key={p.id}
                className='list-row'
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}
              >
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <p
                      className='text-sm font-semibold truncate'
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p1 || '?'} <span style={{ color: 'var(--text-muted)' }}>vs</span> {p2 || '?'}
                    </p>
                    {p.estado === 'en_vivo' && <LiveBadge />}
                  </div>
                  <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
                    {p.categoria?.nombre || 'Sin categoría'}
                    {p.fecha_inicio &&
                      ` · ${formatDate(p.fecha_inicio)} ${formatTime(p.fecha_inicio)}`}
                  </p>
                </div>
                <div className='flex items-center gap-1 shrink-0'>
                  {(p.estado === 'en_vivo' || p.estado === 'programado') && (
                    <button
                      onClick={() => openMarcador(p)}
                      className='btn-ghost p-2 flex items-center gap-1 text-xs'
                      style={{ color: '#ef4444' }}
                    >
                      <Radio className='w-4 h-4' />
                    </button>
                  )}
                  <button onClick={() => openEdit(p)} className='btn-ghost p-2'>
                    <Pencil className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className='btn-ghost p-2'
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
