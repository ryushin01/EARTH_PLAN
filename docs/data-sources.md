# 데이터 출처

| 파일 (`public/textures/`)                                                                                                     | 출처                                                                                                                                                    | 사용 허락                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `earth-albedo.webp`, `earth-lights.webp`, `earth-clouds.webp`, 작은 화면용 `earth-albedo-1024.webp`, `earth-lights-1024.webp` | [three.js 예제 텍스처](https://github.com/mrdoob/three.js/tree/r160/examples/textures/planets) (r160)                                                   | MIT (three.js 저장소)                                                  |
| `earth-elevation.webp`, 작은 화면용 `earth-elevation-1024.webp`, `land-elevation-512x256.u8`                                  | NOAA NGDC ETOPO1 얼음 표면판. [NOAA CoastWatch ERDDAP `etopo180`](https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.html)에서 1/6° 간격으로 받음 | 자유롭게 쓰고 다시 배포할 수 있음. 법적 용도가 아니며 정확성 보증 없음 |
| `*-elevation.webp` 고도 패치 11개                                                                                             | 같은 ETOPO1에서 저지대 열한 곳만 원래 해상도인 1분(약 1.8km) 간격으로 받음([고해상도 고도 패치](#고해상도-고도-패치))                                   | 위와 같음                                                              |

ETOPO1을 쓸 때 NOAA가 밝히도록 한 문헌입니다.

> Amante, C. and B. W. Eakins, ETOPO1 1 Arc-Minute Global Relief Model: Procedures, Data Sources and Analysis. NOAA Technical Memorandum NESDIS NGDC-24, 19 pp, March 2009.

색·불빛·구름 텍스처는 원본(JPG·PNG)을 WebP(손실)로 바꿨습니다. 도시 고도·인구(국내 도시 포함), 화산·해구·단층 기록, 해협·빙하·산불·가뭄 지역 정보는 널리 알려진 대략값을 직접 정리한 것입니다.

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

## 고해상도 고도 패치

고도 패치(무손실 WebP, 회색조)는 ETOPO1 1분 격자를 한 칸 = 한 픽셀로 옮긴 것입니다. 픽셀 값은 전 세계 고도 텍스처의 R 채널과 같은 척도(고도 −50~205m, `값 − 50`)이고, 첫 줄이 북쪽, 첫 칸이 서쪽입니다. 격자점이 픽셀 가운데라 덮는 범위는 사방으로 반 칸(1/120°)씩 넓습니다(`src/shared/config`의 `DETAIL_PATCHES`).

| 파일                               | 범위                                               | 크기    | 용량   |
| ---------------------------------- | -------------------------------------------------- | ------- | ------ |
| `korea-elevation.webp`             | 북위 33~43°, 동경 124~131°                         | 421×601 | 60KB   |
| `tokyo-bay-elevation.webp`         | 북위 34.8~36.5°, 동경 139.2~141°                   | 109×103 | 5.0KB  |
| `netherlands-elevation.webp`       | 북위 50.7~53.8°, 동경 2.5~7.5°                     | 301×187 | 20.5KB |
| `bengal-delta-elevation.webp`      | 북위 20.4~25.4°, 동경 87~92.8° (방글라데시·콜카타) | 349×301 | 37.4KB |
| `mekong-delta-elevation.webp`      | 북위 8.2~12°, 동경 104.2~107.4° (호찌민·프놈펜)    | 193×229 | 15.3KB |
| `chao-phraya-elevation.webp`       | 북위 12.9~14.9°, 동경 99.6~101.3° (방콕)           | 103×121 | 4.9KB  |
| `yangtze-delta-elevation.webp`     | 북위 29.8~32.6°, 동경 119.6~122.6° (상하이)        | 181×169 | 11.6KB |
| `pearl-river-delta-elevation.webp` | 북위 21.6~23.6°, 동경 112.4~114.6° (광저우·홍콩)   | 133×121 | 10.8KB |
| `nile-delta-elevation.webp`        | 북위 29.9~31.9°, 동경 29.3~32.7° (알렉산드리아)    | 205×121 | 8.9KB  |
| `jakarta-elevation.webp`           | 남위 6.7~5.8°, 동경 106.3~107.6°                   | 79×55   | 1.8KB  |
| `south-florida-elevation.webp`     | 북위 24.4~27°, 서경 82~79.8° (마이애미)            | 133×157 | 4.7KB  |

지구 셰이더는 각 범위 안에서 침수 판정에 이 고도를 쓰고(가장자리는 전 세계 고도와 부드럽게 섞음), 육지·바다 구분과 색은 전 세계 텍스처를 그대로 씁니다. 해발 0m 아래 육지(네덜란드 간척지 등)는 전 세계 고도처럼 기존 제방이 0.5m까지 지킨다고 봅니다. 섞는 가장자리(패치 크기의 4%)에 낮은 해안이 걸리지 않게 범위를 넉넉히 잡았습니다(젤란트·바덴 제도·돌라르트, 조시·보소 반도 끝). 지구가 보인 뒤에 받아 첫 화면을 늦추지 않습니다.

```bash
# ERDDAP etopo180은 가끔 503을 돌려주므로 실패하면 다시 받습니다
curl -o korea.nc "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?altitude%5B(33.0):1:(43.0)%5D%5B(124.0):1:(131.0)%5D"
curl -o tokyo-bay.nc "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?altitude%5B(34.8):1:(36.5)%5D%5B(139.2):1:(141.0)%5D"
curl -o netherlands.nc "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?altitude%5B(50.7):1:(53.8)%5D%5B(2.5):1:(7.5)%5D"
# 나머지 여덟 곳: 이름 남 북 서 동
while read r s n w e; do
  curl -o $r.nc "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.nc?altitude%5B($s):1:($n)%5D%5B($w):1:($e)%5D"
done <<'EOF'
bengal-delta 20.4 25.4 87.0 92.8
mekong-delta 8.2 12.0 104.2 107.4
chao-phraya 12.9 14.9 99.6 101.3
yangtze-delta 29.8 32.6 119.6 122.6
pearl-river-delta 21.6 23.6 112.4 114.6
nile-delta 29.9 31.9 29.3 32.7
jakarta -6.7 -5.8 106.3 107.6
south-florida 24.4 27.0 -82.0 -79.8
EOF
for r in korea tokyo-bay netherlands bengal-delta mekong-delta chao-phraya yangtze-delta pearl-river-delta nile-delta jakarta south-florida; do
  pnpm data:detail $r.nc $r-elevation.png
  cwebp -lossless -exact -z 9 $r-elevation.png -o public/textures/$r-elevation.webp
done
```

## 오늘의 지구 (USGS·NOAA)

`public/data/today.json`은 사이트를 배포할 때 `node scripts/fetch-today.ts`가 받아 씁니다.

| 자료      | 출처                                                                                                                | 내용                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 지진      | [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) `4.5_week.geojson` | 지난 7일 규모 4.5 이상 지진(시각·규모·깊이·위치·설명·쓰나미 정보). 위치는 0.01°, 깊이는 1km 단위로 줄임 |
| 지자기 Kp | [NOAA SWPC](https://www.swpc.noaa.gov/products/planetary-k-index) `noaa-planetary-k-index.json`                     | 3시간 간격 행성 Kp 지수 최근 7일(56개)                                                                  |

두 자료 모두 미국 정부 공공 자료(퍼블릭 도메인)입니다. Pages 배포 워크플로가 매일 한국 시각 오전 6시(`cron: '0 21 * * *'`)와 main에 합칠 때마다 다시 받습니다. 받지 못하거나 응답이 이상하면(지진 0건, Kp 없음) 저장소에 들어 있는 마지막 자료로 배포합니다. 방문자 브라우저는 외부 API를 부르지 않고 이 파일만 읽으므로, API가 멈추거나 오프라인이어도 마지막 자료가 보입니다(화면에 기준 시각 표시). CI는 받지 않고 저장소의 자료로 테스트합니다. GitHub는 60일 동안 활동이 없는 저장소의 예약 실행을 멈추므로, 그때는 Actions에서 다시 켭니다.

Kp는 오로라 띠가 내려오는 지자기 위도와 밝기로 바꿉니다. G3·G4·G5(Kp 7·8·9)는 태양 폭풍 기능과 같은 값(지자기 위도 50·45·40°, 밝기 0.6·0.75·0.9)이고, 조용할 때(Kp 0~3)는 지자기 위도 63~67°의 옅은 띠입니다.

```bash
node scripts/fetch-today.ts   # public/data/today.json
```

## 인공위성 궤도

궤도 값은 아래 공개 자료에서 확인할 수 있는 궤도 종류·고도·경사각·정지 경도만 씁니다(`src/pages/simulator/model/military/satellites.ts`). 시각 0의 위치(위상)는 설명용이고, 실시간 궤도 요소(TLE)는 쓰지 않습니다.

| 위성                                            | 쓴 값                                           | 출처                                                |
| ----------------------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| 국제우주정거장                                  | 고도 약 420km, 경사각 51.64°                    | NASA                                                |
| 허블 우주 망원경                                | 고도 약 515km, 경사각 28.47°                    | NASA                                                |
| 랜드샛 9호                                      | 태양동기 705km(경사각 98.2°)                    | USGS·NASA                                           |
| 천리안위성 2A호 · 히마와리 9호 · GOES-East      | 정지궤도 128.2°E · 140.7°E · 75.2°W             | 기상청 국가기상위성센터 · JMA · NOAA                |
| 갈릴레오                                        | 고도 23,222km, 경사각 56°                       | EUSPA                                               |
| GPS                                             | 고도 약 20,180km, 경사각 55°, 궤도면 6개        | U.S. Space Force (gps.gov)                          |
| GLONASS                                         | 고도 약 19,100km, 경사각 64.8°                  | Roscosmos (GLONASS-IAC)                             |
| 일반 유형(통신 군집·정찰·조기경보·군 통신·방송) | 궤도 종류별 대표값(몰니야: 600×39,700km, 63.4°) | 궤도 역학 교과서 값. 실제 위성·배치를 나타내지 않음 |

전투기·함선 길이(F-15 19.4m, F-16 15.1m, 니미츠급 333m, 아이오와급 270m, 타이콘데로가급 173m, 알레이 버크급 155m 등)와 속도는 공개된 대표값입니다. 모형은 모두 코드로 만들었고 외부 3D 에셋은 쓰지 않았습니다.

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
