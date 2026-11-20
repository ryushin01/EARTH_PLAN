# 배포

`main`에 올라가면 `.github/workflows/pages.yml`이 GitHub Pages에 배포합니다.

| 주소                                             | 내용       |
| ------------------------------------------------ | ---------- |
| https://ryushin01.github.io/TerraNova/           | 시뮬레이터 |
| https://ryushin01.github.io/TerraNova/storybook/ | Storybook  |

## 하위 경로

Pages 주소는 저장소 이름 아래(`/TerraNova/`)라서, 빌드할 때 `BASE_PATH`로 경로 접두사를 넘깁니다. 배포 워크플로는 이 값을 저장소 이름에서 계산합니다.

```bash
BASE_PATH=/TerraNova/ pnpm build:all
```

- `vite.config.ts`의 `base`와 TanStack Router의 `basepath`가 이 값을 씁니다. 기본값은 `/`입니다.
- 텍스처·파비콘처럼 `public`에 있는 파일은 `import.meta.env.BASE_URL`을 앞에 붙여 부릅니다(`src/shared/config`).
- 없는 주소에는 GitHub Pages가 `404.html`을 내줍니다. 이 파일은 빌드가 TanStack Start의 SPA 셸(본문 없이 문서 틀만 있는 HTML, `vite.config.ts`의 `spa`)로 만들고, 브라우저에서 라우터가 404 안내를 그립니다. 첫 화면(`index.html`)은 지금처럼 내용까지 사전 렌더링합니다.
- 공유 링크(`?s=`)는 현재 주소를 바탕으로 만들므로 하위 경로에서도 그대로 동작합니다.

## 검색·공유

- 문서 머리에 canonical(`https://ryushin01.github.io/TerraNova/`)과 Open Graph·트위터 카드를 넣습니다. 미리보기 이미지는 `public/og-image.jpg`(1200×630, 실제 첫 화면)이고, 주소는 `src/shared/config`의 `SITE_URL`·`OG_IMAGE`에 있습니다. 화면이 크게 바뀌면 이미지를 다시 찍습니다.
- `public/sitemap.xml`은 검색 엔진에 직접 제출합니다. 저장소 이름 하위 경로(프로젝트 페이지)라 `robots.txt`는 도메인 루트에 둘 수 없어 두지 않습니다.

## 캐시

서비스 워커 캐시 이름에는 빌드할 때 버전이 들어가므로([개발 가이드](development.md#설치캐시)), 배포하면 다시 방문한 브라우저가 바뀐 코드·텍스처만 새로 받고 옛 캐시를 지웁니다. 배포 직후 열려 있던 화면은 사라진 코드 조각을 받지 못하면 한 번 새로고침합니다.

## 이름 변경 (1.0.1)

2026-11-20 EARTH_PLAN에서 TerraNova로 이름을 바꿨습니다. GitHub는 옛 저장소 주소(`github.com/ryushin01/EARTH_PLAN`)를 새 저장소로 넘겨 주지만, 옛 사이트 주소(`ryushin01.github.io/EARTH_PLAN/`)는 넘겨 주지 않아 404가 됩니다. 같은 출처(`ryushin01.github.io`)라 브라우저에 남은 값은 이렇게 이어받습니다.

- 저장한 시나리오·화면 언어: 옛 키(`earth-plan:*`)에 값이 있으면 처음 읽을 때 새 키(`terranova:*`)로 옮깁니다(`readMigrated`). 저장 공간이 모자라 옮기지 못하면 옛 값을 지우지 않고 옛 키에 계속 씁니다(같은 출처의 다른 프로젝트와 저장 공간을 함께 씀).
- 서비스 워커 캐시: 새 서비스 워커가 활성화될 때 옛 이름(`earth-plan-*`) 캐시를 지웁니다.

## 직접 실행

Actions 탭에서 **Pages** 워크플로를 고르고 **Run workflow**를 누르면 `main`을 다시 배포합니다.
