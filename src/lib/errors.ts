export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/decode|read/i.test(message)) {
    return 'This image could not be read. The file may be corrupted, or the format may not be supported by this browser.'
  }
  if (/memory|allocation/i.test(message)) {
    return 'This image is too large to process on this device. Try a smaller file.'
  }
  if (message && message.length <= 200) return message
  return 'Something went wrong while processing this image.'
}

export function failedToProcess(error: unknown): string {
  const message = describeError(error)
  if (/could not be encoded|cannot encode/.test(message)) return message
  if (/decod/.test(message)) return message
  return `Processing failed: ${message}`
}
