import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { precacheList, stampServiceWorker } from './vite-sw-version'

const SW = `const ASSET_CACHE = 'terranova-assets-__ASSETS_VERSION__'
const TEXTURE_CACHE = 'terranova-textures-__TEXTURES_VERSION__'
const STATIC_CACHE = 'terranova-static-__STATIC_VERSION__'
const PRECACHE = __PRECACHE__
`

/** 빌드 결과(dist/client)를 흉내 낸 임시 폴더 */
function fakeBuild(files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'tn-sw-'))
  const all: Record<string, string> = {
    'assets/index-AAAA1111.js': 'main',
    'assets/GlobeCanvas-BBBB2222.js': '3d',
    'assets/index-CCCC3333.css': 'css',
    'assets/paperlogy-rest-HHHH8888.css': 'rest css',
    'assets/paperlogy-400-ui-DDDD4444.woff2': 'ui font',
    'assets/paperlogy-400-12-EEEE5555.woff2': 'rest slice',
    'assets/sora-latin-wght-normal-FFFF6666.woff2': 'latin font',
    'assets/earth-600-GGGG7777.webp': 'poster',
    'textures/earth-albedo.webp': 'albedo',
    'data/today.json': '{}',
    'manifest.webmanifest': '{}',
    'favicon.svg': 'svg',
    'icon-192.png': 'png',
    'og-image.jpg': 'jpg',
    'sitemap.xml': 'xml',
    'storybook/index.html': 'sb',
    'sw.js': SW,
    ...files,
  }
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  return dir
}

describe('서비스 워커 빌드 도구', () => {
  it('설치 때 미리 받을 목록: 코드·CSS·화면 글꼴·첫 화면 이미지, 매니페스트·아이콘·자료', () => {
    expect(precacheList(fakeBuild())).toEqual({
      assets: [
        'assets/GlobeCanvas-BBBB2222.js',
        'assets/earth-600-GGGG7777.webp',
        'assets/index-AAAA1111.js',
        'assets/index-CCCC3333.css',
        'assets/paperlogy-400-ui-DDDD4444.woff2',
        'assets/paperlogy-rest-HHHH8888.css',
        'assets/sora-latin-wght-normal-FFFF6666.woff2',
      ],
      // 입력한 글자에만 쓰는 나머지 글꼴 조각, 기기마다 다른 텍스처, 공유 이미지·사이트맵·Storybook은 뺌
      static: [
        'data/today.json',
        'favicon.svg',
        'icon-192.png',
        'manifest.webmanifest',
      ],
    })
  })

  it('sw.js에 캐시 버전과 미리 받을 목록을 채운다', () => {
    const dir = fakeBuild()
    expect(stampServiceWorker(dir)).toBe(true)
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8')
    expect(sw).not.toMatch(/__[A-Z_]+__/)
    expect(sw).toMatch(/terranova-assets-[0-9a-f]{12}/)
    expect(sw).toMatch(/terranova-static-[0-9a-f]{12}/)
    expect(sw).toContain('"assets/index-AAAA1111.js"')
    expect(sw).toContain('"data/today.json"')
    expect(sw).not.toContain('paperlogy-400-12-')
  })

  it('자료·매니페스트 내용이 바뀌면 static 캐시 이름이 바뀐다', () => {
    const name = (dir: string) => {
      stampServiceWorker(dir)
      return readFileSync(join(dir, 'sw.js'), 'utf8').match(
        /terranova-static-([0-9a-f]{12})/,
      )![1]
    }
    const before = name(fakeBuild())
    expect(name(fakeBuild())).toBe(before)
    expect(name(fakeBuild({ 'data/today.json': '{"kp":3}' }))).not.toBe(before)
  })
})
