import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FlipHorizontal, FlipVertical, RotateCcw, RotateCw, RefreshCw } from 'lucide-react'
import { ToolShell } from '../components/ToolShell'
import { Dropzone } from '../components/Dropzone'
import { FormatSelect } from '../components/FormatSelect'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProcessor } from '../hooks/useProcessor'
import { useStoredSetting } from '../hooks/useStoredSetting'
import { useElementSize } from '../hooks/useElementSize'
import { useToast } from '../components/Toasts'
import { toolByPath } from '../lib/site'
import { decodeImageBitmap, drawOriented, supportedEncodeFormats, type ImageFormat } from '../lib/canvas'
import { extensionForMime } from '../lib/extensions'
import { outputName, splitName } from '../lib/filenames'
import { formatBytes } from '../lib/format'
import { saveBlob } from '../lib/download'
import { failedToProcess } from '../lib/errors'

const tool = toolByPath('/crop')!

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type DragMode = { kind: 'move' } | { kind: 'handle'; handle: HandleId } | { kind: 'new' } | { kind: 'pan' }

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface Transform {
  quarter: number
  flipH: boolean
  flipV: boolean
}

const ratioOptions: { label: string; value: string }[] = [
  { label: 'Free', value: 'free' },
  { label: '1:1', value: '1' },
  { label: '4:3', value: '1.333333' },
  { label: '3:2', value: '1.5' },
  { label: '16:9', value: '1.777778' },
  { label: '9:16', value: '0.5625' },
  { label: 'Custom', value: 'custom' }
]

const handleIds: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export default function Crop() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const toast = useToast()
  const processImage = useProcessor()

  const [fileName, setFileName] = useState<string | null>(null)
  const [transform, setTransform] = useState<Transform>({ quarter: 0, flipH: false, flipV: false })
  const [view, setView] = useState({ zoom: 1, panX: 0, panY: 0 })
  const [crop, setCrop] = useState<CropRect | null>(null)
  const [ratioChoice, setRatioChoice] = useStoredSetting<string>('pixelforge-crop-ratio', 'free')
  const [customWidth, setCustomWidth] = useStoredSetting<string>('pixelforge-crop-ratio-w', '1200')
  const [customHeight, setCustomHeight] = useStoredSetting<string>('pixelforge-crop-ratio-h', '630')
  const [format, setFormat] = useStoredSetting<ImageFormat>('pixelforge-crop-format', 'image/png')
  const [quality, setQuality] = useStoredSetting<number>('pixelforge-crop-quality', 90)
  const [supported, setSupported] = useState<Record<ImageFormat, boolean>>({
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/avif': false
  })
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<{ blob: Blob; url: string; name: string } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const fileRef = useRef<File | null>(null)
  const bitmapRef = useRef<ImageBitmap | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragRef = useRef<{
    mode: DragMode
    pointerId: number
    start: { x: number; y: number }
    startScreen: { x: number; y: number }
    crop: CropRect
    view: { zoom: number; panX: number; panY: number }
  } | null>(null)
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStateRef = useRef<{ distance: number; midX: number; midY: number } | null>(null)
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

  const ratio = useMemo(() => {
    if (ratioChoice === 'free') return null
    if (ratioChoice === 'custom') {
      const w = Number.parseFloat(customWidth)
      const h = Number.parseFloat(customHeight)
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h
      return null
    }
    const parsed = Number.parseFloat(ratioChoice)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [ratioChoice, customWidth, customHeight])

  const bitmapSize = useRef({ width: 0, height: 0 })
  const orientedSize = useMemo(() => {
    const { width, height } = bitmapSize.current
    return transform.quarter % 2 === 1 ? { width: height, height: width } : { width, height }
  }, [transform])

  const stage = { width: stageSize.width, height: 420 }
  const fitScale = useMemo(() => {
    if (orientedSize.width === 0 || stage.width === 0) return 1
    return Math.min(stage.width / orientedSize.width, stage.height / orientedSize.height)
  }, [orientedSize, stage.width, stage.height])
  const scale = fitScale * view.zoom

  const clampPan = useCallback(
    (zoom: number, panX: number, panY: number) => {
      const drawnWidth = orientedSize.width * fitScale * zoom
      const drawnHeight = orientedSize.height * fitScale * zoom
      const maxX = Math.max(0, (drawnWidth - stage.width) / 2)
      const maxY = Math.max(0, (drawnHeight - stage.height) / 2)
      return {
        zoom,
        panX: Math.min(maxX, Math.max(-maxX, panX)),
        panY: Math.min(maxY, Math.max(-maxY, panY))
      }
    },
    [orientedSize, fitScale, stage.width, stage.height]
  )

  const acceptFile = useCallback(
    async (incoming: File) => {
      try {
        const bitmap = await decodeImageBitmap(incoming)
        bitmapRef.current?.close()
        bitmapRef.current = bitmap
        fileRef.current = incoming
        bitmapSize.current = { width: bitmap.width, height: bitmap.height }
        setTransform({ quarter: 0, flipH: false, flipV: false })
        setView({ zoom: 1, panX: 0, panY: 0 })
        setCrop({ x: 0, y: 0, width: bitmap.width, height: bitmap.height })
        if (resultUrlRef.current) {
          URL.revokeObjectURL(resultUrlRef.current)
          resultUrlRef.current = null
        }
        setResult(null)
        setFileName(incoming.name)
      } catch {
        toast('This image could not be read in this browser.', 'error')
      }
    },
    [toast]
  )

  const resetAll = () => {
    bitmapRef.current?.close()
    bitmapRef.current = null
    fileRef.current = null
    bitmapSize.current = { width: 0, height: 0 }
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
    setResult(null)
    setCrop(null)
    setFileName(null)
    setTransform({ quarter: 0, flipH: false, flipV: false })
    setView({ zoom: 1, panX: 0, panY: 0 })
  }

  const applyRatio = useCallback(
    (nextRatio: number | null) => {
      setCrop((current) => {
        if (!current || bitmapSize.current.width === 0) return current
        const ow = transform.quarter % 2 === 1 ? bitmapSize.current.height : bitmapSize.current.width
        const oh = transform.quarter % 2 === 1 ? bitmapSize.current.width : bitmapSize.current.height
        if (nextRatio === null) return current
        let width = current.width
        let height = width / nextRatio
        if (height > oh) {
          height = oh
          width = height * nextRatio
        }
        if (width > ow) {
          width = ow
          height = width / nextRatio
        }
        const x = current.x + (current.width - width) / 2
        const y = current.y + (current.height - height) / 2
        return {
          x: Math.min(ow - width, Math.max(0, x)),
          y: Math.min(oh - height, Math.max(0, y)),
          width,
          height
        }
      })
    },
    [transform.quarter]
  )

  const rotate = (direction: 1 | -1) => {
    setTransform((current) => {
      const quarter = ((current.quarter + direction) % 4 + 4) % 4
      setCrop((cropCurrent) => {
        if (!cropCurrent) return cropCurrent
        const swapped = quarter % 2 === 1
        const ow = swapped ? bitmapSize.current.height : bitmapSize.current.width
        const oh = swapped ? bitmapSize.current.width : bitmapSize.current.height
        const width = Math.min(swapped ? cropCurrent.height : cropCurrent.width, ow)
        const height = Math.min(swapped ? cropCurrent.width : cropCurrent.height, oh)
        return {
          x: Math.min(cropCurrent.x, ow - width),
          y: Math.min(cropCurrent.y, oh - height),
          width,
          height
        }
      })
      setView({ zoom: 1, panX: 0, panY: 0 })
      return { ...current, quarter }
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bitmapRef.current || stage.width === 0 || !crop) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(stage.width * ratio)
    canvas.height = Math.round(stage.height * ratio)
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, stage.width, stage.height)

    const bitmap = bitmapRef.current
    const originX = stage.width / 2 + view.panX
    const originY = stage.height / 2 + view.panY
    context.save()
    context.translate(originX, originY)
    context.scale(scale, scale)
    drawOriented(context, bitmap, bitmap.width, bitmap.height, transform.quarter, transform.flipH, transform.flipV)
    context.restore()

    const rectX = originX + (crop.x - orientedSize.width / 2) * scale
    const rectY = originY + (crop.y - orientedSize.height / 2) * scale
    const rectWidth = crop.width * scale
    const rectHeight = crop.height * scale

    context.fillStyle = 'rgba(15, 12, 9, 0.58)'
    context.beginPath()
    context.rect(0, 0, stage.width, stage.height)
    context.rect(rectX, rectY, rectWidth, rectHeight)
    context.fill('evenodd')

    context.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    context.lineWidth = 1
    for (let i = 1; i <= 2; i++) {
      const gx = rectX + (rectWidth * i) / 3
      const gy = rectY + (rectHeight * i) / 3
      context.beginPath()
      context.moveTo(gx, rectY)
      context.lineTo(gx, rectY + rectHeight)
      context.stroke()
      context.beginPath()
      context.moveTo(rectX, gy)
      context.lineTo(rectX + rectWidth, gy)
      context.stroke()
    }

    context.strokeStyle = '#ffffff'
    context.lineWidth = 2
    context.strokeRect(rectX, rectY, rectWidth, rectHeight)

    context.fillStyle = '#ffffff'
    context.strokeStyle = 'rgba(20, 16, 12, 0.8)'
    context.lineWidth = 1
    for (const point of handlePositions(rectX, rectY, rectWidth, rectHeight)) {
      context.beginPath()
      context.rect(point.x - 5, point.y - 5, 10, 10)
      context.fill()
      context.stroke()
    }
  })

  const pointerToImage = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const bounds = canvas.getBoundingClientRect()
    const x = clientX - bounds.left
    const y = clientY - bounds.top
    const originX = stage.width / 2 + view.panX
    const originY = stage.height / 2 + view.panY
    return {
      x: (x - originX) / scale + orientedSize.width / 2,
      y: (y - originY) / scale + orientedSize.height / 2
    }
  }

  const hitTest = (clientX: number, clientY: number): DragMode | null => {
    const canvas = canvasRef.current
    if (!canvas || !crop) return null
    const bounds = canvas.getBoundingClientRect()
    const px = clientX - bounds.left
    const py = clientY - bounds.top
    const originX = stage.width / 2 + view.panX
    const originY = stage.height / 2 + view.panY
    const rectX = originX + (crop.x - orientedSize.width / 2) * scale
    const rectY = originY + (crop.y - orientedSize.height / 2) * scale
    const rectWidth = crop.width * scale
    const rectHeight = crop.height * scale
    for (const [index, point] of handlePositions(rectX, rectY, rectWidth, rectHeight).entries()) {
      if (Math.abs(px - point.x) <= 16 && Math.abs(py - point.y) <= 16) {
        return { kind: 'handle', handle: handleIds[index] }
      }
    }
    if (px >= rectX && px <= rectX + rectWidth && py >= rectY && py <= rectY + rectHeight) {
      return { kind: 'move' }
    }
    if (view.zoom > 1.02) return { kind: 'pan' }
    return { kind: 'new' }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !crop) return
    pinchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinchRef.current.size === 2) {
      dragRef.current = null
      const points = [...pinchRef.current.values()]
      pinchStateRef.current = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        midX: (points[0].x + points[1].x) / 2,
        midY: (points[0].y + points[1].y) / 2
      }
      return
    }
    if (pinchRef.current.size > 2) return
    const usePan = event.pointerType === 'touch'
    let mode = hitTest(event.clientX, event.clientY)
    if (usePan && mode?.kind === 'new') mode = { kind: 'pan' }
    if (!mode) return
    canvas.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      start: pointerToImage(event.clientX, event.clientY),
      startScreen: { x: event.clientX, y: event.clientY },
      crop: { ...crop },
      view: { ...view }
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pinchRef.current.has(event.pointerId)) {
      pinchRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    if (pinchRef.current.size === 2 && pinchStateRef.current) {
      const points = [...pinchRef.current.values()]
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const midX = (points[0].x + points[1].x) / 2
      const midY = (points[0].y + points[1].y) / 2
      const state = pinchStateRef.current
      const factor = distance / state.distance
      setView((current) => {
        const zoom = Math.min(8, Math.max(1, current.zoom * factor))
        return clampPan(zoom, current.panX + (midX - state.midX), current.panY + (midY - state.midY))
      })
      pinchStateRef.current = { distance, midX, midY }
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !crop) return
    const point = pointerToImage(event.clientX, event.clientY)
    const ow = orientedSize.width
    const oh = orientedSize.height
    const minSize = Math.max(1, 12 / scale)

    if (drag.mode.kind === 'pan') {
      const dx = event.clientX - drag.startScreen.x
      const dy = event.clientY - drag.startScreen.y
      setView(clampPan(drag.view.zoom, drag.view.panX + dx, drag.view.panY + dy))
      return
    }

    if (drag.mode.kind === 'move') {
      const width = drag.crop.width
      const height = drag.crop.height
      setCrop({
        x: Math.min(ow - width, Math.max(0, drag.crop.x + (point.x - drag.start.x))),
        y: Math.min(oh - height, Math.max(0, drag.crop.y + (point.y - drag.start.y))),
        width,
        height
      })
      return
    }

    if (drag.mode.kind === 'new') {
      const startX = drag.start.x
      const startY = drag.start.y
      setCrop(rectBetween(startX, startY, point.x, point.y, ratio, ow, oh, minSize))
      return
    }

    setCrop(resizeFromHandle(drag, drag.mode.handle, point.x, point.y, ratio, ow, oh, minSize))
  }

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pinchRef.current.delete(event.pointerId)
    if (pinchRef.current.size < 2) pinchStateRef.current = null
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setCrop((current) => {
      if (current && (current.width < 2 || current.height < 2)) {
        return drag.crop
      }
      return current
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (event: WheelEvent) => {
      if (!fileName) return
      event.preventDefault()
      const bounds = canvas.getBoundingClientRect()
      const px = event.clientX - bounds.left - stage.width / 2
      const py = event.clientY - bounds.top - stage.height / 2
      setView((current) => {
        const zoom = Math.min(8, Math.max(1, current.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)))
        const next = clampPan(zoom, current.panX, current.panY)
        const imageX = (px - current.panX) / (fitScale * current.zoom)
        const imageY = (py - current.panY) / (fitScale * current.zoom)
        return clampPan(zoom, next.panX + (px - imageX * fitScale * zoom), next.panY + (py - imageY * fitScale * zoom))
      })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [fileName, clampPan, fitScale, stage.width, stage.height])

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!crop) return
    const step = event.shiftKey ? 10 : 1
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowLeft') dx = -step
    else if (event.key === 'ArrowRight') dx = step
    else if (event.key === 'ArrowUp') dy = -step
    else if (event.key === 'ArrowDown') dy = step
    else return
    event.preventDefault()
    const ow = orientedSize.width
    const oh = orientedSize.height
    setCrop({
      ...crop,
      x: Math.min(ow - crop.width, Math.max(0, crop.x + dx)),
      y: Math.min(oh - crop.height, Math.max(0, crop.y + dy))
    })
  }

  const exportCrop = async () => {
    const source = fileRef.current
    if (!source || !crop) return
    if (crop.width * crop.height > 40_000_000) {
      toast('That selection is very large — it may fail on this device. Trying anyway.', 'info')
    }
    setExporting(true)
    try {
      const output = await processImage(source, {
        steps: [
          {
            kind: 'orient',
            rotateQuarter: transform.quarter,
            flipHorizontal: transform.flipH,
            flipVertical: transform.flipV
          },
          {
            kind: 'crop',
            x: Math.round(crop.x),
            y: Math.round(crop.y),
            width: Math.round(crop.width),
            height: Math.round(crop.height)
          }
        ],
        encode: {
          mime: format,
          quality: format === 'image/png' ? undefined : quality / 100,
          background: '#ffffff'
        }
      })
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
      const url = URL.createObjectURL(output.blob)
      resultUrlRef.current = url
      setResult({
        blob: output.blob,
        url,
        name: outputName(splitName(fileName ?? 'image').base, extensionForMime(output.mime), '-cropped')
      })
      setPreviewOpen(true)
    } catch (error) {
      toast(failedToProcess(error), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <ToolShell tool={tool}>
      {!fileName ? (
        <div className="mx-auto max-w-xl">
          <Dropzone
            title="Drop an image to crop it"
            hint="Mouse, trackpad and touch controls are supported. Pinch to zoom on mobile."
            onFiles={(files) => acceptFile(files[0])}
          />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_18rem]">
          <section aria-label="Crop stage" className="card p-3 sm:p-4">
            <div ref={stageRef}>
              <canvas
                ref={canvasRef}
                role="application"
                aria-label="Crop editor. Drag inside the frame to move it, drag the handles to resize, arrow keys nudge, scroll or pinch to zoom."
                tabIndex={0}
                className="checkerboard w-full touch-none rounded-lg"
                style={{ height: stage.height }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs text-ink-faint" aria-live="polite">
                {crop ? `${Math.round(crop.width)} × ${Math.round(crop.height)} px` : ''}
                {ratio ? ` · locked ${formatRatio(ratio)}` : ' · free'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <IconButton label="Rotate left" onClick={() => rotate(-1)}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <IconButton label="Rotate right" onClick={() => rotate(1)}>
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={transform.flipH ? 'Undo horizontal flip' : 'Flip horizontally'}
                  onClick={() => setTransform((current) => ({ ...current, flipH: !current.flipH }))}
                  active={transform.flipH}
                >
                  <FlipHorizontal className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={transform.flipV ? 'Undo vertical flip' : 'Flip vertically'}
                  onClick={() => setTransform((current) => ({ ...current, flipV: !current.flipV }))}
                  active={transform.flipV}
                >
                  <FlipVertical className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label="Reset crop and rotation"
                  onClick={() => {
                    setTransform({ quarter: 0, flipH: false, flipV: false })
                    setView({ zoom: 1, panX: 0, panY: 0 })
                    setCrop({
                      x: 0,
                      y: 0,
                      width: bitmapSize.current.width,
                      height: bitmapSize.current.height
                    })
                  }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </section>

          <section aria-label="Crop settings" className="card p-5">
            <h2 className="font-medium text-ink">Settings</h2>
            <div className="mt-4 grid gap-5">
              <div>
                <label htmlFor="crop-ratio" className="field-label">
                  Aspect ratio
                </label>
                <select
                  id="crop-ratio"
                  value={ratioChoice}
                  onChange={(event) => {
                    setRatioChoice(event.target.value)
                    applyRatio(
                      event.target.value === 'free'
                        ? null
                        : event.target.value === 'custom'
                          ? Number.parseFloat(customWidth) / Number.parseFloat(customHeight) || null
                          : Number.parseFloat(event.target.value)
                    )
                  }}
                  className="field-input"
                >
                  {ratioOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {ratioChoice === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="crop-ratio-w" className="field-label">
                        Ratio width
                      </label>
                      <input
                        id="crop-ratio-w"
                        type="number"
                        min={1}
                        value={customWidth}
                        onChange={(event) => setCustomWidth(event.target.value)}
                        className="field-input font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="crop-ratio-h" className="field-label">
                        Ratio height
                      </label>
                      <input
                        id="crop-ratio-h"
                        type="number"
                        min={1}
                        value={customHeight}
                        onChange={(event) => setCustomHeight(event.target.value)}
                        className="field-input font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor="crop-zoom" className="field-label mb-0">
                    Zoom
                  </label>
                  <span className="font-mono text-sm text-ink">{view.zoom.toFixed(2)}×</span>
                </div>
                <input
                  id="crop-zoom"
                  type="range"
                  min={1}
                  max={8}
                  step={0.01}
                  value={view.zoom}
                  onChange={(event) =>
                    setView((current) => clampPan(Number(event.target.value), current.panX, current.panY))
                  }
                  className="h-6 w-full cursor-pointer"
                />
                <p className="mt-1 text-xs text-ink-faint">Zoom only affects editing, not the export.</p>
              </div>

              <FormatSelect
                  id="crop-format"
                  value={format}
                  onChange={(next) => {
                    if (next !== 'keep') setFormat(next)
                  }}
                  supported={supported}
                />

              {format !== 'image/png' && (
                <div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <label htmlFor="crop-quality" className="field-label mb-0">
                      Quality
                    </label>
                    <span className="font-mono text-sm text-ink">{quality}%</span>
                  </div>
                  <input
                    id="crop-quality"
                    type="range"
                    min={50}
                    max={100}
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                    className="h-6 w-full cursor-pointer"
                  />
                </div>
              )}

              <div className="border-t border-line-soft pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={exportCrop}
                  disabled={exporting || !crop}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {exporting ? 'Cropping…' : 'Crop image'}
                </Button>
                {result && (
                  <Button className="mt-2 w-full" onClick={() => saveBlob(result.blob, result.name)}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Save {result.name}
                  </Button>
                )}
                {result && (
                  <Button variant="ghost" className="mt-2 w-full" onClick={() => setPreviewOpen(true)}>
                    Preview result · {formatBytes(result.blob.size)}
                  </Button>
                )}
                <Button variant="ghost" className="mt-2 w-full" onClick={resetAll}>
                  Start over
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Cropped result" wide>
        {result && (
          <div>
            <img
              src={result.url}
              alt="Cropped result"
              className="checkerboard max-h-[62vh] w-full rounded-lg border border-line object-contain"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs text-ink-faint">
                {result.name} · {formatBytes(result.blob.size)}
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  saveBlob(result.blob, result.name)
                  setPreviewOpen(false)
                }}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ToolShell>
  )
}

function handlePositions(x: number, y: number, width: number, height: number) {
  const midX = x + width / 2
  const midY = y + height / 2
  return [
    { x, y },
    { x: midX, y },
    { x: x + width, y },
    { x: x + width, y: midY },
    { x: x + width, y: y + height },
    { x: midX, y: y + height },
    { x, y: y + height },
    { x, y: midY }
  ]
}

function rectBetween(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ratio: number | null,
  ow: number,
  oh: number,
  minSize: number
): CropRect {
  let width = Math.abs(bx - ax)
  let height = Math.abs(by - ay)
  const left = Math.min(ax, bx)
  const top = Math.min(ay, by)
  if (ratio !== null) {
    height = width / ratio
    if (height > Math.abs(by - ay) && Math.abs(by - ay) > minSize) {
      height = Math.abs(by - ay)
      width = height * ratio
    }
    if (left + width > ow) width = ow - left
    height = width / ratio
    if (top + height > oh) {
      height = oh - top
      width = height * ratio
    }
  }
  width = Math.min(Math.max(minSize, width), ow)
  height = Math.min(Math.max(minSize, height), oh)
  return { x: left, y: top, width, height }
}

function resizeFromHandle(
  drag: { crop: CropRect; start: { x: number; y: number } },
  handle: HandleId,
  px: number,
  py: number,
  ratio: number | null,
  ow: number,
  oh: number,
  minSize: number
): CropRect {
  const base = drag.crop
  let left = base.x
  let top = base.y
  let right = base.x + base.width
  let bottom = base.y + base.height

  if (handle.includes('w')) left = Math.min(px, right - minSize)
  if (handle.includes('e')) right = Math.max(px, left + minSize)
  if (handle.includes('n')) top = Math.min(py, bottom - minSize)
  if (handle.includes('s')) bottom = Math.max(py, top + minSize)

  let width = right - left
  let height = bottom - top

  if (ratio !== null) {
    const anchorLeft = handle.includes('e')
    const anchorTop = handle.includes('s')
    const horizontalOnly = handle === 'e' || handle === 'w'
    const verticalOnly = handle === 'n' || handle === 's'
    if (horizontalOnly) {
      height = width / ratio
      const centerY = base.y + base.height / 2
      top = centerY - height / 2
      bottom = centerY + height / 2
    } else if (verticalOnly) {
      width = height * ratio
      const centerX = base.x + base.width / 2
      left = centerX - width / 2
      right = centerX + width / 2
    } else {
      height = width / ratio
      if (anchorTop) top = bottom - height
      else bottom = top + height
    }
    if (left < 0) {
      const overflow = -left
      left = 0
      right = Math.max(minSize, right - overflow)
      height = (right - left) / ratio
      if (anchorTop) top = bottom - height
      else bottom = top + height
    }
    if (top < 0) {
      const overflow = -top
      top = 0
      bottom = Math.max(minSize, bottom - overflow)
      width = (bottom - top) * ratio
      if (!anchorLeft) right = left + width
      else left = right - width
    }
    if (right > ow) {
      right = ow
      width = right - left
      height = width / ratio
      if (anchorTop) top = bottom - height
      else bottom = top + height
    }
    if (bottom > oh) {
      bottom = oh
      height = bottom - top
      width = height * ratio
      if (!anchorLeft) right = left + width
      else left = right - width
    }
    if (left < 0 || top < 0) {
      return base
    }
    return {
      x: Math.max(0, left),
      y: Math.max(0, top),
      width: Math.min(width, ow),
      height: Math.min(height, oh)
    }
  }

  left = Math.max(0, left)
  top = Math.max(0, top)
  right = Math.min(ow, right)
  bottom = Math.min(oh, bottom)
  return {
    x: left,
    y: top,
    width: Math.max(minSize, right - left),
    height: Math.max(minSize, bottom - top)
  }
}

function formatRatio(ratio: number): string {
  if (Math.abs(ratio - 1) < 0.001) return '1:1'
  if (Math.abs(ratio - 4 / 3) < 0.001) return '4:3'
  if (Math.abs(ratio - 3 / 2) < 0.001) return '3:2'
  if (Math.abs(ratio - 16 / 9) < 0.001) return '16:9'
  if (Math.abs(ratio - 9 / 16) < 0.001) return '9:16'
  return ratio.toFixed(2)
}

function IconButton({
  label,
  onClick,
  active,
  children
}: {
  label: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border p-2 transition-colors ${
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line bg-surface text-ink-soft hover:bg-raised hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
