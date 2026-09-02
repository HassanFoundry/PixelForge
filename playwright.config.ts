import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const chromiumExecutable = join(tmpdir(), 'chromium')
const usesBundledChromium = existsSync(chromiumExecutable)
if (usesBundledChromium) {
  const libs = join(tmpdir(), 'al2023', 'lib')
  process.env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':')
}

export default defineConfig({
  testDir: 'tests',
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4174/PixelForge/',
    trace: 'off',
    launchOptions: usesBundledChromium
      ? {
          executablePath: chromiumExecutable,
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
      : undefined
  },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://localhost:4174/PixelForge/',
    reuseExistingServer: false,
    timeout: 120000
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
})
