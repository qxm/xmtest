import { AccountCards } from './AccountCards'
import { BalanceHero } from './BalanceHero'
import { DailyLimitPanel } from './DailyLimitPanel'
import { TransactionList } from './TransactionList'

export function DashboardSkeleton() {
  return <div className="dashboard-grid" aria-busy="true" aria-label="Loading dashboard">
    <p className="sr-only" role="status">Loading your dashboard…</p>
    <div className="main-column">
      <BalanceHero loading />
      <AccountCards loading />
      <TransactionList transactions={[]} search="" onSearchChange={() => {}} loading />
    </div>
    <DailyLimitPanel loading />
  </div>
}
