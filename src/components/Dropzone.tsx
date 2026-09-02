import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus } from 'lucide-react'

interface DropzoneProps {
  onFiles: (files: File[]) => void
  title?: string
  hint?: string
  compact?: boolean
}

export function Dropzone({
  onFiles,
  title = 'Drop images here',
  hint = 'PNG, JPG, WebP, GIF, AVIF or SVG',
  compact = false
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const files = Array.from(event.dataTransfer.files).filter((file) => file.size > 0)
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}, or press Enter to browse your files`}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openPicker()
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center transition-colors ${
        dragging ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-ink-faint hover:bg-raised/60'
      } ${compact ? 'p-6' : 'p-8 sm:p-14'}`}
    >
      <span className="rounded-xl border border-line bg-raised p-3">
        <ImagePlus className="h-6 w-6 text-accent" aria-hidden="true" />
      </span>
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-soft">
          or <span className="font-medium text-accent underline underline-offset-2">browse files</span>
        </p>
        {hint && <p className="mt-2 text-xs text-ink-faint">{hint}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
    </div>
  )
}
