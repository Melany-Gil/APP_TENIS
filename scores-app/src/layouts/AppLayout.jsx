import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/layout/Header'
import SponsorDock from '../components/sponsors/SponsorDock'
import ContentLoader from '../components/ui/ContentLoader'
import ToastContainer from '../components/ui/Toast'
import { useHealthCheck } from '../hooks/useHealthCheck'

export default function AppLayout() {
  useHealthCheck()

  return (
    <div className='min-h-screen' style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Header />
      <main className='app-main'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <SponsorDock />
      <ToastContainer />
    </div>
  )
}
