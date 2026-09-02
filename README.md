# PixelForge

Private, offline-capable image tools that run entirely in your browser. Drop files in,
get results out — nothing is ever uploaded to a server.

Live app: **https://hassanisbacknow.github.io/PixelForge/**

## What it does

PixelForge packs ten focused tools into one fast, installable web app:

| Tool | What it does |
| --- | --- |
| **Compress** | Shrink JPG/PNG/WebP files with a quality slider, per-file savings and ZIP download |
| **Resize** | Exact pixels, percentages or 12 ready-made presets, with aspect lock and crop-to-fill |
| **Convert** | Convert between JPG, PNG and WebP (AVIF where the browser supports it) |
| **Crop** | Full canvas cropper: aspect lock, rotate/flip, zoom and pan, keyboard nudging |
| **Optimize** | One-pass resize + recompress tuned for web publishing |
| **Metadata cleaner** | Detect and strip EXIF, GPS, XMP, IPTC, ICC and comment metadata |
| **Social media images** | Fit any photo into platform presets with focal-point control and background blur |
| **Favicon generator** | Produce `favicon.ico` (16/32/48), a full PNG icon set, `site.webmanifest` and install notes as a ZIP |
| **Color extractor** | Median-cut palette extraction with dominant color and HEX copying |
| **Image info** | Format, dimensions, aspect ratio, megapixels and embedded metadata inspection |

## Why it is different

- **Truly private.** All decoding, processing and encoding happens on your device with
  Canvas and Web Worker APIs. There is no backend, no upload endpoint and no analytics.
- **Fast.** Heavy image work runs in a worker so the interface stays responsive; batches
  of up to 30 files are processed with live progress.
- **Works offline.** A service worker (via `vite-plugin-pwa`) precaches the whole app —
  after the first visit every tool works without a network connection.
- **Honest defaults.** Format support is probed in your browser and the UI tells you
  what is available instead of failing silently.

## Tech stack

- [React 18](https://react.dev) + [React Router 6](https://reactrouter.com)
- [TypeScript 5.6](https://www.typescriptlang.org) (strict)
- [Vite 5](https://vitejs.dev) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app)
- [Tailwind CSS 3.4](https://tailwindcss.com) with a custom light/dark token palette
- [Vitest](https://vitest.dev) for unit tests, [Playwright](https://playwright.dev) for end-to-end tests
- [JSZip](https://stuk.github.io/jszip/) for archive downloads, [lucide-react](https://lucide.dev) for icons

## Getting started

```bash
npm install
npm run dev       # start the dev server
```

Production build and preview:

```bash
npm run build     # type-check, then build into dist/
npm run preview   # serve the production build locally
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc` + `vite build` |
| `npm run preview` | Serve `dist/` |
| `npm run test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) — prepares a bundled Chromium when needed |
| `npm run lint` | ESLint (flat config) |
| `npm run icons` | Regenerate favicons, OG image, robots.txt and sitemap from `src/assets/anvil.json` |

## Testing

- **Unit tests** cover the pure logic: metadata parsing against hand-built binary
  fixtures, ICO file layout, palette extraction, filename helpers and formatters.
- **End-to-end tests** drive the real app in a browser: every route, theme switching,
  the full compress/resize/convert/crop/optimize/metadata/social/favicon/palette/info
  flows, responsive layout at eight viewport widths, keyboard access and offline mode.

Run everything:

```bash
npm run test
npm run e2e
```

## Project structure

```
src/
  components/   Reusable UI (Dropzone, FileQueue, ToolShell, Modal, Toasts, …)
  constants/    Size presets and tool constants
  hooks/        Queue management, worker orchestration, persisted settings, theming
  lib/          Pure logic: canvas pipeline, metadata, palette, ICO writer, helpers
  pages/        One page per tool plus Home, Privacy, About and 404
  workers/      process.worker.ts and palette.worker.ts
tests/          Playwright end-to-end specs and helpers
scripts/        Icon/OG/robots generation, e2e browser preparation
```

## Deployment

The site deploys to GitHub Pages from the `main` branch via the workflow in
`.github/workflows/pages.yml`. The app is built with `base: '/PixelForge/'`, so the
router and asset URLs match the Pages subpath automatically.

## License

Copyright © 2026. All rights reserved.

This software and its source code are proprietary. You may view the source for
reference, but you may not copy, modify, distribute, sublicense or use it — in whole
or in part — for any purpose without prior written permission from the author.
