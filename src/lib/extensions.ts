import type { ImageFormat } from './canvas'

export function extensionForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/avif') return 'avif'
  return 'png'
}

export function defaultEncodeForType(type: string, canEncodeAvif: boolean): ImageFormat {
  if (type === 'image/webp') return 'image/webp'
  if (type === 'image/png') return 'image/png'
  if (type === 'image/jpeg') return 'image/jpeg'
  if (type === 'image/avif') return canEncodeAvif ? 'image/avif' : 'image/jpeg'
  return 'image/png'
}
