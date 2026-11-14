import { createFileRoute } from '@tanstack/react-router'
import { EARLY_WAKE_SCRIPT, SimulatorPage } from '@/pages/simulator'

export const Route = createFileRoute('/')({
  // 페이지가 준비되기 전의 첫 입력을 기록해 두면 준비되자마자 3D 지구를 불러옴
  head: () => ({ scripts: [{ children: EARLY_WAKE_SCRIPT }] }),
  component: SimulatorPage,
})
