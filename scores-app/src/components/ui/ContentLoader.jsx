import Loader from './Loader'

/**
 * Loader pequeño para el área de contenido — NO ocupa toda la pantalla.
 * Se usa dentro de cada layout envolviendo el <Outlet />, así el Header
 * y el Sidebar nunca se desmontan al navegar entre páginas.
 */
export default function ContentLoader() {
  return (
    <div className='flex items-center justify-center py-24'>
      <Loader />
    </div>
  )
}
