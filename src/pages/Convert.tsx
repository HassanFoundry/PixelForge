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
import { extensionForMime } from '../lib/extensions'
import { outputName, splitName } from '../lib/filenames'

const tool = toolByPath('/convert')!

export default function Convert() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const [format, setFormat] = useStoredSetting<ImageFormat>('pixelforge-convert-format', 'image/webp')
  const [quality, setQuality] = useStoredSetting<number>('pixelforge-convert-quality', 85)
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
      if (!result[format]) setFormat(result['image/webp'] ? 'image/webp' : 'image/jpeg')
    })
    return () => {
      active = false
    }
  }, [format, setFormat])

  const buildPlan = useCallback(
    () => ({
      steps: [],
      encode: {
        mime: format,
        quality: format === 'image/png' ? undefined : quality / 100,
        background: '#ffffff'
      }
    }),
    [format, quality]
  )

  const { queue, processing, progress, zipPercent, processQueue, downloadItem, downloadZip } =
    useBatchTool({
      buildPlan,
      resultName: (item, output) => outputName(splitName(item.name).base, extensionForMime(output.mime)),
      zipPrefix: 'pixelforge-converted'
    })

  const selectedItems = useMemo(
    () => queue.items.filter((item) => queue.selected.has(item.id)),
    [queue.items, queue.selected]
  )

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <section aria-label="Conversion settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4 grid gap-5">
            <FormatSelect
              id="convert-format"
              value={format}
              onChange={(next) => {
                if (next !== 'keep') {
                  setFormat(next)
                  queue.resetResults()
                }
              }}
              supported={supported}
            />
            <QualitySlider
              value={quality}
              onChange={(value) => {
                setQuality(value)
                queue.resetResults()
              }}
              disabled={format === 'image/png'}
              note={
                format === 'image/png'
                  ? 'PNG is lossless — quality does not apply'
                  : 'Applies to JPG, WebP and AVIF output.'
              }
            />
            <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
              Converting re-encodes the image, which also removes metadata. Transparent images
              converted to JPG get a white background.
            </p>
          </div>
        </section>

        <section aria-label="File queue">
          {queue.items.length === 0 ? (
            <Dropzone hint="Add up to 30 files and convert them all at once" onFiles={queue.addFiles} />
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
                    ? 'Convert'
                    : `Convert ${selectedItems.length} file${selectedItems.length > 1 ? 's' : ''}`}
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
