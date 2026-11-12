import { useEffect, useState } from 'react'
import type { Segment } from '../../api/types'

type Theme = 'light' | 'dark'
function persist(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* Session preferences still work. */ }
}
function readSegmentOverride(): Segment | undefined {
  try {
    const saved = localStorage.getItem('meridian.segment')
    return saved === 'retail' || saved === 'premium' ? saved : undefined
  } catch { return undefined }
}
export function PreferenceControls({ defaultSegment }: { defaultSegment?: Segment }) {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const [segmentOverride, setSegmentOverride] = useState(readSegmentOverride)
  // An explicit choice wins, including a choice made before the API returns.
  const segment = segmentOverride ?? defaultSegment ?? 'retail'
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { document.documentElement.dataset.segment = segment }, [segment])
  function changeTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    persist('meridian.theme', next)
    setTheme(next)
  }
  function changeSegment(next: Segment) {
    persist('meridian.segment', next)
    setSegmentOverride(next)
  }
  return <div className="preferences">
    <div className="segment-switch" role="group" aria-label="Customer segment">
      {(['retail', 'premium'] as const).map(value => <button type="button" key={value} aria-pressed={segment === value} onClick={() => changeSegment(value)}>{value === 'retail' ? 'Retail' : 'Premium'}</button>)}
    </div>
    <button className="theme-toggle" type="button" aria-label="Dark mode" aria-pressed={theme === 'dark'} onClick={changeTheme}>{theme === 'dark' ? 'Dark' : 'Light'}</button>
  </div>
}


