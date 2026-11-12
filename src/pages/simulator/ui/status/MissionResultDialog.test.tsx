import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MISSION_BY_ID } from '../../model/world/missions'
import { useWorld } from '../../model/world/store'
import { MissionResultDialog } from './MissionResultDialog'

describe('MissionResultDialog', () => {
  beforeEach(() => {
    // jsdom 버전에 따라 showModal·close가 없을 수 있어 최소 동작으로 덮어씀
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
    useWorld.getState().reset()
  })

  it('미션이 끝나는 순간 결과를 열고, 닫을 수 있다', async () => {
    useWorld.getState().startMission('asteroid-2032')
    render(<MissionResultDialog mission={MISSION_BY_ID['asteroid-2032']} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    act(() => {
      useWorld.setState({
        mission: { id: 'asteroid-2032', status: 'failed', firedIds: [] },
      })
    })
    const dialog = screen.getByRole('dialog', { name: /미션 실패/ })
    expect(dialog).toHaveAccessibleDescription(/충돌 전/)
    expect(dialog).toHaveTextContent('쓴 예산')
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
