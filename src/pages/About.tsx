import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import { SITE_NAME } from '../lib/site'

export default function About() {
  usePageMeta({
    title: 'About',
    description: `${SITE_NAME} is a fast, private image toolkit that runs entirely in your browser. Learn how it works and why it exists.`,
    path: '/about'
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
          <li className="text-ink-soft">About</li>
        </ol>
      </nav>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        About {SITE_NAME}
      </h1>
      <div className="mt-6 grid gap-6 text-[15px] leading-relaxed text-ink-soft">
        <p>
          {SITE_NAME} started with a simple annoyance: almost every online image tool asks you to
          upload your photos to somebody else's server, wait in a queue, and hope the result comes
          back. For a quick resize or compression, that round trip has never made much sense —
          browsers have been able to do this work locally for years.
        </p>
        <p>
          So {SITE_NAME} does exactly that, and nothing else. It is a set of focused image tools —
          compress, resize, convert, crop, optimize, clean metadata, prepare social sizes, generate
          favicons, extract colors and inspect files — built to work entirely on your device. Fast on
          a phone, comfortable on a laptop, private everywhere.
        </p>
        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">How it works</h2>
          <p className="mt-2.5">
            The app is a static website built with React, TypeScript and Tailwind CSS. Image work
            uses the browser's Canvas and Web Worker APIs: files are decoded in your browser,
            transformed in memory, and encoded back to the format you chose. Your browser does the
            heavy lifting; the hosting only serves the app files themselves.
          </p>
          <p className="mt-2.5">
            That is also why the batch tools show real numbers. Output sizes and savings are read
            from the actual encoded files, never estimated, and a format only appears in the picker
            if your browser can genuinely produce it.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Scope and limits</h2>
          <p className="mt-2.5">
            Browser-only processing has honest limits: huge images are bound by your device's memory,
            animated files keep only their first frame, and output formats depend on what your
            browser can encode. The tools tell you when you hit those limits instead of pretending
            otherwise.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">License</h2>
          <p className="mt-2.5">
            {SITE_NAME} is proprietary software. All rights reserved. See the LICENSE file in the
            repository for details.
          </p>
        </section>
      </div>
      <div className="mt-10 flex gap-3 border-t border-line pt-6">
        <Link to="/" className="text-sm font-medium text-accent hover:underline">
          Browse the tools
        </Link>
        <Link to="/privacy" className="text-sm font-medium text-accent hover:underline">
          Read the privacy page
        </Link>
      </div>
    </div>
  )
}
