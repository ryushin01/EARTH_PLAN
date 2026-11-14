import type { Meta, StoryObj } from '@storybook/react-vite'
import type { LatLon } from '@/shared/lib'
import { getSite } from '../../model/site/data'
import type { BuiltStructure } from '../../model/structure/types'
import { StructureModels } from './StructureModels'
import { StoryStage } from './StoryStage'
import type { StageOptions } from './StoryStage'

const meta = {
  title: 'pages/simulator/StructureModels',
  component: StructureModels,
  decorators: [
    (Story, { parameters }) => (
      <StoryStage {...(parameters.stage as StageOptions)}>
        <Story />
      </StoryStage>
    ),
  ],
  args: { structures: [], activeIds: [], locate: getSite },
} satisfies Meta<typeof StructureModels>
export default meta
type Story = StoryObj<typeof meta>

/** 그 지점을 비스듬히 내려다보는 근접 보기 (가동 중은 하늘색, 공사 중은 반투명 주황) */
function closeUp(
  kind: BuiltStructure['kind'],
  siteId: string,
  range: number,
  active = true,
): Story {
  const structure: BuiltStructure = {
    id: `${kind}-${siteId}`,
    kind,
    siteId,
    startYear: 2026,
    completeYear: 2032,
  }
  return {
    args: {
      structures: [structure],
      activeIds: active ? [structure.id] : [],
    },
    parameters: {
      stage: {
        focus: getSite(siteId) as LatLon,
        range,
      } satisfies StageOptions,
    },
  }
}

export const SeaWall = closeUp('sea-wall', 'tokyo', 0.13)
export const UnderConstruction = closeUp('sea-wall', 'tokyo', 0.13, false)
export const TsunamiBarrier = closeUp('tsunami-barrier', 'sendai', 0.15)
export const SeismicRetrofit = closeUp('seismic-retrofit', 'osaka', 0.1)
export const MagmaRelief = closeUp('magma-relief', 'fuji', 0.13)
export const FirefightingBase = closeUp('firefighting-base', 'korea', 0.1)
export const Desalination = closeUp('desalination', 'china-north', 0.14)
export const StraitDam = closeUp('strait-dam', 'bohai-yellow', 0.36)
export const GlacierCurtain = closeUp('glacier-curtain', 'thwaites', 0.3)

/** 궤도 구조물: 태양 쪽 우주 차양과 요격 위성망 */
export const Orbit: Story = {
  args: {
    structures: [
      {
        id: 'solar-shade',
        kind: 'solar-shade',
        siteId: 'orbit',
        startYear: 2026,
        completeYear: 2040,
      },
      {
        id: 'planetary-defense',
        kind: 'planetary-defense',
        siteId: 'orbit',
        startYear: 2026,
        completeYear: 2036,
      },
    ],
    activeIds: ['solar-shade', 'planetary-defense'],
  },
  parameters: { stage: { distance: 5.5 } satisfies StageOptions },
}
