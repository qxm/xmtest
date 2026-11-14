import { createMockReadiness } from './readiness'

export const ensureMockApiReady = createMockReadiness({
  container: () => 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  start: async restart => {
    const { worker } = await import('./browser')
    if (restart) worker.stop()
    const registration = await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      // A fresh predicate on restart makes MSW replace its stale transport/channel.
      // This does not re-import/reset the page's in-memory banking handlers.
      findWorker: restart ? (scriptUrl, expectedUrl) => scriptUrl === expectedUrl : undefined,
    })
    return registration?.active ?? undefined
  },
})
