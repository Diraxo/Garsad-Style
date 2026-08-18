import { getStockStatus } from '../../types'

export function StockBadge({ quantity, threshold = 5 }: { quantity: number; threshold?: number }) {
  const status = getStockStatus(quantity, threshold)
  const map = {
    normal: { cls: 'bg-ok-100 text-ok-700', text: `${quantity} in stock` },
    warning: { cls: 'bg-warn-100 text-warn-700', text: `${quantity} remaining` },
    critical: { cls: 'bg-crit-100 text-crit-700', text: `1 remaining` },
    sold_out: { cls: 'bg-ink-800 text-white', text: 'SOLD OUT' },
  } as const
  const cfg = map[status]
  return <span className={`tag ${cfg.cls}`}>{cfg.text}</span>
}
