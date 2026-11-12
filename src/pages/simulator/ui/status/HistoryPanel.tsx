import { useWorld } from '../../model/world/store'
import { HistoryChart } from './HistoryChart'

export function HistoryPanel() {
  const history = useWorld((s) => s.history)
  return <HistoryChart points={history} />
}
