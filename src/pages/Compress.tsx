import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Play } from 'lucide-react'
import { ToolShell } from '../components/ToolShell'
import { Dropzone } from '../components/Dropzone'
import { FileQueue, QueueToolbar } from '../components/FileQueue'
import { QualitySlider } from '../components/QualitySlider'
import { FormatSelect } from '../components/FormatSelect'
import { Button } from '../components/Button'
import { useBatchTool } from '../hooks/useBatchTool'
import { useStoredSetting } from '../hooks/useStoredSetting'
import { usePageMeta } from '../hooks/usePageMeta'
import { supportedEncodeFormats, type ImageFormat } from '../lib/canvas'
import { toolByPath } from '../lib/site'
import { defaultEncodeForType, extensionForMime } from '../lib/extensions'
import { outputName, splitName } from '../lib/filenames'
import { formatBytes, savingsPercent } from '../lib/format'
import { takePendingFiles } from '../lib/handoff'

const tool = toolByPath('/compress')!

export default function Compress() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const [format, setFormat] = useStoredSetting<'keep' | ImageFormat>('pixelforge-compress-format', 'keep')
  const [quality, setQuality] = useStoredSetting<number>('pixelforge-compress-quality', 80)
  const [supported, setSupported] = useState<Record<ImageFormat, boolean>>({
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/avif': false
  })

  useEffect(() => {
    let active = true
    supportedEncodeFormats().then((result) => {
      if (!active) return
      setSupported(result)
      if (format !== 'keep' && !result[format]) setFormat('keep')
    })
    return () => {
      active = false
    }
  }, [format, setFormat])

  const buildPlan = useCallback(
    (item: { type: string }) => {
      const mime = format === 'keep' ? defaultEncodeForType(item.type, supported['image/avif']) : format
      const lossy = mime !== 'image/png'
      return {
        steps: [],
        encode: { mime, quality: lossy ? quality / 100 : undefined, background: '#ffffff' }
      }
    },
    [format, quality, supported]
  )

  const { queue, processing, progress, zipPercent, processQueue, downloadItem, downloadZip } =
    useBatchTool({
      buildPlan: (item) => buildPlan(item),
      resultName: (item, output) =>
        outputName(splitName(item.name).base, extensionForMime(output.mime), '-compressed'),
      zipPrefix: 'pixelforge-compressed'
    })

  const addFiles = queue.addFiles
  useEffect(() => {
    const files = takePendingFiles()
    if (files.length > 0) addFiles(files)
  }, [addFiles])

  const selectedItems = useMemo(
    () => queue.items.filter((item) => queue.selected.has(item.id)),
    [queue.items, queue.selected]
  )
  const doneItems = queue.items.filter((item) => item.result)
  const totalIn = doneItems.reduce((sum, item) => sum + item.size, 0)
  const totalOut = doneItems.reduce((sum, item) => sum + (item.result?.size ?? 0), 0)
  const overallSavings = totalIn > 0 ? savingsPercent(totalIn, totalOut) : null
  const outputMime = format === 'keep' ? null : format
  const qualityDisabled = outputMime === 'image/png'

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <section aria-label="Compression settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4 grid gap-5">
            <FormatSelect
              value={format}
              onChange={(next) => {
                setFormat(next)
                queue.resetResults()
              }}
              supported={supported}
              includeKeep
            />
            <QualitySlider
              value={quality}
              onChange={(value) => {
                setQuality(value)
                queue.resetResults()
              }}
              disabled={qualityDisabled}
              note={
                qualityDisabled
                  ? 'PNG is lossless — quality does not apply'
                  : 'Lower quality means smaller files. 70–85% works for most photos.'
              }
            />
            <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
              GIF, BMP and SVG files are re-encoded as PNG. Animated files keep only their first
              frame. Metadata is dropped during compression.
            </p>
          </div>
        </section>

        <section aria-label="File queue">
          {queue.items.length === 0 ? (
            <div className="grid gap-4">
              <Dropzone hint="JPG, PNG and WebP work best — add up to 30 files at once" onFiles={queue.addFiles} />
            </div>
          ) : (
            <div className="card px-5 py-4">
              <QueueToolbar
                totalCount={queue.items.length}
                selectedCount={selectedItems.length}
                onSelectAll={queue.selectAll}
                onDeselectAll={queue.deselectAll}
                onClearAll={queue.clearAll}
              >
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => processQueue(selectedItems)}
                  disabled={selectedItems.length === 0 || processing}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {selectedItems.length === 0
                    ? 'Compress'
                    : `Compress ${selectedItems.length} file${selectedItems.length > 1 ? 's' : ''}`}
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadZip(selectedItems)}
                  disabled={selectedItems.filter((item) => item.result).length === 0}
                >
                  <Package className="h-4 w-4" aria-hidden="true" />
                  {zipPercent !== null ? `Packing ${zipPercent}%` : 'Download ZIP'}
                </Button>
              </QueueToolbar>
              {processing && (
                <p className="pt-3 text-xs text-ink-soft" aria-live="polite">
                  Processing {Math.min(progress.done + 1, progress.total)} of {progress.total}…
                </p>
              )}
              {doneItems.length > 0 && (
                <p className="pt-3 font-mono text-xs text-ink-soft" aria-live="polite">
                  {doneItems.length} file{doneItems.length > 1 ? 's' : ''} · {formatBytes(totalIn)} →{' '}
                  {formatBytes(totalOut)}
                  {overallSavings !== null && (
                    <span className={overallSavings >= 0 ? 'text-ok' : 'text-warn'}>
                      {' '}
                      {overallSavings >= 0 ? `−${overallSavings}%` : `+${-overallSavings}%`}
                    </span>
                  )}
                </p>
              )}
              <FileQueue
                items={queue.items}
                selected={queue.selected}
                onToggleSelected={queue.toggleSelected}
                onRemove={queue.removeItem}
                onDownload={downloadItem}
                onThumbnailDecoded={(id, width, height) => queue.patchItem(id, { width, height })}
              />
              <div className="pt-4">
                <Dropzone compact title="Add more files" hint="" onFiles={queue.addFiles} />
              </div>
            </div>
          )}
        </section>
      </div>
    </ToolShell>
  )
}
