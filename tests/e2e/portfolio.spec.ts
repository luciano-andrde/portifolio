import { expect, test } from '@playwright/test'

test('apresenta apenas o nome e permite alternar os dois temas no desktop', async ({ page }, testInfo) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await expect(page).toHaveTitle(/Luciano Andrade/)
  await expect(page.getByRole('heading', { name: /Luciano Andrade/ })).toBeVisible()
  await expect(page.getByRole('heading')).toHaveCount(1)
  await expect(page.locator('main')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440)
  expect(pageErrors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true })
})

test('apresenta apenas o nome e mantém o toggle utilizável no mobile', async ({ page }, testInfo) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /Luciano Andrade/ })).toBeVisible()
  await expect(page.getByRole('heading')).toHaveCount(1)
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  expect(pageErrors).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true })
})
