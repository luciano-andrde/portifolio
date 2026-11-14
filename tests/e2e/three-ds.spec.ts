import { expect, test } from '@playwright/test'

test.use({ launchOptions: { channel: 'chrome', args: ['--enable-unsafe-swiftshader'] } })

for (const reduced of [false, true]) {
  test(`abre a experiência 3DS no celular${reduced ? ' com movimento reduzido' : ''}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 320, height: 568 })
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const next = page.getByRole('button', { name: 'Próximo cartucho' })
    await next.click({ timeout: 60_000 })
    await next.click()
    await expect(page.getByText('ANDRDE EDS', { exact: true })).toBeVisible()
    if (reduced) await page.getByRole('button', { name: 'ABRIR', exact: true }).click()
    else await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .69))
    const scroll = await page.evaluate(() => scrollY)
    const open = reduced ? page.locator('.preview-3ds-screen footer').getByRole('button', { name: 'Abrir portfólio' }) : page.locator('.preview-3ds-library button')
    await expect(open).toBeVisible({ timeout: 30_000 })
    expect(await page.evaluate(() => scrollY)).toBe(scroll)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    await open.click()
    await expect(page.locator('[data-experience="3ds"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Luciano Andrade Filho/i })).toBeVisible()
    await page.getByRole('link', { name: /voltar ao início/i }).click()
    await expect(page.getByRole('group', { name: 'Escolher cartucho' })).toBeVisible({ timeout: 60_000 })
  })
}

test('abre o portfólio pelo controle de toque', async ({ browser }) => {
  test.setTimeout(90_000)
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Cartucho anterior' }).click({ timeout: 60_000 })
  await page.getByRole('button', { name: 'ABRIR', exact: true }).click()
  const open = page.locator('.preview-touch-controls button')
  await expect(open).toBeVisible({ timeout: 30_000 })
  await open.click()
  await expect(page.locator('[data-experience="3ds"]')).toBeVisible()
  await page.close()
})

test('oferece ação de toque no EDS em paisagem', async ({ browser }) => {
  test.setTimeout(90_000)
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })
  await page.goto('/')
  await page.getByRole('button', { name: 'Cartucho anterior' }).click({ timeout: 60_000 })
  await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .69))
  const open = page.locator('.preview-touch-controls button')
  await expect(open).toBeVisible({ timeout: 30_000 })
  await open.click()
  await expect(page.locator('[data-experience="3ds"]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(844)
  await page.close()
})

test('mostra o encaixe, contorna o console e restaura o carrossel', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1000, height: 850 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Cartucho anterior' }).click({ timeout: 60_000 })
  await expect(page.getByText('ANDRDE EDS', { exact: true })).toBeVisible()
  const background = await page.locator('.preview-stage').evaluate((element) => getComputedStyle(element, '::before').backgroundImage)
  expect(background).toContain('rgb(95, 55, 59)')
  const captures: Buffer[] = []
  for (const progress of [.55, .69, 1]) {
    await page.evaluate((value) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * value), progress)
    if (progress === 1) await expect(page.locator('.preview-3ds-library button')).toBeVisible({ timeout: 30_000 })
    else await page.waitForTimeout(progress === .69 ? 800 : 2200)
    const image = await page.screenshot()
    captures.push(image)
    await testInfo.attach(`3ds-${progress}`, { body: image, contentType: 'image/png' })
  }
  const differences = await page.evaluate(async (images) => {
    const frames = await Promise.all(images.map(async (data) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob())
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0, 64, 64)
      return context.getImageData(0, 0, 64, 64).data
    }))
    return frames.slice(1).map((frame, index) => {
      let sum = 0
      for (let i = 0; i < frame.length; i += 4) for (let channel = 0; channel < 3; channel++) sum += Math.abs(frame[i + channel] - frames[index][i + channel])
      return sum / (64 * 64 * 3)
    })
  }, captures.map((capture) => capture.toString('base64')))
  expect(differences[0]).toBeGreaterThan(2)
  expect(differences[1]).toBeGreaterThan(3)
  await page.evaluate(() => window.scrollTo(0, 0))
  const next = page.getByRole('button', { name: 'Próximo cartucho' })
  await next.click()
  await expect(page.getByText('GAME BOY', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
