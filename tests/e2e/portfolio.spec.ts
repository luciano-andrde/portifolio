import { expect, test } from '@playwright/test'

test('permite escolher uma seção após a intro e guarda a preferência de tema', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('listbox', { name: 'Escolha uma seção' })).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#sobre/)
  await expect(page.getByRole('heading', { name: /Prazer/ })).toBeVisible()
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('main')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: /Prazer/ })).toBeVisible()
})

for (const width of [360, 768, 1280, 1920]) {
  test(`mantém a navegação acessível em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/#projetos')
    await expect(page.getByRole('heading', { name: /Trabalho/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: 'VER DETALHES +' }).first().click()
    await expect(page.getByText('O DESAFIO')).toBeVisible()
  })
}
