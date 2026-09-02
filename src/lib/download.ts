import { uniqueName } from './filenames'

export interface DownloadEntry {
  name: string
  blob: Blob
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 15000)
}

export async function zipAndSave(
  entries: DownloadEntry[],
  zipName: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const taken = new Set<string>()
  for (const entry of entries) {
    zip.file(uniqueName(entry.name, taken), entry.blob)
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (metadata) => {
    onProgress?.(metadata.percent)
  })
  saveBlob(blob, zipName)
}
