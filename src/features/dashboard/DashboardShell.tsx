import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { accountsQuery, customerQuery, transactionsQuery } from '../../api/queries'
import { BalanceHero } from './BalanceHero'
import { DailyLimitPanel } from './DailyLimitPanel'
import { Greeting } from './Greeting'
import { AccountCards } from './AccountCards'
import { TransactionList } from './TransactionList'
import { DashboardSkeleton } from './DashboardSkeleton'
import { TransferDialog } from '../transfer/TransferDialog'

export function DashboardShell() {
  // All hooks run on the same render, so these requests start in parallel.
  const customer = useQuery(customerQuery)
  const accounts = useQuery(accountsQuery)
  const transactions = useQuery(transactionsQuery())
  const [search, setSearch] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)
  const failed = customer.isError || accounts.isError || transactions.isError
  const pending = customer.isPending || accounts.isPending || transactions.isPending
  const retrying = customer.isFetching || accounts.isFetching || transactions.isFetching

  function retry() {
    void Promise.all([customer.refetch(), accounts.refetch(), transactions.refetch()])
  }

  const deposits = accounts.data?.accounts.filter(account => account.type !== 'credit') ?? []
  const total = deposits.reduce((sum, account) => sum + account.balance, 0)
  const remaining = customer.data ? Math.max(0, customer.data.customer.dailyTransferLimit - customer.data.customer.transferredToday) : 0

  return <main id="main" className="dashboard" tabIndex={-1}>
    <div className="greeting"><p className="eyebrow">YOUR OVERVIEW</p><Greeting firstName={customer.data?.customer.firstName} /><p>Your everyday banking, in one place.</p></div>
    {failed ? <section className="panel dashboard-error" aria-labelledby="dashboard-error-title">
      <h2 id="dashboard-error-title" role="alert">We couldn't load your dashboard.</h2>
      <button className="action-button" type="button" onClick={retry} disabled={retrying}>{retrying ? 'Retrying…' : 'Retry'}</button>
    </section> : pending ? <DashboardSkeleton /> : <div className="dashboard-grid"><div className="main-column">
      <BalanceHero total={total} depositCount={deposits.length} onTransfer={() => setTransferOpen(true)} />
      <AccountCards accounts={accounts.data.accounts} />
      <TransactionList transactions={transactions.data.transactions} search={search} onSearchChange={setSearch} />
    </div><DailyLimitPanel remaining={remaining} limit={customer.data.customer.dailyTransferLimit} /></div>}
    {transferOpen && accounts.data && customer.data && <TransferDialog accounts={accounts.data.accounts} customer={customer.data.customer} onClose={() => setTransferOpen(false)} />}
  </main>
}
