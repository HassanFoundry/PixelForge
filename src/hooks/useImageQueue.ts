import { useCallback, useEffect, useRef, useState } from 'react'

export type QueueItemStatus = 'ready' | 'processing' | 'done' | 'error'

export interface QueueResult {
  blob: Blob
  url: string
  name: string
  size: number
  width: number
  height: number
  mime: string
}

export interface QueueItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  url: string
  width?: number
  height?: number
  status: QueueItemStatus
  error?: string
  result?: QueueResult
}

export const MAX_QUEUE_FILES = 30
export const LARGE_FILE_BYTES = 30 * 1024 * 1024

let queueCounter = 0

function nextQueueId(): string {
  queueCounter += 1
  return `q${Date.now().toString(36)}-${queueCounter}`
}

function looksLikeImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(jpe?g|png|webp|avif|gif|bmp|svg)$/i.test(file.name)
}

export function useImageQueue(
  onRejected?: (names: string[]) => void,
  onLargeFile?: (name: string) => void
) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const itemsRef = useRef<QueueItem[]>([])
  const onRejectedRef = useRef(onRejected)
  const onLargeFileRef = useRef(onLargeFile)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    onRejectedRef.current = onRejected
    onLargeFileRef.current = onLargeFile
  }, [onRejected, onLargeFile])

  useEffect(() => {
    const ref = itemsRef
    return () => {
      for (const item of ref.current) {
        URL.revokeObjectURL(item.url)
        if (item.result) URL.revokeObjectURL(item.result.url)
      }
    }
  }, [])

  const addFiles = useCallback((incoming: File[] | FileList) => {
    const files = Array.from(incoming)
    if (files.length === 0) return
    const rejected: string[] = []
    const accepted: QueueItem[] = []
    const currentCount = itemsRef.current.length
    for (const file of files) {
      if (!looksLikeImage(file)) {
        rejected.push(file.name)
        continue
      }
      if (currentCount + accepted.length >= MAX_QUEUE_FILES) {
        rejected.push(`${file.name} — queue holds ${MAX_QUEUE_FILES} files`)
        continue
      }
      if (file.size > LARGE_FILE_BYTES) onLargeFileRef.current?.(file.name)
      accepted.push({
        id: nextQueueId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        status: 'ready'
      })
    }
    if (accepted.length > 0) {
      setItems((previous) => [...previous, ...accepted])
      setSelected((previous) => {
        const next = new Set(previous)
        for (const item of accepted) next.add(item.id)
        return next
      })
    }
    if (rejected.length > 0) onRejectedRef.current?.(rejected)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((previous) =>
      previous.filter((item) => {
        if (item.id !== id) return true
        URL.revokeObjectURL(item.url)
        if (item.result) URL.revokeObjectURL(item.result.url)
        return false
      })
    )
    setSelected((previous) => {
      if (!previous.has(id)) return previous
      const next = new Set(previous)
      next.delete(id)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.url)
      if (item.result) URL.revokeObjectURL(item.result.url)
    }
    setItems([])
    setSelected(new Set())
  }, [])

  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item
        if (patch.result && item.result && patch.result.url !== item.result.url) {
          URL.revokeObjectURL(item.result.url)
        }
        return { ...item, ...patch }
      })
    )
  }, [])

  const hasItem = useCallback((id: string) => itemsRef.current.some((item) => item.id === id), [])

  const toggleSelected = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(itemsRef.current.map((item) => item.id)))
  }, [])

  const deselectAll = useCallback(() => setSelected(new Set()), [])

  const resetResults = useCallback(() => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.result) URL.revokeObjectURL(item.result.url)
        return { ...item, status: 'ready', result: undefined, error: undefined }
      })
    )
  }, [])

  return {
    items,
    selected,
    addFiles,
    removeItem,
    clearAll,
    patchItem,
    hasItem,
    toggleSelected,
    selectAll,
    deselectAll,
    resetResults
  }
}
