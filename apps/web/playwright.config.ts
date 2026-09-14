import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3101',
    trace: 'off'
  },
  webServer: {
    command: 'npx next dev -p 3101',
    url: 'http://localhost:3101',
    reuseExistingServer: false,
    timeout: 60000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: '/opt/pw-browsers/chromium' } }
    }
  ]
})
