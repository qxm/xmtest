import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DailyLimitPanel } from './DailyLimitPanel'

describe('daily limit usage', () => {
  it.each([
    [5000, 5000, 0], [5000, 4880, 120], [5000, 0, 5000],
    [5000, -100, 5000], [5000, 6000, 0], [0, 0, 0],
  ])('shows limit %s and remaining %s as used %s', (limit, remaining, used) => {
    render(<DailyLimitPanel limit={limit} remaining={remaining} />)
    const progress = screen.getByRole('progressbar', { name: 'Daily transfer limit used' })
    expect(progress).toHaveAttribute('value', String(used))
    expect(progress).toHaveAttribute('max', String(limit || 1))
    expect(progress).toHaveAttribute('aria-valuetext', expect.stringContaining('used'))
  })
})
