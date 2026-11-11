import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { handlers, resetMockDb } from '../mocks/handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetMockDb())
afterEach(() => {
  cleanup()
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())
