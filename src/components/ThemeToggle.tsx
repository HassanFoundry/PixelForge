import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeChoice } from '../hooks/useTheme'

const cycle: ThemeChoice[] = ['light', 'dark', 'system']

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = cycle[(cycle.indexOf(theme) + 1) % cycle.length]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}. Click to use ${next}.`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-raised hover:text-ink"
    >
      {theme === 'light' && <Sun className="h-5 w-5" aria-hidden="true" />}
      {theme === 'dark' && <Moon className="h-5 w-5" aria-hidden="true" />}
      {theme === 'system' && <Monitor className="h-5 w-5" aria-hidden="true" />}
    </button>
  )
}
