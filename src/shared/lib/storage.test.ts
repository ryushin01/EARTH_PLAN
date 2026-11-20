import { readMigrated } from './storage'

describe('readMigrated', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('새 키에 값이 있으면 그 값을 돌려준다', () => {
    window.localStorage.setItem('new', 'a')
    window.localStorage.setItem('old', 'b')
    expect(readMigrated(window.localStorage, 'new', 'old')).toBe('a')
  })

  it('옛 키에만 값이 있으면 새 키로 옮기고 옛 키를 지운다', () => {
    window.localStorage.setItem('old', 'b')
    expect(readMigrated(window.localStorage, 'new', 'old')).toBe('b')
    expect(window.localStorage.getItem('new')).toBe('b')
    expect(window.localStorage.getItem('old')).toBeNull()
  })

  it('두 키 모두 비어 있으면 null', () => {
    expect(readMigrated(window.localStorage, 'new', 'old')).toBeNull()
  })

  it('옮겨 쓰기가 막혀도 옛 값을 돌려준다', () => {
    const storage = {
      getItem: (key: string) => (key === 'old' ? 'b' : null),
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    } as unknown as Storage
    expect(readMigrated(storage, 'new', 'old')).toBe('b')
  })
})
