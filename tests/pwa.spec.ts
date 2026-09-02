import { expect, test } from '@playwright/test'

test('the app is installable and keeps working offline', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)

  const registered = await page.waitForFunction(
    async () => {
      const registration = await navigator.serviceWorker.ready
      return Boolean(registration.active)
    },
    undefined,
    { timeout: 60000 }
  )
  expect(await registered.jsonValue()).toBe(true)

  await context.setOffline(true)
  await page.goto('crop')
  await expect(page.locator('h1')).toContainText('Image Cropper')
  await page.goto('/PixelForge/')
  await expect(page.locator('h1')).toContainText('Powerful image tools')
  await context.setOffline(false)
})
