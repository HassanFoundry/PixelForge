import { expect, test } from '@playwright/test'

test('theme cycles through light, dark and system and persists', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.setItem('pixelforge-theme', 'light'))
  await page.reload()

  const root = page.locator('html')
  const toggle = page.getByRole('button', { name: /^Theme:/ })
  await expect(toggle).toHaveAccessibleName(/Theme: light/)
  await expect(root).not.toHaveClass(/\bdark\b/)

  await toggle.click()
  await expect(root).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(() => localStorage.getItem('pixelforge-theme'))).toBe('dark')

  await page.reload()
  await expect(root).toHaveClass(/\bdark\b/)
  await expect(toggle).toHaveAccessibleName(/Theme: dark/)

  await toggle.click()
  expect(await page.evaluate(() => localStorage.getItem('pixelforge-theme'))).toBe('system')
  await expect(toggle).toHaveAccessibleName(/Theme: system/)

  await toggle.click()
  expect(await page.evaluate(() => localStorage.getItem('pixelforge-theme'))).toBe('light')
})

test('dark mode restyles the interface', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.setItem('pixelforge-theme', 'dark'))
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  const backgroundColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(backgroundColor).not.toBe('rgb(247, 244, 239)')
})
