import { useEffect, useRef, useState } from 'react'
import { Copy, RefreshCw } from 'lucide-react'
import { ToolShell } from '../components/ToolShell'
import { Dropzone } from '../components/Dropzone'
import { Button } from '../components/Button'
import { usePageMeta } from '../hooks/usePageMeta'
import { useToast } from '../components/Toasts'
import { toolByPath } from '../lib/site'
import { decodeImageBitmap, detectTransparency } from '../lib/canvas'
import { detectContainer, inspectMetadata, type DetectedMetadata, type ImageContainer } from '../lib/metadata'
import { aspectRatio, formatBytes, formatDate, formatDimensions, megapixels } from '../lib/format'
import { copyText } from '../lib/clipboard'

const tool = toolByPath('/image-info')!

const containerForMime: Record<string, ImageContainer> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'image/avif': 'AVIF',
  'image/bmp': 'BMP',
  'image/svg+xml': 'SVG'
}

const containerNames: Record<ImageContainer, string> = {
  JPEG: 'JPEG',
  PNG: 'PNG',
  WebP: 'WebP',
  GIF: 'GIF',
  AVIF: 'AVIF',
  BMP: 'BMP',
  SVG: 'SVG',
  unknown: 'Unknown'
}

interface ImageFacts {
  file: File
  url: string
  container: ImageContainer
  declaredType: string
  width: number
  height: number
  transparent: boolean | null
  metadata: DetectedMetadata
}

export default function ImageInfo() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })
  const toast = useToast()
  const [facts, setFacts] = useState<ImageFacts | null>(null)
  const [working, setWorking] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const inspect = async (file: File) => {
    setWorking(true)
    setFacts(null)
    try {
      const [bitmap, metadata, header] = await Promise.all([
        decodeImageBitmap(file),
        inspectMetadata(file),
        file.slice(0, 65536).arrayBuffer()
      ])
      try {
        const transparent = await detectTransparency(bitmap)
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        const url = URL.createObjectURL(file)
        urlRef.current = url
        setFacts({
          file,
          url,
          container: detectContainer(new Uint8Array(header)),
          declaredType: file.type || 'unknown',
          width: bitmap.width,
          height: bitmap.height,
          transparent,
          metadata
        })
      } finally {
        bitmap.close()
      }
    } catch {
      toast('This image could not be read. It may be corrupted or unsupported in this browser.', 'error')
    } finally {
      setWorking(false)
    }
  }

  const reset = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setFacts(null)
  }

  const mismatch = facts && facts.declaredType !== 'unknown' && containerForMime[facts.declaredType] !== facts.container

  return (
    <ToolShell tool={tool}>
      {!facts ? (
        <div className="mx-auto max-w-xl">
          <Dropzone
            title="Drop an image to inspect it"
            hint="Format, dimensions, transparency and metadata are read locally."
            onFiles={(files) => inspect(files[0])}
          />
          {working && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-soft" aria-live="polite">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
              Reading file…
            </p>
          )}
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[28rem_1fr]">
          <section aria-label="Preview" className="card p-4 sm:p-5">
            <img
              src={facts.url}
              alt={`Preview of ${facts.file.name}`}
              className="checkerboard max-h-[26rem] w-full rounded-lg border border-line object-contain"
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-ink" title={facts.file.name}>
                {facts.file.name}
              </p>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                New file
              </Button>
            </div>
          </section>

          <div className="grid gap-6">
            <section aria-label="File details" className="card p-5">
              <h2 className="font-medium text-ink">File</h2>
              <dl className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                <Fact label="Filename" value={facts.file.name} />
                <Fact label="File size" value={formatBytes(facts.file.size)} />
                <Fact label="Declared type" value={facts.declaredType} />
                <Fact
                  label="Detected format"
                  value={containerNames[facts.container]}
                  extra={mismatch ? 'File content does not match its extension or type.' : undefined}
                />
                <Fact
                  label="Last modified"
                  value={facts.file.lastModified ? formatDate(facts.file.lastModified) : '—'}
                />
                <Fact label="Animated" value={facts.metadata.animation ? 'Yes' : 'No'} />
              </dl>
            </section>

            <section aria-label="Image details" className="card p-5">
              <h2 className="font-medium text-ink">Image</h2>
              <dl className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                <Fact label="Dimensions" value={formatDimensions(facts.width, facts.height)} />
                <Fact label="Aspect ratio" value={aspectRatio(facts.width, facts.height)} />
                <Fact label="Resolution" value={megapixels(facts.width, facts.height)} />
                <Fact
                  label="Transparency"
                  value={facts.transparent === null ? '—' : facts.transparent ? 'Yes' : 'No'}
                />
              </dl>
              {facts.container === 'SVG' && (
                <p className="mt-3 text-xs text-ink-faint">
                  SVG has no fixed pixel size; the dimensions shown are the browser's default
                  rendering size.
                </p>
              )}
            </section>

            <section aria-label="Metadata" className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium text-ink">Metadata</h2>
                {facts.metadata.entries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const text = detailsAsText(facts)
                      const copied = await copyText(text)
                      toast(copied ? 'Details copied to the clipboard' : 'Copy failed. Select the text manually.', copied ? 'success' : 'error')
                    }}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy details
                  </Button>
                )}
              </div>
              {facts.metadata.entries.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">
                  No metadata entries found in the scanned portion of this file.
                </p>
              ) : (
                <dl className="mt-3 divide-y divide-line-soft">
                  {facts.metadata.entries.map((entry) => (
                    <div key={entry.label + entry.value} className="grid gap-0.5 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
                      <dt className="text-sm text-ink-faint">{entry.label}</dt>
                      <dd className="break-words text-sm text-ink">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {facts.metadata.notes.map((note) => (
                <p key={note} className="mt-3 text-xs text-ink-faint">
                  {note}
                </p>
              ))}
              <p className="mt-4 border-t border-line-soft pt-3 text-xs text-ink-faint">
                Values are read from the file itself and treated as untrusted text. Metadata values
                can be forged; treat them as hints, not facts.
              </p>
            </section>
          </div>
        </div>
      )}
    </ToolShell>
  )
}

function Fact({ label, value, extra }: { label: string; value: string; extra?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words font-mono text-sm text-ink" title={value}>
        {value}
      </dd>
      {extra && <dd className="mt-0.5 text-xs text-warn">{extra}</dd>}
    </div>
  )
}

function detailsAsText(facts: ImageFacts): string {
  const lines = [
    `Filename: ${facts.file.name}`,
    `File size: ${formatBytes(facts.file.size)}`,
    `Declared type: ${facts.declaredType}`,
    `Detected format: ${containerNames[facts.container]}`,
    `Last modified: ${facts.file.lastModified ? formatDate(facts.file.lastModified) : '—'}`,
    `Dimensions: ${formatDimensions(facts.width, facts.height)}`,
    `Aspect ratio: ${aspectRatio(facts.width, facts.height)}`,
    `Resolution: ${megapixels(facts.width, facts.height)}`,
    `Transparency: ${facts.transparent === null ? '—' : facts.transparent ? 'Yes' : 'No'}`,
    `Animated: ${facts.metadata.animation ? 'Yes' : 'No'}`,
    'Metadata:'
  ]
  for (const entry of facts.metadata.entries) {
    lines.push(`  ${entry.label}: ${entry.value}`)
  }
  return lines.join('\n')
}
