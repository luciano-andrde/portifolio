import { expect, test } from '@playwright/test'

test.use({ launchOptions: { channel: 'chrome', args: ['--enable-unsafe-swiftshader'] } })

for (const viewport of [{ width: 1100, height: 850 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`inicializa o AndrdeStation 2 e abre o portfólio em ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/')
    await page.getByRole('button', { name: 'Próximo cartucho' }).click({ timeout: 60_000 })
    await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .87))
    const scroll = await page.evaluate(() => scrollY)
    const menu = page.getByRole('region', { name: 'Sistema AndrdeStation 2' })
    await expect(menu).toBeVisible({ timeout: 30_000 })
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await menu.getByRole('button', { name: 'Voltar ao carrossel' }).click()
    await expect(menu).toBeHidden()
    await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .87))
    await expect(menu).toBeVisible({ timeout: 30_000 })
    await menu.getByRole('button', { name: 'ABRIR PORTFÓLIO →' }).click()
    await expect(page.locator('[data-experience="ps2"]')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    expect(errors).toEqual([])
  })
}
