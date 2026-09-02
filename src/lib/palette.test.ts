import { describe, expect, it } from 'vitest'
import { extractPalette, toHex } from './palette'

function pixelsFrom(colors: [number, number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4)
  colors.forEach((color, index) => {
    data.set(color, index * 4)
  })
  return data
}

describe('extractPalette', () => {
  it('splits two clear clusters', () => {
    const red: [number, number, number, number] = [220, 30, 30, 255]
    const blue: [number, number, number, number] = [30, 40, 220, 255]
    const data = pixelsFrom([...Array(500).fill(red), ...Array(500).fill(blue)] as [])
    const palette = extractPalette(data, 2)
    expect(palette.length).toBe(2)
    const hexes = palette.map(toHex)
    expect(hexes).toContain('#dc1e1e')
    expect(hexes).toContain('#1e28dc')
    const totalShare = palette.reduce((sum, color) => sum + color.share, 0)
    expect(totalShare).toBeCloseTo(1, 5)
  })

  it('ignores fully transparent pixels', () => {
    const data = pixelsFrom([
      [255, 0, 0, 255],
      [0, 0, 255, 0]
    ])
    const palette = extractPalette(data, 2)
    expect(palette.length).toBe(1)
    expect(toHex(palette[0])).toBe('#ff0000')
  })

  it('returns empty for empty input', () => {
    expect(extractPalette(new Uint8ClampedArray(0), 4)).toEqual([])
    expect(
      extractPalette(pixelsFrom([[0, 0, 0, 0]]), 4)
    ).toEqual([])
  })
})
