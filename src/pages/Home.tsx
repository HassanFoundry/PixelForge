import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Cpu,
  Gauge,
  Layers,
  Moon,
  Scaling,
  ShieldCheck,
  WifiOff,
  Zap
} from 'lucide-react'
import { Dropzone } from '../components/Dropzone'
import { buttonClasses } from '../components/Button'
import { usePageMeta } from '../hooks/usePageMeta'
import { useToast } from '../components/Toasts'
import { SITE_URL, tools } from '../lib/site'
import { setPendingFiles } from '../lib/handoff'

const faqs = [
  {
    question: 'Are my images really never uploaded?',
    answer:
      'Yes. Every tool runs in your browser using Canvas and Web Worker APIs. PixelForge does not upload your images. After the site has loaded, the tools can continue to work offline.'
  },
  {
    question: 'Is there a file size limit?',
    answer:
      'The practical limit depends on your browser, available memory and image dimensions. Since files are processed locally, larger images may require more device memory.'
  },
  {
    question: 'Which formats can PixelForge read and write?',
    answer:
      'PixelForge can read JPG, PNG, WebP, GIF, BMP, SVG and AVIF when supported by the browser. It can export JPG, PNG, WebP and AVIF. The format picker only shows formats the browser can encode.'
  },
  {
    question: 'Does it work offline?',
    answer:
      'Yes. After your first visit the app files are cached, and every tool keeps working without a connection. You can also install PixelForge as an app from your browser menu.'
  },
  {
    question: 'Is it free?',
    answer:
      'Yes. PixelForge does not require an account, add a watermark or use a paid tier.'
  },
  {
    question: 'Where are my files stored?',
    answer:
      'In memory, for the current session. Nothing is written to disk unless you press download. Small preferences such as theme and quality are kept in localStorage.'
  }
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer }
  }))
}

const appJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PixelForge',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web browser',
  url: SITE_URL,
  description:
    'Compress, resize, convert, crop and optimize images directly in your browser. Your images never leave your device.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
}

const highlights = [
  {
    icon: Cpu,
    title: 'Local processing',
    text: 'Compression, resizing, conversion and cropping all run on your device, in your browser tab.'
  },
  {
    icon: Layers,
    title: 'Batch mode',
    text: 'Queue up to 30 files, process them in one pass and download everything as a ZIP.'
  },
  {
    icon: Gauge,
    title: 'Real output numbers',
    text: 'Sizes and savings are measured from the actual encoded file, never estimated.'
  },
  {
    icon: Scaling,
    title: 'Platform presets',
    text: 'Exact dimensions for Instagram, YouTube, X, LinkedIn, Facebook and common web sizes.'
  },
  {
    icon: Moon,
    title: 'Light, dark or system',
    text: 'Choose light, dark or system theme. The selected preference is saved in the browser.'
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    text: 'You can install it as an app or keep the tab open. After the app files are cached, the tools can work without a network connection.'
  }
]

const workflowSteps = [
  {
    step: '1',
    title: 'Add images',
    text: 'Drag files onto the page or pick them from your device. Add a few, or fill the queue.'
  },
  {
    step: '2',
    title: 'Choose settings',
    text: 'Set the required quality, dimensions, format or crop before processing.'
  },
  {
    step: '3',
    title: 'Download',
    text: 'Download files individually or as a ZIP. Files remain in the current browser session until they are cleared or the tab is closed.'
  }
]

const useCases = [
  'Product photos',
  'Blog headers',
  'Favicons and app icons',
  'Social posts and stories',
  'Portfolio pieces',
  'Email attachments',
  'Faster web pages',
  'School and course work'
]

const comparisonRows: { label: string; pixelforge: string; typical: string }[] = [
  { label: 'Files leave your device', pixelforge: 'No', typical: 'Yes, uploaded to a server' },
  { label: 'Upload wait', pixelforge: 'None', typical: 'Depends on your connection' },
  { label: 'Works offline', pixelforge: 'Yes', typical: 'No' },
  { label: 'Batch limits', pixelforge: 'Your device memory', typical: 'Server caps, often paid' },
  { label: 'Accounts and watermarks', pixelforge: 'None', typical: 'Common on free plans' },
  { label: 'Image processing location', pixelforge: 'Your device', typical: 'Remote server' }
]

export default function Home() {
  usePageMeta({
    description:
      'Compress, resize, convert, crop and optimize images directly in your browser. Your images never leave your device.',
    path: '/',
    jsonLd: { '@graph': [appJsonLd, faqJsonLd] }
  })
  const navigate = useNavigate()
  const toast = useToast()

  return (
    <>
      <section className="border-b border-line">
        <div className="shell flex flex-col items-center py-16 text-center sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-soft">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Browser processing. Images are not uploaded.
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Image tools that run in your browser.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Compress, resize, convert, crop and optimize images directly in your browser. Your images
            never leave your device.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#tools" className={buttonClasses('primary', 'lg')}>
              Start Editing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link to="/compress" className={buttonClasses('secondary', 'lg')}>
              Compress Images
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-faint">Free to use. No account required. Works offline.</p>
          <div className="mt-10 w-full max-w-xl">
            <Dropzone
              compact
              title="Drop an image to start compressing"
              hint="Opens the compressor with your file loaded"
              onFiles={(files) => {
                setPendingFiles(files)
                navigate('/compress')
                toast(`Opening the compressor with ${files.length} file${files.length > 1 ? 's' : ''}`, 'info')
              }}
            />
          </div>
        </div>
      </section>

      <section id="tools" className="scroll-mt-20 border-b border-line">
        <div className="shell py-14 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                The tools
              </h2>
              <p className="mt-2 text-ink-soft">Ten image tools for common editing and inspection tasks.</p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const ToolIcon = tool.icon
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className="card group flex flex-col gap-3 p-5 transition-colors hover:border-accent/60"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-raised">
                    <ToolIcon className="h-5 w-5 text-accent" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{tool.listName}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{tool.tagline}</span>
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-accent">
                    Open
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="shell py-14 sm:py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Why PixelForge
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            PixelForge processes images locally instead of sending them to a remote image
            processing service.
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => {
              const HighlightIcon = item.icon
              return (
                <div key={item.title} className="flex gap-4">
                  <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-line bg-surface">
                    <HighlightIcon className="h-5 w-5 text-accent" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-medium text-ink">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="shell grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-ink-soft">
              Add an image, choose the settings and download the result.
            </p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {workflowSteps.map((item) => (
              <li key={item.step} className="card p-5">
                <span className="font-mono text-sm text-accent" aria-hidden="true">
                  {item.step}
                </span>
                <h3 className="mt-2 font-medium text-ink">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="shell grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Built for batches
            </h2>
            <p className="mt-2 text-ink-soft">
              Batch tools can process up to 30 files in one queue.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <p className="text-sm leading-relaxed text-ink-soft">
              Add multiple files to the queue and PixelForge processes them one at a time while
              keeping the interface responsive. Each file shows its current status along with the
              output size and savings when available.
            </p>
            <ul className="grid gap-2.5 text-sm text-ink-soft">
              {[
                'Up to 30 files per batch',
                'Per-file progress and results',
                'Download individually or as a ZIP',
                'Predictable names like photo-compressed.jpg',
                'Remove or re-run single files anytime'
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <Zap className="mt-0.5 h-4 w-4 flex-none text-accent" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="shell py-14 sm:py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Who it's for
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            PixelForge can be used by designers, developers, photographers, bloggers, students,
            social media managers, small businesses and anyone who needs common image processing
            tools without uploading files to a remote service.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {useCases.map((label) => (
              <li
                key={label}
                className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-soft"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="shell py-14 sm:py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            PixelForge compared with online upload tools
          </h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-ink-faint">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Feature
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium text-ink">
                    PixelForge
                  </th>
                  <th scope="col" className="py-3 font-medium">
                    Typical online tool
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-line-soft">
                    <th scope="row" className="py-3.5 pr-4 font-medium text-ink">
                      {row.label}
                    </th>
                    <td className="py-3.5 pr-4 font-medium text-ok">{row.pixelforge}</td>
                    <td className="py-3.5 text-ink-soft">{row.typical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="shell py-14 sm:py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 grid gap-3 lg:grid-cols-2">
            {faqs.map((faq) => (
              <details key={faq.question} className="card group p-5 open:bg-raised/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span
                    className="text-lg text-ink-faint transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="shell flex flex-col items-center py-16 text-center sm:py-20">
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Start with a tool
          </h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            Choose a tool and add an image. No account is required.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/compress" className={buttonClasses('primary', 'lg')}>
              Compress Images
            </Link>
            <a href="#tools" className={buttonClasses('secondary', 'lg')}>
              Browse all tools
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
