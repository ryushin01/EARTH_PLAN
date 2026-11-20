/** 읽은 값과, 앞으로 그 값을 쓸 키 */
export interface StoredValue {
  value: string | null
  key: string
}

/**
 * 이름을 바꾼 저장 키를 읽습니다. 새 키가 비어 있고 옛 키에 값이 있으면 새 키로 옮기고
 * 옛 키는 지웁니다. 옮겨 쓰기가 막히면(저장 공간 부족 등) 옛 값을 지우지 않고, 앞으로도
 * 옛 키에 쓰도록 key로 알려 줍니다. (읽기 자체가 막히면 예외가 그대로 나가므로 부르는 쪽에서 처리)
 */
export function readMigrated(
  storage: Storage,
  key: string,
  legacyKey: string,
): StoredValue {
  const current = storage.getItem(key)
  if (current !== null) return { value: current, key }
  const legacy = storage.getItem(legacyKey)
  if (legacy === null) return { value: null, key }
  try {
    storage.setItem(key, legacy)
  } catch {
    return { value: legacy, key: legacyKey }
  }
  try {
    storage.removeItem(legacyKey)
  } catch {
    // 옛 값이 남아도 새 키를 먼저 읽으므로 괜찮음
  }
  return { value: legacy, key }
}
