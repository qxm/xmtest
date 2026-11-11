export function DashboardSkeleton() {
  return <div className="dashboard-grid" aria-busy="true" aria-label="Loading dashboard">
    <p className="sr-only" role="status">Loading your dashboard…</p>
    <div className="main-column" aria-hidden="true">
      <div className="balance-hero skeleton-hero"><span className="placeholder-line short" /><span className="placeholder-line skeleton-total" /><span className="placeholder-line short" /></div>
      <div className="panel"><h2>Accounts</h2><div className="account-cards">{[1,2,3].map(id => <div className="account-card" key={id}>{[1,2,3,4].map(line => <span className="placeholder-line" key={line} />)}</div>)}</div></div>
      <div className="panel"><h2>Recent transactions</h2><div className="skeleton-search placeholder-line" />{Array.from({ length: 8 }, (_, id) => <div className="transaction-row skeleton-row" key={id}><span className="placeholder-line" /></div>)}</div>
    </div>
    <aside className="panel" aria-hidden="true"><h2>Daily transfer limit</h2><span className="placeholder-line" /><span className="placeholder-line short" /></aside>
  </div>
}
