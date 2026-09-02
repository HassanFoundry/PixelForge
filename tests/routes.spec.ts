import { expect, test } from '@playwright/test'

const open = (path: string) => `/PixelForge${path}`

const routes = [
  { path: '/', h1: 'Powerful image tools. Completely private.' },
  { path: '/compress', h1: 'Image Compressor' },
  { path: '/resize', h1: 'Image Resizer' },
  { path: '/convert', h1: 'Image Converter' },
  { path: '/crop', h1: 'Image Cropper' },
  { path: '/optimize', h1: 'Image Optimizer' },
  { path: '/metadata-remover', h1: 'Metadata Cleaner' },
  { path: '/social-media', h1: 'Social Media Images' },
  { path: '/favicon-generator', h1: 'Favicon Generator' },
  { path: '/color-extractor', h1: 'Color Extractor' },
  { path: '/image-info', h1: 'Image Information' },
  { path: '/privacy', h1: 'Privacy' },
  { path: '/about', h1: 'About PixelForge' }
]

test('every route renders its heading and unique metadata', async ({ page }) => {
  const titles: string[] = []
  const descriptions: string[] = []
  for (const route of routes) {
    await page.goto(open(route.path))
    await expect(page.locator('h1')).toContainText(route.h1)
    const title = await page.title()
    expect(title.length).toBeGreaterThan(5)
    titles.push(title)
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description, `${route.path} description`).toBeTruthy()
    descriptions.push(description ?? '')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`https://hassanisbacknow.github.io/PixelForge${route.path}`)
  }
  expect(new Set(titles).size).toBe(routes.length)
  expect(new Set(descriptions).size).toBe(routes.length)
})

test('deep links survive a reload', async ({ page }) => {
  await page.goto('favicon-generator')
  await expect(page.locator('h1')).toContainText('Favicon Generator')
  await page.reload()
  await expect(page.locator('h1')).toContainText('Favicon Generator')
})

test('unknown paths get the 404 page', async ({ page }) => {
  await page.goto('definitely-not-here')
  await expect(page.locator('h1')).toContainText('Page not found')
})

test('structured data is present on the homepage', async ({ page }) => {
  await page.goto('./')
  const scripts = await page.locator('script[data-page-jsonld]').count()
  expect(scripts).toBe(1)
  const content = await page.locator('script[data-page-jsonld]').textContent()
  expect(content).toContain('FAQPage')
  expect(content).toContain('WebApplication')
})

test('pages load without console errors', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('pageerror', (error) => problems.push(error.message))
  for (const route of routes) {
    await page.goto(open(route.path))
    await expect(page.locator('h1')).toBeVisible()
  }
  expect(problems).toEqual([])
})

test('the tools menu links to every tool', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Tools' }).click()
  for (const route of routes.slice(1, 11)) {
    await expect(page.locator(`header a[href="/PixelForge${route.path}"]`).first()).toBeVisible()
  }
})

test('navigation to a tool works from the homepage', async ({ page }) => {
  await page.goto('./')
  await page.locator('a[href="/PixelForge/crop"]').first().click()
  await expect(page.locator('h1')).toContainText('Image Cropper')
})
