import { z } from 'zod'
import type { Account, Payee, CreateTransferRequest } from '../../api/types'
import { formatMoney } from '../../lib/format'

export function transferSchema(accounts: Account[], payees: Payee[], remaining: number) {
  return z.object({
    recipientMode: z.enum(['saved', 'new']), payeeId: z.string(),
    recipient: z.object({ name: z.string(), accountNumber: z.string(), bank: z.string() }),
    fromAccountId: z.string(), amount: z.string(), note: z.string().max(50, 'Use no more than 50 characters.'),
  }).superRefine((values, ctx) => {
    const error = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    if (values.recipientMode === 'saved') {
      if (!payees.some(payee => payee.id === values.payeeId)) error(['payeeId'], 'Choose a recipient.')
    } else {
      const name = values.recipient.name.trim()
      if (name.length < 2 || name.length > 50) error(['recipient', 'name'], 'Enter a name between 2 and 50 characters.')
      if (!/^\d{8}$/.test(values.recipient.accountNumber)) error(['recipient', 'accountNumber'], 'Enter a valid 8-digit account number.')
      const bank = values.recipient.bank.trim()
      if (bank.length < 2 || bank.length > 30) error(['recipient', 'bank'], 'Enter a bank between 2 and 30 characters.')
    }
    const account = accounts.find(account => account.id === values.fromAccountId && account.type !== 'credit')
    if (!account) error(['fromAccountId'], 'Choose a deposit account.')
    if (!/^\d+(?:\.\d{1,2})?$/.test(values.amount) || !Number.isFinite(Number(values.amount)) || Number(values.amount) < 1) {
      error(['amount'], 'Enter an amount of at least SGD 1.00 with no more than 2 decimal places.')
    } else {
      const amount = Number(values.amount)
      if (account && amount > account.balance) error(['amount'], `Amount can't be more than your available balance (${formatMoney(account.balance)}).`)
      else if (amount > remaining) error(['amount'], `This transfer exceeds your remaining daily limit (${formatMoney(remaining)}).`)
    }
  })
}
export type TransferValues = z.infer<ReturnType<typeof transferSchema>>
export function toTransferRequest(values: TransferValues): CreateTransferRequest {
  return {
    fromAccountId: values.fromAccountId, amount: Number(values.amount), note: values.note || undefined,
    ...(values.recipientMode === 'saved' ? { payeeId: values.payeeId } : { recipient: {
      name: values.recipient.name.trim(), accountNumber: values.recipient.accountNumber, bank: values.recipient.bank.trim(),
    } }),
  }
}
