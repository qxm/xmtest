import { AppHeader } from './components/AppHeader'
import { DashboardShell } from './features/dashboard/DashboardShell'

export default function App() {
  return <><a className="skip-link" href="#main">Skip to content</a><AppHeader /><DashboardShell /></>
}
