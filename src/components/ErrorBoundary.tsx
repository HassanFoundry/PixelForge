import { Component, type ReactNode } from 'react'
import { Logo } from './Logo'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="shell flex min-h-dvh flex-col items-center justify-center gap-4 py-20 text-center">
          <Logo className="h-10 w-10 opacity-50" />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft">
            The page encountered an unexpected error and stopped. Your files remain on your device and
            were not uploaded. Reload to continue.
          </p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload PixelForge
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
