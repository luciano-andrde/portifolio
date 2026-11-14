import { expect, test } from '@playwright/test'

test.use({ launchOptions: { channel: 'chrome', args: ['--enable-unsafe-swiftshader'] } })

test('prepara os modelos antes de apresentar o carrossel', async ({ page }) => {
  test.setTimeout(90_000)
  let releaseModel!: () => void
  const modelReleased = new Promise<void>((resolve) => { releaseModel = resolve })
  let requests = 0
  await page.route('**/models/psp-otimizado.glb', async (route) => {
    requests++
    await modelReleased
    await route.continue()
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  try {
    await expect.poll(() => requests, { timeout: 30_000 }).toBe(1)
    await expect(page.locator('.loading-skeleton--carousel')).toBeVisible()
    await expect(page.getByRole('group', { name: 'Escolher cartucho' })).toBeHidden()
  } finally {
    releaseModel()
  }
  await expect(page.getByRole('group', { name: 'Escolher cartucho' })).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Próximo cartucho' }).click()
  await expect(page.getByText('ANDRDE PSP', { exact: true })).toBeVisible()
  await expect(page.locator('.loading-skeleton--psp')).toBeHidden()
  expect(requests).toBe(1)
  await page.getByRole('button', { name: 'ABRIR', exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.getByRole('button', { name: 'Abrir portfólio' })).toBeVisible({ timeout: 30_000 })
})

test('mantém o fluxo do Game Boy após preparar o PSP', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'ABRIR', exact: true }).click({ timeout: 60_000 })
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.locator('.console-menu').getByRole('button', { name: /ABRIR PORTFÓLIO/ })).toBeVisible({ timeout: 30_000 })
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-experience="gameboy"]')).toBeVisible()
})
