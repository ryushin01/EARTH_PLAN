import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { kmToRadians, latLonToVector3 } from '@/shared/lib'
import type { LatLon } from '@/shared/lib'
import type { PlanetFrame } from '../../model/planet'
import { getSite } from '../../model/site/data'
import { Planet } from './Planet'
import { PlanetStage } from './StoryStage'

const at = (id: string) => latLonToVector3(getSite(id) as LatLon)

/** 시간이 흘러도 바뀌지 않는 셰이더 입력 (기본: 동아시아의 낮) */
const frame = (patch: Partial<PlanetFrame> = {}): PlanetFrame => ({
  sun: latLonToVector3({ lat: 12, lon: 150 }),
  seaLevel: 0,
  seaIceLatN: 75,
  seaIceLatS: -65,
  snowLatN: 60,
  snowLatS: -55,
  snowAltitude: 4500,
  aridity: 0,
  cloudCover: 0.55,
  cloudOffset: 0,
  waves: [],
  ashes: [],
  storms: [],
  plumes: [],
  fires: [],
  droughts: [],
  ...patch,
})

const meta = {
  title: 'pages/simulator/Planet',
  component: Planet,
  decorators: [
    (Story) => (
      <PlanetStage>
        <Story />
      </PlanetStage>
    ),
  ],
  args: { readFrame: () => frame(), showClouds: true },
  // 실제 WebGL에서 셰이더가 오류 없이 컴파일되고 지구가 보이게 되는지 확인
  play: async ({ canvasElement }) => {
    const stage = canvasElement.querySelector('[data-planet-ready]')
    await waitFor(
      () => expect(stage).toHaveAttribute('data-planet-ready', 'true'),
      { timeout: 30_000 },
    )
    await expect(stage).toHaveAttribute('data-shader-errors', '0')
  },
} satisfies Meta<typeof Planet>
export default meta
type Story = StoryObj<typeof meta>

export const Day: Story = {}

/** 밤 쪽에는 도시 불빛이 보임 */
export const Night: Story = {
  args: {
    readFrame: () => frame({ sun: latLonToVector3({ lat: -15, lon: -70 }) }),
  },
}

/** 해수면 +25 m, 더워진 기후 (해빙·눈 줄고 땅이 마름), 구름 끔 */
export const Flooded: Story = {
  args: {
    showClouds: false,
    readFrame: () =>
      frame({
        seaLevel: 25,
        seaIceLatN: 84,
        seaIceLatS: -72,
        snowLatN: 70,
        snowLatS: -63,
        snowAltitude: 5500,
        aridity: 0.5,
      }),
  },
}

/** 쓰나미 파면, 화산재, 태풍, 산불, 가뭄 */
export const Hazards: Story = {
  args: {
    readFrame: () =>
      frame({
        waves: [
          {
            center: at('japan-trench'),
            radius: kmToRadians(900),
            strength: 0.9,
          },
        ],
        ashes: [
          { center: at('sakurajima'), radius: kmToRadians(400), amount: 0.85 },
        ],
        storms: [
          {
            center: latLonToVector3({ lat: 21, lon: 132 }),
            radius: kmToRadians(520),
            strength: 0.95,
            hemisphere: 1,
          },
        ],
        fires: [
          {
            center: at('korea'),
            radius: kmToRadians(160),
            intensity: 0.9,
            scar: 0.6,
          },
        ],
        droughts: [
          { center: at('china-north'), radius: kmToRadians(600), amount: 0.8 },
        ],
      }),
  },
}
