import { useCallback, useState } from 'react'

export type ToastType = 'info' | 'success' | 'error'
export type Toast = { message: string; type?: ToastType } | null

export function useToast() {
  const [toast, setToast] = useState<Toast>(null)

  const showToast = useCallback(
    (msg: string, options?: { duration?: number; type?: ToastType }) => {
      setToast({ message: msg, type: options?.type ?? 'info' })

      const duration = options?.duration ?? 2000
      if (duration > 0) {
        setTimeout(() => {
          setToast(null)
        }, duration)
      }
    },
    [],
  )

  const clearToast = useCallback(() => setToast(null), [])

  return { toast, showToast, clearToast }
}
