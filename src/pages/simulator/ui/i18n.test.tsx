import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocale } from '@/shared/i18n'
import { useWorld } from '../model/world/store'
import { ControlPanel } from './panels/ControlPanel'
import { MissionHud } from './status/MissionHud'
import { MESSAGES } from './messages'

describe('언어 전환', () => {
  beforeEach(() => {
    useLocale.setState({ locale: 'ko' })
    useWorld.getState().reset()
  })
  afterEach(() => useLocale.setState({ locale: 'ko' }))

  it('모든 문구에 한국어와 영어가 있다', () => {
    for (const [key, [ko, en]] of Object.entries(MESSAGES)) {
      expect(ko, key).toBeTruthy()
      expect(en, key).toBeTruthy()
      // 자리 표시가 두 언어에서 같아야 함
      const slots = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      expect(slots(en), key).toEqual(slots(ko))
    }
  })

  it('영어로 바꾸면 탭과 지난 사건 기록까지 영어로 보인다', async () => {
    render(
      <>
        <ControlPanel />
        <MissionHud />
      </>,
    )
    act(() => {
      useWorld.getState().triggerEruption('vesuvius', 5, 0)
    })
    expect(screen.getByRole('tab', { name: '해수면' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '사건 기록' })).toHaveTextContent(
      '베수비오 분화',
    )
    act(() => useLocale.getState().setLocale('en'))
    expect(screen.getByRole('tab', { name: 'Sea' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Event log' })).toHaveTextContent(
      'Vesuvius erupts at VEI 5',
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Volcano' }))
    expect(screen.getByRole('button', { name: /Erupt / })).toBeInTheDocument()
  })
})
