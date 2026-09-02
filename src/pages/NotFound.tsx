import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { buttonClasses } from '../components/Button'
import { Logo } from '../components/Logo'
import { tools } from '../lib/site'

export default function NotFound() {
  usePageMeta({
    title: 'Page not found',
    description: 'The page you are looking for does not exist.',
    path: '/404'
  })

  return (
    <div className="shell flex flex-col items-center py-20 text-center sm:py-28">
      <Logo className="h-12 w-12 opacity-60" />
      <p className="mt-6 font-mono text-sm text-accent">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
        This address doesn't match any page. It may have been moved, or the link that brought you
        here is wrong.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link to="/" className={buttonClasses('primary', 'lg')}>
          Go to the homepage
        </Link>
        <Link to="/compress" className={buttonClasses('secondary', 'lg')}>
          Compress an image
        </Link>
      </div>
      <nav aria-label="Tools" className="mt-12 w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">All tools</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          {tools.map((tool) => (
            <li key={tool.path}>
              <Link
                to={tool.path}
                className="inline-flex rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent/60 hover:text-ink"
              >
                {tool.listName}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
