import { useEffect } from 'react'
import type { RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { latLonToVector3 } from '@/shared/lib'
import type { CameraApi } from '../../model/camera'
import { useT } from '../i18n'
import { GlobeScene } from './GlobeScene'

/** 처음 카메라: 동아시아 상공 (정지 이미지도 같은 시점에서 찍음) */
const CAMERA = {
  position: latLonToVector3({ lat: 25, lon: 128 }, 3.7),
  fov: 40,
  near: 0.05,
  far: 200,
}

export interface GlobeCanvasProps {
  apiRef: RefObject<CameraApi | null>
  autoRotate: boolean
  showClouds: boolean
  showMarkers: boolean
  reducedMotion: boolean
  showStars?: boolean
  /** 텍스처 내려받기 진행률(%). 내려받는 중이 아니면 null */
  onProgress?: (percent: number | null) => void
  /** 지구가 처음 보이게 되면 */
  onReady?: () => void
}

/** three.js를 쓰는 부분 (지구본 화면이 필요할 때 따로 불러옴) */
export function GlobeCanvas({ onProgress, ...scene }: GlobeCanvasProps) {
  const { t } = useT()
  return (
    <>
      <Canvas
        camera={CAMERA}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        fallback={
          <p className="p-6 text-sm text-muted">{t('globe.noWebgl')}</p>
        }
      >
        <GlobeScene {...scene} />
      </Canvas>
      {onProgress ? <ProgressReporter onProgress={onProgress} /> : null}
    </>
  )
}

function ProgressReporter({
  onProgress,
}: {
  onProgress: (percent: number | null) => void
}) {
  const { active, progress } = useProgress()
  useEffect(() => {
    onProgress(active ? Math.round(progress) : null)
  }, [active, progress, onProgress])
  return null
}
