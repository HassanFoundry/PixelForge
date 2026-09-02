import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { sizePresets } from '../constants/presets'
import type { PipelineStep } from '../lib/pipeline'

const tool = toolByPath('/resize')!

type ResizeMode = 'pixels' | 'percent' | 'preset'

const modeTabs: { id: ResizeMode; label: string }[] = [
  { id: 'pixels', label: 'Pixels' },
  { id: 'percent', label: 'Percent' },
  { id: 'preset', label: 'Presets' }
]

export default function Resize() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const [mode, setMode] = useStoredSetting<ResizeMode>('pixelforge-resize-mode', 'pixels')
  const [widthText, setWidthText] = useStoredSetting<string>('pixelforge-resize-width', '1280')
  const [heightText, setHeightText] = useStoredSetting<string>('pixelforge-resize-height', '')
  const [lockAspect, setLockAspect] = useStoredSetting<boolean>('pixelforge-resize-lock', true)
  const [percent, setPercent] = useStoredSetting<number>('pixelforge-resize-percent', 50)
  const [presetIndex, setPresetIndex] = useStoredSetting<number>('pixelforge-resize-preset', 0)
  const [cropToFill, setCropToFill] = useStoredSetting<boolean>('pixelforge-resize-crop', false)
  const [allowEnlarging, setAllowEnlarging] = useStoredSetting<boolean>('pixelforge-resize-enlarge', false)
  const [format, setFormat] = useStoredSetting<'keep' | ImageFormat>('pixelforge-resize-format', 'keep')
  const [quality, setQuality] = useStoredSetting<number>('pixelforge-resize-quality', 85)
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

  const parsedWidth = Number.parseInt(widthText, 10)
  const parsedHeight = Number.parseInt(heightText, 10)
  const widthValid = Number.isFinite(parsedWidth) && parsedWidth >= 1 && parsedWidth <= 12000
  const heightValid = Number.isFinite(parsedHeight) && parsedHeight >= 1 && parsedHeight <= 12000
  const settingsValid =
    mode === 'pixels'
      ? lockAspect
        ? widthValid
        : widthValid && heightValid
      : mode === 'percent'
        ? percent >= 1 && percent <= 400
        : presetIndex >= 0 && presetIndex < sizePresets.length

  const buildStep = useCallback((): PipelineStep | null => {
    if (mode === 'pixels') {
      if (!settingsValid) return null
      return {
        kind: 'resize',
        width: parsedWidth,
        height: lockAspect ? undefined : parsedHeight,
        fit: 'exact',
        allowEnlarging
      }
    }
    if (mode === 'percent') {
      return { kind: 'scale', percent: allowEnlarging ? percent : Math.min(percent, 100) }
    }
    const preset = sizePresets[presetIndex]
    if (!preset) return null
    return {
      kind: 'resize',
      width: preset.width,
      height: preset.height,
      fit: cropToFill ? 'cover' : 'within',
      allowEnlarging
    }
  }, [mode, settingsValid, parsedWidth, parsedHeight, lockAspect, allowEnlarging, percent, presetIndex, cropToFill])

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
      resultName: (item, output) =>
        outputName(
          splitName(item.name).base,
          extensionForMime(output.mime),
          `-${output.width}x${output.height}`
        ),
      zipPrefix: 'pixelforge-resized'
    })

  const selectedItems = useMemo(
    () => queue.items.filter((item) => queue.selected.has(item.id)),
    [queue.items, queue.selected]
  )

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <section aria-label="Resize settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4 grid gap-5">
            <div role="tablist" aria-label="Resize mode" className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-raised p-1">
              {modeTabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`h-8 rounded-md text-sm font-medium transition-colors ${
                    mode === tab.id ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {mode === 'pixels' && (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="resize-width" className="field-label">
                      Width (px)
                    </label>
                    <input
                      id="resize-width"
                      type="number"
                      min={1}
                      max={12000}
                      inputMode="numeric"
                      value={widthText}
                      onChange={(event) => setWidthText(event.target.value)}
                      className="field-input font-mono"
                      aria-invalid={!widthValid}
                    />
                  </div>
                  <div>
                    <label htmlFor="resize-height" className="field-label">
                      Height (px)
                    </label>
                    <input
                      id="resize-height"
                      type="number"
                      min={1}
                      max={12000}
                      inputMode="numeric"
                      value={lockAspect ? '' : heightText}
                      onChange={(event) => setHeightText(event.target.value)}
                      disabled={lockAspect}
                      placeholder={lockAspect ? 'auto' : undefined}
                      className="field-input font-mono"
                      aria-invalid={!lockAspect && !heightValid}
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={lockAspect}
                    onChange={(event) => setLockAspect(event.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded"
                  />
                  Keep aspect ratio
                </label>
              </div>
            )}

            {mode === 'percent' && (
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor="resize-percent" className="field-label mb-0">
                    Scale
                  </label>
                  <span className="font-mono text-sm text-ink">{percent}%</span>
                </div>
                <input
                  id="resize-percent"
                  type="range"
                  min={1}
                  max={400}
                  step={1}
                  value={percent}
                  onChange={(event) => setPercent(Number(event.target.value))}
                  className="h-6 w-full cursor-pointer"
                />
                <p className="mt-1 text-xs text-ink-faint">
                  50% halves both dimensions. Above 100% needs “Allow enlarging”.
                </p>
              </div>
            )}

            {mode === 'preset' && (
              <div className="grid gap-3">
                <div>
                  <label htmlFor="resize-preset" className="field-label">
                    Preset size
                  </label>
                  <select
                    id="resize-preset"
                    value={presetIndex}
                    onChange={(event) => setPresetIndex(Number(event.target.value))}
                    className="field-input"
                  >
                    {sizePresets.map((preset, index) => (
                      <option key={preset.label} value={index}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={cropToFill}
                    onChange={(event) => setCropToFill(event.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded"
                  />
                  Crop to fill the frame
                </label>
                <p className="text-xs text-ink-faint">
                  {cropToFill
                    ? 'The image is scaled to cover the frame; edges outside it are cropped.'
                    : 'The image fits inside the frame; no pixels are cut.'}
                </p>
              </div>
            )}

            <FormatSelect
              id="resize-format"
              value={format}
              onChange={(next) => setFormat(next)}
              supported={supported}
              includeKeep
            />

            <QualitySlider
              value={quality}
              onChange={setQuality}
              disabled={format !== 'keep' && format === 'image/png'}
              note={format === 'keep' ? 'Used when the output is JPG, WebP or AVIF.' : undefined}
            />

            <label className="flex cursor-pointer items-center gap-2.5 border-t border-line-soft pt-4 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={allowEnlarging}
                onChange={(event) => setAllowEnlarging(event.target.checked)}
                className="h-4 w-4 cursor-pointer rounded"
              />
              Allow enlarging smaller images
            </label>

            <p className="text-xs text-ink-faint">
              Need a different kind of crop? The{' '}
              <Link to="/crop" className="rounded-sm font-medium text-accent hover:underline">
                cropper
              </Link>{' '}
              gives you full control.
            </p>
          </div>
        </section>

        <section aria-label="File queue">
          {queue.items.length === 0 ? (
            <Dropzone hint="Add up to 30 files and resize them all at once" onFiles={queue.addFiles} />
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
                    ? 'Resize'
                    : `Resize ${selectedItems.length} file${selectedItems.length > 1 ? 's' : ''}`}
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
              {!settingsValid && (
                <p className="pt-3 text-xs text-warn">Enter a width between 1 and 12000 to continue.</p>
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
