# 데이터 출처

| 파일 (`public/textures/`)                                  | 출처                                                                                                                                    | 라이선스                |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `earth-albedo.jpg`, `earth-lights.png`, `earth-clouds.png` | [three.js 예제 텍스처](https://github.com/mrdoob/three.js/tree/r160/examples/textures/planets) (r160)                                   | MIT (three.js 저장소)   |
| `earth-elevation.png`, `land-elevation-512x256.i16`        | [NOAA ETOPO1](https://www.ncei.noaa.gov/products/etopo-global-relief-model) (`etopo180`, NOAA CoastWatch ERDDAP에서 1/6° 간격으로 받음) | 미국 정부 저작물 (공개) |

도시 고도·인구, 화산·해구 기록, 해협·빙하 정보는 널리 알려진 대략값을 직접 정리한 것입니다.

## 고도 텍스처 구성

`earth-elevation.png` (2048×1024, 등장방형 도법, 경도 −180°가 왼쪽)

| 채널 | 값                                                                     | 쓰임                  |
| ---- | ---------------------------------------------------------------------- | --------------------- |
| R    | 고도 −50~205m를 1m 단위로 (`값 − 50`)                                  | 해수면 상승 침수 판정 |
| G    | 128 이상은 육지 고도 0~8,800m, 127 이하는 수심 0~11,000m (제곱근 척도) | 만년설 고도           |
| B    | 255 육지, 0 바다 (three.js 반사 텍스처의 바다 마스크)                  | 육지·바다 구분        |

마스크는 육지인데 ETOPO1 고도가 −8m보다 낮은 곳은 호수 바닥(바다로 처리)이나 남극 빙붕(50m로 처리)입니다.

`land-elevation-512x256.i16`은 같은 R 채널 값을 512×256 Int16 격자로 줄인 것입니다(바다 −32768, 205m 초과는 1205). 브라우저에서 위도별 면적 가중치를 곱해 해수면별 침수 면적 곡선을 만듭니다.

## 다시 만들기

```bash
# 1. ETOPO1 받기 (약 4.7MB)
curl -o etopo.nc "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?altitude%5B(-90.0):10:(90.0)%5D%5B(-180.0):10:(180.0)%5D"
# 2. three.js 반사 텍스처(바다 마스크) 받기
curl -o earth_specular_2048.jpg https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_specular_2048.jpg
# 3. 변환
pnpm data:elevation etopo.nc earth_specular_2048.jpg public/textures/earth-elevation.png public/textures/land-elevation-512x256.i16
```
