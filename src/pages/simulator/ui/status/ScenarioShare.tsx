import { useId, useMemo, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import {
  SHARE_PARAM,
  encodeSnapshot,
  parseSnapshot,
  toSnapshot,
} from '../../model/world/snapshot'
import type { Snapshot } from '../../model/world/snapshot'
import { useWorld } from '../../model/world/store'
import { formatSimDate } from './TimeControls'
import { Button, StatusMessage } from '@/shared/ui'

const STORAGE_KEY = 'earth-plan:saves'
const MAX_SAVES = 8

interface SavedItem {
  id: string
  name: string
  savedAt: string
  snapshot: Snapshot
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '[]'
  } catch {
    return '[]'
  }
}

function parseSaves(raw: string): SavedItem[] {
  try {
    const list = JSON.parse(raw) as unknown
    if (!Array.isArray(list)) return []
    return list.flatMap((item: unknown) => {
      if (typeof item !== 'object' || item === null) return []
      const { id, name, savedAt, snapshot } = item as Record<string, unknown>
      const parsed = parseSnapshot(snapshot)
      if (
        typeof id !== 'string' ||
        typeof name !== 'string' ||
        typeof savedAt !== 'string' ||
        !parsed
      )
        return []
      return [{ id, name, savedAt, snapshot: parsed }]
    })
  } catch {
    return []
  }
}

function writeSaves(items: SavedItem[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    listeners.forEach((l) => l())
    return true
  } catch {
    return false
  }
}

export function shareUrl(snapshot: Snapshot, base: string): string {
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  url.searchParams.set(SHARE_PARAM, encodeSnapshot(snapshot))
  return url.toString()
}

/** 시나리오를 이 브라우저에 저장하고, 링크로 공유합니다 */
export function ScenarioShare() {
  const loadSnapshot = useWorld((s) => s.loadSnapshot)
  const raw = useSyncExternalStore(subscribe, readRaw, () => '[]')
  const saves = useMemo(() => parseSaves(raw), [raw])
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [status, setStatus] = useState({ message: '', ok: true })
  const nameId = useId()
  const linkId = useId()

  const copyLink = async () => {
    const url = shareUrl(toSnapshot(useWorld.getState()), window.location.href)
    setLink(url)
    try {
      await navigator.clipboard.writeText(url)
      setStatus({
        ok: true,
        message:
          '공유 링크를 복사했습니다. 링크를 열면 지금 시나리오가 그대로 열립니다.',
      })
    } catch {
      setStatus({
        ok: false,
        message: '자동 복사가 막혀 있습니다. 아래 링크 칸에서 직접 복사하세요.',
      })
    }
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const state = useWorld.getState()
    const label = name.trim() || `${formatSimDate(state.year)} 시나리오`
    const item: SavedItem = {
      id: `${Date.now()}`,
      name: label.slice(0, 40),
      savedAt: new Date().toISOString(),
      snapshot: toSnapshot(state),
    }
    const next = [item, ...saves].slice(0, MAX_SAVES)
    if (!writeSaves(next)) {
      setStatus({
        ok: false,
        message:
          '이 브라우저에서는 저장할 수 없습니다. 공유 링크를 복사해 보관하세요.',
      })
      return
    }
    setName('')
    setStatus({ ok: true, message: `"${item.name}"을(를) 저장했습니다.` })
  }

  const remove = (item: SavedItem) => {
    const next = saves.filter((s) => s.id !== item.id)
    writeSaves(next)
    setStatus({ ok: true, message: `"${item.name}"을(를) 지웠습니다.` })
  }

  return (
    <section aria-labelledby="share-title" className="grid gap-3">
      <h3 id="share-title" className="label-caps">
        저장·공유
      </h3>
      <Button onClick={copyLink}>공유 링크 복사</Button>
      {link ? (
        <div className="grid gap-1">
          <label htmlFor={linkId} className="label-caps">
            공유 링크
          </label>
          <input
            id={linkId}
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full rounded-xs border border-line-strong bg-panel-solid px-3 text-xs text-ice"
          />
        </div>
      ) : null}
      <form onSubmit={save} className="grid gap-2">
        <label htmlFor={nameId} className="label-caps">
          저장할 이름
        </label>
        <div className="flex gap-2">
          <input
            id={nameId}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 북해 댐 실험"
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-xs border border-line-strong bg-panel-solid px-3 text-sm text-ice placeholder:text-muted"
          />
          <Button type="submit">저장</Button>
        </div>
      </form>
      <StatusMessage
        message={status.message}
        tone={status.ok ? 'info' : 'error'}
      />
      {saves.length ? (
        <ul className="grid gap-1" aria-label="저장한 시나리오">
          {saves.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 border-t border-line py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {item.name}
                <span className="block text-xs text-muted">
                  시뮬레이션 {formatSimDate(item.snapshot.year)} · 구조물{' '}
                  {item.snapshot.structures.length}개
                </span>
              </span>
              <Button
                size="sm"
                aria-label={`${item.name} 불러오기`}
                onClick={() => {
                  loadSnapshot(item.snapshot, `저장한 "${item.name}"`)
                  setStatus({
                    ok: true,
                    message: `"${item.name}"을(를) 불러왔습니다.`,
                  })
                }}
              >
                불러오기
              </Button>
              <Button
                size="sm"
                aria-label={`${item.name} 지우기`}
                onClick={() => remove(item)}
              >
                지우기
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
