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
  it('adopts the API default after loading without persisting it as a user choice', () => {
    const view = render(<PreferenceControls />)
    view.rerender(<PreferenceControls defaultSegment="premium" />)
    expect(document.documentElement.dataset.segment).toBe('premium')
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('meridian.segment')).toBeNull()
  })
  it('keeps a saved Retail preference over a Premium customer default', () => {
    localStorage.setItem('meridian.segment', 'retail')
    render(<PreferenceControls defaultSegment="premium" />)
    expect(document.documentElement.dataset.segment).toBe('retail')
  })
  it('keeps a manual selection made while the customer request is pending', () => {
    const view = render(<PreferenceControls />)
    fireEvent.click(screen.getByRole('button', { name: 'Retail' }))
    view.rerender(<PreferenceControls defaultSegment="premium" />)
    expect(document.documentElement.dataset.segment).toBe('retail')
    expect(localStorage.getItem('meridian.segment')).toBe('retail')
  })
  it('ignores malformed stored brand values', () => {
    localStorage.setItem('meridian.segment', 'invalid')
    render(<PreferenceControls defaultSegment="premium" />)
    expect(document.documentElement.dataset.segment).toBe('premium')
  })

  it.each([
    ['light', 'retail'], ['light', 'premium'], ['dark', 'retail'], ['dark', 'premium'],
  ])('keeps %s / %s controls and root attributes in sync', (theme, segment) => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.segment = segment
    localStorage.setItem('meridian.segment', segment)
    render(<PreferenceControls />)
    expect(screen.getByRole('button', { name: 'Dark mode' })).toHaveAttribute('aria-pressed', String(theme === 'dark'))
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', String(segment === 'premium'))
    fireEvent.click(screen.getByRole('button', { name: 'Dark mode' }))
    expect(document.documentElement.dataset.segment).toBe(segment)
    expect(document.documentElement.dataset.theme).toBe(theme === 'light' ? 'dark' : 'light')
  })

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
