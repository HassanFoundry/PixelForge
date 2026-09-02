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
export const SITE_URL = 'https://hassanisbacknow.github.io/PixelForge'

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
    tagline: 'Make JPEG, PNG and WebP files smaller with a quality slider you control.',
    description:
      'Compress JPEG, PNG and WebP images in your browser. Real output sizes, batch processing and no uploads.',
    icon: Minimize2,
    popular: true
  },
  {
    path: '/resize',
    listName: 'Resize images',
    nav: 'Resize',
    name: 'Image Resizer',
    tagline: 'Set exact pixel dimensions, percentages or ready-made presets.',
    description:
      'Resize images by pixels, percentage or presets for Instagram, YouTube, X and more. Runs entirely in your browser.',
    icon: Scaling,
    popular: true
  },
  {
    path: '/convert',
    listName: 'Convert formats',
    nav: 'Convert',
    name: 'Image Converter',
    tagline: 'Switch between JPG, PNG, WebP and AVIF without uploading anything.',
    description:
      'Convert images between JPG, PNG, WebP and AVIF locally in your browser. Single files or whole batches at once.',
    icon: ArrowLeftRight,
    popular: true
  },
  {
    path: '/crop',
    listName: 'Crop images',
    nav: 'Crop',
    name: 'Image Cropper',
    tagline: 'Crop with aspect ratios, rotation, flips, zoom and touch support.',
    description:
      'Crop images in your browser with free and locked aspect ratios, rotation, flips and zoom. Works with mouse and touch.',
    icon: Crop,
    popular: true
  },
  {
    path: '/optimize',
    listName: 'Optimize images',
    nav: 'Optimize',
    name: 'Image Optimizer',
    tagline: 'Resize, reformat and compress in a single pass.',
    description:
      'Combine resizing, format conversion and compression into one step. Ideal for preparing images for the web.',
    icon: Gauge
  },
  {
    path: '/metadata-remover',
    listName: 'Clean metadata',
    nav: 'Metadata',
    name: 'Metadata Cleaner',
    tagline: 'See what your files carry, then re-encode them clean.',
    description:
      'Detect EXIF, GPS, XMP and other metadata in your images, then download clean copies with the metadata stripped.',
    icon: ScanLine
  },
  {
    path: '/social-media',
    listName: 'Social media images',
    nav: 'Social',
    name: 'Social Media Images',
    tagline: 'Fit any photo to exact platform sizes with fill, fit or blur.',
    description:
      'Prepare images for Instagram, YouTube, X, LinkedIn and Facebook at the exact sizes each platform expects.',
    icon: Share2
  },
  {
    path: '/favicon-generator',
    listName: 'Favicon generator',
    name: 'Favicon Generator',
    nav: 'Favicon',
    tagline: 'Turn one image into a full set of icons, including favicon.ico.',
    description:
      'Generate favicon.ico, PNG icons and a web manifest from a single image, ready to drop into any website.',
    icon: Grid2x2
  },
  {
    path: '/color-extractor',
    listName: 'Color extractor',
    nav: 'Colors',
    name: 'Color Extractor',
    tagline: 'Pull a working palette out of any image.',
    description:
      'Extract dominant colors from any image with HEX and RGB values you can copy straight into your designs.',
    icon: Palette
  },
  {
    path: '/image-info',
    listName: 'Image info',
    nav: 'Info',
    name: 'Image Information',
    tagline: 'Inspect dimensions, format, transparency and metadata.',
    description:
      'Look up an image\'s real format, dimensions, aspect ratio, transparency and metadata without uploading it.',
    icon: FileSearch
  }
]

export function toolByPath(path: string): Tool | undefined {
  return tools.find((tool) => tool.path === path)
}
