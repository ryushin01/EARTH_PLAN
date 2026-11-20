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

/**
 * 빌드 결과의 sw.js 캐시 이름에 버전을 채웁니다.
 * - 코드(assets/)는 파일 이름에 해시가 있으므로 이름 목록으로
 * - 텍스처(textures/)는 이름이 그대로이므로 내용으로
 * 바뀐 쪽 캐시만 이름이 달라져, 서비스 워커가 그 옛 캐시만 지웁니다.
 */
export function stampServiceWorker(outDir: string): boolean {
  const file = join(outDir, 'sw.js')
  if (!existsSync(file)) return false
  const source = readFileSync(file, 'utf8')
  if (!source.includes('__ASSETS_VERSION__')) return false
  writeFileSync(
    file,
    source
      .replace('__ASSETS_VERSION__', digest(join(outDir, 'assets'), false))
      .replace('__TEXTURES_VERSION__', digest(join(outDir, 'textures'), true)),
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
