import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  ArrowRight,
  CalendarDays,
  Network,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  UsersRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { tournamentService } from '../../services/tournamentService'
import { confirm } from '../../utils/confirm'
import useUIStore from '../../store/useUIStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { formatDate } from '../../utils/formatDate'

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
const SISTEMAS = [
  {
    value: 'por_definir',
    label: 'Por definir',
    description:
      'Puedes crear y programar el torneo ahora, y elegir el sistema cuando esté confirmado.',
  },
  {
    value: 'eliminacion_directa',
    label: 'Eliminación directa',
    description: 'Quien pierde sale; ideal para un cuadro rápido y fácil de seguir.',
  },
  {
    value: 'todos_contra_todos',
    label: 'Todos contra todos',
    description: 'Cada participante juega varias veces y se ordena por resultados.',
  },
  {
    value: 'grupos_eliminacion',
    label: 'Grupos + fase final',
    description: 'Primero grupos y luego llaves; útil cuando hay más participantes.',
  },
]

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  const selectedSystem = watch('sistema') || 'por_definir'
  const systemInfo = SISTEMAS.find((system) => system.value === selectedSystem)

  const fetchAll = () => {
    setLoading(true)
    tournamentService
      .getAll()
      .then((tournaments) => setTorneos(tournaments.data || []))
      .catch(() => addToast({ type: 'error', title: 'Error al cargar los torneos' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    reset({
      nombre: '',
      deporte: 'tenis',
      categoria_id: null,
      modalidad: 'individual',
      sistema: 'por_definir',
      estado: 'proximo',
      fecha_inicio: '',
      fecha_fin: '',
    })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (torneo) => {
    setEditing(torneo)
    reset({
      nombre: torneo.nombre,
      deporte: torneo.deporte,
      categoria_id: null,
      modalidad: torneo.modalidad,
      sistema: torneo.sistema,
      fecha_inicio: torneo.fecha_inicio?.split('T')[0] || '',
      fecha_fin: torneo.fecha_fin?.split('T')[0] || '',
      estado: torneo.estado,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await tournamentService.update(editing.id, data)
        addToast({ type: 'success', title: 'Torneo actualizado' })
      } else {
        await tournamentService.create(data)
        addToast({
          type: 'success',
          title: 'Torneo creado',
          message: 'Ya puedes asignarle partidos desde el módulo de Partidos.',
        })
      }
      closeForm()
      fetchAll()
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo guardar', message: error.message })
    }
  }

  const handleDelete = async (torneo) => {
    const ok = await confirm({
      title: 'Eliminar torneo',
      message:
        torneo.partidos_count > 0
          ? 'Este torneo tiene partidos y no se puede eliminar hasta reasignarlos o borrarlos.'
          : `Esta acción eliminará permanentemente el torneo "${torneo.nombre}".`,
      confirmLabel: torneo.partidos_count > 0 ? 'Entendido' : 'Eliminar',
      danger: torneo.partidos_count === 0,
      requireText: torneo.partidos_count > 0 ? undefined : torneo.nombre,
    })
    if (!ok || torneo.partidos_count > 0) return
    try {
      await tournamentService.remove(torneo.id)
      addToast({ type: 'success', title: 'Torneo eliminado' })
      fetchAll()
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo eliminar', message: error.message })
    }
  }

  return (
    <div className='space-y-6 animate-fade-up'>
      <header className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>
        <div>
          <p
            className='text-xs font-bold uppercase tracking-[0.16em]'
            style={{ color: 'var(--color-brand)' }}
          >
            Organización deportiva
          </p>
          <h1 className='text-2xl font-black mt-1' style={{ color: 'var(--text-primary)' }}>
            Torneos
          </h1>
          <p className='text-sm mt-1 max-w-xl' style={{ color: 'var(--text-muted)' }}>
            Crea una competencia para todas las categorías. La categoría se elige al programar cada
            partido.
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
          Crear torneo
        </Button>
      </header>

      <section className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
        <GuideStep number='1' title='Crea el torneo' text='Define solo sus datos esenciales.' />
        <GuideStep
          number='2'
          title='Prepara participantes'
          text='Jugadores en individual; parejas en dobles.'
        />
        <GuideStep number='3' title='Programa partidos' text='Elige el torneo y arma sus cruces.' />
      </section>

      {showForm && (
        <section className='card p-5 sm:p-6 animate-fade-up'>
          <div className='flex items-start justify-between gap-3 mb-5'>
            <div>
              <h2 className='text-lg font-bold' style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Editar torneo' : 'Nuevo torneo'}
              </h2>
              <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
                Los campos avanzados del marcador se configuran después, en cada partido.
              </p>
            </div>
            <button
              type='button'
              onClick={closeForm}
              className='btn-ghost p-2'
              aria-label='Cerrar formulario'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='sm:col-span-2'>
              <Input
                label='Nombre del torneo *'
                placeholder='Ej.: Copa Club Unión 2026'
                error={errors.nombre?.message}
                {...register('nombre', { required: 'Escribe el nombre del torneo' })}
              />
            </div>

            <Field label='Deporte *' error={errors.deporte?.message}>
              <select
                className='form-input'
                {...register('deporte', { required: 'Selecciona el deporte' })}
              >
                <option value='tenis'>Tenis</option>
                <option value='padel'>Pádel</option>
              </select>
            </Field>

            <div
              className='rounded-xl p-3 text-sm'
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
            >
              <span className='font-semibold'>Categorías:</span> todas. Se asignan individualmente
              al crear cada partido.
            </div>

            <Field label='Modalidad *'>
              <select className='form-input' {...register('modalidad', { required: true })}>
                <option value='individual'>Individual · 1 vs 1</option>
                <option value='dobles'>Dobles · pareja vs pareja</option>
              </select>
            </Field>

            <Field label='Sistema de competencia *'>
              <select className='form-input' {...register('sistema', { required: true })}>
                {SISTEMAS.map((system) => (
                  <option key={system.value} value={system.value}>
                    {system.label}
                  </option>
                ))}
              </select>
            </Field>

            <div
              className='sm:col-span-2 rounded-xl p-3 flex gap-3'
              style={{ backgroundColor: 'var(--color-brand-dim)' }}
            >
              <Network
                className='w-5 h-5 shrink-0 mt-0.5'
                style={{ color: 'var(--color-brand)' }}
              />
              <div>
                <p className='text-sm font-semibold' style={{ color: 'var(--text-primary)' }}>
                  {systemInfo?.label}
                </p>
                <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
                  {systemInfo?.description}
                </p>
              </div>
            </div>

            <Input label='Fecha de inicio' type='date' {...register('fecha_inicio')} />
            <Input label='Fecha de finalización' type='date' {...register('fecha_fin')} />

            <Field label='Estado'>
              <select className='form-input' {...register('estado')}>
                {ESTADOS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className='sm:col-span-2 flex flex-wrap gap-3 pt-1'>
              <Button type='submit' loading={isSubmitting}>
                {editing ? 'Guardar cambios' : 'Crear torneo'}
              </Button>
              <Button type='button' variant='secondary' onClick={closeForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className='space-y-3'>
        {loading ? (
          Array.from({ length: 3 }, (_, index) => (
            <div key={index} className='skeleton h-36 rounded-2xl' />
          ))
        ) : torneos.length === 0 ? (
          <div className='card p-10 text-center'>
            <Trophy className='w-10 h-10 mx-auto mb-3' style={{ color: 'var(--text-muted)' }} />
            <p className='font-semibold' style={{ color: 'var(--text-primary)' }}>
              Aún no hay torneos
            </p>
            <p className='text-sm mt-1 mb-4' style={{ color: 'var(--text-muted)' }}>
              Crea el primero para comenzar a organizar sus partidos.
            </p>
            <Button onClick={openCreate} leftIcon={<Plus className='w-4 h-4' />}>
              Crear torneo
            </Button>
          </div>
        ) : (
          torneos.map((tournament) => (
            <article key={tournament.id} className='card p-4 sm:p-5'>
              <div className='flex flex-col lg:flex-row lg:items-center gap-4'>
                <div
                  className='w-12 h-12 rounded-2xl flex items-center justify-center shrink-0'
                  style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
                >
                  <Trophy className='w-6 h-6' />
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h2 className='font-bold text-base' style={{ color: 'var(--text-primary)' }}>
                      {tournament.nombre}
                    </h2>
                    <span className={ESTADO_BADGE[tournament.estado] || 'badge'}>
                      {ESTADOS.find((status) => status.value === tournament.estado)?.label}
                    </span>
                  </div>
                  <div
                    className='flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs'
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span className='inline-flex items-center gap-1.5'>
                      <UsersRound className='w-3.5 h-3.5' />
                      {tournament.modalidad === 'dobles' ? 'Dobles' : 'Individual'} ·{' '}
                      {tournament.deporte === 'padel' ? 'Pádel' : 'Tenis'}
                    </span>
                    <span className='inline-flex items-center gap-1.5'>
                      <Network className='w-3.5 h-3.5' />
                      {SISTEMAS.find((system) => system.value === tournament.sistema)?.label}
                    </span>
                    <span>{tournament.categoria?.nombre || 'Todas las categorías'}</span>
                    {(tournament.fecha_inicio || tournament.fecha_fin) && (
                      <span className='inline-flex items-center gap-1.5'>
                        <CalendarDays className='w-3.5 h-3.5' />
                        {formatPeriod(tournament)}
                      </span>
                    )}
                  </div>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  <span
                    className='text-xs font-semibold px-3'
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {tournament.partidos_count} partido{tournament.partidos_count !== 1 ? 's' : ''}
                  </span>
                  <Link
                    to={`/admin/partidos?torneo=${tournament.id}`}
                    className='btn-secondary px-3 py-2 flex items-center gap-1.5 text-xs'
                  >
                    Partidos <ArrowRight className='w-3.5 h-3.5' />
                  </Link>
                  <button
                    onClick={() => openEdit(tournament)}
                    className='btn-ghost p-2'
                    aria-label='Editar torneo'
                  >
                    <Pencil className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => handleDelete(tournament)}
                    className='btn-ghost p-2'
                    style={{ color: '#ef4444' }}
                    aria-label='Eliminar torneo'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}

function GuideStep({ number, title, text }) {
  return (
    <div className='card p-4 flex gap-3'>
      <span
        className='w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0'
        style={{ backgroundColor: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
      >
        {number}
      </span>
      <div>
        <p className='text-sm font-bold' style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className='text-xs mt-0.5' style={{ color: 'var(--text-muted)' }}>
          {text}
        </p>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className='form-group'>
      <span className='form-label'>{label}</span>
      {children}
      {error && <span className='form-error'>{error}</span>}
    </label>
  )
}

function formatPeriod(tournament) {
  if (tournament.fecha_inicio && tournament.fecha_fin) {
    return `${formatDate(tournament.fecha_inicio)} → ${formatDate(tournament.fecha_fin)}`
  }
  return tournament.fecha_inicio
    ? `Desde ${formatDate(tournament.fecha_inicio)}`
    : `Hasta ${formatDate(tournament.fecha_fin)}`
}
