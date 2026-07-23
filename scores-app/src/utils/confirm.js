import useConfirmStore from '../store/useConfirmStore'

/**
 * Reemplazo de window.confirm() con un diálogo visual y soporte
 * para verificación doble (escribir un texto exacto antes de confirmar).
 *
 * Uso simple:
 *   const ok = await confirm({ title: 'Eliminar', message: '¿Seguro?' })
 *   if (!ok) return
 *
 * Uso con verificación doble (recomendado para eliminar registros):
 *   const ok = await confirm({
 *     title: 'Eliminar jugador',
 *     message: 'Esta acción no se puede deshacer.',
 *     danger: true,
 *     requireText: 'Carlos García',   // el usuario debe escribir esto exacto
 *   })
 *   if (!ok) return
 */
export function confirm(options = {}) {
  return new Promise((resolve) => {
    useConfirmStore.getState().open(options, resolve)
  })
}
