import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import useAuthStore from '../store/useAuthStore'
import ContentLoader from '../components/ui/ContentLoader'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore()
  const { pathname } = useLocation()
  const isRegister = pathname === '/register'

  if (isAuthenticated) return <Navigate to='/' replace />

  // Register → centrado, sin scroll, sin panel lateral
  if (isRegister) {
    return (
      <div
        className='w-full flex items-center justify-center p-4 sm:p-8'
        style={{
          minHeight: '100vh',
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </div>
    )
  }

  // Login / ForgotPassword → layout con panel lateral
  return (
    <div className='auth-layout'>
      {/* Panel izquierdo — branding (solo desktop) */}
      <div className='auth-side-image'>
        <div className='relative z-10 max-w-lg px-14'>
          <div
            className='brand-mark w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-extrabold mb-10'
            style={{ backgroundColor: 'var(--color-brand)', boxShadow: 'var(--shadow-brand)' }}
          >
            CU
          </div>
          <p className='text-xs font-bold uppercase tracking-[0.16em] mb-4'>
            Subcomité de Tenis
          </p>
          <h1 className='text-4xl xl:text-5xl font-extrabold leading-[1.08] tracking-[-0.04em] mb-5'>
            Cada punto del club, en un solo lugar.
          </h1>
          <p className='text-base leading-relaxed max-w-md'>
            Sigue partidos en vivo, consulta resultados y mantente conectado con el torneo del
            Club Unión.
          </p>
          <div className='flex flex-wrap gap-2 mt-9'>
            {['Resultados en vivo', 'Historial completo', 'Gestión segura'].map((item) => (
              <span
                key={item}
                className='px-3 py-2 rounded-full text-xs font-semibold'
                style={{
                  color: 'rgba(255,255,255,.88)',
                  backgroundColor: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.1)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className='auth-side-form'>
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
