import { SkeletonText } from '../../components/SkeletonText'
import { formatMoney } from '../../lib/format'

type Props = { total?: number; depositCount?: number; loading?: boolean; onTransfer?: () => void }
export function BalanceHero({ total = 0, depositCount = 0, loading = false, onTransfer }: Props) {
  return <section className="balance-hero" aria-labelledby="balance-title" aria-hidden={loading || undefined}>
    <p id="balance-title">Total available</p>
    <p className="balance-placeholder amount">{loading ? <SkeletonText>SGD 00,000.00</SkeletonText> : formatMoney(total)}</p>
    <p>{loading ? <SkeletonText>Across 2 deposit accounts</SkeletonText> : `Across ${depositCount} deposit accounts`}</p>
    <button className="transfer-button" type="button" disabled={loading || depositCount === 0} onClick={onTransfer}>New transfer</button>
  </section>
}
