import { readMigrated } from './storage'

describe('readMigrated', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('새 키에 값이 있으면 그 값과 새 키를 돌려준다', () => {
    window.localStorage.setItem('new', 'a')
    window.localStorage.setItem('old', 'b')
    expect(readMigrated(window.localStorage, 'new', 'old')).toEqual({
      value: 'a',
      key: 'new',
    })
  })

  it('옛 키에만 값이 있으면 새 키로 옮기고 옛 키를 지운다', () => {
    window.localStorage.setItem('old', 'b')
    expect(readMigrated(window.localStorage, 'new', 'old')).toEqual({
      value: 'b',
      key: 'new',
    })
    expect(window.localStorage.getItem('new')).toBe('b')
    expect(window.localStorage.getItem('old')).toBeNull()
  })

  it('두 키 모두 비어 있으면 값은 null, 쓸 곳은 새 키', () => {
    expect(readMigrated(window.localStorage, 'new', 'old')).toEqual({
      value: null,
      key: 'new',
    })
  })

  it('옮겨 쓰기가 막히면 옛 값을 지우지 않고, 옛 키를 계속 쓰라고 알린다', () => {
    const removeItem = vi.fn()
    const storage = {
      getItem: (key: string) => (key === 'old' ? 'b' : null),
      setItem: () => {
        throw new DOMException('저장 공간 부족', 'QuotaExceededError')
      },
      removeItem,
    } as unknown as Storage
    expect(readMigrated(storage, 'new', 'old')).toEqual({
      value: 'b',
      key: 'old',
    })
    expect(removeItem).not.toHaveBeenCalled()
  })
})
