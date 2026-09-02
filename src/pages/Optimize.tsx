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
import type { PipelineStep } from '../lib/pipeline'

const tool = toolByPath('/optimize')!

type OptimizeResizeMode = 'max' | 'percent'

export default function Optimize() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const [resizeEnabled, setResizeEnabled] = useStoredSetting<boolean>('pixelforge-optimize-resize', true)
  const [resizeMode, setResizeMode] = useStoredSetting<OptimizeResizeMode>('pixelforge-optimize-mode', 'max')
  const [maxWidthText, setMaxWidthText] = useStoredSetting<string>('pixelforge-optimize-max-width', '1600')
  const [maxHeightText, setMaxHeightText] = useStoredSetting<string>('pixelforge-optimize-max-height', '')
  const [percent, setPercent] = useStoredSetting<number>('pixelforge-optimize-percent', 80)
  const [format, setFormat] = useStoredSetting<'keep' | ImageFormat>('pixelforge-optimize-format', 'keep')
  const [quality, setQuality] = useStoredSetting<number>('pixelforge-optimize-quality', 78)
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

  const maxWidth = Number.parseInt(maxWidthText, 10)
  const maxHeight = Number.parseInt(maxHeightText, 10)
  const maxValid =
    (maxWidthText.trim() === '' || (Number.isFinite(maxWidth) && maxWidth >= 1 && maxWidth <= 12000)) &&
    (maxHeightText.trim() === '' || (Number.isFinite(maxHeight) && maxHeight >= 1 && maxHeight <= 12000))
  const atLeastOneBound = maxWidthText.trim() !== '' || maxHeightText.trim() !== ''

  const buildStep = useCallback((): PipelineStep | null => {
    if (!resizeEnabled) return null
    if (resizeMode === 'percent') {
      return { kind: 'scale', percent: Math.min(Math.max(percent, 1), 100) }
    }
    if (!maxValid || !atLeastOneBound) return null
    return {
      kind: 'resize',
      width: maxWidthText.trim() === '' ? undefined : maxWidth,
      height: maxHeightText.trim() === '' ? undefined : maxHeight,
      fit: 'within',
      allowEnlarging: false
    }
  }, [resizeEnabled, resizeMode, percent, maxValid, atLeastOneBound, maxWidthText, maxHeightText, maxWidth, maxHeight])

  const buildPlan = useCallback(
    (item: { type: string }) => {
      const mime = format === 'keep' ? defaultEncodeForType(item.type, supported['image/avif']) : format
      const step = buildStep()
      return {
        steps: step ? [step] : [],
        encode: {
          mime,
          quality: mime === 'image/png' ? undefined : quality / 100,
          background: '#ffffff'
        }
      }
    },
    [format, quality, supported, buildStep]
  )

  const { queue, processing, progress, zipPercent, processQueue, downloadItem, downloadZip } =
    useBatchTool({
      buildPlan,
      resultName: (item, output) => {
        const base = splitName(item.name).base
        const ext = extensionForMime(output.mime)
        return outputName(base, ext, output.width !== item.width ? `-${output.width}x${output.height}` : '-optimized')
      },
      zipPrefix: 'pixelforge-optimized'
    })

  const selectedItems = useMemo(
    () => queue.items.filter((item) => queue.selected.has(item.id)),
    [queue.items, queue.selected]
  )
  const doneItems = queue.items.filter((item) => item.result)
  const totalIn = doneItems.reduce((sum, item) => sum + item.size, 0)
  const totalOut = doneItems.reduce((sum, item) => sum + (item.result?.size ?? 0), 0)
  const overallSavings = totalIn > 0 ? savingsPercent(totalIn, totalOut) : null
  const settingsValid = resizeMode === 'percent' || !resizeEnabled || (maxValid && atLeastOneBound)

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <section aria-label="Optimization settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4 grid gap-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={resizeEnabled}
                onChange={(event) => setResizeEnabled(event.target.checked)}
                className="h-4 w-4 cursor-pointer rounded"
              />
              Resize
            </label>

            {resizeEnabled && (
              <div className="grid gap-3 rounded-lg border border-line-soft bg-raised/50 p-3.5">
                <div role="tablist" aria-label="Resize mode" className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1">
                  {(
                    [
                      { id: 'max', label: 'Max dimensions' },
                      { id: 'percent', label: 'Percent' }
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={resizeMode === tab.id}
                      onClick={() => setResizeMode(tab.id)}
                      className={`h-8 rounded-md text-sm font-medium transition-colors ${
                        resizeMode === tab.id ? 'bg-raised text-ink' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {resizeMode === 'max' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="optimize-max-width" className="field-label">
                        Max width
                      </label>
                      <input
                        id="optimize-max-width"
                        type="number"
                        min={1}
                        max={12000}
                        inputMode="numeric"
                        value={maxWidthText}
                        onChange={(event) => setMaxWidthText(event.target.value)}
                        className="field-input font-mono"
                        aria-invalid={!maxValid}
                      />
                    </div>
                    <div>
                      <label htmlFor="optimize-max-height" className="field-label">
                        Max height
                      </label>
                      <input
                        id="optimize-max-height"
                        type="number"
                        min={1}
                        max={12000}
                        inputMode="numeric"
                        value={maxHeightText}
                        onChange={(event) => setMaxHeightText(event.target.value)}
                        className="field-input font-mono"
                        aria-invalid={!maxValid}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 flex items-baseline justify-between">
                      <label htmlFor="optimize-percent" className="field-label mb-0">
                        Scale
                      </label>
                      <span className="font-mono text-sm text-ink">{percent}%</span>
                    </div>
                    <input
                      id="optimize-percent"
                      type="range"
                      min={1}
                      max={100}
                      value={percent}
                      onChange={(event) => setPercent(Number(event.target.value))}
                      className="h-6 w-full cursor-pointer"
                    />
                  </div>
                )}
                <p className="text-xs text-ink-faint">Images already inside the limits are left at their size.</p>
              </div>
            )}

            <FormatSelect
              id="optimize-format"
              value={format}
              onChange={setFormat}
              supported={supported}
              includeKeep
              label="Format"
            />

            <QualitySlider
              value={quality}
              onChange={setQuality}
              disabled={format !== 'keep' && format === 'image/png'}
              note="A good starting point for web images is 70 to 80%."
            />

            <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
              Everything runs in one pass: optional resize, format change and compression. Metadata
              is always dropped. For the smallest files, try WebP output.
            </p>
          </div>
        </section>

        <section aria-label="File queue">
          {queue.items.length === 0 ? (
            <Dropzone hint="Add up to 30 files and optimize them all in one pass" onFiles={queue.addFiles} />
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
                  disabled={selectedItems.length === 0 || processing || !settingsValid}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {selectedItems.length === 0
                    ? 'Optimize'
                    : `Optimize ${selectedItems.length} file${selectedItems.length > 1 ? 's' : ''}`}
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
              {!settingsValid && (
                <p className="pt-3 text-xs text-warn">
                  Enter at least one valid dimension (1–12000), or switch to percent.
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
