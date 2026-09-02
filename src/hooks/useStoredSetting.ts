import { useCallback, useState } from 'react'

export function useStoredSetting<T extends boolean | number | string>(
  key: string,
  fallback: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return fallback
      const parsed = JSON.parse(raw) as unknown
      if (typeof parsed !== typeof fallback) return fallback
      return parsed as T
    } catch {
      return fallback
    }
  })

  const update = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        return
      }
    },
    [key]
  )

  return [value, update]
}
