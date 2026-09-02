export type ImageContainer = 'JPEG' | 'PNG' | 'WebP' | 'GIF' | 'AVIF' | 'BMP' | 'SVG' | 'unknown'

export interface MetadataEntry {
  label: string
  value: string
}

export interface MetadataCategories {
  exif: boolean
  gps: boolean
  xmp: boolean
  icc: boolean
  iptc: boolean
  comment: boolean
  fileText: boolean
}

export interface DetectedMetadata {
  container: ImageContainer
  animation: boolean
  categories: MetadataCategories
  entries: MetadataEntry[]
  notes: string[]
  truncated: boolean
}

const SCAN_WINDOW = 786432

export function detectContainer(bytes: Uint8Array): ImageContainer {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'JPEG'
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'PNG'
  if (bytes.length >= 12 && asciiAt(bytes, 0) === 'RIFF' && asciiAt(bytes, 8) === 'WEBP') return 'WebP'
  if (bytes.length >= 6 && asciiAt(bytes, 0).startsWith('GIF8')) return 'GIF'
  if (bytes.length >= 12 && asciiAt(bytes, 4) === 'ftyp') {
    const brand = asciiAt(bytes, 8, 4)
    if (brand === 'avif' || brand === 'avis') return 'AVIF'
    return 'unknown'
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'BMP'
  const head = asciiAt(bytes, 0, Math.min(bytes.length, 1024)).trimStart().slice(0, 128).toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'SVG'
  return 'unknown'
}

export async function inspectMetadata(file: Blob): Promise<DetectedMetadata> {
  const window = await file.slice(0, Math.min(file.size, SCAN_WINDOW)).arrayBuffer()
  const bytes = new Uint8Array(window)
  const view = new DataView(window)
  const container = detectContainer(bytes)
  const emptyCategories = { exif: false, gps: false, xmp: false, icc: false, iptc: false, comment: false, fileText: false }
  const report: DetectedMetadata = {
    container,
    animation: false,
    categories: emptyCategories,
    entries: [],
    notes: [],
    truncated: file.size > SCAN_WINDOW
  }
  try {
    if (container === 'JPEG') scanJpeg(view, report)
    else if (container === 'PNG') scanPng(view, report)
    else if (container === 'WebP') scanWebp(view, report)
    else if (container === 'GIF') scanGif(bytes, view, report)
    else if (container === 'AVIF') report.notes.push('AVIF metadata scanning is not supported here, but re-encoding still produces a clean file.')
    else if (container === 'SVG') report.notes.push('SVG files can embed text and links. Check the source or export a PNG copy.')
    else if (container === 'BMP') report.notes.push('BMP files carry no standard metadata block.')
  } catch {
    report.notes.push('Part of the metadata could not be scanned safely.')
  }
  return report
}

function scanJpeg(view: DataView, report: DetectedMetadata): void {
  let position = 2
  while (position + 4 <= view.byteLength) {
    if (view.getUint8(position) !== 0xff) {
      position++
      continue
    }
    const marker = view.getUint8(position + 1)
    if (marker === 0xff) {
      position++
      continue
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      position += 2
      continue
    }
    if (marker === 0xda || marker === 0xd9) return
    const segmentLength = view.getUint16(position + 2)
    const dataStart = position + 4
    if (dataStart > view.byteLength) {
      report.truncated = true
      return
    }
    const safeEnd = Math.min(dataStart + segmentLength - 2, view.byteLength)
    const headerLength = Math.min(32, Math.max(0, view.byteLength - dataStart))
    const header = asciiAt(new Uint8Array(view.buffer, dataStart, headerLength), 0, headerLength)
    if (marker === 0xe1) {
      if (header.startsWith('Exif')) {
        report.categories.exif = true
        collectTiff(view, dataStart + 6, safeEnd, report)
      } else if (header.startsWith('http://ns.adobe.com/xap/1.0/')) {
        report.categories.xmp = true
        report.entries.push({ label: 'XMP', value: 'Adobe XMP metadata block present' })
      }
    } else if (marker === 0xe2) {
      if (header.startsWith('ICC_PROFILE')) {
        report.categories.icc = true
        report.entries.push({ label: 'Color profile', value: 'Embedded ICC profile' })
      }
    } else if (marker === 0xed) {
      if (header.startsWith('Photoshop 3.0')) {
        report.categories.iptc = true
        report.entries.push({ label: 'IPTC / Photoshop', value: 'Photoshop resource block present (often holds IPTC captions)' })
      }
    } else if (marker === 0xfe) {
      const textLength = Math.max(0, safeEnd - dataStart)
      const text = sanitize(asciiAt(new Uint8Array(view.buffer, dataStart, textLength), 0, textLength))
      if (text) {
        report.categories.comment = true
        report.entries.push({ label: 'JPEG comment', value: text })
      }
    }
    position = dataStart + Math.max(0, segmentLength - 2)
  }
  report.truncated = true
}

interface TiffEntry {
  tag: number
  type: number
  count: number
  valueOffset: number
  entryAt: number
}

function collectTiff(view: DataView, tiffStart: number, tiffEnd: number, report: DetectedMetadata): void {
  if (tiffStart + 8 > tiffEnd) return
  const byteOrder = view.getUint16(tiffStart)
  const little = byteOrder === 0x4949
  if (!little && byteOrder !== 0x4d4d) return
  if (view.getUint16(tiffStart + 2, little) !== 0x2a) return
  const ifdOffset = view.getUint32(tiffStart + 4, little)
  const ifd0 = readIfd(view, tiffStart, ifdOffset, tiffEnd, little)
  if (!ifd0) return
  const ifdIndex = new Map(ifd0.map((entry) => [entry.tag, entry]))

  const camera = joinValues(readAscii(view, tiffStart, ifdIndex.get(0x010f), tiffEnd), readAscii(view, tiffStart, ifdIndex.get(0x0110), tiffEnd))
  if (camera) report.entries.push({ label: 'Camera', value: camera })
  const orientation = readNumeric(view, tiffStart, ifdIndex.get(0x0112), tiffEnd, little)
  if (orientation) report.entries.push({ label: 'Orientation', value: describeOrientation(orientation) })
  const software = readAscii(view, tiffStart, ifdIndex.get(0x0131), tiffEnd)
  if (software) report.entries.push({ label: 'Software', value: software })
  const dateTime = readAscii(view, tiffStart, ifdIndex.get(0x0132), tiffEnd)
  if (dateTime) report.entries.push({ label: 'Date', value: dateTime })
  const artist = readAscii(view, tiffStart, ifdIndex.get(0x013b), tiffEnd)
  if (artist) report.entries.push({ label: 'Artist', value: artist })
  const copyright = readAscii(view, tiffStart, ifdIndex.get(0x8298), tiffEnd)
  if (copyright) report.entries.push({ label: 'Copyright', value: copyright })

  const exifPointer = readNumeric(view, tiffStart, ifdIndex.get(0x8769), tiffEnd, little)
  if (exifPointer) {
    const exifIfd = readIfd(view, tiffStart, exifPointer, tiffEnd, little)
    if (exifIfd) {
      const exifMap = new Map(exifIfd.map((entry) => [entry.tag, entry]))
      const taken = readAscii(view, tiffStart, exifMap.get(0x9003), tiffEnd)
      if (taken) report.entries.push({ label: 'Date taken', value: taken })
      const exposure = readRationals(view, tiffStart, exifMap.get(0x829a), tiffEnd, little)
      if (exposure && exposure[0] > 0) {
        report.entries.push({ label: 'Exposure', value: describeExposure(exposure) })
      }
      const aperture = readRationals(view, tiffStart, exifMap.get(0x829d), tiffEnd, little)
      if (aperture && aperture[1] > 0) {
        report.entries.push({ label: 'Aperture', value: `f/${(aperture[0] / aperture[1]).toFixed(1)}` })
      }
      const iso = readNumeric(view, tiffStart, exifMap.get(0x8827), tiffEnd, little)
      if (iso) report.entries.push({ label: 'ISO', value: String(iso) })
      const focal = readRationals(view, tiffStart, exifMap.get(0x920a), tiffEnd, little)
      if (focal && focal[1] > 0) {
        report.entries.push({ label: 'Focal length', value: `${Math.round(focal[0] / focal[1])} mm` })
      }
      const lens = readAscii(view, tiffStart, exifMap.get(0xa434), tiffEnd)
      if (lens) report.entries.push({ label: 'Lens', value: lens })
      const exifWidth = readNumeric(view, tiffStart, exifMap.get(0xa002), tiffEnd, little)
      const exifHeight = readNumeric(view, tiffStart, exifMap.get(0xa003), tiffEnd, little)
      if (exifWidth && exifHeight) {
        report.entries.push({ label: 'EXIF dimensions', value: `${exifWidth} × ${exifHeight}` })
      }
    }
  }

  const gpsPointer = readNumeric(view, tiffStart, ifdIndex.get(0x8825), tiffEnd, little)
  if (gpsPointer) {
    const gpsIfd = readIfd(view, tiffStart, gpsPointer, tiffEnd, little)
    if (gpsIfd) {
      const gpsMap = new Map(gpsIfd.map((entry) => [entry.tag, entry]))
      const position = describeGps(view, tiffStart, gpsMap, tiffEnd, little)
      if (position) {
        report.categories.gps = true
        report.entries.push({ label: 'GPS position', value: position })
      }
      const altitudeEntry = readRationals(view, tiffStart, gpsMap.get(0x0006), tiffEnd, little)
      if (altitudeEntry && altitudeEntry[1] > 0) {
        report.entries.push({ label: 'GPS altitude', value: `${Math.round(altitudeEntry[0] / altitudeEntry[1])} m` })
      }
    }
  }
}

function readIfd(
  view: DataView,
  tiffStart: number,
  offset: number,
  tiffEnd: number,
  little: boolean
): TiffEntry[] | null {
  const ifdStart = tiffStart + offset
  if (ifdStart < 0 || ifdStart + 2 > tiffEnd || ifdStart + 2 > view.byteLength) return null
  const count = view.getUint16(ifdStart, little)
  if (count > 128) return null
  const entries: TiffEntry[] = []
  for (let i = 0; i < count; i++) {
    const at = ifdStart + 2 + i * 12
    if (at + 12 > tiffEnd || at + 12 > view.byteLength) return entries
    entries.push({
      tag: view.getUint16(at, little),
      type: view.getUint16(at + 2, little),
      count: view.getUint32(at + 4, little),
      valueOffset: view.getUint32(at + 8, little),
      entryAt: at
    })
  }
  return entries
}

const typeSizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

function valueLocation(
  view: DataView,
  tiffStart: number,
  entry: TiffEntry | undefined,
  tiffEnd: number
): number {
  if (!entry) return -1
  const size = typeSizes[entry.type]
  if (!size || entry.count > 1024) return -1
  const total = size * entry.count
  const at = total <= 4 ? entry.entryAt + 8 : tiffStart + entry.valueOffset
  if (tiffStart + entry.valueOffset < 0) return -1
  if (at + total > tiffEnd || at + total > view.byteLength) return -1
  return at
}

function readAscii(
  view: DataView,
  tiffStart: number,
  entry: TiffEntry | undefined,
  tiffEnd: number
): string {
  if (!entry || entry.type !== 2) return ''
  const at = valueLocation(view, tiffStart, entry, tiffEnd)
  if (at < 0) return ''
  let text = ''
  for (let i = 0; i < entry.count; i++) {
    const code = view.getUint8(at + i)
    if (code === 0) break
    text += String.fromCharCode(code)
  }
  return sanitize(text)
}

function readNumeric(
  view: DataView,
  tiffStart: number,
  entry: TiffEntry | undefined,
  tiffEnd: number,
  little: boolean
): number {
  if (!entry || entry.count < 1) return 0
  const at = valueLocation(view, tiffStart, entry, tiffEnd)
  if (at < 0) return 0
  if (entry.type === 3) return view.getUint16(at, little)
  if (entry.type === 4) return view.getUint32(at, little)
  return 0
}

function readRationals(
  view: DataView,
  tiffStart: number,
  entry: TiffEntry | undefined,
  tiffEnd: number,
  little: boolean
): number[] | null {
  if (!entry || entry.type !== 5 || entry.count < 1) return null
  const at = valueLocation(view, tiffStart, entry, tiffEnd)
  if (at < 0) return null
  const values: number[] = []
  for (let i = 0; i < entry.count; i++) {
    values.push(view.getUint32(at + i * 8, little), view.getUint32(at + i * 8 + 4, little))
  }
  return values
}

function describeGps(
  view: DataView,
  tiffStart: number,
  gpsMap: Map<number, TiffEntry>,
  tiffEnd: number,
  little: boolean
): string {
  const parts: string[] = []
  const latitude = readRationals(view, tiffStart, gpsMap.get(0x0002), tiffEnd, little)
  if (latitude) {
    const value = dmsToDegrees(latitude)
    if (Number.isFinite(value)) {
      const reference = readAscii(view, tiffStart, gpsMap.get(0x0001), tiffEnd)
      parts.push(`${value.toFixed(4)}° ${reference.startsWith('S') ? 'S' : 'N'}`)
    }
  }
  const longitude = readRationals(view, tiffStart, gpsMap.get(0x0004), tiffEnd, little)
  if (longitude) {
    const value = dmsToDegrees(longitude)
    if (Number.isFinite(value)) {
      const reference = readAscii(view, tiffStart, gpsMap.get(0x0003), tiffEnd)
      parts.push(`${value.toFixed(4)}° ${reference.startsWith('W') ? 'W' : 'E'}`)
    }
  }
  return parts.join(', ')
}

function dmsToDegrees(pairs: number[]): number {
  if (pairs.length < 6) return NaN
  const degrees = pairs[0] / (pairs[1] || 1)
  const minutes = pairs[2] / (pairs[3] || 1)
  const seconds = pairs[4] / (pairs[5] || 1)
  return degrees + minutes / 60 + seconds / 3600
}

function describeExposure(pairs: number[]): string {
  const seconds = pairs[0] / (pairs[1] || 1)
  if (seconds >= 1) return `${seconds.toFixed(1)} s`
  if (seconds <= 0) return ''
  return `1/${Math.round(1 / seconds)} s`
}

function describeOrientation(value: number): string {
  const descriptions: Record<number, string> = {
    1: 'Normal',
    2: 'Mirrored horizontally',
    3: 'Rotated 180°',
    4: 'Mirrored vertically',
    5: 'Mirrored, rotated 90°',
    6: 'Rotated 90° CW',
    7: 'Mirrored, rotated 270°',
    8: 'Rotated 270° CW'
  }
  return descriptions[value] ?? `Value ${value}`
}

function scanPng(view: DataView, report: DetectedMetadata): void {
  let position = 8
  while (position + 12 <= view.byteLength) {
    const length = view.getUint32(position)
    const type = asciiAt(new Uint8Array(view.buffer, position + 4, 4), 0)
    const dataStart = position + 8
    if (dataStart + length > view.byteLength) {
      report.truncated = true
      return
    }
    if (length > SCAN_WINDOW) {
      report.truncated = true
      return
    }
    const safeEnd = dataStart + length
    if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
      report.categories.fileText = true
      const keyword = readPngKeyword(view, dataStart, safeEnd)
      report.entries.push({
        label: `PNG text${type === 'iTXt' ? ' (international)' : type === 'zTXt' ? ' (compressed)' : ''}`,
        value: keyword || 'unnamed text chunk'
      })
    } else if (type === 'eXIf') {
      report.categories.exif = true
      collectTiff(view, dataStart, safeEnd, report)
    } else if (type === 'iCCP' || type === 'sRGB' || type === 'gAMA') {
      if (type === 'iCCP') {
        report.categories.icc = true
        report.entries.push({ label: 'Color profile', value: 'Embedded ICC profile (iCCP chunk)' })
      }
    } else if (type === 'tIME') {
      report.entries.push({ label: 'File timestamp', value: readPngTime(view, dataStart, safeEnd) })
    } else if (type === 'acTL') {
      report.animation = true
    } else if (type === 'IEND') {
      return
    }
    position = dataStart + length + 4
  }
  report.truncated = true
}

function readPngKeyword(view: DataView, start: number, end: number): string {
  let text = ''
  for (let at = start; at < end && at < start + 80; at++) {
    const code = view.getUint8(at)
    if (code === 0) break
    if (code < 32 || code > 126) continue
    text += String.fromCharCode(code)
  }
  return sanitize(text)
}

function readPngTime(view: DataView, start: number, end: number): string {
  if (start + 7 > end) return ''
  const year = view.getUint16(start)
  const month = view.getUint8(start + 2)
  const day = view.getUint8(start + 3)
  if (!year || !month || !day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function scanWebp(view: DataView, report: DetectedMetadata): void {
  let position = 12
  while (position + 8 <= view.byteLength) {
    const type = asciiAt(new Uint8Array(view.buffer, position, 4), 0)
    const length = view.getUint32(position + 4, true)
    const dataStart = position + 8
    if (dataStart + length > view.byteLength) {
      report.truncated = true
      return
    }
    const safeEnd = dataStart + length
    if (type === 'VP8X') {
      const flags = view.getUint8(dataStart)
      if (flags & 0x02) report.animation = true
    } else if (type === 'EXIF') {
      report.categories.exif = true
      const header = asciiAt(new Uint8Array(view.buffer, dataStart, Math.min(6, view.byteLength - dataStart)), 0)
      collectTiff(view, header.startsWith('Exif') ? dataStart + 6 : dataStart, safeEnd, report)
    } else if (type === 'XMP ') {
      report.categories.xmp = true
      report.entries.push({ label: 'XMP', value: 'Adobe XMP metadata block present' })
    } else if (type === 'ICCP') {
      report.categories.icc = true
      report.entries.push({ label: 'Color profile', value: 'Embedded ICC profile' })
    } else if (type === 'ANMF' || type === 'ANIM') {
      report.animation = true
    }
    position = dataStart + length + (length % 2)
  }
}

function scanGif(bytes: Uint8Array, view: DataView, report: DetectedMetadata): void {
  if (bytes.length < 14) return
  let position = 13
  const flags = view.getUint8(10)
  if (flags & 0x80) position += 3 * (1 << ((flags & 0x07) + 1))
  let images = 0
  let looped = false
  const guard = Math.min(bytes.length, 262144)
  while (position < guard) {
    const block = bytes[position]
    if (block === 0x3b) break
    if (block === 0x21 && position + 2 < guard) {
      const label = bytes[position + 1]
      position += 2
      if (label === 0xfe) {
        const text = readGifText(bytes, position)
        position = skipSubBlocks(bytes, position)
        report.categories.comment = true
        report.entries.push({ label: 'GIF comment', value: text || 'empty comment extension' })
        continue
      }
      if (label === 0xff && position + 12 < guard) {
        if (asciiAt(bytes, position + 1, 11) === 'NETSCAPE2.0') looped = true
        position = skipSubBlocks(bytes, position)
        continue
      }
      position = skipSubBlocks(bytes, position)
      continue
    }
    if (block === 0x2c && position + 10 < guard) {
      images++
      const descriptorFlags = bytes[position + 8]
      position += 10
      if (descriptorFlags & 0x80) position += 3 * (1 << ((descriptorFlags & 0x07) + 1))
      if (position < guard) position++
      position = skipSubBlocks(bytes, position)
      continue
    }
    break
  }
  report.animation = images > 1 || looped
  if (report.animation) {
    report.notes.push('Animated file: only the first frame survives re-encoding.')
  }
}

function readGifText(bytes: Uint8Array, start: number): string {
  let text = ''
  let position = start
  while (position < bytes.length) {
    const size = bytes[position]
    if (size === 0) break
    for (let i = 1; i <= size && text.length < 120; i++) {
      const code = bytes[position + i]
      if (code >= 32 && code <= 126) text += String.fromCharCode(code)
    }
    position += size + 1
  }
  return sanitize(text)
}

function skipSubBlocks(bytes: Uint8Array, start: number): number {
  let position = start
  while (position < bytes.length) {
    const size = bytes[position]
    position += 1
    if (size === 0) return position
    position += size
  }
  return position
}

function asciiAt(bytes: Uint8Array, start: number, length = 4): string {
  let text = ''
  for (let i = 0; i < length && start + i < bytes.length; i++) {
    text += String.fromCharCode(bytes[start + i])
  }
  return text
}

function sanitize(text: string): string {
  let clean = ''
  for (const character of text) {
    const code = character.charCodeAt(0)
    clean += code >= 32 && code !== 127 ? character : ' '
  }
  return clean.replace(/\s+/g, ' ').trim().slice(0, 96)
}

function joinValues(...parts: string[]): string {
  return parts.filter(Boolean).join(' · ')
}
