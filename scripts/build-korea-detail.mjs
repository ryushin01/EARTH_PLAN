import fs from 'node:fs'
import { NetCDFReader } from 'netcdfjs'
import { PNG } from 'pngjs'
// 사용법: node scripts/build-korea-detail.mjs <etopo-한반도.nc> <출력.png>
// 한반도(북위 33~43°, 동경 124~131°) ETOPO1 1분 격자를 그대로 한 칸 = 한 픽셀로 옮깁니다.
// 픽셀 값: 고도 −50~205m를 1m 단위로 (값 − 50). 전 세계 고도 텍스처의 R 채널과 같은 척도입니다.
// 첫 줄이 북쪽(43°), 첫 칸이 서쪽(124°)입니다. 웹용으로는 무손실 WebP로 바꿉니다:
//   cwebp -lossless -exact -z 9 <png> -o public/textures/korea-elevation.webp
const [nc, out] = process.argv.slice(2)
const r = new NetCDFReader(fs.readFileSync(nc))
const lat = r.getDataVariable('latitude')
const lon = r.getDataVariable('longitude')
const alt = r.getDataVariable('altitude')
const H = lat.length
const W = lon.length
console.log('grid', W, H, 'lat', lat[0], lat[H - 1], 'lon', lon[0], lon[W - 1])
const northFirst = lat[0] > lat[H - 1]
const png = new PNG({ width: W, height: H, colorType: 0 })
let land = 0
for (let y = 0; y < H; y++) {
  // PNG 첫 줄이 북쪽이 되도록
  const row = northFirst ? y : H - 1 - y
  for (let x = 0; x < W; x++) {
    const h = alt[row * W + x]
    if (h > 0) land++
    const v = Math.round(Math.min(205, Math.max(-50, h)) + 50)
    const i = (y * W + x) * 4
    png.data[i] = png.data[i + 1] = png.data[i + 2] = v
    png.data[i + 3] = 255
  }
}
fs.writeFileSync(out, PNG.sync.write(png, { colorType: 0 }))
console.log(`done: 육지 ${((land / (W * H)) * 100).toFixed(1)}%`)
