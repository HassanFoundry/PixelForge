import { Link } from 'react-router-dom'

import { usePageMeta } from '../hooks/usePageMeta'
import { SITE_NAME } from '../lib/site'

const sections = [
  {
    title: 'Your images stay on your device',
    body: [
      'PixelForge processes images inside your browser using standard web APIs such as Canvas and Web Workers. The image tools do not upload your files to a remote server.',
      'When you start an image operation, processing takes place on your device. When you download the result, your browser saves the generated file directly to your device.'
    ]
  },
  {
    title: 'What the app stores locally',
    body: [
      'PixelForge stores a small number of preferences in your browser localStorage, including the selected theme and tool settings such as quality and output format. Image content is not stored there.',
      'Images added to a tool remain in memory during the current session. Closing the tab or using the Clear all option removes them from the active session. A file is saved to your device only when you choose to download it.'
    ]
  },
  {
    title: 'Network requests',
    body: [
      'PixelForge is a static website. When the site loads, the browser downloads the application files, including HTML, CSS, JavaScript and fonts, from the hosting provider. These requests do not contain your images.',
      'Application files can be cached by the browser so that the image tools can continue to work offline. PixelForge does not include analytics, advertising trackers, session recording or fingerprinting.'
    ]
  },
  {
    title: 'No accounts, no database',
    body: [
      'PixelForge does not require a user account, and the core image tools do not use a database on a remote server. Image processing takes place in the browser and the application does not provide an image upload endpoint.'
    ]
  },
  {
    title: 'Browser limitations worth knowing',
    body: [
      'Web applications can process only the file formats and operations supported by the browser. PixelForge reports an error when a file cannot be decoded or an output format is unavailable. Format selectors show only supported options.',
      'If you are working with sensitive photographs, you can verify local processing by loading PixelForge, disconnecting from the network and continuing to use the image tools.'
    ]
  }
]

export default function Privacy() {
  usePageMeta({
    title: 'Privacy',
    description: `How ${SITE_NAME} handles images, local processing, storage and network activity.`,
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
        {SITE_NAME} processes images locally in your browser. This page explains what
        information the application stores and what network activity is required to use it.
      </p>

      <div className="mt-10 grid gap-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
              {section.title}
            </h2>

            {section.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="mt-2.5 text-[15px] leading-relaxed text-ink-soft"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-6 text-sm text-ink-faint">
        Network activity can be reviewed using your browser's developer tools or network
        inspector.
      </p>
    </div>
  )
}
