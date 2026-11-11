import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from './test/setup'
import { formatMoney } from './lib/format'
import App from './App'

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>)
}
const text = (value: string) => (_: string, element: Element | null) => element?.textContent === value && !Array.from(element.children).some(child => child.textContent === value)

describe('dashboard', () => {
  it('uses the API customer name and initials instead of fixed identity text', async () => {
    server.use(http.get('*/api/customer', () => HttpResponse.json({ customer: {
      id: 'cus_test', firstName: 'Jamie', lastName: 'Tan', email: 'jamie@example.com',
      segment: 'retail', dailyTransferLimit: 5000, transferredToday: 0,
    } })))
    renderApp()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good evening')
    expect(screen.queryByText('Good evening, Ava')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Good evening, Jamie' })).toBeInTheDocument()
    expect(screen.getByLabelText('Jamie Tan')).toHaveTextContent('JT')
  })

  it('loads all three endpoints concurrently and renders deposit totals, accounts and eight transactions', async () => {
    const started = new Set<string>()
    let release: () => void = () => {}
    const allStarted = new Promise<void>(resolve => { release = resolve })
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (['/api/customer', '/api/accounts', '/api/transactions'].includes(url.pathname)) {
        started.add(url.pathname)
        if (started.size === 3) release()
      }
    })
    renderApp()
    expect(screen.getByLabelText('Loading dashboard')).toHaveAttribute('aria-busy', 'true')
    await allStarted
    const accounts = await screen.findByRole('region', { name: 'Accounts' })
    expect(screen.getByText(text(formatMoney(17120.55)))).toBeInTheDocument()
    expect(within(accounts).getAllByRole('listitem')).toHaveLength(3)
    expect(within(accounts).getByText(text(formatMoney(-420.3)))).toBeInTheDocument()
    expect(within(accounts).getByText('Amount due')).toBeInTheDocument()
    const transactions = screen.getByRole('region', { name: 'Recent transactions' })
    expect(within(transactions).getAllByRole('listitem')).toHaveLength(8)
    expect(within(transactions).getAllByRole('listitem')[0]).toHaveTextContent('FairPrice Finest')
    expect(within(transactions).getByText('Pending')).toBeInTheDocument()
    expect(within(transactions).getByText(text('+' + formatMoney(45)))).toBeInTheDocument()
    expect(started.size).toBe(3)
    server.events.removeAllListeners('request:start')
  })

  it('searches descriptions and categories ignoring case, handles no matches, and clears search', async () => {
    renderApp()
    await screen.findByText('FairPrice Finest')
    const input = screen.getByRole('searchbox', { name: 'Search transactions' })
    fireEvent.change(input, { target: { value: 'gRaB' } })
    expect(screen.getByRole('status')).toHaveTextContent('1 transaction match your search')
    expect(screen.getByText('Grab')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'GROCERIES' } })
    expect(screen.getByText('FairPrice Finest')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'not-a-match' } })
    expect(screen.getByText('No transactions match your search.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(input).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent('8 transactions shown')
  })

  it('shows an error for a failed request and loads the dashboard on Retry', async () => {
    let fail = true
    server.use(http.get('*/api/accounts', async () => {
      if (fail) return HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Down' } }, { status: 500 })
      return undefined
    }))
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your dashboard.")
    fail = false
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Everyday Checking')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('handles empty accounts and transactions without treating them as errors', async () => {
    server.use(
      http.get('*/api/accounts', () => HttpResponse.json({ accounts: [] })),
      http.get('*/api/transactions', () => HttpResponse.json({ transactions: [], total: 0 })),
    )
    renderApp()
    expect(await screen.findByText('No accounts to display.')).toBeInTheDocument()
    expect(screen.getByText('No transactions yet.')).toBeInTheDocument()
    expect(screen.getByText('Across 0 deposit accounts')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
