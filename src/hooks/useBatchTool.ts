import { useCallback, useEffect, useRef, useState } from 'react'
import { useProcessor } from './useProcessor'
import { useImageQueue, type QueueItem, type QueueResult } from './useImageQueue'
import { useToast } from '../components/Toasts'
import { failedToProcess } from '../lib/errors'
import { uniqueName } from '../lib/filenames'
import { saveBlob, zipAndSave } from '../lib/download'
import type { PipelineOutput, PipelinePlan } from '../lib/pipeline'

interface BatchToolOptions {
  buildPlan: (item: QueueItem) => PipelinePlan
  resultName: (item: QueueItem, output: PipelineOutput) => string
  zipPrefix: string
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useBatchTool(options: BatchToolOptions) {
  const toast = useToast()
  const processImage = useProcessor()
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const queue = useImageQueue(
    (names) => {
      toast(
        names.length === 1
          ? `Skipped ${names[0]} — not a recognizable image file`
          : `Skipped ${names.length} files — not recognizable images`,
        'error'
      )
    },
    (name) => toast(`${name} is a large file — it may be slow on this device`, 'info')
  )

  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [zipPercent, setZipPercent] = useState<number | null>(null)

  const processQueue = useCallback(
    async (targets: QueueItem[]) => {
      if (targets.length === 0 || processing) return
      setProcessing(true)
      setProgress({ done: 0, total: targets.length })
      const takenNames = new Set<string>()
      for (const item of targets) {
        if (!queue.hasItem(item.id)) continue
        queue.patchItem(item.id, { status: 'processing', error: undefined })
        try {
          const plan = optionsRef.current.buildPlan(item)
          const output = await processImage(item.file, plan)
          if (!queue.hasItem(item.id)) continue
          const name = uniqueName(optionsRef.current.resultName(item, output), takenNames)
          const result: QueueResult = {
            blob: output.blob,
            url: URL.createObjectURL(output.blob),
            name,
            size: output.blob.size,
            width: output.width,
            height: output.height,
            mime: output.mime
          }
          queue.patchItem(item.id, { status: 'done', result, error: undefined })
        } catch (error) {
          if (queue.hasItem(item.id)) {
            queue.patchItem(item.id, { status: 'error', error: failedToProcess(error) })
          }
        }
        setProgress((current) => ({ ...current, done: current.done + 1 }))
      }
      setProcessing(false)
    },
    [processing, processImage, queue]
  )

  const downloadItem = useCallback((item: QueueItem) => {
    if (item.result) saveBlob(item.result.blob, item.result.name)
  }, [])

  const downloadZip = useCallback(
    async (targets: QueueItem[]) => {
      const withResults = targets.filter((item) => item.result)
      if (withResults.length === 0) return
      if (withResults.length === 1) {
        downloadItem(withResults[0])
        return
      }
      setZipPercent(0)
      try {
        await zipAndSave(
          withResults.map((item) => ({ name: item.result!.name, blob: item.result!.blob })),
          `${optionsRef.current.zipPrefix}-${dateStamp()}.zip`,
          (percent) => setZipPercent(Math.round(percent))
        )
      } catch {
        toast('The ZIP file could not be created. Try downloading files individually.', 'error')
      } finally {
        setZipPercent(null)
      }
    },
    [downloadItem, toast]
  )

  return {
    queue,
    processing,
    progress,
    zipPercent,
    processQueue,
    downloadItem,
    downloadZip
  }
}
