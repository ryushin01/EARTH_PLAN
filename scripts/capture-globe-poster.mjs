/**
 * 지구본 정지 이미지 만들기
 *
 * Storybook의 GlobeCanvas › Poster 스토리(처음 상태·카메라, 별 없음, 1200px)를 찍어
 * src/pages/simulator/ui/globe/poster/earth-{1200,800,600}.webp로 저장합니다.
 * 처음 화면이 바뀌면(셰이더, 텍스처, 시작 시각, 카메라, 지점 표시) 다시 만듭니다.
 *
 * 사용: pnpm storybook 을 띄운 뒤 pnpm poster [Storybook 주소 (기본 http://localhost:6006)]
 */
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:6006'
const outDir = new URL(
  '../src/pages/simulator/ui/globe/poster/',
  import.meta.url,
)
const SIZES = [1200, 800, 600]
const QUALITY = 0.82

const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1280 },
    deviceScaleFactor: 1,
  })
  await page.goto(
    `${base}/iframe.html?id=pages-simulator-globecanvas--poster&viewMode=story`,
  )
  await page.waitForSelector('[data-globe-ready="true"]', { timeout: 60_000 })
  // 지구가 보이게 된 뒤 몇 프레임 더 그려지도록 기다림
  await page.waitForTimeout(1000)
  const png = await page.locator('[data-globe-ready] canvas').screenshot()

  // 브라우저의 WebP 인코더로 크기별 이미지를 만듦
  const images = await page.evaluate(
    async ({ data, sizes, quality }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${data}`
      await image.decode()
      return sizes.map((size) => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        context.imageSmoothingQuality = 'high'
        context.drawImage(image, 0, 0, size, size)
        return canvas.toDataURL('image/webp', quality).split(',')[1]
      })
    },
    { data: png.toString('base64'), sizes: SIZES, quality: QUALITY },
  )
  SIZES.forEach((size, i) => {
    const file = new URL(`earth-${size}.webp`, outDir)
    const bytes = Buffer.from(images[i], 'base64')
    writeFileSync(file, bytes)
    console.log(`${file.pathname} (${Math.round(bytes.length / 1024)}KB)`)
  })
} finally {
  await browser.close()
}
