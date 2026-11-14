import { expect, test } from '@playwright/test'

test.use({ launchOptions: { channel: 'chrome', args: ['--enable-unsafe-swiftshader'] } })

for (const viewport of [{ width: 1100, height: 850 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`inicializa o Andrde PSP e abre o portfólio em ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/')
    await page.getByRole('button', { name: 'Próximo cartucho' }).click({ timeout: 60_000 })
    await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .69))
    const scroll = await page.evaluate(() => scrollY)
    const menu = page.getByRole('region', { name: 'Sistema Andrde PSP' })
    await expect(menu).toBeVisible({ timeout: 30_000 })
    await testInfo.attach('psp-menu', { body: await page.screenshot({ path: testInfo.outputPath('psp-menu.png') }), contentType: 'image/png' })
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await menu.getByRole('button', { name: 'Voltar ao carrossel' }).click()
    await expect(menu).toBeHidden()
    await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .69))
    await expect(menu).toBeVisible({ timeout: 30_000 })
    await menu.getByRole('button', { name: 'Abrir portfólio' }).click()
    await expect(page.locator('[data-experience="psp"]')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    expect(errors).toEqual([])
  })
}

test('abre o PSP por toque com movimento reduzido e retorna ao início', async ({ browser }) => {
  test.setTimeout(90_000)
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Próximo cartucho' }).click({ timeout: 60_000 })
  await page.getByRole('button', { name: 'ABRIR', exact: true }).click()
  const open = page.locator('.preview-touch-controls').getByRole('button', { name: 'ABRIR PORTFÓLIO' })
  await expect(open).toBeVisible({ timeout: 30_000 })
  await open.tap()
  await expect(page.locator('[data-experience="psp"]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.getByRole('link', { name: /voltar ao início/i }).click()
  await expect(page.getByRole('group', { name: 'Escolher cartucho' })).toBeVisible({ timeout: 60_000 })
  await page.close()
})
