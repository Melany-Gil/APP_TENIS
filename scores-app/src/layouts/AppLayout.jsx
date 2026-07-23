import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import Header from '../components/layout/Header'
import Sidebar from '../components/layout/Sidebar'
import BottomNavigation from '../components/layout/BottomNavigation'
import ToastContainer from '../components/ui/Toast'
import ContentLoader from '../components/ui/ContentLoader'
import useUIStore from '../store/useUIStore'
import { useHealthCheck } from '../hooks/useHealthCheck'
import { cn } from '../utils/cn'

export default function AppLayout() {
  const { sidebarCollapsed } = useUIStore()

  // Verifica conexión con el backend; si cae 3 veces seguidas, cierra sesión
  useHealthCheck()

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header />
      <Sidebar />
      {/* Header y Sidebar quedan FUERA de este Suspense — nunca se desmontan al navegar */}
      <main
        className={cn(
          'transition-all duration-300 pt-16 pb-24 lg:pb-8',
          sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-[272px]'
        )}
      >
        <div className='max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomNavigation />
      <ToastContainer />
    </div>
  )
}
