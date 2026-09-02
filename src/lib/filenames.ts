export function splitName(filename: string): { base: string; ext: string } {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0 || dot === filename.length - 1) return { base: filename, ext: '' }
  return { base: filename.slice(0, dot), ext: filename.slice(dot + 1).toLowerCase() }
}

export function outputName(base: string, ext: string, ...parts: string[]): string {
  const suffix = parts.filter(Boolean).join('')
  const safeBase = base.replace(/\s+/g, ' ').trim() || 'image'
  return `${safeBase}${suffix}.${ext}`
}

export function uniqueName(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) {
    taken.add(desired)
    return desired
  }
  const dot = desired.lastIndexOf('.')
  const stem = dot > 0 ? desired.slice(0, dot) : desired
  const ext = dot > 0 ? desired.slice(dot) : ''
  let attempt = 2
  while (taken.has(`${stem} (${attempt})${ext}`)) attempt++
  const name = `${stem} (${attempt})${ext}`
  taken.add(name)
  return name
}

export function sanitizeBaseName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'image'
}
