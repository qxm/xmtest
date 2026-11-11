// Run before CSS and React to avoid a flash of the wrong theme.
(() => {
  let theme
  let segment
  try { theme = localStorage.getItem('meridian.theme') } catch { /* Storage can be unavailable. */ }
  try { segment = localStorage.getItem('meridian.segment') } catch { /* Use the default. */ }
  const root = document.documentElement
  root.dataset.theme = theme === 'light' || theme === 'dark' ? theme
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  root.dataset.segment = segment === 'premium' ? 'premium' : 'retail'
})()
