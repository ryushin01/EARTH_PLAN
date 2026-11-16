// README 화면(docs/images/*.jpg)을 다시 찍습니다.
// 먼저 프로덕션 빌드를 띄워 두세요: pnpm build:all && pnpm preview
// 사용: BASE_URL=http://localhost:4173 pnpm screenshots
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = 'docs/images'
// WebGL 지구본이 그려지도록 소프트웨어 렌더러를 켭니다.
const browser = await chromium.launch({
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})

/**
 * 화면을 엽니다. utc를 주면 지구 상태의 시각 슬라이더(UTC 시)를 옮겨 낮·밤을 맞춥니다.
 */
async function open({
  utc,
  viewport = { width: 1440, height: 900 },
  scale = 1,
  locale = 'ko-KR',
} = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    isMobile: scale > 1,
    locale,
  })
  const page = await context.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // 정지 이미지(포스터)가 걷히고 실제 지구본이 그려질 때까지 기다립니다.
  await page.waitForFunction(
    () =>
      document.querySelector('canvas') &&
      ![...document.images].some(
        (image) =>
          image.className.includes('transition-opacity') &&
          !image.className.includes('opacity-0'),
      ),
    null,
    { timeout: 30_000 },
  )
  if (utc !== undefined) {
    await page.locator('input[type="range"][max="23.75"]').fill(String(utc))
    // 슬라이더의 초점 테두리가 찍히지 않게 초점을 뺍니다.
    await page.evaluate(() => document.activeElement?.blur())
  }
  return { page, context }
}

async function shot(page, name, wait = 3500) {
  await page.waitForTimeout(wait)
  await page.screenshot({
    path: `${OUT}/${name}.jpg`,
    type: 'jpeg',
    quality: 82,
  })
  console.log('저장', name)
}

const tab = (page, name) => page.getByRole('tab', { name }).click()
const panel = (page, name) => page.getByRole('tabpanel', { name })

// 첫 화면: 동아시아가 낮
{
  const { page, context } = await open({ utc: 3 })
  await shot(page, 'home')
  // 해수면 25m: 방글라데시·인도 해안·메콩 삼각주
  await page.getByRole('slider', { name: '해수면 (2020년 대비)' }).fill('25')
  await page.getByRole('button', { name: /다카/ }).first().click()
  await shot(page, 'sea-level')
  await context.close()
}

// 쓰나미: 일본 해구
{
  const { page, context } = await open({ utc: 3 })
  await tab(page, '쓰나미')
  await page.getByRole('button', { name: '일본 해구 지진 일으키기' }).click()
  await shot(page, 'tsunami', 6000)
  await context.close()
}

// 밤의 백두산 분화(한국 밤 22시 = 13시 UTC)
{
  const { page, context } = await open({ utc: 13 })
  await tab(page, '화산')
  // README 그림처럼 VEI 7로 분화시킵니다.
  await panel(page, '화산').getByRole('slider').first().fill('7')
  await page.getByRole('button', { name: '백두산 분화 시키기' }).click()
  await shot(page, 'eruption-night', 6000)
  await context.close()
}

// 북대서양 소행성 충돌
{
  const { page, context } = await open({ utc: 15 })
  await tab(page, '소행성')
  await panel(page, '소행성')
    .getByRole('combobox', { name: '충돌 지점' })
    .selectOption('north-atlantic')
  await page.getByRole('button', { name: '북대서양에 충돌시키기' }).click()
  await shot(page, 'asteroid', 6000)
  await context.close()
}

// 밤의 캘리포니아 산불(현지 밤 22시 = 06시 UTC)
{
  const { page, context } = await open({ utc: 6 })
  await tab(page, '산불·가뭄')
  const wildfire = panel(page, '산불·가뭄')
  await wildfire
    .getByRole('combobox', { name: '지역' })
    .selectOption('california')
  // 극심한 가뭄을 먼저 일으킨 뒤 산불을 일으켜, 가뭄이 반영된 확산을 찍습니다.
  await wildfire.getByRole('radio', { name: /극심/ }).check({ force: true })
  await wildfire
    .getByRole('button', { name: '캘리포니아 가뭄 일으키기' })
    .click()
  await wildfire
    .getByRole('button', { name: '캘리포니아 산불 일으키기' })
    .click()
  await shot(page, 'wildfire-night', 6000)
  await context.close()
}

// 지진: 북아나톨리아 단층(이스탄불)
{
  const { page, context } = await open({ utc: 9 })
  await tab(page, '지진')
  await panel(page, '지진')
    .getByRole('combobox')
    .first()
    .selectOption('north-anatolian')
  // 규모 7.6
  await panel(page, '지진').getByRole('slider').first().fill('7.6')
  await page
    .getByRole('button', { name: '북아나톨리아 단층 지진 일으키기' })
    .click()
  await shot(page, 'earthquake', 2500)
  await context.close()
}

// 구조물: 북해 차단 댐
{
  const { page, context } = await open({ utc: 11 })
  await tab(page, '구조물')
  const build = panel(page, '구조물')
  await build.getByText('해협 차단 댐').click()
  await build.getByRole('combobox').first().selectOption('north-sea')
  await build.getByRole('checkbox', { name: /바로 완공/ }).check()
  await build.getByRole('button', { name: /해협 차단 댐 짓기/ }).click()
  await shot(page, 'build')
  await context.close()
}

// 미션: 스웨이츠 빙하 해저 커튼, 몇 해 진행한 뒤
{
  const { page, context } = await open({ utc: 3 })
  await page.getByRole('button', { name: '빙상 붕괴 대응 2150 시작' }).click()
  // 처음 상태로 돌아간다는 확인이 나오면 시작합니다.
  const confirm = page
    .getByRole('dialog')
    .getByRole('button', { name: /^시작/ })
  if (await confirm.count()) await confirm.first().click()
  await page.waitForTimeout(1500)
  // 스웨이츠 빙하에 해저 커튼을 짓습니다.
  await tab(page, '구조물')
  const curtain = panel(page, '구조물')
  await curtain.getByText('빙하 해저 커튼').click()
  await curtain.getByRole('combobox').first().selectOption('thwaites')
  await curtain.getByRole('button', { name: /빙하 해저 커튼 짓기/ }).click()
  await page.getByRole('radio', { name: '1년' }).check({ force: true })
  await page.getByRole('button', { name: '재생' }).click()
  await page.waitForTimeout(12000)
  await page.getByRole('button', { name: '일시정지' }).click()
  await shot(page, 'mission-history')
  await context.close()
}

// 캐링턴급 태양 폭풍: 유럽 밤하늘까지 내려온 오로라(03시 UTC면 유럽은 밤)
{
  const { page, context } = await open({ utc: 3 })
  await page.getByRole('button', { name: '자동 회전' }).click()
  await page
    .getByRole('combobox', { name: '지점으로 이동' })
    .selectOption('london')
  await tab(page, '태양 폭풍')
  await panel(page, '태양 폭풍')
    .getByRole('radio', { name: /캐링턴급/ })
    .check({ force: true })
  await page.getByRole('button', { name: '태양 폭풍 일으키기' }).click()
  await shot(page, 'solar-storm', 6000)
  await context.close()
}

// 한반도 해수면 +12m: 1분 고해상도 고도로 그린 서해안·한강 하구 침수(한국 낮)
{
  const { page, context } = await open({ utc: 3 })
  await page.getByRole('button', { name: '자동 회전' }).click()
  await page.getByRole('slider', { name: '해수면 (2020년 대비)' }).fill('12')
  await page
    .getByRole('combobox', { name: '지점으로 이동' })
    .selectOption('seoul')
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: '확대' }).click()
  // 크게 확대하면 지점 표시가 반도를 가리므로 끔
  await page.getByRole('button', { name: '지점' }).click()
  await shot(page, 'korea', 5000)
  await context.close()
}

// 영어 화면: 캐스케이디아 섭입대 쓰나미(북미 서해안 밤)
{
  const { page, context } = await open({ utc: 7, locale: 'en-US' })
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('tab', { name: 'Tsunami' }).click()
  await page
    .getByRole('tabpanel', { name: 'Tsunami' })
    .getByRole('combobox')
    .first()
    .selectOption('cascadia')
  await page.getByRole('button', { name: /Cascadia/ }).click()
  await shot(page, 'english', 6000)
  await context.close()
}

// 모바일
{
  const { page, context } = await open({
    utc: 3,
    viewport: { width: 390, height: 844 },
    scale: 2,
  })
  await shot(page, 'mobile')
  await context.close()
}

await browser.close()
