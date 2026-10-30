import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TennisAtmosphere from '../components/common/TennisAtmosphere'
import Header from '../components/layout/Header'
import SponsorDock from '../components/sponsors/SponsorDock'
import ContentLoader from '../components/ui/ContentLoader'
import ToastContainer from '../components/ui/Toast'
import { useHealthCheck } from '../hooks/useHealthCheck'

export default function AppLayout() {
  useHealthCheck()
  const {pathname,search}=useLocation()
  const padel=pathname==='/padel' || pathname.startsWith('/padel/') || (pathname==='/reglamento' && new URLSearchParams(search).get('deporte')==='padel')
  const screen=pathname==='/padel/flash' && new URLSearchParams(search).get('pantalla')==='1'

  return (
    <div className='min-h-screen tennis-scene' style={{ backgroundColor: 'var(--bg-primary)' }}>
      {pathname!=='/ayuda' && !padel && <TennisAtmosphere/>}
      {!screen && <Header />}
      <main className='app-main'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      {!padel && !/^\/match\/[^/]+\/?$/.test(pathname) && <SponsorDock />}
      <ToastContainer />
    </div>
  )
}
