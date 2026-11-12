import { useId, useState } from 'react'
import type { PointerEvent } from 'react'
import type { HistoryPoint } from '../../model/world/types'
import { decimalYearToDate, formatSigned } from '@/shared/lib'

const W = 320
const H = 96
const PAD = { top: 10, right: 8, bottom: 18, left: 40 }

interface SeriesChartProps {
  title: string
  unit: string
  points: HistoryPoint[]
  value: (p: HistoryPoint) => number
  format: (v: number) => string
}

const yearLabel = (y: number) => String(decimalYearToDate(y).getUTCFullYear())
const monthLabel = (y: number) => {
  const d = decimalYearToDate(y)
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** 한 계열짜리 작은 선 그래프 (축 하나, 마우스를 올리면 세로선과 값) */
function SeriesChart({ title, unit, points, value, format }: SeriesChartProps) {
  const titleId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map(value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (max - min < 1e-6) {
    min -= 0.5
    max += 0.5
  }
  const x0 = points[0].year
  const x1 = points[points.length - 1].year
  const sx = (y: number) =>
    PAD.left + ((y - x0) / Math.max(1e-9, x1 - x0)) * (W - PAD.left - PAD.right)
  const sy = (v: number) =>
    PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom)
  const path = points
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'}${sx(p.year).toFixed(1)},${sy(values[i]).toFixed(1)}`,
    )
    .join('')

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * W
    let best = 0
    for (let i = 1; i < points.length; i++) {
      if (
        Math.abs(sx(points[i].year) - x) < Math.abs(sx(points[best].year) - x)
      )
        best = i
    }
    setHover(best)
  }

  const h = hover === null ? null : { p: points[hover], v: values[hover] }

  return (
    <figure className="grid gap-1">
      <figcaption id={titleId} className="flex items-baseline justify-between">
        <span className="label-caps">
          {title} ({unit})
        </span>
        <span className="display-num text-sm text-ice">
          {h
            ? `${yearLabel(h.p.year)}년 ${format(h.v)}`
            : format(values[values.length - 1])}
        </span>
      </figcaption>
      {/* 그림은 보조 수단이고, 값은 아래 표로도 제공 */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        aria-hidden="true"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {[min, max].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={sy(v)}
              y2={sy(v)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={sy(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--color-muted)"
            >
              {format(v)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 4} fontSize={9} fill="var(--color-muted)">
          {yearLabel(x0)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 4}
          fontSize={9}
          textAnchor="end"
          fill="var(--color-muted)"
        >
          {yearLabel(x1)}
        </text>
        <path
          d={path}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {h ? (
          <g>
            <line
              x1={sx(h.p.year)}
              x2={sx(h.p.year)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--color-line-strong)"
              strokeWidth={1}
            />
            <circle
              cx={sx(h.p.year)}
              cy={sy(h.v)}
              r={4}
              fill="var(--color-accent)"
              stroke="var(--color-panel-solid)"
              strokeWidth={2}
            />
          </g>
        ) : null}
        {/* 마우스를 잡기 쉬운 투명 영역 */}
        <rect
          x={PAD.left}
          y={0}
          width={W - PAD.left - PAD.right}
          height={H}
          fill="transparent"
        />
      </svg>
    </figure>
  )
}

/** 해수면·기온 추이 (작은 그래프 두 개 + 표) */
export function HistoryChart({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <section aria-labelledby="history-title" className="grid gap-2">
        <h3 id="history-title" className="label-caps">
          추이
        </h3>
        <p className="text-sm text-muted">
          재생하면 해수면·기온 기록이 쌓여 그래프로 나옵니다.
        </p>
      </section>
    )
  }
  const step = Math.max(1, Math.ceil(points.length / 12))
  const rows = points.filter(
    (_, i) => i % step === 0 || i === points.length - 1,
  )
  return (
    <section aria-labelledby="history-title" className="grid gap-3">
      <h3 id="history-title" className="label-caps">
        추이
      </h3>
      <SeriesChart
        title="해수면"
        unit="m"
        points={points}
        value={(p) => p.seaLevel}
        format={(v) => `${formatSigned(v, 2)}`}
      />
      <SeriesChart
        title="평균 기온"
        unit="°C"
        points={points}
        value={(p) => p.warming}
        format={(v) => `${formatSigned(v, 2)}`}
      />
      <details className="text-sm">
        <summary className="label-caps min-h-11 cursor-pointer content-center">
          표로 보기
        </summary>
        <div
          className="max-h-48 overflow-y-auto"
          tabIndex={0}
          role="region"
          aria-label="추이 기록 표"
        >
          <table className="w-full text-left">
            <caption className="sr-only">
              연도별 해수면, 평균 기온, 침수 도시 수
            </caption>
            <thead className="label-caps">
              <tr>
                <th scope="col" className="py-1 font-semibold">
                  연도
                </th>
                <th scope="col" className="py-1 font-semibold">
                  해수면
                </th>
                <th scope="col" className="py-1 font-semibold">
                  기온
                </th>
                <th scope="col" className="py-1 font-semibold">
                  침수 도시
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.year} className="border-t border-line">
                  <th scope="row" className="py-1 font-normal">
                    {monthLabel(p.year)}
                  </th>
                  <td className="display-num">
                    {formatSigned(p.seaLevel, 2)}m
                  </td>
                  <td className="display-num">
                    {formatSigned(p.warming, 2)}°C
                  </td>
                  <td className="display-num">{p.floodedCities}곳</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
