import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Play } from 'lucide-react'
import { ToolShell } from '../components/ToolShell'
import { Dropzone } from '../components/Dropzone'
import { FileQueue, QueueToolbar } from '../components/FileQueue'
import { FormatSelect } from '../components/FormatSelect'
import { Button } from '../components/Button'
import { useBatchTool } from '../hooks/useBatchTool'
import { useStoredSetting } from '../hooks/useStoredSetting'
import { usePageMeta } from '../hooks/usePageMeta'
import { supportedEncodeFormats, type ImageFormat } from '../lib/canvas'
import { toolByPath } from '../lib/site'
import { defaultEncodeForType, extensionForMime } from '../lib/extensions'
import { outputName, splitName } from '../lib/filenames'
import { inspectMetadata, type DetectedMetadata, type MetadataCategories } from '../lib/metadata'

const tool = toolByPath('/metadata-remover')!

const categoryLabels: { key: keyof MetadataCategories; label: string }[] = [
  { key: 'exif', label: 'EXIF' },
  { key: 'gps', label: 'GPS' },
  { key: 'xmp', label: 'XMP' },
  { key: 'iptc', label: 'IPTC' },
  { key: 'icc', label: 'ICC profile' },
  { key: 'comment', label: 'Comment' },
  { key: 'fileText', label: 'Text chunks' }
]

const noMetadataReport: DetectedMetadata = {
  container: 'unknown',
  animation: false,
  categories: { exif: false, gps: false, xmp: false, icc: false, iptc: false, comment: false, fileText: false },
  entries: [],
  notes: [],
  truncated: false
}

export default function MetadataRemover() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const [format, setFormat] = useStoredSetting<'keep' | ImageFormat>('pixelforge-metadata-format', 'keep')
  const [quality, setQuality] = useStoredSetting<number>('pixelforge-metadata-quality', 92)
  const [supported, setSupported] = useState<Record<ImageFormat, boolean>>({
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/avif': false
  })
  const [reports, setReports] = useState<Record<string, DetectedMetadata>>({})
  const [inspectedIds, setInspectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true
    supportedEncodeFormats().then((result) => {
      if (active) setSupported(result)
    })
    return () => {
      active = false
    }
  }, [])

  const buildPlan = useCallback(
    (item: { type: string }) => {
      const mime = format === 'keep' ? defaultEncodeForType(item.type, supported['image/avif']) : format
      return {
        steps: [],
        encode: {
          mime,
          quality: mime === 'image/png' ? undefined : quality / 100,
          background: '#ffffff'
        }
      }
    },
    [format, quality, supported]
  )

  const { queue, processing, progress, zipPercent, processQueue, downloadItem, downloadZip } =
    useBatchTool({
      buildPlan,
      resultName: (item, output) => outputName(splitName(item.name).base, extensionForMime(output.mime), '-clean'),
      zipPrefix: 'pixelforge-clean'
    })

  useEffect(() => {
    const fresh = queue.items.filter((item) => !inspectedIds.has(item.id))
    if (fresh.length === 0) return
    setInspectedIds((previous) => {
      const next = new Set(previous)
      for (const item of fresh) next.add(item.id)
      return next
    })
    for (const item of fresh) {
      inspectMetadata(item.file)
        .then((report) => setReports((previous) => ({ ...previous, [item.id]: report })))
        .catch(() => setReports((previous) => ({ ...previous, [item.id]: noMetadataReport })))
    }
  }, [queue.items, inspectedIds])

  useEffect(() => {
    const liveIds = new Set(queue.items.map((item) => item.id))
    setReports((previous) => {
      const next: Record<string, DetectedMetadata> = {}
      for (const [id, report] of Object.entries(previous)) {
        if (liveIds.has(id)) next[id] = report
      }
      const changed = Object.keys(next).length !== Object.keys(previous).length
      return changed ? next : previous
    })
  }, [queue.items])

  const selectedItems = useMemo(
    () => queue.items.filter((item) => queue.selected.has(item.id)),
    [queue.items, queue.selected]
  )

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <section aria-label="Cleaning settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4 grid gap-5">
            <FormatSelect
              id="metadata-format"
              value={format}
              onChange={setFormat}
              supported={supported}
              includeKeep
            />
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <label htmlFor="metadata-quality" className="field-label mb-0">
                  Quality
                </label>
                <span className="font-mono text-sm text-ink">{quality}%</span>
              </div>
              <input
                id="metadata-quality"
                type="range"
                min={60}
                max={100}
                value={quality}
                disabled={format !== 'keep' && format === 'image/png'}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="h-6 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-ink-faint">
                The image is re-encoded from its pixels, so this setting controls how closely the
                clean copy matches the original.
              </p>
            </div>
            <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
              Cleaning re-encodes the image, which drops EXIF, GPS, XMP, IPTC, JPEG comments, ICC
              profiles and PNG text chunks. Animated GIF and WebP files become still images. Keep
              the quality at 90% or above for photography.
            </p>
          </div>
        </section>

        <section aria-label="File queue">
          {queue.items.length === 0 ? (
            <Dropzone
              hint="JPG, PNG, WebP and GIF. Metadata is scanned locally."
              onFiles={queue.addFiles}
            />
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
                    ? 'Clean'
                    : `Clean ${selectedItems.length} file${selectedItems.length > 1 ? 's' : ''}`}
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
                itemDetail={(item) => (
                  <MetadataSummary report={reports[item.id]} done={item.status === 'done'} />
                )}
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

function MetadataSummary({ report, done }: { report?: DetectedMetadata; done: boolean }) {
  if (!report) {
    return <p className="mt-1.5 text-xs text-ink-faint">Scanning metadata…</p>
  }
  const found = categoryLabels.filter((category) => report.categories[category.key])
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {found.length === 0 && (
        <span className="text-xs text-ink-faint">No standard metadata detected</span>
      )}
      {report.animation && (
        <span className="rounded border border-warn/40 px-1.5 py-0.5 text-[11px] font-medium text-warn">
          Animated
        </span>
      )}
      {found.map((category) => (
        <span
          key={category.key}
          className="rounded border border-line bg-raised px-1.5 py-0.5 text-[11px] font-medium text-ink-soft"
        >
          {category.label}
        </span>
      ))}
      {done && (
        <span className="rounded border border-ok/40 px-1.5 py-0.5 text-[11px] font-medium text-ok">
          Cleaned copy ready
        </span>
      )}
      {!done && found.length > 0 && (
        <span className="text-[11px] text-ink-faint">removed in the clean copy</span>
      )}
    </div>
  )
}
