import { useCallback, useEffect, useRef } from 'react'
import { describeError } from '../lib/errors'
import { runPipeline, type PipelineOutput, type PipelinePlan, type ProcessResponse } from '../lib/pipeline'

interface PendingRequest {
  resolve: (output: PipelineOutput) => void
  reject: (error: Error) => void
}

export function useProcessor() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef(new Map<number, PendingRequest>())
  const nextIdRef = useRef(1)
  const workerCapable =
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function'

  useEffect(() => {
    if (!workerCapable) return
    const pendingRequests = pendingRef.current
    const worker = new Worker(new URL('../workers/process.worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (event: MessageEvent<ProcessResponse>) => {
      const pending = pendingRequests.get(event.data.id)
      if (!pending) return
      pendingRequests.delete(event.data.id)
      if (event.data.ok) {
        pending.resolve({
          blob: event.data.blob,
          width: event.data.width,
          height: event.data.height,
          mime: event.data.mime
        })
      } else {
        pending.reject(new Error(event.data.error))
      }
    })
    worker.addEventListener('error', () => {
      for (const pending of pendingRequests.values()) {
        pending.reject(new Error('Processing was interrupted.'))
      }
      pendingRequests.clear()
      workerRef.current = null
    })
    workerRef.current = worker
    return () => {
      workerRef.current = null
      worker.terminate()
      for (const pending of pendingRequests.values()) {
        pending.reject(new Error('Processing was cancelled.'))
      }
      pendingRequests.clear()
    }
  }, [workerCapable])

  return useCallback(
    (source: Blob, plan: PipelinePlan): Promise<PipelineOutput> =>
      new Promise<PipelineOutput>((resolve, reject) => {
        const worker = workerRef.current
        if (!worker) {
          runPipeline(source, plan).then(resolve, (error) => reject(new Error(describeError(error))))
          return
        }
        const id = nextIdRef.current++
        pendingRef.current.set(id, { resolve, reject })
        worker.postMessage({ id, source, plan })
      }),
    []
  )
}
