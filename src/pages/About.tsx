import { Link } from 'react-router-dom'

import { usePageMeta } from '../hooks/usePageMeta'
import { SITE_NAME } from '../lib/site'

export default function About() {
  usePageMeta({
    title: 'About',
    description: `${SITE_NAME} is a private image toolkit that runs in the browser for everyday image processing tasks.`,
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
          {SITE_NAME} is an image toolkit that runs in the browser for common image processing tasks.
          It includes tools for compression, resizing, conversion, cropping, optimization,
          metadata removal, social media sizing, favicon generation, color extraction and
          file inspection.
        </p>

        <p>
          Image processing takes place locally in your browser. Your images do not need
          to be uploaded to a remote server before they can be processed. The application
          is designed to work on both desktop and mobile devices.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            How it works
          </h2>

          <p className="mt-2.5">
            The application is a static website built with React, TypeScript and Tailwind
            CSS. Image processing uses browser APIs including Canvas and Web Workers.
            Files are decoded, processed in memory and encoded in the selected output
            format on your device.
          </p>

          <p className="mt-2.5">
            File sizes and compression savings are calculated from the generated output
            files rather than estimated values. Output formats are shown only when they
            are supported by the browser.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            Scope and limits
          </h2>

          <p className="mt-2.5">
            Browser processing is subject to the capabilities of the device and browser.
            Very large images may be limited by available memory, animated files are
            processed using their first frame, and available output formats depend on
            browser support. The application reports an error when an operation cannot
            be completed.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
            License
          </h2>

          <p className="mt-2.5">
            {SITE_NAME} is proprietary software. All rights reserved. See the LICENSE
            file in the repository for full terms.
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
