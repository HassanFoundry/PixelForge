import { expect, test } from '@playwright/test'
import { addFiles, makeImageBuffer } from './helpers'

test('compresses a batch, reports real numbers and downloads files', async ({ page }) => {
  await page.goto('compress')
  const jpeg = await makeImageBuffer(page, { width: 1200, height: 800, type: 'image/jpeg' })
  const png = await makeImageBuffer(page, { width: 400, height: 400, type: 'image/png', noise: false })
  await addFiles(page, [
    { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: jpeg },
    { name: 'logo.png', mimeType: 'image/png', buffer: png }
  ])

  await expect(page.getByText('photo.jpg')).toBeVisible()
  await expect(page.getByText('2 selected')).toBeVisible()
  await expect(page.getByText('1200×800')).toBeVisible()

  await page.getByRole('button', { name: /Compress 2 files/ }).click()
  await expect(page.getByText('2 selected')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Download photo-compressed.jpg' })
  ).toBeVisible({ timeout: 45000 })
  await expect(page.getByRole('button', { name: 'Download logo-compressed.png' })).toBeVisible()

  const photoRow = page.locator('li', { hasText: 'photo.jpg' })
  await expect(photoRow.getByText(/−?\d+%/)).toBeVisible()
  const totalLine = page.locator('p', { hasText: '2 files ·' })
  await expect(totalLine).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download photo-compressed.jpg' }).click()
  expect((await download).suggestedFilename()).toBe('photo-compressed.jpg')

  const zipDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download ZIP' }).click()
  const zip = await zipDownload
  expect(zip.suggestedFilename()).toMatch(/^pixelforge-compressed-\d{4}-\d{2}-\d{2}\.zip$/)
})

test('removing and clearing files works', async ({ page }) => {
  await page.goto('compress')
  const jpeg = await makeImageBuffer(page, { width: 600, height: 400, type: 'image/jpeg' })
  await addFiles(page, [
    { name: 'one.jpg', mimeType: 'image/jpeg', buffer: jpeg },
    { name: 'two.jpg', mimeType: 'image/jpeg', buffer: jpeg }
  ])
  await expect(page.getByText('one.jpg')).toBeVisible()

  await page.getByRole('button', { name: 'Remove one.jpg' }).click()
  await expect(page.getByText('one.jpg')).toHaveCount(0)
  await expect(page.getByText('two.jpg')).toBeVisible()

  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByText('Drop images here')).toBeVisible()
})

test('selection controls work', async ({ page }) => {
  await page.goto('compress')
  const jpeg = await makeImageBuffer(page, { width: 600, height: 400, type: 'image/jpeg' })
  await addFiles(page, [
    { name: 'one.jpg', mimeType: 'image/jpeg', buffer: jpeg },
    { name: 'two.jpg', mimeType: 'image/jpeg', buffer: jpeg }
  ])
  await expect(page.getByText('2 selected')).toBeVisible()
  await page.getByRole('button', { name: 'Deselect all' }).click()
  await expect(page.getByText('0 of 2 selected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Compress' })).toBeDisabled()
  await page.getByRole('button', { name: 'Select all', exact: true }).click()
  await expect(page.getByText('2 selected')).toBeVisible()
})

test('unsupported files are rejected with a toast', async ({ page }) => {
  await page.goto('compress')
  await addFiles(page, [
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') }
  ])
  await expect(page.getByText(/Skipped notes\.txt/)).toBeVisible()
  await expect(page.getByText('Drop images here')).toBeVisible()
})

test('quality changes affect the output size', async ({ page }) => {
  await page.goto('compress')
  const jpeg = await makeImageBuffer(page, { width: 1200, height: 900, type: 'image/jpeg', quality: 0.95 })
  await addFiles(page, [{ name: 'detailed.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  await page.getByRole('button', { name: /Compress 1 file/ }).click()
  await expect(
    page.getByRole('button', { name: 'Download detailed-compressed.jpg' })
  ).toBeVisible({ timeout: 45000 })
  const highQualitySize = await readResultSize(page, 'detailed.jpg')

  await page.locator('#quality').evaluate((element) => {
    const input = element as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, '40')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.getByRole('button', { name: /Compress 1 file/ }).click()
  await expect
    .poll(async () => readResultSize(page, 'detailed.jpg'), { timeout: 60000 })
    .toBeLessThan(highQualitySize)
})

async function readResultSize(page: import('@playwright/test').Page, fileName: string): Promise<number> {
  return page
    .locator('li', { hasText: fileName })
    .locator('p.font-mono.text-ink-soft')
    .first()
    .textContent()
    .then((text) => {
    const match = text?.match(/([0-9.]+)\s*(B|KB|MB)/)
    if (!match) throw new Error(`no size found in "${text}"`)
    const value = Number.parseFloat(match[1])
    if (match[2] === 'KB') return value * 1024
    if (match[2] === 'MB') return value * 1024 * 1024
    return value
  })
}
