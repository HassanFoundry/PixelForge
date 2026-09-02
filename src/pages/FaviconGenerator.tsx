import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Package, RefreshCw } from 'lucide-react'
import { ToolShell } from '../components/ToolShell'
import { Dropzone } from '../components/Dropzone'
import { Button } from '../components/Button'
import { usePageMeta } from '../hooks/usePageMeta'
import { useProcessor } from '../hooks/useProcessor'
import { useStoredSetting } from '../hooks/useStoredSetting'
import { useToast } from '../components/Toasts'
import { toolByPath } from '../lib/site'
import { decodeImageBitmap } from '../lib/canvas'
import { buildIcoFile } from '../lib/ico'
import { saveBlob, zipAndSave } from '../lib/download'
import { failedToProcess } from '../lib/errors'
import { formatBytes } from '../lib/format'

const tool = toolByPath('/favicon-generator')!

const iconSizes = [16, 32, 48, 64, 96, 180, 192, 512]
const icoSizes = [16, 32, 48]

interface FaviconFile {
  name: string
  label: string
  blob: Blob
  url: string
}

const installSnippet = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`

const manifestTemplate = (maskable: boolean) =>
  JSON.stringify(
    {
      name: 'Your site',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ...(maskable
          ? [{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
          : [])
      ]
    },
    null,
    2
  )

const installNotes = `How to install these favicons

1. Copy the files into the root (or an /icons folder) of your website.
2. If you use a folder, adjust the paths below to match.
3. Paste these tags into the <head> of your pages:

${installSnippet}

4. Edit the "name" in site.webmanifest before publishing.

The favicon.ico holds 16, 32 and 48 pixel icons for older browsers.
apple-touch-icon.png is the 180 pixel icon iOS uses for home screens.
The maskable icons include safe padding so Android can crop them into any shape.`

export default function FaviconGenerator() {
  usePageMeta({ title: tool.name, description: tool.description, path: tool.path })

  const toast = useToast()
  const processImage = useProcessor()
  const [fileName, setFileName] = useState<string | null>(null)
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 })
  const [maskable, setMaskable] = useStoredSetting<boolean>('pixelforge-favicon-maskable', true)
  const [paddingColor, setPaddingColor] = useStoredSetting<string>('pixelforge-favicon-padding', '#201b16')
  const [files, setFiles] = useState<FaviconFile[] | null>(null)
  const [generating, setGenerating] = useState(false)
  const fileRef = useRef<File | null>(null)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    const urls = urlsRef
    return () => {
      for (const url of urls.current) URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => {
    setFiles(null)
  }, [maskable, paddingColor])

  const clearFiles = () => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url)
    urlsRef.current = []
    setFiles(null)
    fileRef.current = null
    setFileName(null)
    setSourceSize({ width: 0, height: 0 })
  }

  const acceptFile = useCallback(
    async (incoming: File) => {
      try {
        const bitmap = await decodeImageBitmap(incoming)
        setSourceSize({ width: bitmap.width, height: bitmap.height })
        bitmap.close()
        fileRef.current = incoming
        setFileName(incoming.name)
        setFiles(null)
      } catch {
        toast('This image could not be read in this browser.', 'error')
      }
    },
    [toast]
  )

  const generate = async () => {
    const source = fileRef.current
    if (!source || generating) return
    setGenerating(true)
    try {
      const generated: FaviconFile[] = []
      const pngForIco: { size: number; png: Blob }[] = []
      for (const size of iconSizes) {
        const output = await processImage(source, {
          steps: [
            {
              kind: 'compose',
              width: size,
              height: size,
              mode: 'cover',
              zoom: 1,
              focalX: 0.5,
              focalY: 0.5,
              background: null
            }
          ],
          encode: { mime: 'image/png' }
        })
        const name =
          size === 180 ? 'apple-touch-icon.png' : size === 32 ? 'icon-32.png' : `icon-${size}.png`
        generated.push({
          name,
          label: `${size} × ${size}${size === 180 ? ' · Apple touch' : ''}`,
          blob: output.blob,
          url: URL.createObjectURL(output.blob)
        })
        if (icoSizes.includes(size)) pngForIco.push({ size, png: output.blob })
      }
      if (maskable) {
        for (const size of [192, 512]) {
          const output = await processImage(source, {
            steps: [
              {
                kind: 'compose',
                width: size,
                height: size,
                mode: 'contain',
                zoom: 1,
                focalX: 0.5,
                focalY: 0.5,
                background: paddingColor
              }
            ],
            encode: { mime: 'image/png' }
          })
          generated.push({
            name: `icon-maskable-${size}.png`,
            label: `${size} × ${size} · maskable`,
            blob: output.blob,
            url: URL.createObjectURL(output.blob)
          })
        }
      }
      const ico = await buildIcoFile(pngForIco)
      generated.push({
        name: 'favicon.ico',
        label: 'ICO · 16, 32 and 48',
        blob: ico,
        url: URL.createObjectURL(ico)
      })
      generated.push({
        name: 'site.webmanifest',
        label: 'Web manifest',
        blob: new Blob([manifestTemplate(maskable)], { type: 'application/manifest+json' }),
        url: ''
      })
      generated.push({
        name: 'how-to-install.txt',
        label: 'Install guide',
        blob: new Blob([installNotes], { type: 'text/plain' }),
        url: ''
      })
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
      urlsRef.current = generated.filter((file) => file.url !== '').map((file) => file.url)
      setFiles(generated)
    } catch (error) {
      toast(failedToProcess(error), 'error')
    } finally {
      setGenerating(false)
    }
  }

  const downloadZip = async () => {
    if (!files) return
    try {
      await zipAndSave(
        files.map((file) => ({ name: file.name, blob: file.blob })),
        'pixelforge-favicons.zip'
      )
    } catch {
      toast('The ZIP file could not be created.', 'error')
    }
  }

  return (
    <ToolShell tool={tool}>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <section aria-label="Icon settings" className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-medium text-ink">Settings</h2>
          <div className="mt-4 grid gap-5">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={maskable}
                onChange={(event) => setMaskable(event.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded"
              />
              Include maskable icons (Android) with safe padding
            </label>
            {maskable && (
              <div>
                <span className="field-label">Padding color</span>
                <label className="inline-flex">
                  <span className="sr-only">Maskable padding color</span>
                  <input
                    type="color"
                    value={paddingColor}
                    onChange={(event) => setPaddingColor(event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface"
                  />
                </label>
              </div>
            )}
            <div>
              <span className="field-label">Included sizes</span>
              <p className="font-mono text-xs leading-relaxed text-ink-faint">
                {iconSizes.join(' · ')} plus favicon.ico (16/32/48)
                {maskable ? ' and maskable 192/512' : ''}
              </p>
            </div>
            <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
              Square icons look best. Non-square images are center-cropped. Every file is generated
              locally — download the ones you need, or take the ZIP.
            </p>
          </div>
        </section>

        <section aria-label="Icon files">
          {!fileName ? (
            <Dropzone
              title="Drop a logo to generate favicons"
              hint="PNG or SVG with transparent edges works best"
              onFiles={(incoming) => acceptFile(incoming[0])}
            />
          ) : (
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{fileName}</p>
                  {sourceSize.width > 0 && (
                    <p className="mt-0.5 font-mono text-xs text-ink-faint">
                      source {sourceSize.width} × {sourceSize.height}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={generate} disabled={generating}>
                    <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {generating ? 'Generating…' : files ? 'Regenerate' : 'Generate icons'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearFiles}>
                    New image
                  </Button>
                </div>
              </div>

              {generating && (
                <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft" aria-live="polite">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
                  Rendering icons at every size…
                </p>
              )}

              {files && (
                <>
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line-soft pt-5">
                    <Button variant="primary" onClick={downloadZip}>
                      <Package className="h-4 w-4" aria-hidden="true" />
                      Download all as ZIP
                    </Button>
                    <p className="font-mono text-xs text-ink-faint">
                      {files.length} files ·{' '}
                      {formatBytes(files.reduce((sum, file) => sum + file.blob.size, 0))}
                    </p>
                  </div>
                  <ul className="mt-4 divide-y divide-line-soft">
                    {files.map((file) => (
                      <li key={file.name} className="flex items-center gap-3 py-3">
                        {file.url ? (
                          <img
                            src={file.url}
                            alt=""
                            className="checkerboard h-10 w-10 flex-none rounded border border-line object-contain"
                            style={{ imageRendering: file.name.includes('16') ? 'pixelated' : 'auto' }}
                          />
                        ) : (
                          <span className="h-10 w-10 flex-none rounded border border-line bg-raised" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-sm text-ink">{file.name}</p>
                          <p className="text-xs text-ink-faint">
                            {file.label} · {formatBytes(file.blob.size)}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => saveBlob(file.blob, file.name)}>
                          <Download className="h-4 w-4" aria-hidden="true" />
                          Save
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </ToolShell>
  )
}
