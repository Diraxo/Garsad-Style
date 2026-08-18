import { useEffect, useState } from 'react'
import type { PaymentMethod, Product } from '../../types'
import { Spinner } from '../../components/common/Basics'
import { ProductImage } from '../../components/common/ProductImage'
import { paymentMethodService } from '../../services/paymentMethodService'
import { salesService } from '../../services/salesService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export function RecordSale({ product, onDone, onCancel }: { product: Product; onDone: () => void; onCancel: () => void }) {
  const { user } = useAuth()
  const { show } = useToast()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(product.sellingPrice.toString())
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    paymentMethodService
      .list(true)
      .then((list) => {
        setMethods(list)
        setPaymentMethodId(list[0]?.id ?? '')
      })
      .catch(() => setError('Unable to load payment methods. Please close this and try again.'))
  }, [])

  const parsedPrice = Number(price) || 0
  const total = parsedPrice * quantity

  function changeQty(delta: number) {
    setQuantity((q) => Math.min(product.quantity, Math.max(1, q + delta)))
  }

  async function handleConfirm() {
    setError('')
    if (!user) return
    if (quantity < 1 || quantity > product.quantity) {
      setError(`Choose a quantity between 1 and ${product.quantity}.`)
      return
    }
    if (!parsedPrice || parsedPrice <= 0) {
      setError('Enter a valid sale price.')
      return
    }
    if (!paymentMethodId) {
      setError('Select a payment method.')
      return
    }
    setSubmitting(true)
    const result = await salesService.recordSale({
      productId: product.id,
      quantity,
      actualPrice: parsedPrice,
      paymentMethodId,
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not record this sale.')
      return
    }
    show('Sale recorded successfully.')
    onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="h-16 w-16 rounded-xl2 bg-ink-100 overflow-hidden shrink-0">
          {product.imageUrl && <ProductImage imageKey={product.imageUrl} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-ink-900 truncate">{product.name}</p>
          <p className="text-xs font-mono text-ink-400">{product.sku}</p>
          <p className="text-sm text-ink-500 mt-0.5">Normal price: {product.sellingPrice.toLocaleString()} ETB · {product.quantity} available</p>
        </div>
      </div>

      <div>
        <label className="label">Quantity</label>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-secondary !px-4 !py-3 text-lg" onClick={() => changeQty(-1)} disabled={quantity <= 1}>−</button>
          <span className="font-display text-2xl font-bold w-12 text-center">{quantity}</span>
          <button type="button" className="btn-secondary !px-4 !py-3 text-lg" onClick={() => changeQty(1)} disabled={quantity >= product.quantity}>+</button>
          <span className="text-xs text-ink-400 ml-1">max {product.quantity}</span>
        </div>
      </div>

      <div>
        <label className="label">Actual sale price (per unit, ETB)</label>
        <input
          className="input text-lg font-semibold"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
        />
        <p className="text-xs text-ink-400 mt-1">Enter what the customer actually pays, after any negotiation.</p>
      </div>

      <div>
        <label className="label">Payment method</label>
        <div className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaymentMethodId(m.id)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                paymentMethodId === m.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-ink-300'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-ink-50 rounded-lg p-3.5 space-y-1 text-sm">
        <div className="flex justify-between text-ink-500"><span>Quantity</span><span>{quantity}</span></div>
        <div className="flex justify-between text-ink-500"><span>Unit price</span><span>{parsedPrice.toLocaleString()} ETB</span></div>
        <div className="flex justify-between font-semibold text-ink-900 text-base pt-1 border-t border-ink-200 mt-1">
          <span>Total</span><span>{total.toLocaleString()} ETB</span>
        </div>
      </div>

      {error && <p className="text-sm text-crit-600 bg-crit-100 rounded-lg px-3 py-2.5">{error}</p>}

      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button className="btn-primary flex-1" onClick={handleConfirm} disabled={submitting}>
          {submitting ? <Spinner /> : 'Confirm sale'}
        </button>
      </div>
    </div>
  )
}
