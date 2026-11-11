import { useQuery } from '@tanstack/react-query'
import { healthQuery } from '../../api/queries'

export function DashboardShell() {
  const health = useQuery(healthQuery)
  const status = health.isPending ? 'checking…' : health.isError ? 'not connected' : 'connected'
  return <main id="main" className="dashboard" tabIndex={-1}>
    <div className="greeting"><p className="eyebrow">YOUR OVERVIEW</p><h1>Good evening, Ava</h1><p>Your everyday banking, in one place.</p></div>
    <div className="dashboard-grid"><div className="main-column">
      <section className="balance-hero" aria-labelledby="balance-title"><p id="balance-title">Total available</p><p className="balance-placeholder" aria-label="Account data not loaded">—</p><p>Across 2 deposit accounts</p><button className="transfer-button" type="button" disabled>New transfer</button></section>
      <section className="panel" aria-labelledby="accounts-title"><h2 id="accounts-title">Accounts</h2><div className="account-placeholders" aria-hidden="true">{[1,2,3].map(id => <div className="account-placeholder" key={id}><span className="placeholder-line" /><span className="placeholder-line short" /></div>)}</div><p className="muted">Your accounts will appear here.</p></section>
      <section className="panel" aria-labelledby="transactions-title"><h2 id="transactions-title">Recent transactions</h2><p className="muted">Your recent activity will appear here.</p></section>
    </div><aside className="panel limit-panel" aria-labelledby="limit-title"><h2 id="limit-title">Daily transfer limit</h2><p className="muted">Your remaining limit will appear here.</p><p className="muted">Resets daily. Applies to all transfers.</p></aside></div>
    <p className="api-status" role="status">Mock API: {status}</p>
  </main>
}
