import { useQuery } from '@tanstack/react-query'
import { customerQuery } from '../api/queries'
import { PreferenceControls } from '../features/preferences/PreferenceControls'

export function AppHeader() {
  const { data } = useQuery(customerQuery)
  const customer = data?.customer
  const fullName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : 'Customer profile'
  const initials = customer ? `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase() : '—'

  return <header className="app-header"><div className="header-inner">
    <a className="wordmark" href="#main"><span className="logo-mark" aria-hidden="true">M</span>Meridian</a>
    <nav aria-label="Main navigation"><a href="#main" aria-current="page">Overview</a>
      {['Cards', 'Payments', 'Insights'].map(label => <button type="button" key={label} disabled>{label}</button>)}
    </nav>
    <PreferenceControls defaultSegment={customer?.segment} /><span className="avatar" aria-label={fullName}>{initials}</span>
  </div></header>
}
