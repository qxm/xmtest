import { queryOptions } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { AccountsResponse, CustomerResponse, Health, PayeesResponse, TransactionsResponse } from './types'

export const bankingKeys = {
  all: ['banking'] as const,
  customer: ['banking', 'customer'] as const,
  accounts: ['banking', 'accounts'] as const,
  transactions: (limit: number) => ['banking', 'transactions', { limit }] as const,
  payees: ['banking', 'payees'] as const,
}
export const healthQuery = queryOptions({ queryKey: ['health'], retry: false,
  queryFn: ({ signal }) => apiFetch<Health>('/api/health', { signal }) })
export const customerQuery = queryOptions({ queryKey: bankingKeys.customer,
  queryFn: ({ signal }) => apiFetch<CustomerResponse>('/api/customer', { signal }) })
export const accountsQuery = queryOptions({ queryKey: bankingKeys.accounts,
  queryFn: ({ signal }) => apiFetch<AccountsResponse>('/api/accounts', { signal }) })
export function transactionsQuery(limit = 8) {
  return queryOptions({ queryKey: bankingKeys.transactions(limit),
    queryFn: ({ signal }) => apiFetch<TransactionsResponse>(`/api/transactions?limit=${limit}`, { signal }) })
}
export const payeesQuery = queryOptions({ queryKey: bankingKeys.payees,
  queryFn: ({ signal }) => apiFetch<PayeesResponse>('/api/payees', { signal }) })
