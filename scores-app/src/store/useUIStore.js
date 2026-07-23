import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUIStore = create(
  persist(
    (set, get) => ({
      // ── Tema ────────────────────────────────────────
      darkMode: false,
      toggleDarkMode: () => {
        const next = !get().darkMode
        document.documentElement.classList.toggle('dark', next)
        set({ darkMode: next })
      },

      // ── Sidebar ─────────────────────────────────────
      sidebarCollapsed: true,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),

      // ── Idioma ──────────────────────────────────────
      language: 'es',
      setLanguage: (lang) => set({ language: lang }),

      // ── Notificaciones ──────────────────────────────
      notifications: {
        push: true,
        enVivo: true,
        resultados: false,
      },
      setNotification: (key, value) =>
        set((s) => ({
          notifications: { ...s.notifications, [key]: value },
        })),

      // ── Toasts ──────────────────────────────────────
      toasts: [],
      addToast: ({ type = 'info', title, message, duration = 3500 }) => {
        const id = Date.now()
        set((s) => ({ toasts: [...s.toasts, { id, type, title, message }] }))
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, duration)
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'ui-storage-v2',
      partialize: (s) => ({
        darkMode: s.darkMode,
        language: s.language,
        notifications: s.notifications,
        // No persistir sidebarCollapsed — siempre inicia colapsado en mobile
      }),
    }
  )
)

// Aplicar tema guardado antes de que React monte
const stored = JSON.parse(localStorage.getItem('ui-storage-v2') || '{}')
document.documentElement.classList.toggle('dark', stored?.state?.darkMode === true)

export default useUIStore
