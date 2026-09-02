import { formatLabels, type ImageFormat } from '../lib/canvas'

interface FormatSelectProps {
  id?: string
  value: ImageFormat | 'keep'
  onChange: (value: ImageFormat | 'keep') => void
  supported: Record<ImageFormat, boolean>
  includeKeep?: boolean
  label?: string
}

export function FormatSelect({
  id = 'output-format',
  value,
  onChange,
  supported,
  includeKeep = false,
  label = 'Output format'
}: FormatSelectProps) {
  const formats: ImageFormat[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as ImageFormat | 'keep')}
        className="field-input"
      >
        {includeKeep && <option value="keep">Keep original</option>}
        {formats.map((format) => (
          <option key={format} value={format} disabled={!supported[format]}>
            {formatLabels[format]}
            {!supported[format] ? ' (not supported in this browser)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
