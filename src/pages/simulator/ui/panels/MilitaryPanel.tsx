import { useEffect, useId, useState } from 'react'
import { formatNumber } from '@/shared/lib'
import { SelectField, StatusMessage } from '@/shared/ui'
import {
  MILITARY_UNITS,
  findUnit,
  satelliteTime,
} from '../../model/military/catalog'
import type { MilitaryUnit } from '../../model/military/catalog'
import {
  groupDrill,
  machToMs,
  KNOT_MS,
  satelliteNow,
} from '../../model/military/motion'
import {
  EARTH_RADIUS_KM,
  orbitState,
  orbitalPeriod,
  subPoint,
} from '../../model/military/orbit'
import {
  MILITARY_LAYERS,
  militaryClock,
  useMilitary,
} from '../../model/military/store'
import { AIRCRAFT, SHIPS } from '../../model/military/units'
import type { ShipClass } from '../../model/military/units'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'

/** 패널의 지금 값(고도·대형)은 1초마다 다시 읽음 */
function useMilitaryTime() {
  const [t, setT] = useState(() => militaryClock.t)
  useEffect(() => {
    const id = window.setInterval(() => setT(militaryClock.t), 1000)
    return () => window.clearInterval(id)
  }, [])
  return t
}

const km = (v: number) => formatNumber(Math.round(v), 0)

function period(sec: number, t: ReturnType<typeof useT>['t']) {
  const total = Math.round(sec / 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? t('mil.periodValue', { h, m }) : t('mil.periodMinutes', { m })
}

const latLonText = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`

function useFacts(unit: MilitaryUnit, screenSec: number) {
  const { t, pick } = useT()
  const facts: Array<[string, string]> = []
  let status = ''
  if (unit.kind === 'satellite') {
    const sat = unit.satellite
    const { aKm, e } = sat.elements
    const now = satelliteNow(sat, satelliteTime(screenSec))
    const pos = orbitState(sat.elements, satelliteTime(screenSec)).position
    const ground = subPoint(pos, satelliteTime(screenSec))
    facts.push(
      [
        t('mil.kind'),
        `${t(`mil.use.${sat.use}`)} · ${t(`mil.role.${sat.role}`)}`,
      ],
      [t('mil.orbit'), t(`mil.orbit.${sat.orbit}`)],
      [
        t('mil.altitude'),
        e > 0.01
          ? t('mil.altitudeRange', {
              perigee: km(aKm * (1 - e) - EARTH_RADIUS_KM),
              apogee: km(aKm * (1 + e) - EARTH_RADIUS_KM),
            })
          : `${km(aKm - EARTH_RADIUS_KM)} km`,
      ],
      [t('mil.altitudeNow'), `${km(now.altitudeKm)} km`],
      [t('mil.inclination'), `${sat.elements.iDeg.toFixed(1)}°`],
      [t('mil.period'), period(orbitalPeriod(aKm), t)],
      [t('mil.speed'), t('mil.speedKms', { v: now.speedKms.toFixed(2) })],
      [t('mil.subPoint'), latLonText(ground.lat, ground.lon)],
      [t('mil.source'), sat.source ?? t('mil.generic')],
    )
    return { facts, status }
  }
  const drill = groupDrill(unit.group, screenSec)
  const name = (f: string) => t(`mil.formation.${f}` as MessageKey)
  status =
    drill.u > 0
      ? t('mil.changing', { from: name(drill.from), to: name(drill.to) })
      : t('mil.holding', { name: name(drill.from) })
  if (unit.kind === 'flight') {
    const f = unit.flight
    const types = [...new Set(f.aircraft)]
    facts.push(
      [t('mil.area'), pick(f.area)],
      [
        t('mil.aircraft'),
        types
          .map((a) => `${pick(AIRCRAFT[a].name)} (${AIRCRAFT[a].family})`)
          .join(' · '),
      ],
      [
        t('mil.features'),
        types.map((a) => pick(AIRCRAFT[a].features)).join(' / '),
      ],
      [t('mil.count'), t('mil.planes', { n: f.aircraft.length })],
      [t('mil.altitude'), `${f.altitudeKm} km`],
      [
        t('mil.speed'),
        t('mil.cruise', {
          mach: f.mach.toFixed(2),
          kmh: km(machToMs(f.mach, f.altitudeKm) * 3.6),
        }),
      ],
    )
  } else {
    const f = unit.fleet
    const counts = new Map<ShipClass, number>()
    for (const s of f.ships) counts.set(s.ship, (counts.get(s.ship) ?? 0) + 1)
    facts.push(
      [t('mil.area'), pick(f.area)],
      [
        t('mil.composition'),
        [...counts]
          .map(([k, n]) => `${pick(SHIPS[k].name)} ${n} (${SHIPS[k].family})`)
          .join(' · '),
      ],
      [t('mil.count'), t('mil.ships', { n: f.ships.length })],
      [
        t('mil.speed'),
        t('mil.knots', { kn: f.knots, kmh: km(f.knots * KNOT_MS * 3.6) }),
      ],
    )
  }
  facts.push([
    t('mil.formation'),
    drill.u > 0 ? `${name(drill.from)} → ${name(drill.to)}` : name(drill.from),
  ])
  if (drill.u === 0)
    facts.push([
      t('mil.nextChange'),
      t('mil.seconds', { s: Math.ceil(drill.untilNext) }),
    ])
  return { facts, status }
}

function UnitCard({ unit }: { unit: MilitaryUnit }) {
  const { t, pick } = useT()
  const id = useId()
  const screenSec = useMilitaryTime()
  const visible = useMilitary((s) => s.enabled && s.layers[unit.layer])
  const { facts, status } = useFacts(unit, screenSec)
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid gap-2 rounded-xs border border-line p-3"
    >
      <h3
        id={`${id}-title`}
        className="font-display text-base font-semibold text-ice"
      >
        {pick(unit.name)}
      </h3>
      {!visible ? (
        <p className="text-sm text-warn">{t('mil.hiddenLayer')}</p>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="text-ice">{value}</dd>
          </div>
        ))}
      </dl>
      {unit.kind !== 'satellite' ? <StatusMessage message={status} /> : null}
    </section>
  )
}

const GROUP_LABEL = {
  militarySat: 'mil.layer.militarySat',
  civilSat: 'mil.layer.civilSat',
  flights: 'mil.layer.flights',
  fleets: 'mil.layer.fleets',
} as const

/** 인공위성(군사·민간)과 전투기 편대·함대 훈련 */
export function MilitaryPanel() {
  const { t, pick } = useT()
  const id = useId()
  const enabled = useMilitary((s) => s.enabled)
  const layers = useMilitary((s) => s.layers)
  const selectedId = useMilitary((s) => s.selectedId)
  const setEnabled = useMilitary((s) => s.setEnabled)
  const setLayer = useMilitary((s) => s.setLayer)
  const select = useMilitary((s) => s.select)
  const unit = findUnit(selectedId)

  return (
    <div className="grid gap-5">
      <section aria-labelledby={`${id}-heading`} className="grid gap-2">
        <h2
          id={`${id}-heading`}
          className="font-display text-lg font-semibold text-ice"
        >
          {t('mil.heading')}
        </h2>
        <p className="text-sm text-muted">{t('mil.intro')}</p>
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm text-ice">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="size-5 accent-accent"
          />
          {t('mil.showAll')}
        </label>
      </section>

      <fieldset className="grid gap-1" disabled={!enabled}>
        <legend className="label-caps mb-1">{t('mil.layers')}</legend>
        <div className="grid grid-cols-2 gap-x-3">
          {MILITARY_LAYERS.map((layer) => (
            <label
              key={layer}
              className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ice"
            >
              <input
                type="checkbox"
                checked={layers[layer]}
                onChange={(event) => setLayer(layer, event.target.checked)}
                className="size-5 accent-accent"
              />
              {t(GROUP_LABEL[layer])}
            </label>
          ))}
        </div>
      </fieldset>

      <SelectField
        label={t('mil.pick')}
        value={selectedId ?? ''}
        onChange={(value) => select(value || null)}
        description={t('mil.pickHelp')}
        options={[
          { value: '', label: t('mil.pickNone') },
          ...MILITARY_UNITS.map((u) => ({
            value: u.id,
            label: pick(u.name),
            group: t(GROUP_LABEL[u.layer]),
          })),
        ]}
      />

      {unit ? <UnitCard key={unit.id} unit={unit} /> : null}

      <section aria-labelledby={`${id}-scale`} className="grid gap-1">
        <h3 id={`${id}-scale`} className="label-caps">
          {t('mil.scaleHeading')}
        </h3>
        <p className="text-xs leading-relaxed text-muted">{t('mil.scale')}</p>
      </section>
    </div>
  )
}
