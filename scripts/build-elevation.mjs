import fs from 'node:fs'
import { NetCDFReader } from 'netcdfjs'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
const [nc, spec, out, outBin] = process.argv.slice(2)
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
// low-res land-elevation grid for CPU stats (512x256, int16, metres; ocean = -32768)
const SW = 512,
  SH = 256
const stats = new Int16Array(SW * SH)
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
    const lo = -180 + ((x + 0.5) / SW) * 360,
      la = 90 - ((y + 0.5) / SH) * 180
    stats[y * SW + x] = png.data[i + 2]
      ? png.data[i] - 50 + (png.data[i] >= 255 ? 1000 : 0)
      : -32768
  }
fs.writeFileSync(out, PNG.sync.write(png))
fs.writeFileSync(outBin, Buffer.from(stats.buffer))
console.log('done')
