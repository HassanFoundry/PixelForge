import { describe, expect, it } from 'vitest'
import { aspectRatio, formatBytes, formatDimensions, megapixels, savingsPercent } from './format'

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })
  it('formats kilobytes with one decimal below ten', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
  it('rounds larger kilobytes', () => {
    expect(formatBytes(150 * 1024)).toBe('150 KB')
  })
  it('formats megabytes', () => {
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB')
  })
  it('handles invalid input', () => {
    expect(formatBytes(-1)).toBe('—')
    expect(formatBytes(Number.NaN)).toBe('—')
  })
})

describe('savingsPercent', () => {
  it('computes savings', () => {
    expect(savingsPercent(1000, 250)).toBe(75)
  })
  it('reports growth as negative', () => {
    expect(savingsPercent(1000, 1200)).toBe(-20)
  })
  it('avoids division by zero', () => {
    expect(savingsPercent(0, 100)).toBe(0)
  })
})

describe('aspectRatio', () => {
  it('reduces to lowest terms', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9')
  })
  it('uses decimals for unusual ratios', () => {
    expect(aspectRatio(101, 100)).toBe('1.01:1')
  })
})

describe('megapixels and dimensions', () => {
  it('computes megapixels', () => {
    expect(megapixels(800, 600)).toBe('0.5 MP')
  })
  it('formats dimensions with a times sign', () => {
    expect(formatDimensions(640, 480)).toBe('640 × 480')
  })
})
