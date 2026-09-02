import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { SITE_NAME } from '../lib/site'

const sections = [
  {
    title: 'Your images stay on your device',
    body: [
      'Every PixelForge tool — compression, resizing, conversion, cropping, optimization, metadata cleaning and the rest — runs inside your browser using standard web APIs such as Canvas and Web Workers. The application contains no code path that uploads your images anywhere.',
      'When you press a process button, the work happens on your device\'s processor. When you press download, the file is saved directly by your browser. At no point is image data sent over the network.'
    ]
  },
  {
    title: 'What the app stores locally',
    body: [
      'PixelForge keeps small preferences in your browser\'s localStorage: your theme choice and per-tool settings such as quality and output format. These are names and numbers, never image content.',
      'The images you add live in memory for the current session. Closing the tab, or pressing Clear all in a tool, drops them. Nothing is written to your disk unless you explicitly download a file.'
    ]
  },
  {
    title: 'Network requests',
    body: [
      'PixelForge is a static website. Loading it downloads the app\'s HTML, CSS, JavaScript and fonts from its hosting provider — a normal page load, like any website. None of these requests contain your images.',
      'After the first load, the app files are cached and the tools keep working offline. No analytics, advertising trackers, session recording or fingerprinting are included.'
    ]
  },
  {
    title: 'No accounts, no database',
    body: [
      'There is no login, and the core tools do not use a server-side database. That is not a policy promise — it is how the software is built. With no upload endpoint, there is nothing to breach.'
    ]
  },
  {
    title: 'Browser limitations worth knowing',
    body: [
      'Web pages can only process what the browser can read. PixelForge shows honest errors when a file cannot be decoded or an output format is not supported by your browser, and the format pickers only offer options that actually work.',
      'If you are working with sensitive photographs, treat any tool — browser-based or not — with care, and verify results. For PixelForge you can confirm the behaviour yourself: load the site, disconnect from the network, and keep editing.'
    ]
  }
]

export default function Privacy() {
  usePageMeta({
    title: 'Privacy',
    description: `How ${SITE_NAME} handles your images: local browser processing, no uploads, no tracking, and no database.`,
    path: '/privacy'
  })

  return (
    <div className="shell max-w-3xl py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-ink-faint">
          <li>
            <Link to="/" className="rounded-sm hover:text-accent">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-ink-soft">Privacy</li>
        </ol>
      </nav>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Privacy
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        {SITE_NAME} is private by architecture, not by policy alone. This page explains exactly what
        happens to your files.
      </p>
      <div className="mt-10 grid gap-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 border-t border-line pt-6 text-sm text-ink-faint">
        Questions about this page? It is a static site — the source of truth is the behaviour
        described above, which you can verify with your browser's network inspector.
      </p>
    </div>
  )
}
