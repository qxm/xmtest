import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockReadiness } from './readiness'
import { apiFetch } from '../api/client'
import { configureApiReadiness } from '../api/readiness'

function transport() {
  const bus = new EventTarget() as EventTarget & { controller: ServiceWorker | null }
  let active = false
  let acknowledge = true
  const worker = {
    state: 'activated',
    postMessage: vi.fn(() => {
      if (!acknowledge) return
      active = true
      queueMicrotask(() => {
        const event = new Event('message')
        Object.defineProperties(event, { source: { value: worker }, data: { value: { type: 'MOCKING_ENABLED' } } })
        bus.dispatchEvent(event)
      })
    }),
  } as unknown as ServiceWorker
  bus.controller = worker
  const start = vi.fn(async (restart: boolean) => { if (restart) bus.controller = worker; return worker })
  const ready = createMockReadiness({ start, container: () => bus as ServiceWorkerContainer, timeoutMs: 100 })
  return { bus, worker, start, ready, sleep: () => { active = false }, isActive: () => active, silence: () => { acknowledge = false }, wake: () => { acknowledge = true } }
}
afterEach(() => {
  configureApiReadiness(async () => {})
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('mock API lifetime recovery', () => {
  it('reactivates after simulated worker-memory loss without resetting page data or reloading', async () => {
    const mock = transport()
    let balance = 4280.55
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!mock.isActive()) return new Response('<html>Not found</html>', { status: 404 })
      if (init?.method === 'POST') balance -= 50
      return Response.json({ balance })
    })
    vi.stubGlobal('fetch', fetch)
    configureApiReadiness(mock.ready)
    expect(await apiFetch('/api/accounts')).toEqual({ balance: 4280.55 })
    await apiFetch('/api/transfers', { method: 'POST' })
    mock.sleep()
    expect(await apiFetch('/api/accounts')).toEqual({ balance: 4230.55 })
    expect(mock.start).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
  it('deduplicates the readiness handshake for parallel dashboard requests', async () => {
    const mock = transport()
    await Promise.all([mock.ready(), mock.ready(), mock.ready()])
    expect(mock.start).toHaveBeenCalledTimes(1)
    expect(mock.worker.postMessage).toHaveBeenCalledTimes(1)
    await mock.ready()
    expect(mock.worker.postMessage).toHaveBeenCalledTimes(2)
  })
  it('waits for initial controller claim without unnecessarily restarting the worker', async () => {
    const mock = transport()
    mock.bus.controller = null
    mock.start.mockImplementationOnce(async () => {
      setTimeout(() => { mock.bus.controller = mock.worker; mock.bus.dispatchEvent(new Event('controllerchange')) }, 10)
      return mock.worker
    })
    await mock.ready()
    expect(mock.start).toHaveBeenCalledTimes(1)
    expect(mock.start).toHaveBeenCalledWith(false)
  })
  it('lets a failed initial registration be retried instead of caching the rejection', async () => {
    const mock = transport()
    mock.start.mockRejectedValueOnce(new Error('Registration failed'))
    await expect(mock.ready()).rejects.toThrow('Registration failed')
    await mock.ready()
    expect(mock.start).toHaveBeenCalledTimes(2)
  })
  it('rebinds when the controlling worker changes', async () => {
    const mock = transport()
    await mock.ready()
    mock.bus.controller = null
    await mock.ready()
    expect(mock.start).toHaveBeenLastCalledWith(true)
  })
  it('times out cleanly, sends no POST, and recovers on the next attempt', async () => {
    vi.useFakeTimers()
    const mock = transport()
    mock.silence()
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    configureApiReadiness(mock.ready)
    const failed = expect(apiFetch('/api/transfers', { method: 'POST' })).rejects.toThrow('did not become ready')
    await vi.advanceTimersByTimeAsync(101)
    await failed
    expect(fetch).not.toHaveBeenCalled()
    mock.wake()
    fetch.mockResolvedValue(Response.json({ ok: true }))
    expect(await apiFetch('/api/accounts')).toEqual({ ok: true })
    expect(mock.start).toHaveBeenLastCalledWith(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('bounds startup waits without overlapping a still-running registration', async () => {
    vi.useFakeTimers()
    const mock = transport()
    let complete: (worker: ServiceWorker) => void = () => {}
    mock.start.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const first = expect(mock.ready()).rejects.toThrow('Timed out starting')
    await vi.advanceTimersByTimeAsync(101)
    await first
    const retry = mock.ready()
    expect(mock.start).toHaveBeenCalledTimes(1)
    complete(mock.worker)
    await retry
    expect(mock.start).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('never retries a transfer that already reached fetch', async () => {
    const mock = transport()
    const fetch = vi.fn().mockRejectedValue(new TypeError('Connection lost'))
    vi.stubGlobal('fetch', fetch)
    configureApiReadiness(mock.ready)
    await expect(apiFetch('/api/transfers', { method: 'POST' })).rejects.toThrow('Connection lost')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('does not send a request that was aborted during readiness', async () => {
    const mock = transport()
    const controller = new AbortController()
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    configureApiReadiness(mock.ready)
    const pending = apiFetch('/api/accounts', { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects a successful HTML fallback instead of treating it as API data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>SPA fallback</html>', { headers: { 'content-type': 'text/html' } })))
    await expect(apiFetch('/api/accounts')).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE' })
  })
})

