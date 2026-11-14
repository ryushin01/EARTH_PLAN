import { expect, test } from '@playwright/test'

// WebGL을 쓸 수 없는 브라우저 (브라우저 실행 옵션은 파일 단위로만 바꿀 수 있음)
test.use({ launchOptions: { args: ['--disable-3d-apis'] } })

test('정지 이미지를 두고 3D를 그릴 수 없는 이유를 알리며, 나머지 화면은 그대로 쓴다', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.getByRole('tab', { name: '화산' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'WebGL을 쓸 수 없어' }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('img[srcset*="earth-600"]')).toBeVisible()
  await expect(page.getByRole('tabpanel', { name: '화산' })).toBeVisible()
  expect(errors).toEqual([])
})
