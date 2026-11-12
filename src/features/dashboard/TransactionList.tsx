import { SkeletonText } from '../../components/SkeletonText'
import type { Transaction } from '../../api/types'
import { formatMoney, formatShortDate } from '../../lib/format'

type Props = { transactions: Transaction[]; search: string; onSearchChange: (value: string) => void; loading?: boolean }
export function TransactionList({ transactions, search, onSearchChange, loading = false }: Props) {
  const query = search.trim().toLowerCase()
  // Search only the eight most recent loaded transactions, as allowed by D6.
  const matches = transactions.filter(item => item.description.toLowerCase().includes(query) || item.category.toLowerCase().includes(query))
    .slice().sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  return <section className="panel transactions-panel" aria-labelledby="transactions-title" aria-hidden={loading || undefined}>
    <h2 id="transactions-title">Recent transactions</h2>
    <div className="transaction-search"><label className="sr-only" htmlFor="transaction-search">Search transactions</label>
      <input id="transaction-search" type="search" disabled={loading} placeholder="Search transactions" value={search} onChange={event => onSearchChange(event.target.value)} />
      {search && <button type="button" className="clear-search" onClick={() => onSearchChange('')}>Clear search</button>}
    </div>
    <p className="muted transaction-count" role="status">{loading ? 8 : matches.length} {matches.length === 1 ? 'transaction' : 'transactions'}{query ? ' match your search' : ' shown'}</p>
    {loading ? <ul className="transaction-list">{Array.from({ length: 8 }, (_, index) => <li className="transaction-row" key={index}>
      <div className="transaction-details"><h3><SkeletonText>Transaction</SkeletonText></h3><p className="muted"><SkeletonText>Category · Date</SkeletonText></p></div>
      <div className="transaction-value"><span className="amount"><SkeletonText>SGD 000.00</SkeletonText></span></div>
    </li>)}</ul> : matches.length === 0 ? <p className="empty-state">{query ? 'No transactions match your search.' : 'No transactions yet.'}</p> : <ul className="transaction-list">
      {matches.map(item => <li className="transaction-row" key={item.id}>
        <div className="transaction-details"><h3>{item.description}</h3><p className="muted"><span className="category">{item.category}</span> · <time dateTime={item.date}>{formatShortDate(item.date)}</time></p></div>
        <div className="transaction-value"><span className={`amount ${item.direction === 'in' ? 'money-in' : ''}`}>{item.direction === 'in' ? '+' : '-'}{formatMoney(item.amount)}</span>{item.status === 'pending' && <span className="pending-chip">Pending</span>}</div>
      </li>)}
    </ul>}
  </section>
}
