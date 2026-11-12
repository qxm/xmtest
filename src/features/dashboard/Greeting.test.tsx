import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Greeting } from './Greeting'

afterEach(() => vi.useRealTimers())
it('updates the greeting across noon without reloading and keeps the customer name', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-12T11:59:45+08:00'))
  const view = render(<Greeting firstName="Jason" />)
  expect(screen.getByRole('heading')).toHaveTextContent('Good morning, Jason')
  act(() => vi.advanceTimersByTime(30_000))
  expect(screen.getByRole('heading')).toHaveTextContent('Good afternoon, Jason')
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
