import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

/** 폴더 안 파일 목록(하위 폴더 포함, 상대 경로, 정렬) */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => statSync(join(dir, file)).isFile())
    .sort()
}

/** 파일 이름(과 내용)으로 만든 짧은 버전 값 */
function digest(dir: string, withContent: boolean): string {
  const hash = createHash('sha256')
  for (const file of listFiles(dir)) {
    hash.update(file)
    if (withContent) hash.update(readFileSync(join(dir, file)))
  }
  return hash.digest('hex').slice(0, 12)
}

/** 입력한 글자에만 쓰는 Paperlogy 나머지 글꼴 조각 (paperlogy-<굵기>-<번호>-<해시>.woff2, 모두 약 1MB) */
const REST_FONT_SLICE = /^paperlogy-\d{3}-\d+-[^/]+\.woff2$/

/** 오프라인에 필요한 루트 파일 (공유 이미지·사이트맵·404·Storybook은 뺌) */
const STATIC_ROOT = [
  'manifest.webmanifest',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
]

/**
 * 서비스 워커가 설치될 때 미리 받을 파일 (scope 기준 경로).
 * - assets: 코드·CSS·화면 글꼴·첫 화면 이미지 (나머지 글꼴 조각은 뺌)
 * - static: 자료(data/)와 매니페스트·아이콘
 * 텍스처는 기기마다 쓰는 크기가 달라 미리 받지 않고, 지구가 보인 뒤 쓴 것만 캐시에 넣습니다(warmOfflineCache).
 */
export function precacheList(outDir: string): {
  assets: string[]
  static: string[]
} {
  const assets = listFiles(join(outDir, 'assets'))
    .filter((file) => !REST_FONT_SLICE.test(file))
    .map((file) => `assets/${file}`)
  const data = listFiles(join(outDir, 'data')).map((file) => `data/${file}`)
  const root = STATIC_ROOT.filter((file) => existsSync(join(outDir, file)))
  return { assets, static: [...data, ...root].sort() }
}

/** 파일 목록의 이름과 내용으로 만든 짧은 버전 값 */
function digestFiles(outDir: string, files: string[]): string {
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file)
    hash.update(readFileSync(join(outDir, file)))
  }
  return hash.digest('hex').slice(0, 12)
}

/**
 * 빌드 결과의 sw.js에 캐시 이름의 버전과 미리 받을 목록을 채웁니다.
 * - 코드(assets/)는 파일 이름에 해시가 있으므로 이름 목록으로
 * - 텍스처(textures/)는 이름이 그대로이므로 내용으로
 * - 자료·매니페스트·아이콘(static)도 이름이 그대로이므로 내용으로
 * 바뀐 쪽 캐시만 이름이 달라져, 서비스 워커가 그 옛 캐시만 지웁니다.
 */
export function stampServiceWorker(outDir: string): boolean {
  const file = join(outDir, 'sw.js')
  if (!existsSync(file)) return false
  const source = readFileSync(file, 'utf8')
  if (!source.includes('__ASSETS_VERSION__')) return false
  const precache = precacheList(outDir)
  writeFileSync(
    file,
    source
      .replace('__ASSETS_VERSION__', digest(join(outDir, 'assets'), false))
      .replace('__TEXTURES_VERSION__', digest(join(outDir, 'textures'), true))
      .replace('__STATIC_VERSION__', digestFiles(outDir, precache.static))
      .replace('__PRECACHE__', JSON.stringify(precache)),
  )
  return true
}

/** 브라우저용 빌드가 끝나면 서비스 워커에 버전을 넣는 Vite 플러그인 */
export function serviceWorkerVersion(): Plugin {
  return {
    name: 'terranova:sw-version',
    apply: 'build',
    closeBundle: {
      order: 'post',
      handler() {
        if (this.environment.name !== 'client') return
        const { root, build } = this.environment.config
        if (!stampServiceWorker(resolve(root, build.outDir)))
          this.warn('sw.js에 캐시 버전을 넣지 못했습니다')
      },
    },
  }
}
