import { expect, test } from '@playwright/test'
import { addFiles, makeImageBuffer } from './helpers'

test('convert produces the selected format', async ({ page }) => {
  await page.goto('convert')
  const png = await makeImageBuffer(page, { width: 500, height: 350, type: 'image/png' })
  await addFiles(page, [{ name: 'art.png', mimeType: 'image/png', buffer: png }])
  await expect(page.locator('#convert-format')).toHaveValue('image/webp')
  await page.getByRole('button', { name: /Convert 1 file/ }).click()
  const download = page.waitForEvent('download')
  await expect(
    page.getByRole('button', { name: 'Download art.webp' })
  ).toBeVisible({ timeout: 45000 })
  await page.getByRole('button', { name: 'Download art.webp' }).click()
  expect((await download).suggestedFilename()).toBe('art.webp')
})

test('resize honors pixel width and keeps the aspect ratio', async ({ page }) => {
  await page.goto('resize')
  const jpeg = await makeImageBuffer(page, { width: 900, height: 600, type: 'image/jpeg' })
  await addFiles(page, [{ name: 'wide.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  await page.locator('#resize-width').fill('640')
  await page.getByRole('button', { name: /Resize 1 file/ }).click()
  await expect(
    page.getByRole('button', { name: 'Download wide-640x427.jpg' })
  ).toBeVisible({ timeout: 45000 })
})

test('resize presets crop to fill when asked', async ({ page }) => {
  await page.goto('resize')
  const jpeg = await makeImageBuffer(page, { width: 1600, height: 1200, type: 'image/jpeg' })
  await addFiles(page, [{ name: 'banner.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  await page.getByRole('tab', { name: 'Presets' }).click()
  await page.getByLabel('Crop to fill the frame').check()
  await page.getByRole('button', { name: /Resize 1 file/ }).click()
  await expect(
    page.getByRole('button', { name: 'Download banner-1080x1080.jpg' })
  ).toBeVisible({ timeout: 45000 })
})

test('optimize combines resize and compression in one pass', async ({ page }) => {
  await page.goto('optimize')
  const jpeg = await makeImageBuffer(page, { width: 2400, height: 1600, type: 'image/jpeg' })
  await addFiles(page, [{ name: 'big.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  await page.getByRole('button', { name: /Optimize 1 file/ }).click()
  await expect(
    page.getByRole('button', { name: 'Download big-1600x1067.jpg' })
  ).toBeVisible({ timeout: 60000 })
  await expect(page.getByText('−50%').first()).toBeVisible()
})

test('crop exports a real cropped file', async ({ page }) => {
  await page.goto('crop')
  const jpeg = await makeImageBuffer(page, { width: 900, height: 600, type: 'image/jpeg' })
  await addFiles(page, [{ name: 'scene.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  await expect(page.locator('canvas[role="application"]')).toBeVisible()
  await expect(page.getByText('900 × 600 px')).toBeVisible()

  await page.locator('#crop-ratio').selectOption('1')
  await expect(page.getByText('600 × 600 px')).toBeVisible()

  await page.getByRole('button', { name: 'Crop image' }).click()
  await expect(page.getByRole('dialog', { name: 'Cropped result' })).toBeVisible({ timeout: 45000 })
  const download = page.waitForEvent('download')
  await page.getByRole('dialog', { name: 'Cropped result' }).getByRole('button', { name: 'Download' }).click()
  expect((await download).suggestedFilename()).toBe('scene-cropped.png')
})

test('crop rotates and flips before export', async ({ page }) => {
  await page.goto('crop')
  const jpeg = await makeImageBuffer(page, { width: 900, height: 600, type: 'image/jpeg' })
  await addFiles(page, [{ name: 'scene.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  await page.getByRole('button', { name: 'Rotate right' }).click()
  await expect(page.getByText('600 × 900 px')).toBeVisible()
  await page.getByRole('button', { name: 'Flip horizontally' }).click()
  await page.getByRole('button', { name: 'Crop image' }).click()
  await expect(page.getByRole('dialog', { name: 'Cropped result' })).toBeVisible({ timeout: 45000 })
})

test('metadata cleaner detects and strips categories', async ({ page }) => {
  await page.goto('metadata-remover')
  const png = await makeImageBuffer(page, { width: 320, height: 240, type: 'image/png' })
  await addFiles(page, [{ name: 'clean.png', mimeType: 'image/png', buffer: png }])
  await expect(page.getByText('No standard metadata detected')).toBeVisible()
  await page.getByRole('button', { name: /Clean 1 file/ }).click()
  await expect(page.getByText('Cleaned copy ready')).toBeVisible({ timeout: 45000 })
  await expect(
    page.getByRole('button', { name: 'Download clean-clean.png' })
  ).toBeVisible()
})

test('social images export at the preset size', async ({ page }) => {
  await page.goto('social-media')
  const jpeg = await makeImageBuffer(page, { width: 640, height: 400, type: 'image/jpeg' })
  await addFiles(page, [{ name: 'post.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  await expect(page.locator('canvas[role="application"]')).toBeVisible()
  await page.getByRole('button', { name: 'Export image' }).click()
  await expect(page.getByRole('button', { name: /Download post-1080x1080\.jpg/ })).toBeVisible({
    timeout: 45000
  })
})

test('favicon generator builds the full icon set', async ({ page }) => {
  await page.goto('favicon-generator')
  const png = await makeImageBuffer(page, { width: 512, height: 512, type: 'image/png', noise: false })
  await addFiles(page, [{ name: 'mark.png', mimeType: 'image/png', buffer: png }])
  await page.getByRole('button', { name: 'Generate icons' }).click()
  const iconFiles = page.locator('section[aria-label="Icon files"]')
  await expect(iconFiles.getByText('favicon.ico', { exact: true })).toBeVisible({ timeout: 60000 })
  await expect(iconFiles.getByText('site.webmanifest', { exact: true })).toBeVisible()
  await expect(iconFiles.getByText('how-to-install.txt', { exact: true })).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download all as ZIP' }).click()
  expect((await download).suggestedFilename()).toBe('pixelforge-favicons.zip')
})

test('color extractor produces a copyable palette', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('color-extractor')
  const png = await makeImageBuffer(page, { width: 400, height: 400, type: 'image/png' })
  await addFiles(page, [{ name: 'art.png', mimeType: 'image/png', buffer: png }])
  await expect(page.getByText('Dominant', { exact: true })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Copy palette' }).click()
  await expect(page.getByText('Palette copied as HEX list')).toBeVisible()
})

test('image info reports real file facts', async ({ page }) => {
  await page.goto('image-info')
  const png = await makeImageBuffer(page, { width: 400, height: 300, type: 'image/png', noise: false })
  await addFiles(page, [{ name: 'facts.png', mimeType: 'image/png', buffer: png }])
  await expect(page.getByText('PNG', { exact: true })).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('400 × 300')).toBeVisible()
  await expect(page.getByText('4:3')).toBeVisible()
  await expect(page.getByText('0.1 MP')).toBeVisible()
  await expect(page.getByText('image/png')).toBeVisible()
})
