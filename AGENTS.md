# AGENTS.md — TerraNova

AI 코딩 에이전트(Codex, Claude Code 등)가 이 저장소에서 일할 때 지킬 규칙입니다. 자세한 내용은 `docs/`와 `README.md`에 있습니다.

## 1. 프로젝트 개요

- 3D 지구 위에서 해수면 상승·화산·쓰나미·지진·소행성·태양 폭풍·산불·가뭄을 일으키고 거대 구조물로 막아 보는 웹 시뮬레이터입니다. 2026-11-20 EARTH_PLAN에서 이름을 바꿨습니다(1.0.1).
- 화면 축 1개: 시뮬레이터(웹). 로그인 없음.
- 운영: https://ryushin01.github.io/TerraNova/ · Storybook https://ryushin01.github.io/TerraNova/storybook/

## 2. 기술 스택과 구조

- TanStack Start(정적 사전 렌더링) + TanStack Router, React 19, three.js·React Three Fiber 9·drei, 직접 작성한 GLSL, zustand, Tailwind CSS 4, Storybook 10.
- TypeScript는 두 판: 타입 검사는 TypeScript 7(`@typescript/native`의 `bin/tsc`), `typescript` 패키지는 6으로 둡니다(ESLint·Storybook·편집기용, typescript-eslint가 `<6.1`만 지원).
- **FSD 2.1, pages-first.** 층 순서(위→아래): `app` → `pages` → `shared`. 시뮬레이터에서만 쓰는 코드는 모두 `src/pages/simulator` 슬라이스(`api`·`lib`·`model`·`ui`)에, 404는 `pages/not-found`, 여러 곳에서 쓰는 UI·유틸만 `shared`에 둡니다. `src/routes/`는 페이지를 연결만 합니다. `pnpm lint:fsd`(Steiger)로 검사하며 `src/routes`, `src/router.tsx`, 생성 파일은 뺍니다.
- 성능 규칙: 패널은 `useWorld` 대신 `useWorldSampled`로 읽습니다. 3D 장면은 `useWorld.getState()`로 매 프레임 읽습니다. 크기가 매 프레임 바뀌는 도형은 `args`로 넘기지 않고 `scale`·정점 수정으로 바꿉니다. 마운트 뒤 바꾸는 셰이더 값은 `ref.current.uniforms`에 씁니다.
- 고도 패치는 지구 셰이더 텍스처 16개 한도를 넘으면 안 됩니다(`detailPatches.test.ts`).
- 자세한 내용: `docs/development.md`(구조, 모델, 셰이더, 캐시, 언어, 글꼴, 테스트, 접근성), `docs/deployment.md`, `docs/data-sources.md`, `docs/performance.md`.

## 3. 설치·개발 명령

- Node.js 26(`.nvmrc`, `engines`), pnpm 12(`packageManager`).

```bash
nvm use
corepack enable pnpm
pnpm install
pnpm dev   # http://localhost:3000
```

- 환경 변수(이름만): `BASE_PATH`(하위 경로 빌드, 예: `/TerraNova/`), `BASE_URL`(`pnpm screenshots` 대상).
- 자료·도구 명령: `pnpm fonts`(화면 글자를 바꾼 뒤 한글 글꼴 다시 만들기, 원본을 바꾸면 `--all`), `pnpm poster`(지구본 정지 이미지, Storybook을 띄운 뒤), `pnpm screenshots`(README 화면), `pnpm data:elevation`, `pnpm data:detail`.

## 4. 검사·테스트 명령

| 명령                                | 내용                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| `pnpm lint` / `pnpm lint:fsd`       | ESLint / Steiger(FSD)                                              |
| `pnpm format:check` / `pnpm format` | Prettier 검사 / 정리(Markdown 포함)                                |
| `pnpm typecheck`                    | TypeScript 7 타입 검사                                             |
| `pnpm test`                         | 단위·컴포넌트(jsdom, 3D 장면 그래프 포함)                          |
| `pnpm test:storybook`               | 모든 스토리를 Chromium에서 렌더링 + `play` + axe(위반 시 실패)     |
| `pnpm build` / `pnpm build:all`     | 사이트 빌드(`dist/client`) / 사이트 + Storybook                    |
| `pnpm test:e2e`                     | 프로덕션 빌드 E2E(넘침·axe·키보드·흐름·오프라인·404), 먼저 빌드    |
| `pnpm lighthouse`                   | 접근성 ≥ 95, 권장사항·SEO ≥ 90, CLS ≤ 0.1은 실패, 성능·용량은 경고 |

- CI(`.github/workflows/ci.yml`, PR·main 푸시) 순서: `lint` → `lint:fsd` → `format:check` → `typecheck` → `test` → Chromium 설치 → `test:storybook` → `build:all` → `test:e2e` → `lighthouse`.
- 스토리 테스트와 E2E는 SwiftShader(소프트웨어 WebGL)로 돕니다. 처음 한 번 `pnpm exec playwright install chromium`.
- 커밋 훅(husky 등)은 없으므로 PR 전에 위 검사를 직접 돌립니다.

## 5. 코드 스타일

- Prettier: 세미콜론 없음, 작은따옴표, 끝 쉼표 `all`. Markdown도 Prettier 검사 대상입니다(표 정렬 포함).
- 화면 문구는 `pages/simulator/ui/messages.ts`에 `[한국어, 영어]` 쌍으로 적고 `useT()`로 씁니다. 사건 기록은 `{ ko, en }`을 함께 만듭니다(`model/text.ts`의 `compose`).
- 화면 글자를 바꾸면 `pnpm fonts`를 다시 돌립니다(빠지면 `fonts.test.ts` 실패).
- 버그를 고치면 고치기 전에 실패하는 테스트를 함께 넣습니다.
- 접근성(KWCAG 2.2): 네이티브 요소 우선, 텍스트 대비 4.5:1 이상, 3D 지구도 키보드(화살표·`+`/`-`)와 같은 기능의 버튼·"지점으로 이동" 목록으로 쓸 수 있게, 초점 표시 유지(`outline: none` 단독 금지), 조작 크기 24px 이상, 입력 레이블과 오류 연결, 결과·사건 알림은 `role="status"`(3초 안의 사건은 한 번에 묶어 읽음), 탭은 APG 패턴, 슬라이더는 `aria-valuetext`, 상태는 색과 글자를 함께, 동작 줄이기면 자동 회전 끔.

## 6. Git·PR

- `main`에 직접 커밋·푸시하지 않습니다. 최신 `main`에서 `feat/…`, `fix/…`, `docs/…`, `chore/…` 브랜치를 만들고 PR을 올립니다.
- 커밋·PR 제목: `<type>: 한국어 요약 (x.y.z)` 예) `feat: 오늘의 지구 — 실제 지진·지자기 Kp, 오프라인에서도 마지막 자료 (1.5.0)`. 본문 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, PR 본문 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- 버전: 기능 PR은 `CHANGELOG.md`에 `## x.y.z - YYYY-MM-DD` 절을 더하고 README 버전 배지를 맞춥니다. 문서만 바뀐 PR은 보통 버전을 올리지 않습니다.
- 병합은 squash(제목 끝 `(#번호)`). **CI가 통과하면 바로 병합**하고 CodeRabbit 리뷰는 기다리지 않습니다(이미 달린 맞는 지적은 반영). Dependabot PR도 CI 통과 뒤 병합합니다.
- 공개 저장소라 Actions가 돕니다. Actions가 막히면 CI와 같은 검사를 로컬에서 돌려 대신합니다.

## 7. 배포·릴리스

- GitHub Pages(`.github/workflows/pages.yml`). **main 푸시마다 배포**하고(문서만 바뀌어도 배포), 매일 한국 시각 오전 6시에 오늘의 지구 자료(USGS·NOAA)를 받아 다시 배포합니다. Actions에서 **Run workflow**로 수동 배포.
- 빌드는 `BASE_PATH=/<저장소 이름>/ pnpm build:all`(저장소 이름에서 계산). 공개 자료만 쓰며 데모 모드·비밀값은 없습니다.
- 배포 뒤 사이트·Storybook 주소가 200인지 확인합니다.
- 릴리스: 병합 뒤 태그 `vX.Y.Z`, 제목 `vX.Y.Z — 요약`, 대상은 병합 커밋 전체 SHA, 본문은 CHANGELOG의 해당 절. 그 뒤 백업 `bash ~/Documents/Archive/Backup/backup.sh`.
- 보관함 계획 문서(`~/Documents/Obsidian Vault/`): `TerraNova v1.0.0 고도화 계획.md`, `TerraNova 1.5 오프라인·오늘의 지구·인구 이동·README.md` 등 `TerraNova *.md`(옛 이름 `EARTH_PLAN v1.0.0 고도화 계획.md`). 진행 기록을 날짜와 함께 남깁니다.
- 소개가 크게 바뀌면 프로필 저장소 `ryushin01/ryushin01` README 프로젝트 표(내용·기술·실행 칸)를 고칩니다. 버전 숫자는 Actions가 자동으로 고칩니다.

## 8. 보안·주의사항

- 비밀값·`.env`를 커밋하지 않습니다. 유료 API 키를 쓰지 않습니다.
- 방문자 브라우저는 외부 API를 부르지 않습니다. 오늘의 지구 자료는 배포할 때 받아 `public/data/today.json`에 넣습니다(받지 못하면 마지막 자료로 배포). E2E가 외부 요청 없음을 확인합니다.
- 서비스 워커 캐시 버전과 미리 받을 목록은 빌드가 채웁니다(`scripts/vite-sw-version.ts`). 손으로 버전을 올리지 않습니다.
- 저장 키는 `terranova:*`입니다. 옛 키(`earth-plan:*`)를 옮기는 코드(`readMigrated`)를 지우지 않습니다.
- 공유 링크(`?s=`)는 불러올 때 모든 값을 범위·종류까지 검사하고, 잘못되면 무시합니다.
- 자료·글꼴·아이콘을 새로 넣으면 README 출처 표와 `docs/data-sources.md`에 저작자·라이선스·원본을 적습니다(ETOPO1은 NOAA 인용 문헌 유지, Orbit 아이콘은 CC BY 3.0 표기). 도시 고도·인구·피해 규모는 대략값이므로 교육·탐색용이라고 밝힙니다.

## 9. 공통 규칙

공통 규칙은 `~/Documents/GitHub/CLAUDE.md`에 있습니다(이 파일과 충돌하면 이 파일이 우선). 핵심:

- 답변·커밋·PR·문서·코드 주석은 한국어로 씁니다.
- 묻지 않고 끝까지 진행하고 결과를 한 번에 보고합니다. 비용이 드는 일, 새 비밀값, 디자인 결정, 되돌릴 수 없는 공개 행동은 하지 않고 보고합니다.
- 사용자의 진행 중인 작업(커밋하지 않은 변경, 원격에 없는 브랜치)을 건드리지 말고 `git worktree add /tmp/<이름> -b <브랜치> origin/main`에서 작업한 뒤 worktree를 지웁니다.
- 다른 세션에 공지할 때는 Paseo ryushin01 그룹 세션에만 보냅니다.
