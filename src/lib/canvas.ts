export type Surface = HTMLCanvasElement | OffscreenCanvas
export type DrawContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'

export const formatLabels: Record<ImageFormat, string> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF'
}

export function createSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function surfaceContext(surface: Surface): DrawContext {
  const context = surface.getContext('2d')
  if (!context) throw new Error('This browser could not create a drawing surface.')
  return context as DrawContext
}

export async function decodeImageBitmap(source: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(source)
    } catch {
      return decodeViaImageElement(source)
    }
  }
  return decodeViaImageElement(source)
}

async function decodeViaImageElement(source: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser cannot decode images.')
  }
  const url = URL.createObjectURL(source)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return await createImageBitmap(image)
  } catch {
    throw new Error('This image could not be decoded.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function encodeSurface(
  surface: Surface,
  mime: ImageFormat,
  quality?: number
): Promise<Blob> {
  let blob: Blob | null = null
  if (surface instanceof OffscreenCanvas) {
    blob = await surface.convertToBlob({ type: mime, quality })
  } else {
    blob = await new Promise<Blob | null>((resolve) => surface.toBlob(resolve, mime, quality))
  }
  if (!blob || blob.type !== mime) {
    throw new Error(`${formatLabels[mime]} encoding is not supported by this browser.`)
  }
  return blob
}

let encodeSupport: Promise<Record<ImageFormat, boolean>> | null = null

export function supportedEncodeFormats(): Promise<Record<ImageFormat, boolean>> {
  if (!encodeSupport) {
    encodeSupport = detectEncodeSupport()
  }
  return encodeSupport
}

async function detectEncodeSupport(): Promise<Record<ImageFormat, boolean>> {
  const formats: ImageFormat[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  const surface = createSurface(4, 4)
  surfaceContext(surface)
  const results = {} as Record<ImageFormat, boolean>
  for (const format of formats) {
    try {
      await encodeSurface(surface, format, 0.8)
      results[format] = true
    } catch {
      results[format] = false
    }
  }
  return results
}

export function supportsCanvasBlur(): boolean {
  try {
    const context = surfaceContext(createSurface(4, 4))
    context.filter = 'blur(2px)'
    return context.filter === 'blur(2px)'
  } catch {
    return false
  }
}

export async function detectTransparency(bitmap: ImageBitmap): Promise<boolean> {
  const pixels = bitmap.width * bitmap.height
  const limit = 8_000_000
  const scale = pixels > limit ? Math.sqrt(limit / pixels) : 1
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const surface = createSurface(width, height)
  const context = surfaceContext(surface)
  context.drawImage(bitmap, 0, 0, width, height)
  const data = context.getImageData(0, 0, width, height).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}

export function drawOriented(
  context: DrawContext,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  rotateQuarter: number,
  flipHorizontal: boolean,
  flipVertical: boolean
): void {
  const quarter = ((rotateQuarter % 4) + 4) % 4
  const swapSides = quarter % 2 === 1
  const width = swapSides ? sourceHeight : sourceWidth
  const height = swapSides ? sourceWidth : sourceHeight
  context.translate(width / 2, height / 2)
  context.rotate((quarter * Math.PI) / 2)
  context.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1)
  context.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight)
}

export function drawScaledInto(
  context: DrawContext,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): void {
  let current: CanvasImageSource = source
  let width = sourceWidth
  let height = sourceHeight
  while (width >= targetWidth * 2 && height >= targetHeight * 2) {
    const halfWidth = Math.max(targetWidth, Math.floor(width / 2))
    const halfHeight = Math.max(targetHeight, Math.floor(height / 2))
    const half = createSurface(halfWidth, halfHeight)
    const halfContext = surfaceContext(half)
    halfContext.imageSmoothingEnabled = true
    halfContext.imageSmoothingQuality = 'high'
    halfContext.drawImage(current, 0, 0, width, height, 0, 0, halfWidth, halfHeight)
    current = half
    width = halfWidth
    height = halfHeight
  }
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(current, 0, 0, width, height, 0, 0, targetWidth, targetHeight)
}

export interface ComposeOptions {
  mode: 'contain' | 'cover' | 'blur'
  zoom: number
  focalX: number
  focalY: number
  background: string | null
}

export function drawComposed(
  context: DrawContext,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  options: ComposeOptions
): void {
  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(0, 0, targetWidth, targetHeight)
  }
  if (options.mode === 'blur') {
    drawBlurredBackdrop(context, source, sourceWidth, sourceHeight, targetWidth, targetHeight)
  }
  if (options.mode === 'cover' || options.mode === 'blur') {
    if (options.mode === 'cover') {
      drawCoverLayer(context, source, sourceWidth, sourceHeight, targetWidth, targetHeight, options)
    } else {
      drawContainLayer(context, source, sourceWidth, sourceHeight, targetWidth, targetHeight)
    }
    return
  }
  drawContainLayer(context, source, sourceWidth, sourceHeight, targetWidth, targetHeight)
}

function drawCoverLayer(
  context: DrawContext,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  options: ComposeOptions
): void {
  const scale =
    Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight) * Math.max(1, options.zoom)
  const drawnWidth = sourceWidth * scale
  const drawnHeight = sourceHeight * scale
  const x = options.focalX * (targetWidth - drawnWidth)
  const y = options.focalY * (targetHeight - drawnHeight)
  context.save()
  context.beginPath()
  context.rect(0, 0, targetWidth, targetHeight)
  context.clip()
  context.translate(x, y)
  drawScaledInto(context, source, sourceWidth, sourceHeight, drawnWidth, drawnHeight)
  context.restore()
}

function drawContainLayer(
  context: DrawContext,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): void {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const drawnWidth = Math.max(1, sourceWidth * scale)
  const drawnHeight = Math.max(1, sourceHeight * scale)
  const x = (targetWidth - drawnWidth) / 2
  const y = (targetHeight - drawnHeight) / 2
  context.save()
  context.beginPath()
  context.rect(0, 0, targetWidth, targetHeight)
  context.clip()
  context.translate(x, y)
  drawScaledInto(context, source, sourceWidth, sourceHeight, drawnWidth, drawnHeight)
  context.restore()
}

function drawBlurredBackdrop(
  context: DrawContext,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): void {
  const backdropScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight) * 1.12
  const drawnWidth = sourceWidth * backdropScale
  const drawnHeight = sourceHeight * backdropScale
  const x = (targetWidth - drawnWidth) / 2
  const y = (targetHeight - drawnHeight) / 2
  context.save()
  context.beginPath()
  context.rect(0, 0, targetWidth, targetHeight)
  context.clip()
  const radius = Math.max(8, Math.round(Math.max(targetWidth, targetHeight) / 24))
  if (supportsCanvasBlur()) {
    context.filter = `blur(${radius}px)`
    context.drawImage(source, 0, 0, sourceWidth, sourceHeight, x, y, drawnWidth, drawnHeight)
    context.filter = 'none'
  } else {
    const tinyWidth = Math.max(2, Math.round(targetWidth / 16))
    const tinyHeight = Math.max(2, Math.round(targetHeight / 16))
    const tiny = createSurface(tinyWidth, tinyHeight)
    const tinyContext = surfaceContext(tiny)
    const cover = Math.max(tinyWidth / sourceWidth, tinyHeight / sourceHeight) * 1.12
    const cropWidth = tinyWidth / cover
    const cropHeight = tinyHeight / cover
    const cropX = (sourceWidth - cropWidth) / 2
    const cropY = (sourceHeight - cropHeight) / 2
    tinyContext.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, tinyWidth, tinyHeight)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(tiny, 0, 0, tinyWidth, tinyHeight, 0, 0, targetWidth, targetHeight)
  }
  context.restore()
}
