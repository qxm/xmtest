import type { Account } from '../../api/types'
import { formatMoney } from '../../lib/format'

export function AccountCards({ accounts }: { accounts: Account[] }) {
  return <section className="panel" aria-labelledby="accounts-title">
    <h2 id="accounts-title">Accounts</h2>
    {accounts.length === 0 ? <p className="muted">No accounts to display.</p> : <ul className="account-cards">
      {accounts.map(account => <li className="account-card" key={account.id}>
        <h3>{account.name}</h3><p className="muted amount">{account.maskedNumber}</p>
        <p className="account-balance amount">{formatMoney(account.balance)}</p>
        <p className="muted">{account.type === 'credit' ? 'Amount due' : 'Available balance'}</p>
      </li>)}
    </ul>}
  </section>
}
