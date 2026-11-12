# 배포

`main`에 올라가면 `.github/workflows/pages.yml`이 GitHub Pages에 배포합니다.

| 주소                                              | 내용       |
| ------------------------------------------------- | ---------- |
| https://ryushin01.github.io/EARTH_PLAN/           | 시뮬레이터 |
| https://ryushin01.github.io/EARTH_PLAN/storybook/ | Storybook  |

## 하위 경로

Pages 주소는 저장소 이름 아래(`/EARTH_PLAN/`)라서, 빌드할 때 `BASE_PATH`로 경로 접두사를 넘깁니다.

```bash
BASE_PATH=/EARTH_PLAN/ pnpm build:all
```

- `vite.config.ts`의 `base`와 TanStack Router의 `basepath`가 이 값을 씁니다. 기본값은 `/`입니다.
- 텍스처·파비콘처럼 `public`에 있는 파일은 `import.meta.env.BASE_URL`을 앞에 붙여 부릅니다(`src/shared/config`).
- 사전 렌더링한 `index.html`을 `404.html`로도 복사해, 없는 주소로 들어와도 앱이 열립니다.
- 공유 링크(`?s=`)는 현재 주소를 바탕으로 만들므로 하위 경로에서도 그대로 동작합니다.

## 직접 실행

Actions 탭에서 **Pages** 워크플로를 고르고 **Run workflow**를 누르면 `main`을 다시 배포합니다.
