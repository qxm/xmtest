import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PreferenceControls } from './PreferenceControls'

const bootstrap = readFileSync('public/preferences.js', 'utf8')
afterEach(() => {
  localStorage.clear()
  document.documentElement.dataset.theme = 'light'
  document.documentElement.dataset.segment = 'retail'
})
describe('preferences', () => {
  it('initializes saved choices before rendering, or falls back to the system when storage fails', () => {
    const dataset: Record<string, string> = {}
    const document = { documentElement: { dataset } }
    const window = { matchMedia: () => ({ matches: true }) }
    runInNewContext(bootstrap, { document, window, localStorage: { getItem: (key: string) => key.endsWith('theme') ? 'light' : 'premium' } })
    expect(dataset).toEqual({ theme: 'light', segment: 'premium' })
    runInNewContext(bootstrap, { document, window, localStorage: { getItem: () => { throw new Error('Blocked') } } })
    expect(dataset).toEqual({ theme: 'dark', segment: 'retail' })
  })
  it('switches theme and segment independently and persists both choices', () => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.dataset.segment = 'retail'
    render(<PreferenceControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-segment', 'premium')
    expect(localStorage.getItem('meridian.theme')).toBe('dark')
    expect(localStorage.getItem('meridian.segment')).toBe('premium')
  })
})
