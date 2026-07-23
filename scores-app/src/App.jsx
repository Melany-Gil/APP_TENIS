import { useEffect } from 'react'
import AppRouter from './routes'
import ConfirmDialog from './components/ui/ConfirmDialog'
import useUIStore from './store/useUIStore'

export default function App() {
  const { darkMode } = useUIStore()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <>
      <AppRouter />
      {/* Diálogo de confirmación global — invocado vía confirm() en utils/confirm.js */}
      <ConfirmDialog />
    </>
  )
}
