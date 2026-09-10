import { useEffect, useRef } from 'react'

export function useDialogFocus(open, onClose, busy) {
  const ref = useRef(null)
  const state = useRef({ onClose, busy })
  state.current = { onClose, busy }
  useEffect(() => {
    if (!open || !ref.current) return
    const root = ref.current
    const previous = document.activeElement
    const focusable = () => [...root.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
      .filter((element) => !element.disabled && element.getClientRects().length)
    ;(focusable()[0] || root).focus()
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!state.current.busy) state.current.onClose()
      }
      if (event.key !== 'Tab') return
      const targets = focusable()
      const first = targets[0] || root, last = targets.at(-1) || root
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    root.addEventListener('keydown', keydown)
    return () => {
      root.removeEventListener('keydown', keydown)
      if (previous?.isConnected) previous.focus()
    }
  }, [open])
  return ref
}
