type Target = Pick<ServiceWorker, 'postMessage' | 'state'>
type Container = Pick<ServiceWorkerContainer, 'addEventListener' | 'removeEventListener'> & { controller: Target | null }
type Options = {
  start: (restart: boolean) => Promise<Target | undefined>
  container: () => Container | undefined
  timeoutMs?: number
}

/** MSW 2.x keeps active client IDs in worker memory. A suspended/restarted
 * worker may still control the page while that set is empty. Re-activate this
 * client and await MOCKING_ENABLED before issuing any API request.
 * Keep this adapter aligned with the pinned public/mockServiceWorker.js protocol.
 */
export function createMockReadiness({ start, container, timeoutMs = 10_000 }: Options) {
  let initialized = false
  let restartNext = false
  let target: Target | undefined
  let pending: Promise<void> | undefined
  let starting: Promise<Target | undefined> | undefined

  function establish(restart: boolean): Promise<Target | undefined> {
    if (!starting) {
      starting = Promise.resolve().then(() => start(restart)).then(worker => {
        target = worker
        initialized = true
        restartNext = false
        return worker
      }).finally(() => { starting = undefined })
    }
    // A deadline doesn't cancel worker.start(). Keep the underlying operation
    // single-flight so Retry cannot launch overlapping registrations.
    const operation = starting
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out starting the mock API. Please retry.')), timeoutMs)
      operation.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
    })
  }

  function activate(bus: Container, worker: Target): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer)
        bus.removeEventListener('message', onMessage)
        if (error) reject(error)
        else resolve()
      }
      const onMessage = (event: MessageEvent) => {
        if (event.source === worker && event.data?.type === 'MOCKING_ENABLED') finish()
      }
      const timer = setTimeout(() => finish(new Error('The mock API did not become ready. Please retry.')), timeoutMs)
      bus.addEventListener('message', onMessage)
      try { worker.postMessage('MOCK_ACTIVATE') }
      catch (error) { finish(error instanceof Error ? error : new Error('Could not activate the mock API.')) }
    })
  }

  async function prepare() {
    const previouslyStarted = initialized
    if (!initialized) {
      target = await establish(restartNext)
    }
    const bus = container()
    // MSW's fetch-interceptor fallback has no ServiceWorker transport.
    if (!bus) return
    if (!target || target.state === 'redundant' || (bus.controller && bus.controller !== target) || (previouslyStarted && !bus.controller)) {
      target = await establish(true)
    }
    if (!target) throw new Error('The mock API service worker is unavailable. Please retry.')
    if (bus.controller !== target) {
      await new Promise<void>((resolve, reject) => {
        const onChange = () => {
          if (bus.controller === target) { cleanup(); resolve() }
        }
        const cleanup = () => { clearTimeout(timer); bus.removeEventListener('controllerchange', onChange) }
        const timer = setTimeout(() => { cleanup(); reject(new Error('The mock API could not control this page. Please retry.')) }, timeoutMs)
        bus.addEventListener('controllerchange', onChange)
        onChange()
      })
    }
    await activate(bus, target)
  }

  return function ensureReady(): Promise<void> {
    if (!pending) {
      pending = prepare().catch(error => {
        restartNext = initialized
        initialized = false
        throw error
      }).finally(() => { pending = undefined })
    }
    return pending
  }
}
