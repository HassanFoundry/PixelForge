import { extractPalette, type ExtractedColor } from '../lib/palette'

const port = self as unknown as Worker

port.addEventListener('message', (event: MessageEvent<{ pixels: ArrayBuffer; count: number }>) => {
  const { pixels, count } = event.data
  const colors: ExtractedColor[] = extractPalette(new Uint8ClampedArray(pixels), count)
  port.postMessage({ colors })
})
