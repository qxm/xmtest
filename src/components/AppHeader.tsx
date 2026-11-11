import { PreferenceControls } from '../features/preferences/PreferenceControls'

export function AppHeader() {
  return <header className="app-header"><div className="header-inner">
    <a className="wordmark" href="#main"><span className="logo-mark" aria-hidden="true">M</span>Meridian</a>
    <nav aria-label="Main navigation"><a href="#main" aria-current="page">Overview</a>
      {['Cards', 'Payments', 'Insights'].map(label => <button type="button" key={label} disabled>{label}</button>)}
    </nav>
    <PreferenceControls /><span className="avatar" aria-label="Ava Chen">AC</span>
  </div></header>
}
