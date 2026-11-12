import { SkeletonText } from '../../components/SkeletonText'
import { formatMoney } from '../../lib/format'

export function DailyLimitPanel({ remaining = 0, limit = 0, loading = false }: { remaining?: number; limit?: number; loading?: boolean }) {
  const maximum = Math.max(0, limit)
  const used = Math.min(maximum, Math.max(0, maximum - remaining))
  const percentage = maximum > 0 ? Math.round(used / maximum * 100) : 0
  return <aside className="panel limit-panel" aria-labelledby="limit-title" aria-hidden={loading || undefined}>
    <h2 id="limit-title">Daily transfer limit</h2>
    <p className="limit-amount amount">{loading ? <SkeletonText>SGD 0,000.00</SkeletonText> : formatMoney(remaining)}</p>
    <p className="muted">remaining today</p>
    <progress className="limit-progress" aria-label="Daily transfer limit used" max={maximum || 1} value={used} aria-valuetext={`${formatMoney(used)} of ${formatMoney(maximum)} used (${percentage}%)`} />
    <p className="muted limit-usage">{loading ? <SkeletonText>SGD 0.00 of SGD 0,000.00 used</SkeletonText> : `${formatMoney(used)} of ${formatMoney(maximum)} used`}</p>
    <p className="muted">Resets daily. Applies to all transfers.</p>
  </aside>
}
