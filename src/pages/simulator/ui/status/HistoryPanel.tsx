import { useWorldSampled } from '../../model/world/sampled'
import { HistoryChart } from './HistoryChart'

export function HistoryPanel() {
  const history = useWorldSampled((s) => s.history)
  return <HistoryChart points={history} />
}
