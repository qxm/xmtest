import type { Account } from '../../api/types'
import { formatMoney } from '../../lib/format'
import { SkeletonText } from '../../components/SkeletonText'

export function AccountCards({ accounts = [], loading = false }: { accounts?: Account[]; loading?: boolean }) {
  const cards: (Account | undefined)[] = loading ? Array.from({ length: 3 }) : accounts
  return <section className="panel accounts-panel" aria-labelledby="accounts-title" aria-hidden={loading || undefined}>
    <h2 id="accounts-title">Accounts</h2>
    {cards.length === 0 ? <p className="muted">No accounts to display.</p> : <ul className="account-cards">
      {cards.map((account, index) => <li className="account-card" key={account?.id ?? index}>
        <h3>{account ? account.name : <SkeletonText>Account name</SkeletonText>}</h3>
        <p className="muted amount">{account ? account.maskedNumber : <SkeletonText>•••• 0000</SkeletonText>}</p>
        <p className="account-balance amount">{account ? formatMoney(account.balance) : <SkeletonText>SGD 0,000.00</SkeletonText>}</p>
        <p className="muted">{account ? account.type === 'credit' ? 'Amount due' : 'Available balance' : <SkeletonText>Available balance</SkeletonText>}</p>
      </li>)}
    </ul>}
  </section>
}
