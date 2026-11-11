import { useEffect, useState } from 'react'
import type { Segment } from '../../api/types'

type Theme = 'light' | 'dark'
function persist(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* Session preferences still work. */ }
}
export function PreferenceControls() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const [segment, setSegment] = useState<Segment>(() => document.documentElement.dataset.segment === 'premium' ? 'premium' : 'retail')
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { document.documentElement.dataset.segment = segment }, [segment])
  function changeTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    persist('meridian.theme', next)
    setTheme(next)
  }
  function changeSegment(next: Segment) {
    persist('meridian.segment', next)
    setSegment(next)
  }
  return <div className="preferences">
    <div className="segment-switch" role="group" aria-label="Customer segment">
      {(['retail', 'premium'] as const).map(value => <button type="button" key={value} aria-pressed={segment === value} onClick={() => changeSegment(value)}>{value === 'retail' ? 'Retail' : 'Premium'}</button>)}
    </div>
    <button className="theme-toggle" type="button" aria-label="Dark mode" aria-pressed={theme === 'dark'} onClick={changeTheme}>{theme === 'dark' ? 'Dark' : 'Light'}</button>
  </div>
}


