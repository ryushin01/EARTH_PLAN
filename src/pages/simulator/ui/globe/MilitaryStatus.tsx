import { SATELLITES } from '../../model/military/satellites'
import { useMilitary } from '../../model/military/store'
import { FLEETS, FLIGHTS } from '../../model/military/units'
import { useT } from '../i18n'

const MILITARY_SATS = SATELLITES.filter((s) => s.use === 'military').length

/** 지구에 보이는 위성·편대·함대 요약 */
export function MilitaryStatus() {
  const { t } = useT()
  const layers = useMilitary((s) => s.layers)
  const sats =
    (layers.militarySat ? MILITARY_SATS : 0) +
    (layers.civilSat ? SATELLITES.length - MILITARY_SATS : 0)
  const flights = layers.flights ? FLIGHTS.length : 0
  const fleets = layers.fleets ? FLEETS.length : 0
  return (
    <p className="rounded-xs border border-line bg-panel px-3 py-1.5 text-xs text-ice">
      <span className="label-caps mr-2 text-muted">
        {t('mil.statusHeading')}
      </span>
      {t('mil.summary', {
        sats,
        flights,
        planes: layers.flights
          ? FLIGHTS.reduce((n, f) => n + f.aircraft.length, 0)
          : 0,
        fleets,
        ships: layers.fleets
          ? FLEETS.reduce((n, f) => n + f.ships.length, 0)
          : 0,
      })}
    </p>
  )
}
