# 데이터 출처

| 파일 (`public/textures/`)                                                                                                     | 출처                                                                                                                                                    | 사용 허락                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `earth-albedo.webp`, `earth-lights.webp`, `earth-clouds.webp`, 작은 화면용 `earth-albedo-1024.webp`, `earth-lights-1024.webp` | [three.js 예제 텍스처](https://github.com/mrdoob/three.js/tree/r160/examples/textures/planets) (r160)                                                   | MIT (three.js 저장소)                                                  |
| `earth-elevation.webp`, 작은 화면용 `earth-elevation-1024.webp`, `land-elevation-512x256.u8`                                  | NOAA NGDC ETOPO1 얼음 표면판. [NOAA CoastWatch ERDDAP `etopo180`](https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.html)에서 1/6° 간격으로 받음 | 자유롭게 쓰고 다시 배포할 수 있음. 법적 용도가 아니며 정확성 보증 없음 |

ETOPO1을 쓸 때 NOAA가 밝히도록 한 문헌입니다.

> Amante, C. and B. W. Eakins, ETOPO1 1 Arc-Minute Global Relief Model: Procedures, Data Sources and Analysis. NOAA Technical Memorandum NESDIS NGDC-24, 19 pp, March 2009.

색·불빛·구름 텍스처는 원본(JPG·PNG)을 WebP(손실)로 바꿨습니다. 도시 고도·인구, 화산·해구·단층 기록, 해협·빙하·산불·가뭄 지역 정보는 널리 알려진 대략값을 직접 정리한 것입니다.

## 고도 텍스처 구성

`earth-elevation.webp` (2048×1024, 무손실 WebP, 등장방형 도법, 경도 −180°가 왼쪽)

| 채널 | 값                                                                     | 쓰임                  |
| ---- | ---------------------------------------------------------------------- | --------------------- |
| R    | 고도 −50~205m를 1m 단위로 (`값 − 50`)                                  | 해수면 상승 침수 판정 |
| G    | 128 이상은 육지 고도 0~8,800m, 127 이하는 수심 0~11,000m (제곱근 척도) | 만년설 고도           |
| B    | 255 육지, 0 바다 (three.js 반사 텍스처의 바다 마스크)                  | 육지·바다 구분        |

마스크는 육지인데 ETOPO1 고도가 −8m보다 낮은 곳은 호수 바닥(바다로 처리)이나 남극 빙붕(50m로 처리)입니다.

`earth-elevation-1024.webp`는 같은 텍스처를 한 칸씩 건너 고른 것(최근접)입니다. 값을 섞어 줄이면 침수 판정이 틀어지기 때문입니다.

`land-elevation-512x256.u8`은 같은 R 채널 값을 512×256 Uint8 격자로 줄인 것입니다(0 바다, 1~254는 `값 − 51`m, 255는 204m 이상). 브라우저에서 위도별 면적 가중치를 곱해 해수면별 침수 면적 곡선을 만듭니다.

## 다시 만들기

```bash
# 1. ETOPO1 받기 (약 4.7MB)
curl -o etopo.nc "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?altitude%5B(-90.0):10:(90.0)%5D%5B(-180.0):10:(180.0)%5D"
# 2. three.js 반사 텍스처(바다 마스크) 받기
curl -o earth_specular_2048.jpg https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_specular_2048.jpg
# 3. 변환 (마지막 인자는 작은 화면용 1024 고도 텍스처)
pnpm data:elevation etopo.nc earth_specular_2048.jpg earth-elevation.png public/textures/land-elevation-512x256.u8 earth-elevation-1024.png
# 4. 무손실 WebP로 (픽셀 값이 그대로 남아야 침수 계산이 맞음)
cwebp -lossless -exact -z 9 earth-elevation.png -o public/textures/earth-elevation.webp
cwebp -lossless -exact -z 9 earth-elevation-1024.png -o public/textures/earth-elevation-1024.webp
```

이 절차로 만든 고도 텍스처 두 장과 육지 격자는 저장소의 파일과 픽셀까지 같습니다(2026-11-14 확인).

색·불빛 텍스처는 three.js 원본(`earth_atmos_2048.jpg`, `earth_lights_2048.png`)을 WebP로 바꾸고, 작은 화면용은 1024×512로 줄여 바꿉니다. 손실 압축이라 도구에 따라 바이트는 달라질 수 있습니다.

```bash
cwebp -q 82 earth_atmos_2048.jpg -o public/textures/earth-albedo.webp
cwebp -q 82 -resize 1024 512 earth_atmos_2048.jpg -o public/textures/earth-albedo-1024.webp
cwebp -q 80 earth_lights_2048.png -o public/textures/earth-lights.webp
cwebp -q 80 -resize 1024 512 earth_lights_2048.png -o public/textures/earth-lights-1024.webp
cwebp -q 80 -alpha_q 85 earth_clouds_1024.png -o public/textures/earth-clouds.webp
```
