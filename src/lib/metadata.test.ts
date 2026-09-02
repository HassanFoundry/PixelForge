import { describe, expect, it } from 'vitest'
import { detectContainer, inspectMetadata } from './metadata'

function ascii(text: string): number[] {
  return Array.from(text, (character) => character.charCodeAt(0))
}

export function buildTiff(): number[] {
  const bytes: number[] = []
  const putU8 = (value: number) => bytes.push(value & 0xff)
  const putU16 = (value: number) => bytes.push(value & 0xff, (value >> 8) & 0xff)
  const putU32 = (value: number) =>
    bytes.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff)
  const putAscii = (text: string) => bytes.push(...ascii(text))

  putAscii('II')
  putU16(42)
  putU32(8)

  const ifd0At = 8
  const entryCount = 5
  const exifIfdAt = ifd0At + 2 + entryCount * 12 + 4
  const exifEntryCount = 1
  const exifDataAt = exifIfdAt + 2 + exifEntryCount * 12 + 4
  const gpsIfdAt = exifDataAt + 20
  const gpsEntryCount = 2
  const gpsDataAt = gpsIfdAt + 2 + gpsEntryCount * 12 + 4
  const makeAt = gpsDataAt + 24
  const modelAt = makeAt + 8

  const entry = (tag: number, type: number, count: number, value: number) => {
    putU16(tag)
    putU16(type)
    putU32(count)
    if (type === 3 && count === 1) {
      putU16(value)
      putU16(0)
    } else {
      putU32(value)
    }
  }

  putU16(entryCount)
  entry(0x010f, 2, 8, makeAt)
  entry(0x0110, 2, 6, modelAt)
  entry(0x0112, 3, 1, 6)
  entry(0x8769, 4, 1, exifIfdAt)
  entry(0x8825, 4, 1, gpsIfdAt)
  putU32(0)

  while (bytes.length < exifIfdAt) bytes.push(0)
  putU16(exifEntryCount)
  entry(0x9003, 2, 20, exifDataAt)
  putU32(0)

  while (bytes.length < exifDataAt) bytes.push(0)
  putAscii('2026:01:15 10:30:00')
  putU8(0)

  while (bytes.length < gpsIfdAt) bytes.push(0)
  putU16(gpsEntryCount)
  entry(0x0001, 2, 2, 0x4e00)
  entry(0x0002, 5, 3, gpsDataAt)
  putU32(0)

  while (bytes.length < gpsDataAt) bytes.push(0)
  for (const value of [48, 1, 51, 1, 2414, 100]) putU32(value)

  while (bytes.length < makeAt) bytes.push(0)
  putAscii('TestCam')
  putU8(0)
  while (bytes.length < modelAt) bytes.push(0)
  putAscii('X-100')
  putU8(0)

  return bytes
}

export function buildJpeg(segments: { marker: number; payload: number[] }[]): Uint8Array {
  const bytes: number[] = [0xff, 0xd8]
  for (const segment of segments) {
    bytes.push(0xff, segment.marker)
    const length = segment.payload.length + 2
    bytes.push((length >> 8) & 0xff, length & 0xff)
    bytes.push(...segment.payload)
  }
  bytes.push(0xff, 0xda, 0x00, 0x3c, 0x00, 0xff, 0xd9)
  return new Uint8Array(bytes)
}

describe('inspectMetadata on JPEG', () => {
  it('reads EXIF camera, orientation, date, GPS, ICC and comments', async () => {
    const tiff = buildTiff()
    const jpeg = buildJpeg([
      { marker: 0xe1, payload: [...ascii('Exif\0\0'), ...tiff] },
      { marker: 0xe2, payload: [...ascii('ICC_PROFILE\0'), 0, 0, 1, 0] },
      { marker: 0xfe, payload: ascii('hello world') }
    ])
    const report = await inspectMetadata(new Blob([jpeg], { type: 'image/jpeg' }))
    expect(report.container).toBe('JPEG')
    expect(report.categories.exif).toBe(true)
    expect(report.categories.gps).toBe(true)
    expect(report.categories.icc).toBe(true)
    expect(report.categories.comment).toBe(true)
    const labels = report.entries.map((entry) => entry.label)
    expect(labels).toContain('Camera')
    expect(labels).toContain('Orientation')
    expect(labels).toContain('Date taken')
    expect(labels).toContain('GPS position')
    const camera = report.entries.find((entry) => entry.label === 'Camera')
    expect(camera?.value).toBe('TestCam · X-100')
    const orientation = report.entries.find((entry) => entry.label === 'Orientation')
    expect(orientation?.value).toBe('Rotated 90° CW')
    const gps = report.entries.find((entry) => entry.label === 'GPS position')
    expect(gps?.value).toContain('48.8567')
    expect(gps?.value).toContain('N')
    const comment = report.entries.find((entry) => entry.label === 'JPEG comment')
    expect(comment?.value).toBe('hello world')
  })

  it('reports nothing for a bare JPEG', async () => {
    const jpeg = buildJpeg([])
    const report = await inspectMetadata(new Blob([jpeg], { type: 'image/jpeg' }))
    expect(report.categories.exif).toBe(false)
    expect(report.entries.length).toBe(0)
  })

  it('detects XMP blocks', async () => {
    const jpeg = buildJpeg([
      { marker: 0xe1, payload: [...ascii('http://ns.adobe.com/xap/1.0/\0'), ...ascii('<?xpacket?>')] }
    ])
    const report = await inspectMetadata(new Blob([jpeg]))
    expect(report.categories.xmp).toBe(true)
  })
})

function pngChunk(type: string, data: number[]): number[] {
  const length = data.length
  return [
    (length >> 24) & 0xff,
    (length >> 16) & 0xff,
    (length >> 8) & 0xff,
    length & 0xff,
    ...ascii(type),
    ...data,
    0,
    0,
    0,
    0
  ]
}

describe('inspectMetadata on PNG', () => {
  it('finds text chunks and embedded EXIF', async () => {
    const png = new Uint8Array([
      ...[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      ...pngChunk('IHDR', [0, 0, 0, 2, 0, 0, 0, 2, 8, 6, 0, 0, 0]),
      ...pngChunk('tEXt', [...ascii('Comment\0'), ...ascii('made in test')]),
      ...pngChunk('eXIf', buildTiff()),
      ...pngChunk('IEND', [])
    ])
    const report = await inspectMetadata(new Blob([png]))
    expect(report.container).toBe('PNG')
    expect(report.categories.fileText).toBe(true)
    expect(report.categories.exif).toBe(true)
    const text = report.entries.find((entry) => entry.label === 'PNG text')
    expect(text?.value).toBe('Comment')
    expect(report.entries.some((entry) => entry.label === 'Camera')).toBe(true)
  })
})

describe('inspectMetadata on WebP', () => {
  it('finds EXIF, XMP, ICC and animation', async () => {
    const chunks: number[] = []
    const pushChunk = (type: string, data: number[]) => {
      chunks.push(...ascii(type))
      const length = data.length
      chunks.push(length & 0xff, (length >> 8) & 0xff, (length >> 16) & 0xff, (length >> 24) & 0xff)
      chunks.push(...data)
      if (length % 2 === 1) chunks.push(0)
    }
    pushChunk('EXIF', [...ascii('Exif\0\0'), ...buildTiff()])
    pushChunk('XMP ', ascii('<x:xmpmeta/>'))
    pushChunk('ICCP', ascii('fake-icc'))
    pushChunk('ANIM', [0, 0])
    const fileSize = 4 + chunks.length
    const webp = new Uint8Array([
      ...ascii('RIFF'),
      fileSize & 0xff,
      (fileSize >> 8) & 0xff,
      (fileSize >> 16) & 0xff,
      (fileSize >> 24) & 0xff,
      ...ascii('WEBP'),
      ...chunks
    ])
    const report = await inspectMetadata(new Blob([webp]))
    expect(report.container).toBe('WebP')
    expect(report.categories.exif).toBe(true)
    expect(report.categories.xmp).toBe(true)
    expect(report.categories.icc).toBe(true)
    expect(report.animation).toBe(true)
  })
})

describe('inspectMetadata on GIF', () => {
  it('marks multi-frame files as animated', async () => {
    const header = [
      ...ascii('GIF89a'),
      0x20, 0x00, 0x20, 0x00,
      0xf7, 0x00, 0x00,
      ...new Array(768).fill(0)
    ]
    const frame = [0x2c, 0, 0, 0, 0, 0x10, 0, 0x10, 0, 0, 0x08, 0x02, 0xaa, 0xbb, 0x00]
    const gif = new Uint8Array([...header, ...frame, ...frame, 0x3b])
    const report = await inspectMetadata(new Blob([gif]))
    expect(report.container).toBe('GIF')
    expect(report.animation).toBe(true)
  })
})

describe('detectContainer', () => {
  it('recognizes magic bytes', () => {
    expect(detectContainer(new Uint8Array([0xff, 0xd8, 0xff, 0xe1]))).toBe('JPEG')
    expect(detectContainer(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('PNG')
    expect(
      detectContainer(new Uint8Array([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')]))
    ).toBe('WebP')
    expect(detectContainer(new Uint8Array([...ascii('GIF89a')]))).toBe('GIF')
    expect(
      detectContainer(new Uint8Array([0, 0, 0, 0x18, ...ascii('ftypavif'), 0, 0, 0, 0]))
    ).toBe('AVIF')
    expect(detectContainer(new Uint8Array([0x42, 0x4d, 0, 0]))).toBe('BMP')
    expect(detectContainer(new Uint8Array(ascii('<svg xmlns="x"></svg>')))).toBe('SVG')
    expect(detectContainer(new Uint8Array([1, 2, 3, 4]))).toBe('unknown')
  })
})
