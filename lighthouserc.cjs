/** Lighthouse CI: 프로덕션 빌드(dist/client)를 모바일 기준으로 측정 */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist/client',
      url: ['http://localhost/'],
      numberOfRuns: 1,
      settings: {
        // GPU가 없는 CI에서도 WebGL이 돌도록 소프트웨어 렌더링
        chromeFlags:
          '--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        // 소프트웨어 WebGL이라 실제 기기보다 낮게 나오므로 경고만
        'categories:performance': ['warn', { minScore: 0.6 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-byte-weight': ['warn', { maxNumericValue: 2_500_000 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './lhci-report' },
  },
}
