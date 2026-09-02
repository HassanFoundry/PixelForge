import { describe, expect, it } from 'vitest'
import { buildIcoFile } from './ico'

describe('buildIcoFile', () => {
  it('assembles a valid ICO container', async () => {
    const pngFor = (filler: number) => {
      const bytes = new Uint8Array(24)
      bytes.fill(filler)
      return new Blob([bytes], { type: 'image/png' })
    }
    const ico = await buildIcoFile([
      { size: 16, png: pngFor(1) },
      { size: 32, png: pngFor(2) },
      { size: 48, png: pngFor(3) }
    ])
    const buffer = new Uint8Array(await ico.arrayBuffer())
    const view = new DataView(buffer.buffer)
    expect(ico.type).toBe('image/x-icon')
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(3)
    expect(buffer[6]).toBe(16)
    expect(buffer[22]).toBe(32)
    expect(buffer[38]).toBe(48)
    expect(view.getUint16(10, true)).toBe(1)
    expect(view.getUint16(12, true)).toBe(32)
    expect(view.getUint16(26, true)).toBe(1)
    expect(view.getUint32(14, true)).toBe(24)
    expect(view.getUint32(18, true)).toBe(54)
    expect(view.getUint32(30, true)).toBe(24)
    expect(view.getUint32(34, true)).toBe(78)
    expect(view.getUint32(46, true)).toBe(24)
    expect(view.getUint32(50, true)).toBe(102)
    expect(buffer[54]).toBe(1)
    expect(buffer[78]).toBe(2)
    expect(buffer[102]).toBe(3)
    expect(buffer.byteLength).toBe(6 + 48 + 72)
  })
})
