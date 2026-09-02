import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { tools } from '../lib/site'
import { Logo } from './Logo'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.4fr_2fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="PixelForge home">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight">PixelForge</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            Image tools that run in your browser. Processing is performed locally and no account is
            required.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Your images never leave your device
          </p>
        </div>
        <nav aria-label="Tools">
          <h2 className="text-sm font-semibold text-ink">Tools</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
            {tools.map((tool) => (
              <li key={tool.path}>
                <Link to={tool.path} className="rounded-sm text-sm text-ink-soft transition-colors hover:text-accent">
                  {tool.listName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Project">
          <h2 className="text-sm font-semibold text-ink">Project</h2>
          <ul className="mt-3 grid gap-2">
            <li>
              <Link to="/" className="rounded-sm text-sm text-ink-soft transition-colors hover:text-accent">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="rounded-sm text-sm text-ink-soft transition-colors hover:text-accent">
                About
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="rounded-sm text-sm text-ink-soft transition-colors hover:text-accent">
                Privacy
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line-soft">
        <div className="shell flex flex-col gap-2 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 HassanFoundry. All rights reserved.</p>
          <p>Proprietary software. Processing happens locally in your browser.</p>
        </div>
      </div>
    </footer>
  )
}
