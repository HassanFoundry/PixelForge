export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 10) return `${kb.toFixed(1)} KB`
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  if (mb < 10) return `${mb.toFixed(1)} MB`
  return `${Math.round(mb)} MB`
}

export function savingsPercent(inputBytes: number, outputBytes: number): number {
  if (inputBytes <= 0) return 0
  return Math.round((1 - outputBytes / inputBytes) * 100)
}

export function megapixels(width: number, height: number): string {
  return `${((width * height) / 1_000_000).toFixed(1)} MP`
}

function greatestCommonDivisor(a: number, b: number): number {
  while (b > 0) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

export function aspectRatio(width: number, height: number): string {
  if (!width || !height) return '—'
  const divisor = greatestCommonDivisor(width, height)
  const ratioWidth = width / divisor
  const ratioHeight = height / divisor
  if (ratioWidth > 50 || ratioHeight > 50) return `${(width / height).toFixed(2)}:1`
  return `${ratioWidth}:${ratioHeight}`
}

export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height}`
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
})

export function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '—'
  return dateFormatter.format(new Date(timestamp))
}
