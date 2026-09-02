import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { tools } from '../lib/site'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
    isActive ? 'bg-raised text-ink' : 'text-ink-soft hover:bg-raised hover:text-ink'
  }`

export function SiteHeader() {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const toolsMenuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    setToolsOpen(false)
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setToolsOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="shell flex h-16 items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="PixelForge home">
          <Logo className="h-8 w-8" />
          <span className="font-display text-lg font-semibold tracking-tight">PixelForge</span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          <div ref={toolsMenuRef} className="relative">
            <button
              type="button"
              aria-expanded={toolsOpen}
              aria-haspopup="true"
              onClick={() => setToolsOpen((open) => !open)}
              className={`inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors ${
                toolsOpen ? 'bg-raised text-ink' : 'text-ink-soft hover:bg-raised hover:text-ink'
              }`}
            >
              Tools
              <ChevronDown
                className={`h-4 w-4 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {toolsOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-[24rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-line bg-surface p-2 shadow-pop">
                <div className="grid gap-0.5 sm:grid-cols-2">
                  {tools.map((tool) => {
                    const ToolIcon = tool.icon
                    return (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className="flex items-start gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-raised"
                      >
                        <ToolIcon className="mt-0.5 h-4 w-4 flex-none text-accent" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">{tool.nav}</span>
                          <span className="block truncate text-xs text-ink-faint">{tool.tagline}</span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <NavLink to="/privacy" className={navLinkClasses}>
            Privacy
          </NavLink>
          <NavLink to="/about" className={navLinkClasses}>
            About
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-1">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-raised hover:text-ink md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-paper md:hidden">
          <div className="shell py-4">
            <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Tools</p>
            <ul className="grid gap-0.5">
              {tools.map((tool) => {
                const ToolIcon = tool.icon
                return (
                  <li key={tool.path}>
                    <Link
                      to={tool.path}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised"
                    >
                      <ToolIcon className="h-[18px] w-[18px] flex-none text-accent" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{tool.nav}</span>
                        <span className="block truncate text-xs text-ink-faint">{tool.tagline}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 flex gap-1 border-t border-line-soft pt-3">
              <NavLink to="/privacy" className={navLinkClasses}>
                Privacy
              </NavLink>
              <NavLink to="/about" className={navLinkClasses}>
                About
              </NavLink>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
