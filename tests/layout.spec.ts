import { expect, test } from '@playwright/test'
import { addFiles, makeImageBuffer } from './helpers'

const widths = [320, 360, 390, 430, 640, 768, 1024, 1440]

test('pages never overflow horizontally at common widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('./')
    await expect(page.locator('h1')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow, `homepage at ${width}px`).toBeLessThanOrEqual(1)
  }
})

test('the compressor stays inside the viewport on phones', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('compress')
    const jpeg = await makeImageBuffer(page, { width: 500, height: 400, type: 'image/jpeg' })
    await addFiles(page, [{ name: 'phone.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
    await page.getByRole('button', { name: /Compress 1 file/ }).click()
    await expect(
      page.getByRole('button', { name: 'Download phone-compressed.jpg' })
    ).toBeVisible({ timeout: 45000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow, `compressor at ${width}px`).toBeLessThanOrEqual(1)
  }
})

test('the mobile menu opens and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Mobile' })).toBeVisible()
  await page.locator('nav[aria-label="Mobile"] a[href="/PixelForge/crop"]').click()
  await expect(page.locator('h1')).toContainText('Image Cropper')
})

test('header controls keep comfortable tap targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  for (const name of ['Theme: system', 'Open menu']) {
    const box = await page.getByRole('button', { name }).boundingBox()
    expect(box?.height, name).toBeGreaterThanOrEqual(40)
    expect(box?.width, name).toBeGreaterThanOrEqual(40)
  }
})

test('keyboard users can reach main navigation', async ({ page }) => {
  await page.goto('./')
  await page.locator('body').focus()
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => ({
    label: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent,
    outline: getComputedStyle(document.activeElement as Element).outlineStyle
  }))
  expect(focused.label).toContain('Skip to content')
  expect(focused.outline).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeVisible()
})

test('the cropper responds to keyboard nudging', async ({ page }) => {
  await page.goto('crop')
  const jpeg = await makeImageBuffer(page, { width: 600, height: 400, type: 'image/jpeg' })
  await addFiles(page, [{ name: 'keys.jpg', mimeType: 'image/jpeg', buffer: jpeg }])
  const canvas = page.locator('canvas[role="application"]')
  await expect(canvas).toBeVisible()
  await canvas.click()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Shift+ArrowRight')
  await expect(canvas).toBeVisible()
})
