import { expect, test } from '@playwright/test'
import { hydrated } from './support/hydrated'

test('home addon text is not clipped with an ellipsis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await hydrated(page)
  const overflows = await page.locator('[data-testid="home-addon-list"] .home-addon__name, [data-testid="home-addon-list"] .home-addon__line').evaluateAll((els) =>
    els.map(el => getComputedStyle(el).textOverflow),
  )
  expect(overflows.length).toBeGreaterThan(0)
  expect(overflows.every(value => value !== 'ellipsis')).toBe(true)
})

test('Guide, Addons, FAQ, Changelog, About and News share the same heading left edge at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const paths = ['/guide', '/addons', '/faq', '/changelog', '/about', '/news']
  const xs: number[] = []
  for (const path of paths) {
    await page.goto(path)
    await hydrated(page)
    const x = await page.locator('h1').first().evaluate(el => Math.round(el.getBoundingClientRect().left))
    xs.push(x)
  }
  const base = xs[0]!
  for (let i = 0; i < paths.length; i++) {
    expect(xs[i], paths[i]).toBeGreaterThan(40)
    expect(Math.abs(xs[i]! - base), `${paths[i]} left ${xs[i]} vs guide ${base}`).toBeLessThanOrEqual(2)
  }
})

const e2eStringCardsRequired = Boolean(process.env.CI) || process.env.NUXT_E2E_SEED === 'true'
const E2E_WOWUP_PACK = 'E2E Test Pack'

test('guide steps keep a sticky-nav scroll-margin', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/guide')
  await hydrated(page)
  const guideMargin = await page.locator('.guide-step').first().evaluate((el) => Number.parseFloat(getComputedStyle(el).scrollMarginTop))
  expect(guideMargin).toBeGreaterThanOrEqual(120)
})

test('string cards keep a sticky-nav scroll-margin', async ({ page }) => {
  test.skip(!e2eStringCardsRequired, 'string cards are only asserted when CI or NUXT_E2E_SEED is set')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/strings?pack=${encodeURIComponent(E2E_WOWUP_PACK)}`)
  await hydrated(page)
  const cards = page.locator('.string-card')
  await expect(cards.first(), 'e2e seed string card should be visible').toBeVisible()
  const cardMargin = await cards.first().evaluate((el) => Number.parseFloat(getComputedStyle(el).scrollMarginTop))
  expect(cardMargin).toBeGreaterThanOrEqual(120)
})

test('news article body stays within a reading measure at 1280', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const res = await page.goto('/news/wow-forever-now-live')
  if (!res || res.status() !== 200) {
    test.skip(true, 'seed article not available in this environment')
  }
  await hydrated(page)
  const body = page.locator('.news-body')
  await expect(body).toBeVisible()
  const metrics = await body.evaluate((el) => {
    const width = el.getBoundingClientRect().width
    const container = el.closest('.mg-container')
    const measure = el.closest('.news-measure')
    const left = el.getBoundingClientRect().left
    const cs = container ? getComputedStyle(container) : null
    const contentLeft = container && cs
      ? container.getBoundingClientRect().left + Number.parseFloat(cs.paddingLeft || '0')
      : left
    return {
      width,
      left,
      contentLeft,
      measureWidth: measure ? measure.getBoundingClientRect().width : width,
    }
  })
  expect(metrics.width, `body width ${metrics.width}px`).toBeLessThanOrEqual(760)
  expect(metrics.measureWidth, `measure ${metrics.measureWidth}px`).toBeLessThanOrEqual(760)
  expect(Math.abs(metrics.left - metrics.contentLeft), 'body left edge should stay on the container').toBeLessThanOrEqual(2)
  const lead = page.locator('.news-lead')
  if (await lead.count()) {
    const leadWidth = await lead.evaluate(el => el.getBoundingClientRect().width)
    expect(leadWidth, `lead width ${leadWidth}px`).toBeLessThanOrEqual(760)
  }
})

test('404 Home and Go back are the same kind of button', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-page-visual-qa')
  expect(res?.status()).toBe(404)
  const home = page.getByRole('button', { name: 'Home' })
  const back = page.getByRole('button', { name: 'Go back' })
  await expect(home).toBeVisible()
  await expect(back).toBeVisible()
  const classes = await Promise.all([home, back].map(btn => btn.getAttribute('class')))
  expect(classes[0]).toBe(classes[1])
  expect(classes[0]).toContain('mg-btn')
})


test('home in-game cards share the same top edge and height at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await hydrated(page)
  const cards = page.locator('[data-testid="home-ingame-cards"] .home-bento__item')
  await expect(cards).toHaveCount(2)
  const boxes = await cards.evaluateAll((els) => els.map((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, height: r.height, right: r.right, left: r.left }
  }))
  expect(Math.abs(boxes[0]!.top - boxes[1]!.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(boxes[0]!.height - boxes[1]!.height)).toBeLessThanOrEqual(1)
  expect(boxes[0]!.right).toBeLessThanOrEqual(boxes[1]!.left + 1)
})

test('wordmark and hero title leave room for descenders', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await hydrated(page)

  const metrics = await page.evaluate(() => {
    function measure(el: HTMLElement, sample: string) {
      const cs = getComputedStyle(el)
      const fontSize = Number.parseFloat(cs.fontSize)
      const lineHeight = cs.lineHeight === 'normal' ? fontSize * 1.2 : Number.parseFloat(cs.lineHeight)
      const pad = (Number.parseFloat(cs.paddingBottom) || 0) + (Number.parseFloat(cs.paddingTop) || 0)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return { ok: false, reason: 'no canvas' }
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const m = ctx.measureText(sample)
      const needed = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0)
      return {
        ok: el.scrollHeight <= el.clientHeight + 1 && (lineHeight + pad) + 0.5 >= needed && lineHeight / fontSize >= 1.15,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        ratio: lineHeight / fontSize,
        pad,
        needed,
        available: lineHeight + pad,
      }
    }
    const word = document.querySelector('.mg-wordmark > span') as HTMLElement | null
    const hero = document.querySelector('.home-hero__name') as HTMLElement | null
    const header = document.querySelector('.mg-header') as HTMLElement | null
    const wordBox = word?.getBoundingClientRect()
    const headerBox = header?.getBoundingClientRect()
    const insideHeader = !!(wordBox && headerBox
      && wordBox.top >= headerBox.top - 0.5
      && wordBox.bottom <= headerBox.bottom + 0.5)
    return {
      word: word ? measure(word, word.textContent || 'Magguu') : null,
      hero: hero ? measure(hero, hero.textContent || 'MagguuUI') : null,
      insideHeader,
    }
  })

  expect(metrics.word, 'header wordmark').toBeTruthy()
  expect(metrics.hero, 'hero title').toBeTruthy()
  expect(metrics.word!.ok, JSON.stringify(metrics.word)).toBe(true)
  expect(metrics.hero!.ok, JSON.stringify(metrics.hero)).toBe(true)
  expect(metrics.insideHeader, 'wordmark must sit fully inside the header box').toBe(true)
})
