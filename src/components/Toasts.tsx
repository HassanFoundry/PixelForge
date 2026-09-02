import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

export type ToastTone = 'info' | 'success' | 'error'

interface ToastMessage {
  id: number
  text: string
  tone: ToastTone
}

type PushToast = (text: string, tone?: ToastTone) => void

const ToastContext = createContext<PushToast>(() => undefined)

export const useToast = () => useContext(ToastContext)

const toneIcons: Record<ToastTone, ReactNode> = {
  info: <Info className="h-5 w-5 text-accent" aria-hidden="true" />,
  success: <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden="true" />,
  error: <TriangleAlert className="h-5 w-5 text-danger" aria-hidden="true" />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const counter = useRef(0)
  const timers = useRef(new Map<number, number>())

  useEffect(() => {
    const storedTimers = timers
    return () => {
      for (const timer of storedTimers.current.values()) window.clearTimeout(timer)
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (text: string, tone: ToastTone = 'info') => {
      counter.current += 1
      const id = counter.current
      setToasts((previous) => [...previous.slice(-2), { id, text, tone }])
      const timer = window.setTimeout(() => dismiss(id), 5200)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-6 sm:items-end sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 pr-1.5 shadow-pop"
          >
            {toneIcons[toast.tone]}
            <p className="flex-1 pt-0.5 text-sm leading-snug text-ink">{toast.text}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-raised hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
