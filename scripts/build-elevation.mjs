import fs from 'node:fs'
import { NetCDFReader } from 'netcdfjs'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
// 사용법: node scripts/build-elevation.mjs <etopo.nc> <바다 마스크.jpg> <고도.png> <격자.u8> [고도-1024.png]
const [nc, spec, out, outBin, outSmall] = process.argv.slice(2)
const r = new NetCDFReader(fs.readFileSync(nc))
const lat = r.getDataVariable('latitude'),
  lon = r.getDataVariable('longitude')
const alt = r.getDataVariable('altitude')
const H = lat.length,
  W = lon.length
console.log('grid', W, H, lat[0], lat[H - 1], lon[0], lon[W - 1])
const s = jpeg.decode(fs.readFileSync(spec), { useTArray: true })
const OW = 2048,
  OH = 1024
const png = new PNG({ width: OW, height: OH })
// bilinear sample of etopo at (lonDeg, latDeg)
function sample(lo, la) {
  const fx = ((lo - lon[0]) / (lon[W - 1] - lon[0])) * (W - 1)
  const fy = ((la - lat[0]) / (lat[H - 1] - lat[0])) * (H - 1)
  const x0 = Math.floor(fx),
    y0 = Math.floor(fy),
    x1 = Math.min(x0 + 1, W - 1),
    y1 = Math.min(y0 + 1, H - 1)
  const tx = fx - x0,
    ty = fy - y0
  const g = (x, y) => alt[y * W + x]
  return (
    (g(x0, y0) * (1 - tx) + g(x1, y0) * tx) * (1 - ty) +
    (g(x0, y1) * (1 - tx) + g(x1, y1) * tx) * ty
  )
}
// 침수 면적 계산용 512×256 Uint8 격자: 0 바다, 1~254 (값 − 51)m, 255 204m 이상
const SW = 512,
  SH = 256
const stats = new Uint8Array(SW * SH)
for (let y = 0; y < OH; y++)
  for (let x = 0; x < OW; x++) {
    const lo = -180 + ((x + 0.5) / OW) * 360,
      la = 90 - ((y + 0.5) / OH) * 180
    const sx = Math.floor((x / OW) * s.width),
      sy = Math.floor((y / OH) * s.height)
    let water = s.data[(sy * s.width + sx) * 4] > 128
    let h = sample(lo, la)
    if (!water && h < -8) {
      if (la < -60) h = 50
      else water = true
    }
    const i = (y * OW + x) * 4
    png.data[i] = Math.round(Math.min(205, Math.max(-50, h)) + 50)
    png.data[i + 1] =
      h >= 0
        ? 128 + Math.round(Math.sqrt(Math.min(h, 8800) / 8800) * 127)
        : 127 - Math.round(Math.sqrt(Math.min(-h, 11000) / 11000) * 127)
    png.data[i + 2] = water ? 0 : 255
    png.data[i + 3] = 255
  }
for (let y = 0; y < SH; y++)
  for (let x = 0; x < SW; x++) {
    const ox = Math.floor(((x + 0.5) / SW) * OW),
      oy = Math.floor(((y + 0.5) / SH) * OH),
      i = (oy * OW + ox) * 4
    stats[y * SW + x] = png.data[i + 2] ? Math.min(255, png.data[i] + 1) : 0
  }
fs.writeFileSync(out, PNG.sync.write(png))
fs.writeFileSync(outBin, Buffer.from(stats.buffer))
// 작은 화면용 1024×512: 값이 섞이면 침수 계산이 틀어지므로 최근접(한 칸씩 건너)으로 줄임
if (outSmall) {
  const SW2 = OW / 2,
    SH2 = OH / 2
  const small = new PNG({ width: SW2, height: SH2 })
  for (let y = 0; y < SH2; y++)
    for (let x = 0; x < SW2; x++) {
      const i = (y * 2 * OW + x * 2) * 4,
        j = (y * SW2 + x) * 4
      for (let k = 0; k < 4; k++) small.data[j + k] = png.data[i + k]
    }
  fs.writeFileSync(outSmall, PNG.sync.write(small))
}
// 웹용으로는 무손실 WebP로 바꿉니다: cwebp -lossless -exact -z 9 <png> -o <webp>
console.log('done')
