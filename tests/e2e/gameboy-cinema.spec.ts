import { expect, test } from '@playwright/test'

test.use({ launchOptions: { channel: 'chrome', args: ['--enable-unsafe-swiftshader'] } })

for (const width of [390, 1100]) {
  test(`completa o boot após o encaixe e entra pelo LCD em ${width}px`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: 850 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/')
    await expect(page.getByRole('group', { name: 'Escolher cartucho' })).toBeVisible({ timeout: 60_000 })
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .73))
    const scroll = await page.evaluate(() => scrollY)
    const open = page.locator('.console-menu').getByRole('button', { name: /ABRIR PORTFÓLIO/ })
    await expect(open).toBeVisible({ timeout: 30_000 })
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(open).toBeHidden()
    await expect(page.getByRole('group', { name: 'Escolher cartucho' })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .73))
    await expect(open).toBeVisible({ timeout: 30_000 })
    await open.click()
    await expect(page.locator('[data-experience="gameboy"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Luciano Andrade Filho/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(errors).toEqual([])
  })
}
