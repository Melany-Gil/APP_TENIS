import { create } from 'zustand'

/**
 * Store interno del diálogo de confirmación.
 * No se usa directamente — usar el helper `confirm()` de
 * `src/utils/confirm.js` en su lugar.
 */
const useConfirmStore = create((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  danger: false,
  requireText: null, // si se define, el usuario debe escribir este texto exacto
  resolver: null,

  open: (options, resolver) =>
    set({
      isOpen: true,
      title: options.title ?? '¿Estás seguro?',
      message: options.message ?? '',
      confirmLabel: options.confirmLabel ?? 'Confirmar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      danger: options.danger ?? false,
      requireText: options.requireText ?? null,
      resolver,
    }),

  close: () => set({ isOpen: false, resolver: null }),
}))

export default useConfirmStore
