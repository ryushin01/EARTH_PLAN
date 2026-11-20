/**
 * 이름을 바꾼 저장 키를 읽습니다. 새 키가 비어 있고 옛 키에 값이 있으면
 * 새 키로 옮기고 옛 키는 지웁니다. 옮겨 쓰기가 막혀도 옛 값은 돌려줍니다.
 * (읽기 자체가 막히면 예외가 그대로 나가므로 부르는 쪽에서 처리)
 */
export function readMigrated(
  storage: Storage,
  key: string,
  legacyKey: string,
): string | null {
  const current = storage.getItem(key)
  if (current !== null) return current
  const legacy = storage.getItem(legacyKey)
  if (legacy === null) return null
  try {
    storage.setItem(key, legacy)
    storage.removeItem(legacyKey)
  } catch {
    // 옮기지 못해도 이번에는 옛 값을 씀
  }
  return legacy
}
