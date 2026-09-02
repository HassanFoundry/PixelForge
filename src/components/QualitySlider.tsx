interface QualitySliderProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  note?: string
}

export function QualitySlider({ value, onChange, disabled, note }: QualitySliderProps) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor="quality" className="field-label mb-0">
          Quality
        </label>
        <span className="font-mono text-sm text-ink" aria-hidden="true">
          {value}%
        </span>
      </div>
      <input
        id="quality"
        type="range"
        min={30}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value} percent`}
        className="h-6 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />
      {note && (
        <p className="mt-1 text-xs text-ink-faint">{note}</p>
      )}
    </div>
  )
}
