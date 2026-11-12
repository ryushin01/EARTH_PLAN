import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('시뮬레이터 첫 화면', () => {
  test('제목·랜드마크와 3D 지구가 나온다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await expect(page).toHaveTitle(/EARTH PLAN/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Earth.*Plan/i,
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: '지구 상태' }),
    ).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible()
    await expect(
      page.getByRole('status').filter({ hasText: '지구를 불러오는 중' }),
    ).toHaveCount(0, {
      timeout: 20_000,
    })
    expect(errors).toEqual([])
  })

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`${viewport.width}px에서 가로로 넘치지 않는다`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.locator('canvas').waitFor()
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('모든 탭에서 axe 접근성 검사를 통과한다', async ({ page }) => {
    // 탭 6개를 차례로 검사하므로 느린 CI에서도 끝나도록 넉넉히
    test.setTimeout(120_000)
    await page.goto('/')
    await page.locator('canvas').waitFor()
    for (const name of [
      '해수면',
      '화산',
      '쓰나미',
      '소행성',
      '산불·가뭄',
      '구조물',
    ]) {
      await page.getByRole('tab', { name }).click()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map((v) => `${name} ${v.id}: ${v.nodes.length}`),
      ).toEqual([])
    }
  })
})

test.describe('키보드 조작', () => {
  test('본문 바로가기와 탭을 키보드로 쓴다', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: '제어판으로 건너뛰기' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#controls')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('tab', { name: '해수면' })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: '화산' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByRole('tabpanel', { name: '화산' })).toBeVisible()
  })

  test('지구본은 화살표 키로 돌리고 자동 회전이 멈춘다', async ({ page }) => {
    await page.goto('/')
    await page.locator('canvas').waitFor()
    const globe = page.getByRole('group', { name: '지구본 조작 영역' })
    await globe.focus()
    await page.keyboard.press('ArrowRight')
    await expect(
      page.getByRole('button', { name: '자동 회전' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('시뮬레이션 흐름', () => {
  test('해수면을 올리면 도시가 잠기고 방조제로 막는다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('slider', { name: '해수면 (2020년 대비)' }).fill('4')
    await expect(page.getByRole('button', { name: /도쿄.*침수/ })).toBeVisible()
    await page.getByRole('tab', { name: '구조물' }).click()
    await page
      .getByRole('combobox', { name: '설치할 도시' })
      .selectOption('tokyo')
    await page.getByRole('checkbox', { name: /바로 완공/ }).check()
    await page.getByRole('button', { name: /해안 방조제 짓기/ }).click()
    await expect(
      page.getByRole('tabpanel', { name: '구조물' }).getByRole('status'),
    ).toHaveText(/도쿄에 해안 방조제을\(를\) 완공했습니다/)
    await page.getByRole('tab', { name: '해수면' }).click()
    await expect(
      page.getByRole('button', { name: /도쿄.*보호 중/ }),
    ).toBeVisible()
  })

  test('쓰나미 도달 표와 분화 결과를 보여 준다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: '쓰나미' }).click()
    await page.getByRole('button', { name: '일본 해구 지진 일으키기' }).click()
    await expect(page.getByRole('table')).toContainText('센다이')
    await page.getByRole('tab', { name: '화산' }).click()
    await page.getByRole('combobox', { name: '화산' }).selectOption('vesuvius')
    await page.getByRole('button', { name: '베수비오 분화 시키기' }).click()
    await expect(
      page.getByRole('tabpanel', { name: '화산' }).getByRole('status'),
    ).toContainText('베수비오 분화')
    await expect(
      page
        .getByRole('list', { name: '사건 기록' })
        .getByRole('listitem')
        .first(),
    ).toContainText('베수비오 분화')
  })

  test('재생하면 날짜가 흐른다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: '1개월' }).check({ force: true })
    const date = page.getByText(/^\d{4}\.\d{2}\.\d{2}/).first()
    const before = await date.textContent()
    await page.getByRole('button', { name: '재생' }).click()
    await expect(date).not.toHaveText(before ?? '', { timeout: 5000 })
    await page.getByRole('button', { name: '일시정지' }).click()
  })

  test('소행성을 바다에 떨어뜨리면 충돌 쓰나미가 생긴다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: '소행성' }).click()
    await page
      .getByRole('combobox', { name: '충돌 지점' })
      .selectOption('north-atlantic')
    await page.getByRole('button', { name: '북대서양에 충돌시키기' }).click()
    await expect(
      page.getByRole('tabpanel', { name: '소행성' }).getByRole('status'),
    ).toContainText('충돌 쓰나미')
  })

  test('가뭄 중인 지역의 산불이 더 크다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: '산불·가뭄' }).click()
    const panel = page.getByRole('tabpanel', { name: '산불·가뭄' })
    await panel
      .getByRole('combobox', { name: '지역' })
      .selectOption('australia-se')
    await panel
      .getByRole('button', { name: '호주 남동부 가뭄 일으키기' })
      .click()
    await expect(
      panel.getByRole('button', { name: '호주 남동부 가뭄 진행 중' }),
    ).toBeDisabled()
    await panel
      .getByRole('button', { name: '호주 남동부 산불 일으키기' })
      .click()
    await expect(
      panel.getByRole('region', { name: '산불' }).getByRole('status'),
    ).toContainText('가뭄으로 커짐')
  })
})

test.describe('저장·공유', () => {
  test('공유 링크로 열면 같은 시나리오가 나온다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await page.getByRole('slider', { name: '해수면 (2020년 대비)' }).fill('22')
    await page.getByRole('radio', { name: /고배출/ }).check({ force: true })
    await page.getByRole('button', { name: '공유 링크 복사' }).click()
    const link = await page
      .getByRole('textbox', { name: '공유 링크' })
      .inputValue()
    expect(link).toContain('?s=')

    const other = await context.newPage()
    await other.goto(link)
    await expect(other.getByRole('radio', { name: /고배출/ })).toBeChecked()
    await expect(
      other.getByRole('slider', { name: '해수면 (2020년 대비)' }),
    ).toHaveValue('22')
    await expect(
      other
        .getByRole('list', { name: '사건 기록' })
        .getByRole('listitem')
        .first(),
    ).toContainText('공유 링크의 시나리오를 불러왔습니다')
  })

  test('잘못된 공유 링크는 무시하고 기본 화면을 연다', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/?s=broken')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('radio', { name: /중간/ })).toBeChecked()
    expect(errors).toEqual([])
  })
})

test.describe('미션과 추이', () => {
  test('요격망을 지으면 2032년 소행성 미션에 성공하고 추이 기록이 쌓인다', async ({
    page,
  }) => {
    await page.goto('/')
    const aside = page.getByRole('complementary', { name: '지구 상태' })
    await aside.getByRole('button', { name: '2032년 소행성 막기 시작' }).click()
    await page.getByRole('tab', { name: '구조물' }).click()
    await page
      .getByRole('radio', { name: /행성 방위 요격망/ })
      .check({ force: true })
    await page.getByRole('button', { name: /행성 방위 요격망 짓기/ }).click()
    await aside.getByRole('radio', { name: '10년' }).check({ force: true })
    await aside.getByRole('button', { name: '재생' }).click()
    await expect(aside.getByRole('region', { name: '미션' })).toContainText(
      '성공',
      { timeout: 15_000 },
    )
    await expect(aside.getByRole('button', { name: '재생' })).toBeVisible()
    await aside.getByText('표로 보기').click()
    await expect(
      aside.getByRole('table', { name: /해수면, 평균 기온/ }),
    ).toContainText('2031.')
  })
})
