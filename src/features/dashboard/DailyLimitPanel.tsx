import { SkeletonText } from '../../components/SkeletonText'
import { formatMoney } from '../../lib/format'

export function DailyLimitPanel({ remaining = 0, loading = false }: { remaining?: number; loading?: boolean }) {
  return <aside className="panel limit-panel" aria-labelledby="limit-title" aria-hidden={loading || undefined}>
    <h2 id="limit-title">Daily transfer limit</h2>
    <p className="limit-amount amount">{loading ? <SkeletonText>SGD 0,000.00</SkeletonText> : formatMoney(remaining)}</p>
    <p className="muted">remaining today</p><p className="muted">Resets daily. Applies to all transfers.</p>
  </aside>
}
