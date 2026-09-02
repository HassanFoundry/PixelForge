import type { Page } from '@playwright/test'

export interface SyntheticImageOptions {
  width: number
  height: number
  type?: string
  quality?: number
  noise?: boolean
}

export async function makeImageBuffer(
  page: Page,
  { width, height, type = 'image/jpeg', quality = 0.85, noise = true }: SyntheticImageOptions
): Promise<Buffer> {
  const bytes = await page.evaluate(
    async ({ width, height, type, quality, noise }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')!
      if (noise) {
        for (let y = 0; y < height; y += 4) {
          for (let x = 0; x < width; x += 4) {
            context.fillStyle = `rgb(${(x * 7) % 255}, ${(y * 13) % 255}, ${((x + y) * 3) % 255})`
            context.fillRect(x, y, 4, 4)
          }
        }
      } else {
        context.fillStyle = '#3366aa'
        context.fillRect(0, 0, width, height)
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result: Blob | null) =>
          result ? resolve(result) : reject(new Error('encode failed'))
        , type, quality)
      })
      const buffer = new Uint8Array(await blob.arrayBuffer())
      return Array.from(buffer)
    },
    { width, height, type, quality, noise }
  )
  return Buffer.from(bytes)
}

export async function addFiles(
  page: Page,
  files: { name: string; mimeType: string; buffer: Buffer }[]
): Promise<void> {
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(files)
}
