import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { ToolShell } from '../components/ToolShell'
import { Dropzone } from '../components/Dropzone'
import { FormatSelect } from '../components/FormatSelect'
import { Button } from '../components/Button'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProcessor } from '../hooks/useProcessor'
import { useStoredSetting } from '../hooks/useStoredSetting'
import { useElementSize } from '../hooks/useElementSize'
import { useToast } from '../components/Toasts'
import { toolByPath } from '../lib/site'
import {
  decodeImageBitmap,
  drawComposed,
  supportedEncodeFormats,
  type ImageFormat
} from '../lib/canvas'
import { extensionForMime } from '../lib/extensions'
import { outputName, splitName } from '../lib/filenames'
import { formatBytes } from '../lib/format'
import { saveBlob } from '../lib/download'
import { failedToProcess } from '../lib/errors'
import { sizePresets } from '../constants/presets'

const tool = toolByPath('/social-media')!

type FitMode = 'fill' | 'fit' | 'blur'

const fitModes: { id: FitMode; label: string; description: string }[] = [
  { id: 'fill', label: 'Fill', description: 'Cover the frame and crop the overflow' },
  { id: 'fit', label: 'Fit', description: 'Show the whole image on a background' },
  { id: 'blur', label: 'Blur', description: 'Whole image over a blurred copy of itself' }
]

interface ExportResult {
  blob: Blob
  url: string
  name: string
}

export default function SocialImage() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const toast = useToast()
  const processImage = useProcessor()

  const [fileName, setFileName] = useState<string | null>(null)
  const [presetIndex, setPresetIndex] = useStoredSetting<number>('pixelforge-social-preset', 0)
  const [fitMode, setFitMode] = useStoredSetting<FitMode>('pixelforge-social-fit', 'fill')
  const [background, setBackground] = useStoredSetting<string>('pixelforge-social-background', '#ffffff')
  const [transparent, setTransparent] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [focal, setFocal] = useState({ x: 0.5, y: 0.5 })
  const [format, setFormat] = useStoredSetting<ImageFormat>('pixelforge-social-format', 'image/jpeg')
  const [quality, setQuality] = useStoredSetting<number>('pixelforge-social-quality', 90)
  const [supported, setSupported] = useState<Record<ImageFormat, boolean>>({
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/avif': false
  })
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<ExportResult | null>(null)

  const bitmapRef = useRef<ImageBitmap | null>(null)
  const fileRef = useRef<File | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; focalX: number; focalY: number } | null>(null)
  const resultUrlRef = useRef<string | null>(null)
  const { ref: stageRef, size: stageSize } = useElementSize<HTMLDivElement>()

  useEffect(() => {
    let active = true
    supportedEncodeFormats().then((formats) => {
      if (active) setSupported(formats)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const bitmap = bitmapRef
    const storedResultUrl = resultUrlRef
    return () => {
      bitmap.current?.close()
      if (storedResultUrl.current) URL.revokeObjectURL(storedResultUrl.current)
    }
  }, [])

  const preset = sizePresets[presetIndex] ?? sizePresets[0]
  const frameWidth = preset.width
  const frameHeight = preset.height

  const acceptFile = useCallback(
    async (incoming: File) => {
      try {
        const bitmap = await decodeImageBitmap(incoming)
        bitmapRef.current?.close()
        bitmapRef.current = bitmap
        fileRef.current = incoming
        if (resultUrlRef.current) {
          URL.revokeObjectURL(resultUrlRef.current)
          resultUrlRef.current = null
        }
        setResult(null)
        setFocal({ x: 0.5, y: 0.5 })
        setZoom(1)
        setFileName(incoming.name)
      } catch {
        toast('This image could not be read in this browser.', 'error')
      }
    },
    [toast]
  )

  const stageWidth = stageSize.width
  const displaySize = useMemo(() => {
    if (stageWidth === 0) return { width: 0, height: 0 }
    const scale = Math.min(stageWidth / frameWidth, 420 / frameHeight)
    return {
      width: Math.max(1, Math.round(frameWidth * scale)),
      height: Math.max(1, Math.round(frameHeight * scale))
    }
  }, [stageWidth, frameWidth, frameHeight])

  const composeMode = fitMode === 'fill' ? 'cover' : fitMode === 'fit' ? 'contain' : 'blur'
  const composeBackground = format === 'image/png' && transparent ? null : background
  const composeOptions = useMemo(
    () => ({
      mode: composeMode as 'cover' | 'contain' | 'blur',
      zoom,
      focalX: focal.x,
      focalY: focal.y,
      background: composeBackground
    }),
    [composeMode, zoom, focal, composeBackground]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const bitmap = bitmapRef.current
    if (!canvas || !bitmap || displaySize.width === 0) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(displaySize.width * ratio)
    canvas.height = Math.round(displaySize.height * ratio)
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, displaySize.width, displaySize.height)
    drawComposed(context, bitmap, bitmap.width, bitmap.height, displaySize.width, displaySize.height, composeOptions)
  }, [displaySize, composeOptions])

  const exportImage = async () => {
    const source = fileRef.current
    if (!source) return
    setExporting(true)
    try {
      const output = await processImage(source, {
        steps: [
          {
            kind: 'compose',
            width: frameWidth,
            height: frameHeight,
            ...composeOptions
          }
        ],
        encode: { mime: format, quality: format === 'image/png' ? undefined : quality / 100, background: composeBackground ?? background }
      })
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
      const url = URL.createObjectURL(output.blob)
      resultUrlRef.current = url
      setResult({
        blob: output.blob,
        url,
        name: outputName(
          splitName(source.name).base,
          extensionForMime(output.mime),
          `-${output.width}x${output.height}`
        )
      })
    } catch (error) {
      toast(failedToProcess(error), 'error')
    } finally {
      setExporting(false)
    }
  }

  const resetAll = () => {
    bitmapRef.current?.close()
    bitmapRef.current = null
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
    setResult(null)
    setFileName(null)
  }

  const transparentAvailable = format === 'image/png' && fitMode === 'fit'

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
        <section aria-label="Layout settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4 grid gap-5">
            <div>
              <label htmlFor="social-preset" className="field-label">
                Platform size
              </label>
              <select
                id="social-preset"
                value={presetIndex}
                onChange={(event) => setPresetIndex(Number(event.target.value))}
                className="field-input"
              >
                {sizePresets.map((option, index) => (
                  <option key={option.label} value={index}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 font-mono text-xs text-ink-faint">
                {frameWidth} × {frameHeight} px
              </p>
            </div>

            <div>
              <span className="field-label">Fit</span>
              <div role="group" aria-label="Fit mode" className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-raised p-1">
                {fitModes.map((mode) => (
                  <button
                    key={mode.id}
                    aria-pressed={fitMode === mode.id}
                    onClick={() => setFitMode(mode.id)}
                    className={`h-8 rounded-md text-sm font-medium transition-colors ${
                      fitMode === mode.id ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                {fitModes.find((mode) => mode.id === fitMode)?.description}
              </p>
            </div>

            {fitMode === 'fill' && (
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor="social-zoom" className="field-label mb-0">
                    Zoom
                  </label>
                  <span className="font-mono text-sm text-ink">{zoom.toFixed(2)}×</span>
                </div>
                <input
                  id="social-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="h-6 w-full cursor-pointer"
                />
              </div>
            )}

            <div className="grid grid-cols-[auto_1fr] items-end gap-3">
              <div>
                <span className="field-label">Background</span>
                <label className="inline-flex">
                  <span className="sr-only">Background color</span>
                  <input
                    type="color"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                    disabled={transparent}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface disabled:opacity-50"
                  />
                </label>
              </div>
              <div className="grid gap-1.5 pb-1.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={transparent}
                    disabled={!transparentAvailable}
                    onChange={(event) => setTransparent(event.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded disabled:opacity-40"
                  />
                  Transparent padding
                </label>
                <p className="text-xs text-ink-faint">PNG and Fit mode only</p>
              </div>
            </div>

            <FormatSelect
                id="social-format"
                value={format}
                onChange={(next) => {
                  if (next !== 'keep') setFormat(next)
                }}
                supported={supported}
              />

            {format !== 'image/png' && (
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor="social-quality" className="field-label mb-0">
                    Quality
                  </label>
                  <span className="font-mono text-sm text-ink">{quality}%</span>
                </div>
                <input
                  id="social-quality"
                  type="range"
                  min={50}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="h-6 w-full cursor-pointer"
                />
              </div>
            )}

            <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
              {fitMode === 'fill'
                ? 'Drag the preview to reposition the image inside the frame.'
                : 'Fit and Blur always show the entire image, so there is nothing to reposition.'}
            </p>
          </div>
        </section>

        <section aria-label="Preview">
          {!fileName ? (
            <Dropzone
              title="Drop an image to format it"
              hint="It stays on your device the whole time"
              onFiles={(files) => acceptFile(files[0])}
            />
          ) : (
            <div className="grid gap-5">
              <div className="card p-4 sm:p-5">
                <div ref={stageRef} className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    role="application"
                    aria-label={`Preview, ${frameWidth} by ${frameHeight} pixels${fitMode === 'fill' ? '. Drag to reposition the image.' : ''}`}
                    tabIndex={0}
                    style={{ width: displaySize.width || undefined, height: displaySize.height || undefined }}
                    className="checkerboard max-w-full touch-none rounded-lg border border-line"
                    onPointerDown={(event) => {
                      if (fitMode !== 'fill') return
                      event.currentTarget.setPointerCapture(event.pointerId)
                      dragRef.current = {
                        startX: event.clientX,
                        startY: event.clientY,
                        focalX: focal.x,
                        focalY: focal.y
                      }
                    }}
                    onPointerMove={(event) => {
                      const drag = dragRef.current
                      const bitmap = bitmapRef.current
                      if (!drag || !bitmap || displaySize.width === 0) return
                      const coverScale =
                        Math.max(displaySize.width / bitmap.width, displaySize.height / bitmap.height) *
                        Math.max(1, zoom)
                      const slackX = displaySize.width - bitmap.width * coverScale
                      const slackY = displaySize.height - bitmap.height * coverScale
                      let nextX = drag.focalX
                      let nextY = drag.focalY
                      if (slackX < -0.5) nextX = drag.focalX + (event.clientX - drag.startX) / slackX
                      if (slackY < -0.5) nextY = drag.focalY + (event.clientY - drag.startY) / slackY
                      setFocal({
                        x: Math.min(1, Math.max(0, nextX)),
                        y: Math.min(1, Math.max(0, nextY))
                      })
                    }}
                    onPointerUp={() => {
                      dragRef.current = null
                    }}
                    onPointerCancel={() => {
                      dragRef.current = null
                    }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-xs text-ink-faint">
                    Output: {frameWidth} × {frameHeight}
                    {result ? ` · ${formatBytes(result.blob.size)}` : ''}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setFocal({ x: 0.5, y: 0.5 })}>
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      Center
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetAll}>
                      New image
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={exportImage} disabled={exporting}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {exporting ? 'Exporting…' : 'Export image'}
                </Button>
                {result && (
                  <Button variant="secondary" onClick={() => saveBlob(result.blob, result.name)}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download {result.name}
                  </Button>
                )}
              </div>

              {result && (
                <figure className="card p-4">
                  <img
                    src={result.url}
                    alt={`Exported result ${result.name}`}
                    className="checkerboard max-h-72 w-full rounded-lg border border-line object-contain"
                  />
                  <figcaption className="mt-2 font-mono text-xs text-ink-faint">
                    {result.name} · {formatBytes(result.blob.size)}
                  </figcaption>
                </figure>
              )}
            </div>
          )}
        </section>
      </div>
    </ToolShell>
  )
}
