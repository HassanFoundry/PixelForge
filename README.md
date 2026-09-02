# PixelForge

Private, offline-capable image tools that run directly in the browser.

PixelForge provides image processing utilities for common editing, conversion and inspection tasks. Image processing is performed locally on the user's device without requiring image uploads to a remote server.

**Live application:** https://hassanfoundry.github.io/PixelForge

## Features

PixelForge includes ten image tools:

| Tool | Function |
| --- | --- |
| **Image Compressor** | Reduce JPEG, PNG and WebP file sizes with adjustable quality settings, batch processing and measured output sizes |
| **Image Resizer** | Resize images by exact dimensions, percentage or preset sizes with aspect ratio controls |
| **Image Converter** | Convert between JPG, PNG, WebP and AVIF when supported by the browser |
| **Image Cropper** | Crop images with free or fixed aspect ratios, rotation, flipping, zoom, pan and touch controls |
| **Image Optimizer** | Resize, convert and compress images in a single operation for web use |
| **Metadata Cleaner** | Detect EXIF, GPS, XMP, IPTC, ICC and other metadata and create a clean copy |
| **Social Media Images** | Prepare images for common Instagram, YouTube, X, LinkedIn and Facebook dimensions |
| **Favicon Generator** | Generate favicon.ico, PNG icons, a web manifest and related files from a source image |
| **Color Extractor** | Extract dominant colors from images and copy HEX or RGB values |
| **Image Information** | Inspect image format, dimensions, aspect ratio, megapixels, transparency and metadata |

## Local Processing and Privacy

PixelForge is designed around local browser processing.

- Image decoding, processing and encoding take place on the user's device.
- The image tools do not require files to be uploaded to a remote server.
- No user account is required.
- The application does not include advertising analytics or session recording.
- User preferences are stored locally in the browser.
- Image processing uses browser APIs including Canvas and Web Workers.
- Supported input and output formats depend on browser capabilities.
- The application can continue to operate offline after the required files have been cached.

For additional information, see the Privacy page in the application.

## Technology

PixelForge is built with:

- React 18
- React Router 6
- TypeScript 5.6
- Vite 5
- Tailwind CSS 3.4
- Vite PWA
- Web Workers
- Canvas API
- JSZip
- Lucide React
- Vitest
- Playwright

## Getting Started

Clone the repository and install the dependencies:

```bash
git clone https://github.com/HassanFoundry/PixelForge.git
cd PixelForge
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check the project and create a production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests with Vitest |
| `npm run e2e` | Run end-to-end tests with Playwright |
| `npm run icons` | Regenerate favicons, the Open Graph image, robots.txt and sitemap |

## Testing

PixelForge includes unit and end-to-end testing.

Unit tests cover application logic including metadata parsing, ICO generation, palette extraction, filename handling and formatting utilities.

End-to-end tests cover application routes and major image processing workflows, including compression, resizing, conversion, cropping, optimization, metadata handling, social media presets, favicon generation, color extraction and image information. Tests also cover responsive layouts, keyboard interaction, theme switching and offline operation.

Run the unit tests:

```bash
npm run test
```

Run the end-to-end tests:

```bash
npm run e2e
```

## Project Structure

```text
src/
  components/   Shared interface components
  constants/    Presets and application constants
  hooks/        Queue management, workers, settings and theme logic
  lib/          Image processing, metadata, palette, ICO and utility logic
  pages/        Application pages and image tools
  workers/      Image processing and palette Web Workers

tests/          Playwright end-to-end tests and supporting files
scripts/        Build support, icon generation and test preparation
```

## Deployment

PixelForge is deployed to GitHub Pages from the `main` branch using the workflow located in `.github/workflows/pages.yml`.

The production build uses `/PixelForge/` as its base path so that application routes and static assets work correctly under the GitHub Pages project path.

## License

Copyright © 2026 HassanFoundry. All rights reserved.

PixelForge is proprietary software. The software and its source code may be viewed for reference, but they may not be copied, modified, distributed, sublicensed or otherwise used without prior written permission from the copyright holder.

See the `LICENSE` file for the complete license terms.
