import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const binary = join(tmpdir(), 'chromium')
const libs = join(tmpdir(), 'al2023')

if (!existsSync(binary) || !existsSync(libs)) {
  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const { inflate } = await import('@sparticuz/chromium')
    await chromium.executablePath()
    const bundleDir = join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'bin')
    await inflate(join(bundleDir, 'al2023.tar.br'))
    console.log('e2e: using the bundled chromium')
  } catch (error) {
    console.log(`e2e: bundled chromium unavailable (${error instanceof Error ? error.message : 'unknown error'})`)
    console.log('e2e: run "npx playwright install chromium" to use a playwright-managed browser')
    process.exit(1)
  }
} else {
  console.log('e2e: bundled chromium already present')
}
