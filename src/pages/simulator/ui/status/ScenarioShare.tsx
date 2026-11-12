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
import { useT } from '../i18n'

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
  const { t } = useT()
  const loadSnapshot = useWorld((s) => s.loadSnapshot)
  const raw = useSyncExternalStore(subscribe, readRaw, () => '[]')
  const saves = useMemo(() => parseSaves(raw), [raw])
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [status, setStatus] = useState<{ message: string; ok: boolean }>({
    message: '',
    ok: true,
  })
  const nameId = useId()
  const linkId = useId()

  const copyLink = async () => {
    const url = shareUrl(toSnapshot(useWorld.getState()), window.location.href)
    setLink(url)
    try {
      await navigator.clipboard.writeText(url)
      setStatus({
        ok: true,
        message: t('share.copied'),
      })
    } catch {
      setStatus({
        ok: false,
        message: t('share.copyBlocked'),
      })
    }
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const state = useWorld.getState()
    const label =
      name.trim() || t('share.defaultName', { date: formatSimDate(state.year) })
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
        message: t('share.saveBlocked'),
      })
      return
    }
    setName('')
    setStatus({ ok: true, message: t('share.saved', { name: item.name }) })
  }

  const remove = (item: SavedItem) => {
    const next = saves.filter((s) => s.id !== item.id)
    writeSaves(next)
    setStatus({ ok: true, message: t('share.removed', { name: item.name }) })
  }

  return (
    <section aria-labelledby="share-title" className="grid gap-3">
      <h3 id="share-title" className="label-caps">
        {t('share.title')}
      </h3>
      <Button onClick={copyLink}>{t('share.copy')}</Button>
      {link ? (
        <div className="grid gap-1">
          <label htmlFor={linkId} className="label-caps">
            {t('share.link')}
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
          {t('share.name')}
        </label>
        <div className="flex gap-2">
          <input
            id={nameId}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('share.placeholder')}
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-xs border border-line-strong bg-panel-solid px-3 text-sm text-ice placeholder:text-muted"
          />
          <Button type="submit">{t('share.save')}</Button>
        </div>
      </form>
      <StatusMessage
        message={status.message}
        tone={status.ok ? 'info' : 'error'}
      />
      {saves.length ? (
        <ul className="grid gap-1" aria-label={t('share.list')}>
          {saves.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 border-t border-line py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {item.name}
                <span className="block text-xs text-muted">
                  {t('share.item', {
                    date: formatSimDate(item.snapshot.year),
                    n: item.snapshot.structures.length,
                  })}
                </span>
              </span>
              <Button
                size="sm"
                aria-label={t('share.loadNamed', { name: item.name })}
                onClick={() => {
                  loadSnapshot(item.snapshot, {
                    ko: `저장한 "${item.name}"`,
                    en: `saved "${item.name}"`,
                  })
                  setStatus({
                    ok: true,
                    message: t('share.loaded', { name: item.name }),
                  })
                }}
              >
                {t('share.load')}
              </Button>
              <Button
                size="sm"
                aria-label={t('share.removeNamed', { name: item.name })}
                onClick={() => remove(item)}
              >
                {t('share.remove')}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
