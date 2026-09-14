import { test, expect } from '@playwright/test'

// This build has no Supabase project or OpenAI key configured, so these tests exercise
// the dev-mode login path and verify the app reports real BLOCKED/NOT_CONFIGURED states
// instead of pretending those integrations work.

async function devLogin(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login')
  await expect(page.getByText('hard-disabled in production')).toBeVisible()
  await page.getByPlaceholder('dev@example.com').fill(email)
  await page.getByRole('button', { name: /Continue \(dev mode\)/ }).click()
  await page.waitForURL('**/dashboard')
}

test('dev-mode login reaches the dashboard and shows live (not fabricated) AI/data state', async ({ page }) => {
  await devLogin(page, 'student@example.com')
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
  // No OPENAI_API_KEY is set in this environment, so the dashboard must say so plainly.
  await expect(page.getByText('AI_PROVIDER_NOT_CONFIGURED')).toBeVisible()
})

test('every nav link loads without a client-side error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await devLogin(page, 'nav-tester@example.com')
  for (const label of ['School', 'Study', 'Calendar', 'Opportunities', 'Business', 'Approvals', 'Control Room', 'Settings']) {
    await page.getByRole('link', { name: label }).click()
    await page.waitForLoadState('networkidle')
  }
  expect(errors).toEqual([])
})

test('extracting an assignment without an AI key returns BLOCKED in the UI, and creates no assignment', async ({ page }) => {
  await devLogin(page, 'school-tester@example.com')
  await page.getByRole('link', { name: 'School' }).click()
  await page.getByPlaceholder(/Paste the assignment text/).fill('Physics lab report due Friday, write up the pendulum experiment.')
  await page.getByRole('button', { name: 'Extract & save' }).click()
  await expect(page.getByText('AI_PROVIDER_NOT_CONFIGURED')).toBeVisible()
  await expect(page.getByText('No assignments yet.')).toBeVisible()
})

test('approval queue starts empty and the queue explains that silence is never approval', async ({ page }) => {
  await devLogin(page, 'approvals-tester@example.com')
  await page.getByRole('link', { name: 'Approvals' }).click()
  await expect(page.getByText('Silence is never approval')).toBeVisible()
  await expect(page.getByText('Nothing waiting on you right now.')).toBeVisible()
})

test('a lead can be created and shows up in the CRM list immediately', async ({ page }) => {
  await devLogin(page, 'crm-tester@example.com')
  await page.getByRole('link', { name: 'Business' }).click()
  await page.getByPlaceholder('Contact name').fill('Jane Prospect')
  await page.getByPlaceholder('Company (optional)').fill('Acme')
  await page.getByRole('button', { name: 'Add' }).first().click()
  await expect(page.getByRole('listitem').getByText('Jane Prospect')).toBeVisible()
})

test('drafting outreach without an AI key is BLOCKED, never a fabricated draft', async ({ page }) => {
  await devLogin(page, 'outreach-tester@example.com')
  await page.getByRole('link', { name: 'Business' }).click()
  await page.getByPlaceholder('Contact name').fill('No AI Prospect')
  await page.getByRole('button', { name: 'Add' }).first().click()
  await expect(page.getByRole('listitem').getByText('No AI Prospect')).toBeVisible()

  await page.locator('select').selectOption({ label: 'No AI Prospect' })
  await page.getByPlaceholder(/Goal, e.g/).fill('schedule a call')
  await page.getByRole('button', { name: 'Draft with AI' }).click()
  await expect(page.getByText('AI_PROVIDER_NOT_CONFIGURED')).toBeVisible()
  await expect(page.getByText('No drafts yet.')).toBeVisible()
})

test('settings page shows real NOT_CONNECTED integration status, never a fake "connected"', async ({ page }) => {
  await devLogin(page, 'settings-tester@example.com')
  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByText('google_calendar')).toBeVisible()
  await expect(page.getByText("Google OAuth isn't configured")).toBeVisible()
})
