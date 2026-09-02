import {
  createSurface,
  decodeImageBitmap,
  drawComposed,
  drawOriented,
  drawScaledInto,
  encodeSurface,
  surfaceContext,
  type ImageFormat,
  type Surface
} from './canvas'

export interface EncodeOptions {
  mime: ImageFormat
  quality?: number
  background?: string
}

export type PipelineStep =
  | { kind: 'scale'; percent: number }
  | { kind: 'resize'; width?: number; height?: number; fit: 'within' | 'exact' | 'cover'; allowEnlarging: boolean }
  | { kind: 'orient'; rotateQuarter: number; flipHorizontal: boolean; flipVertical: boolean }
  | { kind: 'crop'; x: number; y: number; width: number; height: number }
  | {
      kind: 'compose'
      width: number
      height: number
      mode: 'contain' | 'cover' | 'blur'
      zoom: number
      focalX: number
      focalY: number
      background: string | null
    }

export interface PipelinePlan {
  steps: PipelineStep[]
  encode: EncodeOptions
}

export interface PipelineOutput {
  blob: Blob
  width: number
  height: number
  mime: ImageFormat
}

export interface ProcessRequest {
  id: number
  source: Blob
  plan: PipelinePlan
}

export type ProcessResponse =
  | { id: number; ok: true; blob: Blob; width: number; height: number; mime: ImageFormat }
  | { id: number; ok: false; error: string }

export async function runPipeline(source: Blob, plan: PipelinePlan): Promise<PipelineOutput> {
  const bitmap = await decodeImageBitmap(source)
  try {
    let width = bitmap.width
    let height = bitmap.height
    let current: CanvasImageSource = bitmap
    for (const step of plan.steps) {
      const outcome = applyStep(current, width, height, step)
      current = outcome.source
      width = outcome.width
      height = outcome.height
    }
    let surface = blit(current, width, height)
    if (plan.encode.mime === 'image/jpeg') {
      surface = flatten(surface, plan.encode.background ?? '#ffffff')
    }
    const blob = await encodeSurface(surface, plan.encode.mime, plan.encode.quality)
    return { blob, width, height, mime: plan.encode.mime }
  } finally {
    bitmap.close()
  }
}

function blit(source: CanvasImageSource, width: number, height: number): Surface {
  const surface = createSurface(width, height)
  surfaceContext(surface).drawImage(source, 0, 0, width, height)
  return surface
}

function flatten(surface: Surface, background: string): Surface {
  const flat = createSurface(surface.width, surface.height)
  const context = surfaceContext(flat)
  context.fillStyle = background
  context.fillRect(0, 0, flat.width, flat.height)
  context.drawImage(surface, 0, 0)
  return flat
}

function applyStep(
  source: CanvasImageSource,
  width: number,
  height: number,
  step: PipelineStep
): { source: CanvasImageSource; width: number; height: number } {
  switch (step.kind) {
    case 'scale': {
      const factor = Math.max(0.01, step.percent) / 100
      return resample(source, width, height, Math.max(1, Math.round(width * factor)), Math.max(1, Math.round(height * factor)))
    }
    case 'resize': {
      const target = resolveResize(width, height, step)
      if (!target) return { source, width, height }
      if (step.fit === 'cover') {
        const surface = createSurface(target.width, target.height)
        drawComposed(surfaceContext(surface), source, width, height, target.width, target.height, {
          mode: 'cover',
          zoom: 1,
          focalX: 0.5,
          focalY: 0.5,
          background: null
        })
        return { source: surface, width: target.width, height: target.height }
      }
      return resample(source, width, height, target.width, target.height)
    }
    case 'orient': {
      const quarter = ((step.rotateQuarter % 4) + 4) % 4
      const swap = quarter % 2 === 1
      const surface = createSurface(swap ? height : width, swap ? width : height)
      drawOriented(surfaceContext(surface), source, width, height, quarter, step.flipHorizontal, step.flipVertical)
      return { source: surface, width: surface.width, height: surface.height }
    }
    case 'crop': {
      const rect = clampRect(width, height, step)
      const surface = createSurface(rect.width, rect.height)
      surfaceContext(surface).drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
      return { source: surface, width: rect.width, height: rect.height }
    }
    case 'compose': {
      const surface = createSurface(step.width, step.height)
      drawComposed(surfaceContext(surface), source, width, height, step.width, step.height, {
        mode: step.mode,
        zoom: step.zoom,
        focalX: step.focalX,
        focalY: step.focalY,
        background: step.background
      })
      return { source: surface, width: step.width, height: step.height }
    }
  }
}

function resample(
  source: CanvasImageSource,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number
): { source: CanvasImageSource; width: number; height: number } {
  const surface = createSurface(targetWidth, targetHeight)
  drawScaledInto(surfaceContext(surface), source, width, height, targetWidth, targetHeight)
  return { source: surface, width: targetWidth, height: targetHeight }
}

function resolveResize(
  width: number,
  height: number,
  step: Extract<PipelineStep, { kind: 'resize' }>
): { width: number; height: number } | null {
  const boxWidth = step.width && step.width > 0 ? step.width : Infinity
  const boxHeight = step.height && step.height > 0 ? step.height : Infinity
  if (!Number.isFinite(boxWidth) && !Number.isFinite(boxHeight)) return null
  if (step.fit === 'exact') {
    if (Number.isFinite(boxWidth) && Number.isFinite(boxHeight)) {
      if (!step.allowEnlarging && (boxWidth > width || boxHeight > height)) return null
      return { width: Math.round(boxWidth), height: Math.round(boxHeight) }
    }
    const factor = Number.isFinite(boxWidth) ? boxWidth / width : boxHeight / height
    if (!step.allowEnlarging && factor >= 1) return null
    return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) }
  }
  let factor = Math.min(boxWidth / width, boxHeight / height)
  if (step.fit === 'cover') {
    factor = Math.max(boxWidth / width, boxHeight / height)
    if (!step.allowEnlarging && factor >= 1) return null
    if (Number.isFinite(boxWidth) && Number.isFinite(boxHeight)) {
      return { width: Math.max(1, Math.round(boxWidth)), height: Math.max(1, Math.round(boxHeight)) }
    }
  }
  if (!step.allowEnlarging && factor >= 1) return null
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) }
}

function clampRect(
  width: number,
  height: number,
  step: Extract<PipelineStep, { kind: 'crop' }>
): { x: number; y: number; width: number; height: number } {
  const cropWidth = Math.min(Math.max(1, Math.round(step.width)), width)
  const cropHeight = Math.min(Math.max(1, Math.round(step.height)), height)
  const x = Math.min(Math.max(0, Math.round(step.x)), width - cropWidth)
  const y = Math.min(Math.max(0, Math.round(step.y)), height - cropHeight)
  return { x, y, width: cropWidth, height: cropHeight }
}
