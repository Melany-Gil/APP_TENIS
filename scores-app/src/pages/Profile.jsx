import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, LogOut, ChevronRight, Bell, Shield, Globe } from 'lucide-react'
import useAuthStore from '../store/useAuthStore'
import { authService } from '../services/authService'
import useUIStore from '../store/useUIStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { cn } from '../utils/cn'

export default function Profile() {
  const { user, logout } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  const menu = [
    { icon: Shield, label: 'Cambiar contraseña' },
    { icon: Bell, label: 'Notificaciones' },
    { icon: Globe, label: 'Idioma', value: 'Español' },
  ]

  return (
    <div className='space-y-5 animate-fade-up'>
      <h1 className='text-xl font-bold text-text-primary'>Mi Perfil</h1>

      <div className='card p-5 flex items-center gap-4'>
        <div className='w-16 h-16 rounded-full bg-brand/20 border-2 border-brand/30 flex items-center justify-center text-2xl font-bold text-brand shrink-0'>
          {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className='flex-1 min-w-0'>
          <h2 className='text-base font-bold text-text-primary'>
            {user?.nombre} {user?.apellido}
          </h2>
          <p className='text-sm text-text-secondary'>{user?.email}</p>
          <p className='text-xs text-text-muted mt-0.5'>CC: {user?.numero_documento}</p>
        </div>
        <Button variant='outline' size='sm' onClick={() => setEditing(!editing)}>
          Editar
        </Button>
      </div>

      {editing && (
        <div className='card p-5 space-y-4 animate-fade-up'>
          <Input
            label='Nombre'
            defaultValue={user?.nombre}
            leftIcon={<User className='w-4 h-4' />}
          />
          <Input label='Apellidos' defaultValue={user?.apellido} />
          <Input
            label='Email'
            type='email'
            defaultValue={user?.email}
            leftIcon={<Mail className='w-4 h-4' />}
          />
          <div className='flex gap-3'>
            <Button
              fullWidth
              onClick={() => {
                addToast({ type: 'success', title: 'Perfil actualizado' })
                setEditing(false)
              }}
            >
              Guardar
            </Button>
            <Button variant='secondary' onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className='card overflow-hidden'>
        {menu.map((item, i) => (
          <button
            key={item.label}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-border-light transition-colors text-left',
              i < menu.length - 1 && 'border-b border-border-light'
            )}
          >
            <item.icon className='w-4 h-4 text-text-secondary shrink-0' />
            <span className='flex-1 text-sm text-text-secondary'>{item.label}</span>
            {item.value && <span className='text-xs text-text-muted mr-2'>{item.value}</span>}
            <ChevronRight className='w-4 h-4 text-text-muted' />
          </button>
        ))}
      </div>

      <Button
        variant='danger'
        fullWidth
        onClick={async () => {
          await authService.logout().catch(() => {})
          logout()
          navigate('/login')
        }}
        leftIcon={<LogOut className='w-4 h-4' />}
      >
        Cerrar sesión
      </Button>
    </div>
  )
}
