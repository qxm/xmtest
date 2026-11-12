import { describe, expect, it } from 'vitest'
import { transferSchema } from './schema'
import type { Account } from '../../api/types'

const accounts: Account[] = [
  { id: 'checking', name: 'Checking', type: 'checking', maskedNumber: '•••• 1234', balance: 4280.55, currency: 'SGD' },
  { id: 'savings', name: 'Savings', type: 'savings', maskedNumber: '•••• 5678', balance: 12840, currency: 'SGD' },
  { id: 'credit', name: 'Credit', type: 'credit', maskedNumber: '•••• 0000', balance: -420.3, currency: 'SGD' },
]
const valid = { recipientMode: 'new' as const, payeeId: '', recipient: { name: 'Alex Lim', bank: 'OCBC', accountNumber: '01234567' }, fromAccountId: 'checking', amount: '1.00', note: '' }
describe('transfer validation boundaries', () => {
  const schema = transferSchema(accounts, [], 5000)
  it.each(['', '0', '0.99', '-1', '1.001', '1e2', 'NaN', 'Infinity'])('rejects invalid amount %j', amount => {
    expect(schema.safeParse({ ...valid, amount }).success).toBe(false)
  })
  it('allows exact balance and exact limit but rejects crossing either boundary', () => {
    expect(schema.safeParse({ ...valid, amount: '4280.55' }).success).toBe(true)
    expect(schema.safeParse({ ...valid, amount: '4280.56' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, fromAccountId: 'savings', amount: '5000' }).success).toBe(true)
    expect(schema.safeParse({ ...valid, fromAccountId: 'savings', amount: '5000.01' }).success).toBe(false)
  })
  it('preserves leading account zeroes and rejects credit accounts or overlong notes', () => {
    expect(schema.safeParse(valid).success).toBe(true)
    expect(schema.safeParse({ ...valid, fromAccountId: 'credit' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, note: 'x'.repeat(50) }).success).toBe(true)
    expect(schema.safeParse({ ...valid, note: 'x'.repeat(51) }).success).toBe(false)
  })
})
