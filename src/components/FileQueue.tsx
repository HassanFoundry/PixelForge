import { Download, Eye, TriangleAlert, X } from 'lucide-react'
import type { QueueItem } from '../hooks/useImageQueue'
import { formatBytes, savingsPercent } from '../lib/format'
import { Button } from './Button'

interface FileQueueProps {
  items: QueueItem[]
  selected: Set<string>
  onToggleSelected: (id: string) => void
  onRemove: (id: string) => void
  onDownload: (item: QueueItem) => void
  onPreview?: (item: QueueItem) => void
  onThumbnailDecoded?: (id: string, width: number, height: number) => void
  itemDetail?: (item: QueueItem) => React.ReactNode
}

export function FileQueue({
  items,
  selected,
  onToggleSelected,
  onRemove,
  onDownload,
  onPreview,
  onThumbnailDecoded,
  itemDetail
}: FileQueueProps) {
  return (
    <ul className="divide-y divide-line-soft">
      {items.map((item) => (
        <QueueRow
          key={item.id}
          item={item}
          isSelected={selected.has(item.id)}
          onToggleSelected={onToggleSelected}
          onRemove={onRemove}
          onDownload={onDownload}
          onPreview={onPreview}
          onThumbnailDecoded={onThumbnailDecoded}
          itemDetail={itemDetail}
        />
      ))}
    </ul>
  )
}

interface QueueRowProps {
  item: QueueItem
  isSelected: boolean
  onToggleSelected: (id: string) => void
  onRemove: (id: string) => void
  onDownload: (item: QueueItem) => void
  onPreview?: (item: QueueItem) => void
  onThumbnailDecoded?: (id: string, width: number, height: number) => void
  itemDetail?: (item: QueueItem) => React.ReactNode
}

function QueueRow({
  item,
  isSelected,
  onToggleSelected,
  onRemove,
  onDownload,
  onPreview,
  onThumbnailDecoded,
  itemDetail
}: QueueRowProps) {
  const savings = item.result ? savingsPercent(item.size, item.result.size) : null

  return (
    <li className="flex gap-3 py-3.5">
      <div className="hidden items-center sm:flex">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelected(item.id)}
          aria-label={`Select ${item.name}`}
          className="h-[18px] w-[18px] cursor-pointer rounded"
        />
      </div>
      <img
        src={item.url}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={(event) =>
          onThumbnailDecoded?.(item.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
        }
        className="checkerboard h-16 w-16 flex-none rounded-lg border border-line object-contain sm:h-20 sm:w-20"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink" title={item.name}>
          {item.name}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-faint">
          {formatBytes(item.size)}
          {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
        </p>
        <div className="mt-1.5">
          <ItemStatus item={item} savings={savings} />
        </div>
        {itemDetail?.(item)}
      </div>
      <div className="flex flex-none flex-col items-center justify-center gap-1.5 sm:flex-row">
        {onPreview && item.result && (
          <IconButton label={`Preview result for ${item.name}`} onClick={() => onPreview(item)}>
            <Eye className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        )}
        {item.result && (
          <IconButton label={`Download ${item.result.name}`} onClick={() => onDownload(item)}>
            <Download className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        )}
        <IconButton label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  )
}

function ItemStatus({ item, savings }: { item: QueueItem; savings: number | null }) {
  if (item.status === 'processing') {
    return <StatusLine tone="processing" text="Processing…" />
  }
  if (item.status === 'error') {
    return <StatusLine tone="error" text={item.error ?? 'Processing failed'} />
  }
  if (item.status === 'done' && item.result) {
    return (
      <p className="font-mono text-xs text-ink-soft">
        {formatBytes(item.result.size)} · {item.result.width}×{item.result.height}
        {savings !== null && (
          <span className={savings >= 0 ? 'text-ok' : 'text-warn'}>
            {' '}
            {savings >= 0 ? `−${savings}%` : `+${-savings}%`}
          </span>
        )}
        {savings !== null && savings < 0 && (
          <span className="font-sans text-ink-faint"> — try WebP or a lower quality</span>
        )}
      </p>
    )
  }
  return <StatusLine tone="ready" text="Ready" />
}

function StatusLine({ tone, text }: { tone: 'ready' | 'processing' | 'error'; text: string }) {
  if (tone === 'error') {
    return (
      <p className="flex items-start gap-1.5 text-xs text-danger">
        <TriangleAlert className="mt-px h-3.5 w-3.5 flex-none" aria-hidden="true" />
        <span>{text}</span>
      </p>
    )
  }
  if (tone === 'processing') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-soft">
        <span
          className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-accent"
          aria-hidden="true"
        />
        <span>{text}</span>
      </p>
    )
  }
  return <p className="text-xs text-ink-faint">{text}</p>
}

function IconButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-raised hover:text-ink"
    >
      {children}
    </button>
  )
}

interface QueueToolbarProps {
  totalCount: number
  selectedCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onClearAll: () => void
  children?: React.ReactNode
}

export function QueueToolbar({
  totalCount,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onClearAll,
  children
}: QueueToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line-soft pb-3.5">
      <div className="mr-auto flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="ghost" onClick={onSelectAll} disabled={totalCount === selectedCount}>
          Select all
        </Button>
        <Button size="sm" variant="ghost" onClick={onDeselectAll} disabled={selectedCount === 0}>
          Deselect all
        </Button>
        <span className="text-xs text-ink-faint" aria-live="polite">
          {selectedCount === totalCount ? `${totalCount} selected` : `${selectedCount} of ${totalCount} selected`}
        </span>
      </div>
      {children}
      <Button size="sm" variant="ghost" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  )
}
