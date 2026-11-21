import { expect, test } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

/**
 * 외부 네트워크가 모두 끊긴 상태(localhost 밖 요청은 모두 중단)에서도 주요 화면이 뜨는지.
 * 서비스 워커는 막아 모든 요청이 아래 route를 거치게 함
 */
test.use({ serviceWorkers: 'block' })

const POSTER = 'img[srcset*="earth-600"]'

async function blockExternal(context: BrowserContext) {
  const blocked: string[] = []
  await context.route('**/*', (route) => {
    const { hostname } = new URL(route.request().url())
    if (hostname === 'localhost' || hostname === '127.0.0.1')
      return route.continue()
    blocked.push(route.request().url())
    return route.abort('internetdisconnected')
  })
  return blocked
}

test.describe('오프라인', () => {
  test('외부 요청을 모두 막아도 지구본·제어판·오늘의 지구·위성·군사가 동작하고 외부 요청이 없다', async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000)
    const blocked = await blockExternal(context)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /TerraNova/,
    )
    await page.mouse.move(200, 200)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator(POSTER)).toHaveCount(0, { timeout: 30_000 })

    await page.getByRole('tab', { name: '해수면' }).click()
    await expect(page.getByRole('tabpanel', { name: '해수면' })).toBeVisible()
    await page.getByRole('tab', { name: '오늘' }).click()
    const today = page.getByRole('tabpanel', { name: '오늘' })
    await expect(today.getByText(/UTC 기준$/)).toBeVisible()
    // 사이트 안 자료를 받았으므로 대체 안내는 없음
    await expect(today.getByText(/^오프라인 자료로 표시 중/)).toHaveCount(0)

    await page.getByRole('tab', { name: '위성·군사' }).click()
    const military = page.getByRole('tabpanel', { name: '위성·군사' })
    await military
      .getByRole('combobox', { name: '위성·편대·함대 고르기' })
      .selectOption('iss')
    await expect(
      military.getByRole('region', { name: '국제우주정거장(ISS)' }),
    ).toBeVisible()

    // 글꼴도 사이트 안 파일
    expect(
      await page.evaluate(() => document.fonts.check('16px Paperlogy', '지구')),
    ).toBe(true)
    expect(blocked).toEqual([])
    expect(errors).toEqual([])
  })

  test('오늘의 지구 자료 파일까지 받지 못하면 넣어 둔 스냅숏으로 보여 주고 상태로 알린다', async ({
    page,
    context,
  }) => {
    await blockExternal(context)
    await page.route('**/data/today.json', (route) =>
      route.abort('internetdisconnected'),
    )
    await page.goto('/')
    await page.getByRole('tab', { name: '오늘' }).click()
    const today = page.getByRole('tabpanel', { name: '오늘' })
    await expect(
      today.getByRole('status').filter({ hasText: '오프라인 자료로 표시 중' }),
    ).toBeVisible()
    await expect(today.getByText(/UTC 기준$/)).toBeVisible()
    await expect(today.getByRole('listitem').first()).toBeVisible()
  })
})
