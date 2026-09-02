import { useCallback, useEffect, useRef } from 'react'
import { extractPalette, type ExtractedColor } from '../lib/palette'

export function usePaletteWorker() {
  const workerRef = useRef<Worker | null>(null)
  const resolveRef = useRef<((colors: ExtractedColor[]) => void) | null>(null)
  const capable = typeof Worker !== 'undefined'

  useEffect(() => {
    if (!capable) return
    const worker = new Worker(new URL('../workers/palette.worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (event: MessageEvent<{ colors: ExtractedColor[] }>) => {
      resolveRef.current?.(event.data.colors)
      resolveRef.current = null
    })
    worker.addEventListener('error', () => {
      resolveRef.current?.([])
      resolveRef.current = null
      workerRef.current = null
    })
    workerRef.current = worker
    return () => {
      workerRef.current = null
      worker.terminate()
      resolveRef.current?.([])
      resolveRef.current = null
    }
  }, [capable])

  return useCallback(
    (pixels: Uint8ClampedArray, count: number): Promise<ExtractedColor[]> => {
      const worker = workerRef.current
      if (!worker) return Promise.resolve(extractPalette(pixels, count))
      return new Promise((resolve) => {
        resolveRef.current = resolve
        const copy = new Uint8ClampedArray(pixels)
        worker.postMessage({ pixels: copy.buffer, count }, [copy.buffer])
      })
    },
    []
  )
}
