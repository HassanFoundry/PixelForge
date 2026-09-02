import {
  ArrowLeftRight,
  Crop,
  FileSearch,
  Gauge,
  Grid2x2,
  Minimize2,
  Palette,
  Scaling,
  ScanLine,
  Share2,
  type LucideIcon
} from 'lucide-react'

export const SITE_NAME = 'PixelForge'
export const SITE_TAGLINE = 'Private Image Tools'
export const SITE_URL = 'https://hassanfoundry.github.io/PixelForge'

export interface Tool {
  path: string
  nav: string
  listName: string
  name: string
  tagline: string
  description: string
  icon: LucideIcon
  popular?: boolean
}

export const tools: Tool[] = [
  {
    path: '/compress',
    listName: 'Compress images',
    nav: 'Compress',
    name: 'Image Compressor',
    tagline: 'Reduce JPEG, PNG and WebP file size with an adjustable quality setting.',
    description:
      'Compress JPEG, PNG and WebP images locally in your browser with batch processing and measured output sizes.',
    icon: Minimize2,
    popular: true
  },
  {
    path: '/resize',
    listName: 'Resize images',
    nav: 'Resize',
    name: 'Image Resizer',
    tagline: 'Resize by exact dimensions, percentage or preset sizes.',
    description:
      'Resize images by pixels, percentage or preset dimensions for social media and common web uses.',
    icon: Scaling,
    popular: true
  },
  {
    path: '/convert',
    listName: 'Convert formats',
    nav: 'Convert',
    name: 'Image Converter',
    tagline: 'Convert between JPG, PNG, WebP and AVIF in the browser.',
    description:
      'Convert individual images or batches between JPG, PNG, WebP and AVIF without uploading the files.',
    icon: ArrowLeftRight,
    popular: true
  },
  {
    path: '/crop',
    listName: 'Crop images',
    nav: 'Crop',
    name: 'Image Cropper',
    tagline: 'Crop images with aspect ratios, rotation, flipping, zoom and touch controls.',
    description:
      'Crop images with free or fixed aspect ratios, rotation, flipping and zoom using mouse or touch controls.',
    icon: Crop,
    popular: true
  },
  {
    path: '/optimize',
    listName: 'Optimize images',
    nav: 'Optimize',
    name: 'Image Optimizer',
    tagline: 'Resize, convert and compress in a single operation.',
    description:
      'Resize, convert and compress images in one operation for web use.',
    icon: Gauge
  },
  {
    path: '/metadata-remover',
    listName: 'Clean metadata',
    nav: 'Metadata',
    name: 'Metadata Cleaner',
    tagline: 'Inspect common metadata and create a clean copy of the image.',
    description:
      'Detect EXIF, GPS, XMP and other metadata, then create a clean copy without the detected metadata.',
    icon: ScanLine
  },
  {
    path: '/social-media',
    listName: 'Social media images',
    nav: 'Social',
    name: 'Social Media Images',
    tagline: 'Prepare images for common platform dimensions using fill, fit or blur.',
    description:
      'Prepare images for Instagram, YouTube, X, LinkedIn and Facebook using preset dimensions.',
    icon: Share2
  },
  {
    path: '/favicon-generator',
    listName: 'Favicon generator',
    name: 'Favicon Generator',
    nav: 'Favicon',
    tagline: 'Generate favicon.ico, PNG icons and a web manifest from one image.',
    description:
      'Generate favicon.ico, PNG icons and a web manifest from a single source image.',
    icon: Grid2x2
  },
  {
    path: '/color-extractor',
    listName: 'Color extractor',
    nav: 'Colors',
    name: 'Color Extractor',
    tagline: 'Extract dominant colors and copy HEX or RGB values.',
    description:
      'Extract dominant colors from an image and copy the resulting HEX and RGB values.',
    icon: Palette
  },
  {
    path: '/image-info',
    listName: 'Image info',
    nav: 'Info',
    name: 'Image Information',
    tagline: 'Inspect format, dimensions, transparency and metadata locally.',
    description:
      'Inspect image format, dimensions, aspect ratio, transparency and metadata without uploading the file.',
    icon: FileSearch
  }
]

export function toolByPath(path: string): Tool | undefined {
  return tools.find((tool) => tool.path === path)
}
