import { useState, useEffect } from 'react'
import { Plus, Search, Shield, User, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { userService } from '../../services/userService'
import useAuthStore from '../../store/useAuthStore'
import useUIStore from '../../store/useUIStore'
import { confirm } from '../../utils/confirm'
import { formatDate } from '../../utils/formatDate'
import Button from '../../components/ui/Button'

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { user: me } = useAuthStore()
  const { addToast } = useUIStore()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { rol: 'miembro' } })

  const fetchAll = () => {
    setLoading(true)
    userService
      .getAll()
      .then((r) => setUsuarios(r.data || []))
      .catch(() => addToast({ type: 'error', title: 'Error al cargar usuarios' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const createUser = async (data) => {
    try {
      await userService.create(data)
      addToast({ type: 'success', title: 'Usuario creado correctamente' })
      reset({ rol: 'miembro' })
      setShowCreate(false)
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'No se pudo crear', message: err.message })
    }
  }

  const toggleRol = async (usuario) => {
    if (usuario.id === me?.id) {
      addToast({ type: 'error', title: 'No puedes cambiarte el rol a ti mismo' })
      return
    }
    const newRol = usuario.rol === 'admin' ? 'miembro' : 'admin'
    const ok = await confirm({
      title: 'Cambiar rol de usuario',
      message: `${usuario.nombre} ${usuario.apellido} pasará a tener el rol "${newRol}". ${newRol === 'admin' ? 'Tendrá acceso completo al panel de administración.' : 'Perderá acceso al panel de administración.'}`,
      confirmLabel: 'Confirmar cambio',
      danger: newRol === 'admin',
    })
    if (!ok) return
    try {
      await userService.updateRole(usuario.id, newRol)
      addToast({ type: 'success', title: 'Rol actualizado' })
      fetchAll()
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message })
    }
  }

  const filtered = usuarios.filter((u) =>
    `${u.nombre} ${u.apellido} ${u.email} ${u.numero_documento}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const admins = filtered.filter((u) => u.rol === 'admin').length
  const miembros = filtered.filter((u) => u.rol === 'miembro').length

  return (
    <div className='space-y-5 animate-fade-up'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            Usuarios / Miembros
          </h1>
          <p className='text-sm mt-0.5' style={{ color: 'var(--text-muted)' }}>
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado
            {usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          leftIcon={showCreate ? <X className='w-4 h-4' /> : <Plus className='w-4 h-4' />}
          onClick={() => setShowCreate((current) => !current)}
        >
          {showCreate ? 'Cancelar' : 'Nuevo usuario'}
        </Button>
      </div>

      {showCreate && (
        <form className='card p-4 space-y-4' onSubmit={handleSubmit(createUser)}>
          <div>
            <h2 className='font-semibold' style={{ color: 'var(--text-primary)' }}>
              Crear acceso
            </h2>
            <p className='text-xs mt-1' style={{ color: 'var(--text-muted)' }}>
              Los administradores crean las cuentas; no hay registro público para miembros.
            </p>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <label className='form-group'>
              <span className='form-label'>Nombres</span>
              <input
                className={`form-input ${errors.nombre ? 'error' : ''}`}
                {...register('nombre', { required: true, minLength: 2 })}
              />
            </label>
            <label className='form-group'>
              <span className='form-label'>Apellidos</span>
              <input
                className={`form-input ${errors.apellido ? 'error' : ''}`}
                {...register('apellido', { required: true, minLength: 2 })}
              />
            </label>
            <label className='form-group'>
              <span className='form-label'>Documento</span>
              <input
                inputMode='numeric'
                className={`form-input ${errors.numero_documento ? 'error' : ''}`}
                {...register('numero_documento', {
                  required: true,
                  minLength: 5,
                  maxLength: 20,
                  pattern: /^\d+$/,
                })}
              />
            </label>
            <label className='form-group'>
              <span className='form-label'>Correo</span>
              <input
                type='email'
                className={`form-input ${errors.email ? 'error' : ''}`}
                {...register('email', { required: true })}
              />
            </label>
            <label className='form-group'>
              <span className='form-label'>Contraseña temporal</span>
              <input
                type='password'
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder='8+ caracteres, mayúscula y número'
                {...register('password', {
                  required: true,
                  minLength: 8,
                  pattern: /^(?=.*[A-Z])(?=.*\d).+$/,
                })}
              />
            </label>
            <label className='form-group'>
              <span className='form-label'>Rol</span>
              <select className='form-input' {...register('rol')}>
                <option value='miembro'>Miembro</option>
                <option value='admin'>Administrador</option>
              </select>
            </label>
          </div>
          <div className='flex justify-end'>
            <Button type='submit' loading={isSubmitting}>
              Crear usuario
            </Button>
          </div>
        </form>
      )}

      {/* Stats rápidas */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='card p-4 flex items-center gap-3'>
          <div
            className='w-10 h-10 rounded-lg flex items-center justify-center'
            style={{ backgroundColor: 'rgba(234,88,12,0.12)' }}
          >
            <Shield className='w-5 h-5' style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <p className='text-2xl font-black' style={{ color: 'var(--text-primary)' }}>
              {admins}
            </p>
            <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
              Administradores
            </p>
          </div>
        </div>
        <div className='card p-4 flex items-center gap-3'>
          <div
            className='w-10 h-10 rounded-lg flex items-center justify-center'
            style={{ backgroundColor: 'rgba(59,130,246,0.12)' }}
          >
            <User className='w-5 h-5' style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <p className='text-2xl font-black' style={{ color: 'var(--text-primary)' }}>
              {miembros}
            </p>
            <p className='text-xs' style={{ color: 'var(--text-muted)' }}>
              Miembros
            </p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className='relative'>
        <Search
          className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none'
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          className='form-input pl-10'
          placeholder='Buscar por nombre, email o documento...'
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
            No se encontraron usuarios
          </p>
        ) : (
          filtered.map((u, i) => (
            <div
              key={u.id}
              className='flex items-center gap-3 px-4 py-3'
              style={{
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              {/* Avatar */}
              <div
                className='w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0'
                style={{
                  backgroundColor: u.id === me?.id ? 'var(--color-brand-dim)' : 'var(--bg-hover)',
                  color: u.id === me?.id ? 'var(--color-brand)' : 'var(--text-secondary)',
                  border:
                    u.id === me?.id
                      ? '2px solid var(--color-brand)'
                      : '1px solid var(--border-color)',
                }}
              >
                {u.nombre?.charAt(0)}
                {u.apellido?.charAt(0)}
              </div>

              {/* Info */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <p
                    className='text-sm font-semibold truncate'
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {u.nombre} {u.apellido}
                    {u.id === me?.id && (
                      <span
                        className='ml-2 text-xs font-normal'
                        style={{ color: 'var(--text-muted)' }}
                      >
                        (tú)
                      </span>
                    )}
                  </p>
                </div>
                <p className='text-xs truncate' style={{ color: 'var(--text-muted)' }}>
                  CC: {u.numero_documento} · {u.email}
                </p>
                <p className='text-[10px]' style={{ color: 'var(--text-muted)' }}>
                  Registrado {formatDate(u.created_at)}
                </p>
              </div>

              {/* Rol + toggle */}
              <div className='flex items-center gap-2 shrink-0'>
                <span className={u.rol === 'admin' ? 'badge-live' : 'badge-atp'}>{u.rol}</span>
                <button
                  onClick={() => toggleRol(u)}
                  disabled={u.id === me?.id}
                  className='btn-ghost p-2 disabled:opacity-40'
                  title={
                    u.id === me?.id
                      ? 'No puedes cambiarte el rol'
                      : `Cambiar a ${u.rol === 'admin' ? 'miembro' : 'admin'}`
                  }
                >
                  {u.rol === 'admin' ? (
                    <User className='w-4 h-4' style={{ color: '#3b82f6' }} />
                  ) : (
                    <Shield className='w-4 h-4' style={{ color: 'var(--color-brand)' }} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className='text-xs text-center' style={{ color: 'var(--text-muted)' }}>
        Haz clic en el ícono de escudo/usuario para cambiar el rol de un miembro
      </p>
    </div>
  )
}
