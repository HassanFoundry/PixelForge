import { useEffect, useRef, useState } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { ToolShell } from '../components/ToolShell'
import { Dropzone } from '../components/Dropzone'
import { Button } from '../components/Button'
import { usePageMeta } from '../hooks/usePageMeta'
import { useStoredSetting } from '../hooks/useStoredSetting'
import { usePaletteWorker } from '../hooks/usePaletteWorker'
import { useToast } from '../components/Toasts'
import { toolByPath } from '../lib/site'
import { createSurface, decodeImageBitmap, surfaceContext } from '../lib/canvas'
import { toHex, type ExtractedColor } from '../lib/palette'
import { copyText } from '../lib/clipboard'

const tool = toolByPath('/color-extractor')!

const paletteSizes = [4, 6, 8, 10, 12]

export default function ColorExtractor() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })
  const toast = useToast()
  const extract = usePaletteWorker()

  const [source, setSource] = useState<{ name: string; url: string } | null>(null)
  const [colors, setColors] = useState<ExtractedColor[] | null>(null)
  const [working, setWorking] = useState(false)
  const [count, setCount] = useStoredSetting<number>('pixelforge-palette-count', 8)
  const pixelsRef = useRef<Uint8ClampedArray | null>(null)
  const sourceUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (pixelsRef.current) {
      setColors(null)
      extract(pixelsRef.current, count).then((result) => setColors(result))
    }
  }, [count, extract])

  const analyze = async (file: File) => {
    setWorking(true)
    setColors(null)
    pixelsRef.current = null
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    const url = URL.createObjectURL(file)
    sourceUrlRef.current = url
    setSource({ name: file.name, url })
    try {
      const bitmap = await decodeImageBitmap(file)
      try {
        const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height))
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))
        const surface = createSurface(width, height)
        surfaceContext(surface).drawImage(bitmap, 0, 0, width, height)
        const data = surfaceContext(surface).getImageData(0, 0, width, height).data
        pixelsRef.current = data
        const extracted = await extract(data, count)
        setColors(extracted)
        if (extracted.length === 0) {
          toast('No solid colors found — the image may be fully transparent.', 'error')
        }
      } finally {
        bitmap.close()
      }
    } catch {
      toast('This image could not be read in this browser.', 'error')
      setSource(null)
    } finally {
      setWorking(false)
    }
  }

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[24rem_1fr]">
        <section aria-label="Palette settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4">
            <label htmlFor="palette-count" className="field-label">
              Palette size
            </label>
            <select
              id="palette-count"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="field-input"
              disabled={!source}
            >
              {paletteSizes.map((size) => (
                <option key={size} value={size}>
                  {size} colors
                </option>
              ))}
            </select>
            <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
              Colors come from a median-cut analysis of the whole image, not random sampling.
              Near-identical shades are merged into one swatch.
            </p>
          </div>
          {colors && colors.length > 0 && (
            <Button
              className="mt-4 w-full"
              onClick={async () => {
                const copied = await copyText(colors.map(toHex).join('\n'))
                toast(copied ? 'Palette copied as HEX list' : 'Copy failed — select the values manually', copied ? 'success' : 'error')
              }}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy palette
            </Button>
          )}
        </section>

        <section aria-label="Image and palette">
          {!source ? (
            <Dropzone
              title="Drop an image to extract its colors"
              hint="Any size works — the palette is computed locally"
              onFiles={(files) => analyze(files[0])}
            />
          ) : (
            <div className="grid gap-6">
              <div className="card p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <img
                    src={source.url}
                    alt=""
                    className="checkerboard h-20 w-20 flex-none rounded-lg border border-line object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{source.name}</p>
                    {colors ? (
                      <p className="mt-1 text-xs text-ink-soft">
                        {colors.length} dominant color{colors.length === 1 ? '' : 's'}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-ink-soft">Analyzing…</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      pixelsRef.current = null
                      setColors(null)
                      setSource(null)
                      if (sourceUrlRef.current) {
                        URL.revokeObjectURL(sourceUrlRef.current)
                        sourceUrlRef.current = null
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Start over
                  </Button>
                </div>
                {working && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-ink-soft" aria-live="polite">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
                    Extracting colors…
                  </p>
                )}
                {colors && colors.length === 0 && !working && (
                  <p className="mt-3 text-sm text-warn">No colors could be extracted from this file.</p>
                )}
              </div>

              {colors && colors.length > 0 && (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {colors.map((color, index) => {
                    const hex = toHex(color)
                    return (
                      <li key={hex + index} className="card overflow-hidden">
                        <div
                          className="relative flex h-20 items-end justify-end p-2"
                          style={{ backgroundColor: hex }}
                        >
                          {index === 0 && (
                            <span className="rounded bg-black/45 px-1.5 py-0.5 text-[11px] font-medium text-white">
                              Dominant
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 p-3">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium uppercase text-ink">{hex}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                              rgb({color.red}, {color.green}, {color.blue})
                            </p>
                          </div>
                          <CopyValue value={hex} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </ToolShell>
  )
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${value}`}
      onClick={async () => {
        const ok = await copyText(value)
        if (ok) {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        }
      }}
      className="rounded-lg border border-line p-2 text-ink-soft transition-colors hover:bg-raised hover:text-ink"
    >
      {copied ? (
        <Check className="h-4 w-4 text-ok" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}
