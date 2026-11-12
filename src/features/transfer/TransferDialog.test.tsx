import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { beforeAll, describe, expect, it } from 'vitest'
import App from '../../App'
import { server } from '../../test/setup'
import { formatMoney } from '../../lib/format'

beforeAll(() => {
  // jsdom has no native modal implementation. Browser focus trapping is native.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><App /></QueryClientProvider>)
}
async function openTransfer() {
  renderApp()
  const opener = await screen.findByRole('button', { name: 'New transfer' })
  opener.focus()
  fireEvent.click(opener)
  await screen.findByRole('radio', { name: /Jamie Tan/ })
  return { opener, modal: screen.getByRole('dialog') }
}
async function goToAmount() {
  const result = await openTransfer()
  fireEvent.click(screen.getByRole('radio', { name: /Jamie Tan/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByRole('heading', { name: 'How much?' })
  return result
}
async function goToReview(note = '') {
  const result = await goToAmount()
  fireEvent.change(screen.getByLabelText('Amount (SGD)'), { target: { value: '120' } })
  if (note) fireEvent.change(screen.getByLabelText(/Note \(optional\)/), { target: { value: note } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByRole('heading', { name: 'Check the details' })
  return result
}
const exact = (value: string) => (_: string, element: Element | null) => element?.textContent === value && !Array.from(element.children).some(child => child.textContent === value)

describe('transfer', () => {
  it('contains keyboard focus, focuses new-recipient fields, and restores scrolling on Escape', async () => {
    const previousOverflow = document.body.style.overflow
    const { opener, modal } = await openTransfer()
    expect(document.body.style.overflow).toBe('hidden')
    const close = screen.getByRole('button', { name: 'Close transfer' })
    const next = screen.getByRole('button', { name: 'Continue' })
    next.focus()
    fireEvent.keyDown(modal, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(modal, { key: 'Tab', shiftKey: true })
    expect(next).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Send to someone new' }))
    await waitFor(() => expect(screen.getByLabelText('Recipient name')).toHaveFocus())
    fireEvent(modal, new Event('cancel', { bubbles: true, cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe(previousOverflow)
    expect(opener).toHaveFocus()
  })
  it('focuses a recipient after an empty selection and the search box when no payees exist', async () => {
    await openTransfer()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText('Choose a recipient.')
    expect(screen.getByRole('radio', { name: /Jamie Tan/ })).toHaveFocus()
  })
  it('keeps recipient validation reachable when the saved-payee list is empty', async () => {
    server.use(http.get('*/api/payees', () => HttpResponse.json({ payees: [] })))
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'New transfer' }))
    await screen.findByText('No saved recipients. Send to someone new below.')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText('Choose a recipient.')
    expect(screen.getByRole('searchbox', { name: 'Search payees' })).toHaveFocus()
  })

  it('rejects an amount above balance with focus and no POST request', async () => {
    let posts = 0
    server.events.on('request:start', ({ request }) => { if (request.method === 'POST') posts++ })
    await goToAmount()
    const amount = screen.getByLabelText('Amount (SGD)')
    fireEvent.change(amount, { target: { value: '4500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(exact(`Amount can't be more than your available balance (${formatMoney(4280.55)}).`))).toBeInTheDocument()
    expect(amount).toHaveFocus()
    expect(posts).toBe(0)
  })
  it('sends once, shows API reference and refreshes balances, transactions and daily limit', async () => {
    let posts = 0
    server.events.on('request:start', ({ request }) => { if (request.method === 'POST') posts++ })
    const { opener, modal } = await goToReview('Dinner')
    const confirm = screen.getByRole('button', { name: 'Confirm transfer' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled()
    await screen.findByRole('heading', { name: 'Transfer sent' })
    expect(within(modal).getByText(/TRF-/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }))
    expect(await screen.findByText('Transfer to Jamie Tan')).toBeInTheDocument()
    expect(screen.getByText(exact(formatMoney(4160.55)))).toBeInTheDocument()
    expect(screen.getByText(exact(formatMoney(17000.55)))).toBeInTheDocument()
    expect(screen.getByText(exact(formatMoney(4880)))).toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(posts).toBe(1)
  })
  it('keeps review and entered data after failure, and lets the user edit then retry', async () => {
    await goToReview('#fail')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Something went wrong. Your money hasn't left your account. Try again.")
    expect(screen.getByRole('heading', { name: 'Check the details' })).toBeInTheDocument()
    expect(screen.queryByText('Transfer sent')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByLabelText('Amount (SGD)')).toHaveValue('120')
    expect(screen.getByLabelText(/Note \(optional\)/)).toHaveValue('#fail')
    fireEvent.change(screen.getByLabelText(/Note \(optional\)/), { target: { value: 'Dinner' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Check the details' })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    expect(await screen.findByRole('heading', { name: 'Transfer sent' })).toBeInTheDocument()
  })
  it('validates a new recipient and preserves it across steps, then sends only recipient data', async () => {
    let body: Record<string, unknown> | undefined
    server.use(http.post('*/api/transfers', async ({ request }) => { body = await request.clone().json() as Record<string, unknown>; return undefined }))
    await openTransfer()
    fireEvent.click(screen.getByRole('button', { name: 'Send to someone new' }))
    fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Alex Lim' } })
    fireEvent.change(screen.getByLabelText('Account number (8 digits)'), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText('Bank'), { target: { value: 'OCBC' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Enter a valid 8-digit account number.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Account number (8 digits)'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'How much?' })
    fireEvent.click(screen.getByRole('button', { name: '50' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Check the details' })
    expect(screen.getByText(/Alex Lim · OCBC · •••• 5678/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    await screen.findByRole('heading', { name: 'Transfer sent' })
    expect(body?.recipient).toEqual({ name: 'Alex Lim', accountNumber: '12345678', bank: 'OCBC' })
    expect(body).not.toHaveProperty('payeeId')
  })
  it('keeps success if refreshing the dashboard fails, without resending', async () => {
    await goToReview()
    server.use(http.get('*/api/transactions', () => HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Down' } }, { status: 500 })))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    await screen.findByRole('heading', { name: 'Transfer sent' })
    expect(await screen.findByText("Your transfer was sent, but we couldn't refresh your dashboard.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm transfer' })).not.toBeInTheDocument()
  })
  it('maps server field errors while retaining review, and closes with focus restored', async () => {
    server.use(http.post('*/api/transfers', async () => {
      await delay(50)
      return HttpResponse.json({ error: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Limit changed.', fields: { amount: 'Only SGD 10.00 remains.' } } }, { status: 422 })
    }))
    const { opener } = await goToReview()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm transfer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Limit changed.')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Only SGD 10.00 remains.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close transfer' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })
})
