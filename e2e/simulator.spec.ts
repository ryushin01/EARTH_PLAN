import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** 3D 전에 먼저 보여 주는 지구 정지 이미지 */
const POSTER = 'img[srcset*="earth-600"]'

test.describe('시뮬레이터 첫 화면', () => {
  test('제목·랜드마크와 정지 이미지가 먼저 나오고, 움직이면 3D 지구로 바뀐다', async ({
    page,
  }) => {
    const errors: string[] = []
    const chunks: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('request', (r) => {
      if (r.url().includes('GlobeCanvas')) chunks.push(r.url())
    })
    await page.goto('/')
    await expect(page).toHaveTitle(/TerraNova/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /TerraNova/,
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: '지구 상태' }),
    ).toBeVisible()
    // 처음에는 사전 렌더링된 정지 이미지. 3D 묶음은 한가할 때 미리 받지만 그리지는 않음
    await expect(page.locator(POSTER)).toBeVisible()
    await expect.poll(() => chunks.length).toBeGreaterThan(0)
    await expect(page.locator('canvas')).toHaveCount(0)

    await page.mouse.move(200, 200)
    await expect(page.locator('canvas')).toBeVisible()
    // 지구가 보이면 정지 이미지를 지움
    await expect(page.locator(POSTER)).toHaveCount(0, { timeout: 30_000 })
    await expect(
      page.getByRole('status').filter({ hasText: '지구를 불러오는 중' }),
    ).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('상호작용이 없어도 잠시 뒤에는 3D 지구를 불러온다', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(POSTER)).toBeVisible()
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 })
  })

  test('페이지가 준비되기 전에 움직여도 준비되자마자 3D 지구를 불러온다', async ({
    page,
  }) => {
    // 앱 코드를 늦게 받게 해 준비(하이드레이션) 전에 입력이 들어오게 함
    let released = 0
    await page.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      released = Date.now()
      await route.continue()
    })
    await page.goto('/', { waitUntil: 'commit' })
    await page.locator(POSTER).waitFor()
    await page.mouse.move(200, 200)
    await page.mouse.move(220, 210)
    await page.locator('canvas').waitFor({ timeout: 15_000 })
    // 입력 기록이 없으면 준비된 뒤 5초(IDLE_LOAD_MS)를 기다린 다음에야 그림
    expect(Date.now() - released).toBeLessThan(5_000)
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
    // 탭 8개를 차례로 검사하므로 느린 CI에서도 끝나도록 넉넉히
    test.setTimeout(150_000)
    await page.goto('/')
    await page.locator('canvas').waitFor()
    for (const name of [
      '해수면',
      '화산',
      '쓰나미',
      '지진',
      '소행성',
      '태양 폭풍',
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

test.describe('필요할 때만 그리기', () => {
  test('동작 줄이기로 멈춰 있으면 지구본 그리기를 쉬고, 돌리거나 끌면 다시 그린다', async ({
    page,
  }) => {
    // WebGL 화면을 지우는 횟수 = 그린 프레임 수
    await page.addInitScript(() => {
      const w = window as unknown as { frames: number }
      w.frames = 0
      const proto = WebGL2RenderingContext.prototype
      const clear = proto.clear
      proto.clear = function (mask) {
        w.frames++
        clear.call(this, mask)
      }
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const canvas = page.locator('canvas')
    await canvas.waitFor()
    // 지구가 보이면(셰이더 컴파일·텍스처 완료) 정지 이미지를 지움. 그 전에는 그릴 것이 없어 0번
    await expect(page.locator(POSTER)).toHaveCount(0, { timeout: 30_000 })
    const frames = () =>
      page.evaluate(() => (window as unknown as { frames: number }).frames)
    // 지구가 보이고 카메라·효과가 가라앉을 때까지
    await expect
      .poll(
        async () => {
          const before = await frames()
          await page.waitForTimeout(1500)
          return (await frames()) - before
        },
        { timeout: 30_000 },
      )
      .toBe(0)

    const globe = page.getByRole('group', { name: '지구본 조작 영역' })
    await globe.focus()
    const beforeKey = await frames()
    await page.keyboard.press('ArrowLeft')
    await expect.poll(frames).toBeGreaterThan(beforeKey)

    await expect
      .poll(
        async () => {
          const before = await frames()
          await page.waitForTimeout(1500)
          return (await frames()) - before
        },
        { timeout: 30_000 },
      )
      .toBe(0)
    const box = (await canvas.boundingBox())!
    const beforeDrag = await frames()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, {
      steps: 6,
    })
    await page.mouse.up()
    await expect.poll(frames).toBeGreaterThan(beforeDrag)
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

  test('해수면을 올리면 잠긴 도시의 인구 이동 요약이 나오고, 끄면 감춘다', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('slider', { name: '해수면 (2020년 대비)' }).fill('6')
    const summary = page.getByText(/^인구 이동 · 해수면 이주 약 [\d.,]+백만 명/)
    await expect(summary).toBeVisible()
    await page.getByRole('button', { name: '인구 이동' }).click()
    await expect(summary).toBeHidden()
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

  test('공유 링크로 열면 처음 화면과 상태가 달라 정지 이미지 없이 바로 3D를 불러온다', async ({
    page,
  }) => {
    await page.goto('/?s=x')
    await expect(page.locator('canvas')).toBeVisible()
    await expect(page.locator(POSTER)).toHaveCount(0)
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
    // 충돌 순간에는 1일 속도로 늦춰 보여 줌 → 다시 10년 속도로
    await expect(aside.getByRole('radio', { name: '1일' })).toBeChecked({
      timeout: 15_000,
    })
    await aside.getByRole('radio', { name: '10년' }).check({ force: true })
    await expect(aside.getByRole('region', { name: '미션' })).toContainText(
      '성공',
      { timeout: 15_000 },
    )
    const result = page.getByRole('dialog', { name: /미션 성공/ })
    await expect(result).toBeVisible()
    await expect(result).toContainText('쓴 예산')
    await result.getByRole('button', { name: '닫기' }).click()
    await expect(result).toBeHidden()
    await expect(aside.getByRole('button', { name: '재생' })).toBeVisible()
    await aside.getByText('표로 보기').click()
    await expect(
      aside.getByRole('table', { name: /해수면, 평균 기온/ }),
    ).toContainText('2031.')
  })

  test('태양 폭풍 미션은 폭풍이 오면 1일 속도로 늦추고 운항 영향을 알린다', async ({
    page,
  }) => {
    await page.goto('/')
    const aside = page.getByRole('complementary', { name: '지구 상태' })
    await aside
      .getByRole('button', { name: '2031년 태양 폭풍 견디기 시작' })
      .click()
    await aside.getByRole('radio', { name: '1년' }).check({ force: true })
    await aside.getByRole('button', { name: '재생' }).click()
    await expect(aside.getByRole('radio', { name: '1일' })).toBeChecked({
      timeout: 15_000,
    })
    await expect(
      aside.getByRole('list', { name: '예정된 사건' }).getByRole('listitem'),
    ).toContainText(['일어남', '2030', '2031'])
    const log = page.getByRole('list', { name: '사건 기록' })
    await expect(log).toContainText('1일 속도로 늦춥니다')
    await expect(log).toContainText('운항 영향')
  })
})

test.describe('오늘의 지구', () => {
  test('켜면 실제 지진 요약을 보여 주고, 오늘 탭에서 지진을 골라 지구에서 본다', async ({
    page,
  }) => {
    const external: string[] = []
    page.on('request', (r) => {
      if (!r.url().startsWith(new URL(page.url() || 'http://localhost').origin))
        external.push(r.url())
    })
    await page.goto('/')
    await page.getByRole('button', { name: '오늘의 지구' }).click()
    await expect(
      page.getByText(/^오늘의 지구 · .+ UTC 기준 · 지난 7일 지진 \d+회/),
    ).toBeVisible()
    await page.getByRole('tab', { name: '오늘' }).click()
    const panel = page.getByRole('tabpanel', { name: '오늘' })
    await expect(panel.getByText(/UTC 기준$/)).toBeVisible()
    await expect(panel.getByText(/^Kp \d+\.\d · /)).toBeVisible()
    await expect(panel.getByRole('listitem')).toHaveCount(10)
    await panel.getByRole('checkbox', { name: '지구에 표시' }).uncheck()
    await panel.getByRole('listitem').first().getByRole('button').click()
    await expect(
      panel.getByRole('checkbox', { name: '지구에 표시' }),
    ).toBeChecked()
    // 방문자 브라우저는 외부 API(USGS·NOAA)를 부르지 않음
    expect(external.filter((url) => /usgs|noaa/.test(url))).toEqual([])
  })
})

test.describe('지진과 모바일', () => {
  test('양산 단층 지진이 경주에 피해를 준다', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: '지진' }).click()
    const panel = page.getByRole('tabpanel', { name: '지진' })
    await panel.getByRole('combobox', { name: '단층' }).selectOption('yangsan')
    await panel.getByRole('button', { name: '양산 단층 지진 일으키기' }).click()
    await expect(
      panel.getByRole('region', { name: '최근 지진 피해' }),
    ).toContainText('경주')
  })

  test('모바일에서 지구는 위에 고정되고 아래 내비게이션으로 이동한다', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: '화면 이동' })
    await nav.getByRole('link', { name: '지구 상태' }).click()
    await expect(
      page.getByRole('heading', { name: '지구 상태' }),
    ).toBeInViewport()
    await expect(
      page.getByRole('group', { name: '지구본 조작 영역' }),
    ).toBeInViewport()
    const more = page.getByRole('button', { name: '보기' })
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    await more.click()
    await expect(page.getByRole('button', { name: '구름' })).toBeVisible()
  })
})

test.describe('언어', () => {
  test('영어로 바꾸면 화면·lang이 바뀌고 새로고침해도 유지된다', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(
      page.getByRole('heading', { name: 'Earth Control' }),
    ).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Sea' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Earth Status' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual(
      [],
    )
    await page.getByRole('button', { name: '한국어' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
  })
})

test.describe('설치와 지점 정보', () => {
  test('매니페스트를 연결하고 서비스 워커를 등록한다', async ({ page }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const manifest = await (await page.request.get(href!)).json()
    expect(manifest.short_name).toBe('TerraNova')
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await navigator.serviceWorker.getRegistrations()).length,
        ),
      )
      .toBeGreaterThan(0)
  })

  test('항공·선박을 끄고 켤 수 있고, 넓은 화면에는 운항 요약이 보인다', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const traffic = page.getByRole('button', { name: '항공·선박' })
    await expect(traffic).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('여객기 30편 · 선박 11척')).toBeVisible()
    await traffic.click()
    await expect(traffic).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('여객기 30편 · 선박 11척')).toHaveCount(0)
  })

  test('지점을 고르면 정보 카드가 나온다', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('combobox', { name: '지점으로 이동' })
      .selectOption('istanbul')
    const card = page.getByRole('region', { name: /이스탄불/ })
    await expect(card).toContainText('인구')
    await card.getByRole('button', { name: '선택 해제' }).click()
    await expect(card).toBeHidden()
  })
})

test.describe('태양 폭풍과 한반도', () => {
  test('캐링턴급 태양 폭풍은 고위도 도시 변압기를 태우고, 우주 기상 경보망이 막는다', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: '태양 폭풍' }).click()
    const panel = page.getByRole('tabpanel', { name: '태양 폭풍' })
    await panel.getByRole('radio', { name: /캐링턴급/ }).check({ force: true })
    await panel.getByRole('button', { name: '태양 폭풍 일으키기' }).click()
    const damage = panel.getByRole('region', { name: '최근 태양 폭풍 피해' })
    await expect(damage).toContainText('레이캬비크')
    await expect(damage).toContainText('변압기 손상')
    await expect(panel.getByRole('status')).toContainText('캐링턴급 태양 폭풍')

    await page.getByRole('tab', { name: '구조물' }).click()
    await page
      .getByRole('radio', { name: /우주 기상 경보망/ })
      .check({ force: true })
    await page.getByRole('checkbox', { name: /바로 완공/ }).check()
    await page.getByRole('button', { name: /우주 기상 경보망 짓기/ }).click()
    await page.getByRole('tab', { name: '태양 폭풍' }).click()
    await panel.getByRole('button', { name: '태양 폭풍 일으키기' }).click()
    await expect(damage).toContainText('경보로 막음')
    await expect(damage).not.toContainText('변압기 손상')
  })

  test('서울을 고르면 정보 카드가 나온다', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('combobox', { name: '지점으로 이동' })
      .selectOption('seoul')
    const card = page.getByRole('region', { name: /서울/ })
    await expect(card).toContainText('인구')
    await expect(card).toContainText('23백만 명')
  })
})

test.describe('없는 주소와 배포 파일', () => {
  test('없는 주소는 404 안내와 처음 화면 링크를 보여 준다', async ({
    page,
  }) => {
    const response = await page.goto('/no-such-page')
    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: '페이지를 찾을 수 없습니다',
      }),
    ).toBeVisible()
    await expect(page).toHaveTitle(/페이지를 찾을 수 없습니다/)
    await page.getByRole('link', { name: '처음 화면으로' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /TerraNova/,
    )
  })

  test('GitHub Pages의 404.html(SPA 셸)도 오류 없이 404 안내를 그린다', async ({
    page,
  }) => {
    const shell = await (await page.request.get('/404.html')).text()
    // 셸에는 본문(첫 화면 내용)이 없고, 브라우저에서 라우터가 그림
    expect(shell).not.toContain('<main')
    expect(shell).not.toContain('<h1')
    await page.route('**/missing/page', (route) =>
      route.fulfill({ status: 404, contentType: 'text/html', body: shell }),
    )
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/missing/page')
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: '페이지를 찾을 수 없습니다',
      }),
    ).toBeVisible()
    expect(errors).toEqual([])
  })

  test('한 번 방문하면 오프라인에서도 그대로 열리고 지구본·패널이 동작한다', async ({
    page,
    context,
  }) => {
    test.setTimeout(150_000)
    await page.goto('/')
    // 서비스 워커가 이 페이지를 맡을 때까지
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        timeout: 30_000,
      })
      .toBe(true)
    await page.mouse.move(200, 200)
    await expect(page.locator(POSTER)).toHaveCount(0, { timeout: 30_000 })
    // 지구가 보인 뒤 쓴 텍스처·고도 패치까지 서비스 워커 캐시에 들어갈 때까지
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const names = await caches.keys()
            const name = names.find((n) => n.startsWith('terranova-textures-'))
            if (!name) return 0
            return (await (await caches.open(name)).keys()).length
          }),
        { timeout: 30_000 },
      )
      .toBeGreaterThanOrEqual(16)

    await context.setOffline(true)
    const failed: string[] = []
    page.on('requestfailed', (r) => failed.push(r.url()))
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /TerraNova/,
    )
    await page.mouse.move(220, 220)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator(POSTER)).toHaveCount(0, { timeout: 30_000 })
    await page.getByRole('tab', { name: '화산' }).click()
    await expect(page.getByRole('tabpanel', { name: '화산' })).toBeVisible()
    // 오늘의 지구 자료도 사이트 안의 파일이라 오프라인에서 보임
    await page.getByRole('tab', { name: '오늘' }).click()
    await expect(
      page.getByRole('tabpanel', { name: '오늘' }).getByText(/UTC 기준$/),
    ).toBeVisible()
    // 화면 글꼴도 캐시에서
    expect(
      await page.evaluate(() => document.fonts.check('16px Paperlogy', '지구')),
    ).toBe(true)
    expect(failed).toEqual([])
    expect(errors).toEqual([])
    await context.setOffline(false)
  })

  test('서비스 워커 캐시 이름에 빌드 버전이 들어 있다', async ({ page }) => {
    const sw = await (await page.request.get('/sw.js')).text()
    expect(sw).toMatch(/terranova-assets-[0-9a-f]{12}/)
    expect(sw).toMatch(/terranova-textures-[0-9a-f]{12}/)
    expect(sw).not.toContain('__ASSETS_VERSION__')
  })

  test('새 서비스 워커가 옛 이름(earth-plan)의 캐시를 지운다', async ({
    page,
  }) => {
    // 같은 출처라 옛 주소(/EARTH_PLAN/)에서 만든 캐시가 남아 있을 수 있음
    await page.addInitScript(() => {
      void caches.open('earth-plan-assets-000000000000')
    })
    await page.goto('/')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await expect
      .poll(() => page.evaluate(() => caches.keys()), { timeout: 15_000 })
      .not.toContain('earth-plan-assets-000000000000')
  })

  test('공유 미리보기 메타와 이미지가 있다', async ({ page }) => {
    await page.goto('/')
    const og = (property: string) =>
      page.locator(`meta[property="${property}"]`).getAttribute('content')
    expect(await og('og:image')).toMatch(/\/og-image\.jpg$/)
    expect(await og('og:title')).toContain('TerraNova')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://ryushin01.github.io/TerraNova/',
    )
    const image = await page.request.get('/og-image.jpg')
    expect(image.ok()).toBe(true)
    expect(image.headers()['content-type']).toContain('image/jpeg')
  })
})
