import { deflateSync } from 'node:zlib'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'

const anvil = JSON.parse(readFileSync(new URL('../src/assets/anvil.json', import.meta.url), 'utf8'))
const publicDir = new URL('../public/', import.meta.url)
const iconsDir = new URL('../public/icons/', import.meta.url)
mkdirSync(iconsDir, { recursive: true })

const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}

function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBytes = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([length, typeBytes, data, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    raw[rowStart] = 0
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

function paintAnvil(pixels, size, offset, cell) {
  for (let row = 0; row < anvil.size; row++) {
    const line = anvil.rows[row]
    for (let col = 0; col < anvil.size; col++) {
      const rgba = anvil.palette[line[col]]
      if (!rgba) continue
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const x = offset + col * cell + dx
          const y = offset + row * cell + dy
          const i = (y * size + x) * 4
          pixels[i] = rgba[0]
          pixels[i + 1] = rgba[1]
          pixels[i + 2] = rgba[2]
          pixels[i + 3] = rgba[3]
        }
      }
    }
  }
}

function roundedCornerCut(x, y, size, radius) {
  const max = size - 1
  const cx = x < radius ? radius : x > max - radius ? max - radius : x
  const cy = y < radius ? radius : y > max - radius ? max - radius : y
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= radius * radius
}

function renderIcon(size, { fillRatio, background, rounded, supersample = 4 }) {
  const big = size * supersample
  const pixels = Buffer.alloc(big * big * 4)
  const cellBig = Math.max(supersample, Math.round((big * fillRatio) / anvil.size / supersample) * supersample)
  const totalBig = cellBig * anvil.size
  const offsetBig = Math.floor((big - totalBig) / 2)
  const radius = rounded ? Math.round(big * 0.22) : 0
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const i = (y * big + x) * 4
      if (rounded && !roundedCornerCut(x, y, big, radius)) continue
      pixels[i] = background[0]
      pixels[i + 1] = background[1]
      pixels[i + 2] = background[2]
      pixels[i + 3] = 255
    }
  }
  paintAnvil(pixels, big, offsetBig, cellBig)
  if (supersample === 1) return encodePng(size, size, pixels)
  const down = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let dy = 0; dy < supersample; dy++) {
        for (let dx = 0; dx < supersample; dx++) {
          const i = ((y * supersample + dy) * big + x * supersample + dx) * 4
          const alpha = pixels[i + 3]
          r += pixels[i] * alpha
          g += pixels[i + 1] * alpha
          b += pixels[i + 2] * alpha
          a += alpha
        }
      }
      const o = (y * size + x) * 4
      if (a === 0) continue
      down[o] = Math.round(r / a)
      down[o + 1] = Math.round(g / a)
      down[o + 2] = Math.round(b / a)
      down[o + 3] = Math.round(a / (supersample * supersample))
    }
  }
  return encodePng(size, size, down)
}

function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)
  const directory = Buffer.alloc(entries.length * 16)
  let offset = 6 + entries.length * 16
  const blobs = []
  entries.forEach(([size, png], index) => {
    const base = index * 16
    directory[base] = size >= 256 ? 0 : size
    directory[base + 1] = size >= 256 ? 0 : size
    directory.writeUInt16LE(1, base + 4)
    directory.writeUInt16LE(32, base + 6)
    directory.writeUInt32LE(png.length, base + 8)
    directory.writeUInt32LE(offset, base + 12)
    offset += png.length
    blobs.push(png)
  })
  return Buffer.concat([header, directory, ...blobs])
}

const ink = [32, 27, 22]

writeFileSync(new URL('icon-192.png', iconsDir), renderIcon(192, { fillRatio: 0.78, background: ink, rounded: true }))
writeFileSync(new URL('icon-512.png', iconsDir), renderIcon(512, { fillRatio: 0.78, background: ink, rounded: true }))
writeFileSync(new URL('maskable-512.png', iconsDir), renderIcon(512, { fillRatio: 0.62, background: ink, rounded: false }))
writeFileSync(new URL('apple-touch-icon.png', iconsDir), renderIcon(180, { fillRatio: 0.72, background: ink, rounded: false }))
writeFileSync(new URL('icon-32.png', iconsDir), renderIcon(32, { fillRatio: 0.8, background: ink, rounded: true }))

const icoEntries = [16, 32, 48].map((size) => [
  size,
  renderIcon(size, { fillRatio: 0.86, background: ink, rounded: true, supersample: 1 })
])
writeFileSync(new URL('favicon.ico', iconsDir), buildIco(icoEntries))

const ogWidth = 1200
const ogHeight = 630
const og = Buffer.alloc(ogWidth * ogHeight * 4)
for (let y = 0; y < ogHeight; y++) {
  for (let x = 0; x < ogWidth; x++) {
    const i = (y * ogWidth + x) * 4
    og[i] = 23
    og[i + 1] = 19
    og[i + 2] = 16
    og[i + 3] = 255
  }
}
const onGrid = (value, step) => Math.abs(((value % step) + step) % step) < 1
for (let y = 0; y < ogHeight; y++) {
  for (let x = 0; x < ogWidth; x++) {
    const i = (y * ogWidth + x) * 4
    const gridLine = onGrid(x, 60) || onGrid(y, 60)
    const frame =
      x === 24 || x === ogWidth - 25 || y === 24 || y === ogHeight - 25
    const alpha = frame ? 70 : gridLine ? 14 : 0
    if (alpha > 0) {
      og[i] = Math.min(255, og[i] + ((249 - og[i]) * alpha) / 255)
      og[i + 1] = Math.min(255, og[i + 1] + ((115 - og[i + 1]) * alpha) / 255)
      og[i + 2] = Math.min(255, og[i + 2] + ((22 - og[i + 2]) * alpha) / 255)
    }
  }
}
const ogCell = 30
const ogTotal = ogCell * anvil.size
const ogOffsetX = Math.floor((ogWidth - ogTotal) / 2)
const ogOffsetY = Math.floor((ogHeight - ogTotal) / 2)
const ogPixels = Buffer.alloc(ogWidth * ogHeight * 4)
og.copy(ogPixels)
{
  const scaled = Buffer.alloc(ogTotal * ogTotal * 4)
  paintAnvil(scaled, ogTotal, 0, ogCell)
  for (let y = 0; y < ogTotal; y++) {
    for (let x = 0; x < ogTotal; x++) {
      const s = (y * ogTotal + x) * 4
      if (scaled[s + 3] === 0) continue
      const d = ((ogOffsetY + y) * ogWidth + ogOffsetX + x) * 4
      ogPixels[d] = scaled[s]
      ogPixels[d + 1] = scaled[s + 1]
      ogPixels[d + 2] = scaled[s + 2]
      ogPixels[d + 3] = 255
    }
  }
}
writeFileSync(new URL('og-image.png', publicDir), encodePng(ogWidth, ogHeight, ogPixels))

console.log('generated brand assets')
