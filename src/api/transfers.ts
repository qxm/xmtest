import { apiFetch } from './client'
import type { CreateTransferRequest, TransferResponse } from './types'

export function createTransfer(request: CreateTransferRequest) {
  return apiFetch<TransferResponse>('/api/transfers', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
  })
}
