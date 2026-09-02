import { describe, expect, it } from 'vitest'
import { outputName, sanitizeBaseName, splitName, uniqueName } from './filenames'

describe('splitName', () => {
  it('splits extension', () => {
    expect(splitName('photo.jpg')).toEqual({ base: 'photo', ext: 'jpg' })
  })
  it('keeps dotfiles without extension', () => {
    expect(splitName('.hidden')).toEqual({ base: '.hidden', ext: '' })
  })
  it('uses the last dot only', () => {
    expect(splitName('archive.tar.png')).toEqual({ base: 'archive.tar', ext: 'png' })
  })
  it('handles names without dots', () => {
    expect(splitName('image')).toEqual({ base: 'image', ext: '' })
  })
})

describe('outputName', () => {
  it('joins base, suffix and extension', () => {
    expect(outputName('photo', 'jpg', '-compressed')).toBe('photo-compressed.jpg')
  })
  it('combines suffix parts', () => {
    expect(outputName('photo', 'webp', '-optimized', '-1200x800')).toBe('photo-optimized-1200x800.webp')
  })
  it('collapses whitespace in the base', () => {
    expect(outputName('my  photo ', 'png', '-cropped')).toBe('my photo-cropped.png')
  })
})

describe('uniqueName', () => {
  it('passes through unused names', () => {
    const taken = new Set<string>()
    expect(uniqueName('a.jpg', taken)).toBe('a.jpg')
    expect(taken.has('a.jpg')).toBe(true)
  })
  it('numbers collisions', () => {
    const taken = new Set(['a.jpg', 'a (2).jpg'])
    expect(uniqueName('a.jpg', taken)).toBe('a (3).jpg')
  })
})

describe('sanitizeBaseName', () => {
  it('strips path separators', () => {
    expect(sanitizeBaseName('..\\evil/name')).toBe('..evilname')
  })
  it('falls back for empty results', () => {
    expect(sanitizeBaseName('???')).toBe('image')
  })
})
