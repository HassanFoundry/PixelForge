import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Tool } from '../lib/site'

interface ToolShellProps {
  tool: Tool
  children: ReactNode
}

export function ToolShell({ tool, children }: ToolShellProps) {
  const ToolIcon = tool.icon
  return (
    <div className="shell py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-ink-faint">
          <li>
            <Link to="/" className="rounded-sm hover:text-accent">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink-soft">{tool.nav}</li>
        </ol>
      </nav>
      <div className="mt-4 flex items-start gap-4">
        <span className="hidden rounded-xl border border-line bg-surface p-3 shadow-card sm:block">
          <ToolIcon className="h-6 w-6 text-accent" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {tool.name}
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
            {tool.tagline}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Runs in your browser — files are never uploaded
          </p>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  )
}
