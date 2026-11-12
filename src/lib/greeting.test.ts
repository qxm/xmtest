import { describe, expect, it } from 'vitest'
import { getGreeting } from './greeting'

describe('Singapore greeting boundaries', () => {
  it.each([
    ['2026-11-12T00:00:00+08:00', 'Good morning'],
    ['2026-11-12T11:59:59+08:00', 'Good morning'],
    ['2026-11-12T12:00:00+08:00', 'Good afternoon'],
    ['2026-11-12T17:59:59+08:00', 'Good afternoon'],
    ['2026-11-12T18:00:00+08:00', 'Good evening'],
    ['2026-11-12T23:59:59+08:00', 'Good evening'],
    ['2026-11-12T04:00:00Z', 'Good afternoon'],
  ])('%s → %s', (time, expected) => {
    expect(getGreeting(new Date(time))).toBe(expected)
  })
})
