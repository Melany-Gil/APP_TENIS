import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useFavoritesStore = create(
  persist(
    (set, get) => ({
      jugadores: [],
      equipos: [],
      partidos: [],
      torneos: [],

      toggleJugador: (jugador) => {
        const { jugadores } = get()
        const exists = jugadores.find((j) => j.id === jugador.id)
        set({
          jugadores: exists
            ? jugadores.filter((j) => j.id !== jugador.id)
            : [...jugadores, jugador],
        })
      },

      toggleEquipo: (equipo) => {
        const { equipos } = get()
        const exists = equipos.find((e) => e.id === equipo.id)
        set({ equipos: exists ? equipos.filter((e) => e.id !== equipo.id) : [...equipos, equipo] })
      },

      togglePartido: (partido) => {
        const { partidos } = get()
        const exists = partidos.find((p) => p.id === partido.id)
        set({
          partidos: exists ? partidos.filter((p) => p.id !== partido.id) : [...partidos, partido],
        })
      },

      toggleTorneo: (torneo) => {
        const { torneos } = get()
        const exists = torneos.find((t) => t.id === torneo.id)
        set({ torneos: exists ? torneos.filter((t) => t.id !== torneo.id) : [...torneos, torneo] })
      },

      isJugadorFavorite: (id) => get().jugadores.some((j) => j.id === id),
      isEquipoFavorite: (id) => get().equipos.some((e) => e.id === id),
      isPartidoFavorite: (id) => get().partidos.some((p) => p.id === id),
      isTorneoFavorite: (id) => get().torneos.some((t) => t.id === id),
    }),
    { name: 'favorites-storage' }
  )
)

export default useFavoritesStore
