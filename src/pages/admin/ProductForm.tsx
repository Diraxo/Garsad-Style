import { useState, type FormEvent } from 'react'
import type { Category, Product } from '../../types'
import { ImageUpload } from '../../components/common/ImageUpload'
import { Spinner } from '../../components/common/Basics'

export interface ProductFormValues {
  name: string
  brand: string
  categoryId: string
  sku: string
  size: string
  color: string
  purchaseCost: string
  sellingPrice: string
  quantity: string
  description: string
}

/** What to do about the image, decided in this form but executed by the caller (Products.tsx) once it has a real product ID. */
export type ImageIntent =
  | { kind: 'unchanged' }
  | { kind: 'upload'; file: File }
  | { kind: 'remove' }

export function ProductForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  categories: Category[]
  initial?: Product
  submitLabel: string
  onSubmit: (values: ProductFormValues, image: ImageIntent) => Promise<void>
  onCancel: () => void
}) {
  const [values, setValues] = useState<ProductFormValues>({
    name: initial?.name ?? '',
    brand: initial?.brand ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    sku: initial?.sku ?? '',
    size: initial?.size ?? '',
    color: initial?.color ?? '',
    purchaseCost: initial?.purchaseCost?.toString() ?? '',
    sellingPrice: initial?.sellingPrice?.toString() ?? '',
    quantity: initial?.quantity?.toString() ?? '',
    description: initial?.description ?? '',
  })
  const [pendingFile, setPendingFile] = useState<File | undefined>()
  const [removeExisting, setRemoveExisting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  type NumericField = 'purchaseCost' | 'sellingPrice' | 'quantity'

  function validateNumericField(key: NumericField, raw: string): string | undefined {
    const n = Number(raw)
    const isEmpty = raw.trim() === ''
    if (key === 'purchaseCost') {
      if (isEmpty || !Number.isFinite(n) || n < 0) return 'Enter a valid purchase cost.'
    }
    if (key === 'sellingPrice') {
      if (isEmpty || !Number.isFinite(n) || n <= 0) return 'Enter a valid selling price.'
    }
    if (key === 'quantity') {
      if (isEmpty || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) return 'Enter a valid quantity.'
    }
    return undefined
  }

  /** Updates a numeric field and, if it currently shows an error, immediately clears it once the new value is valid. */
  function setNumeric(key: NumericField, val: string) {
    set(key, val)
    setErrors((prev) => {
      if (!prev[key]) return prev
      if (validateNumericField(key, val)) return prev
      const { [key]: _removed, ...rest } = prev
      return rest
    })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!values.name.trim()) e.name = 'Product name is required.'
    if (!values.categoryId) e.categoryId = 'Choose a category.'
    if (!values.sku.trim()) e.sku = 'SKU is required.'
    const purchaseCostError = validateNumericField('purchaseCost', values.purchaseCost)
    if (purchaseCostError) e.purchaseCost = purchaseCostError
    const sellingPriceError = validateNumericField('sellingPrice', values.sellingPrice)
    if (sellingPriceError) e.sellingPrice = sellingPriceError
    const quantityError = validateNumericField('quantity', values.quantity)
    if (quantityError) e.quantity = quantityError
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function numericInputClass(key: NumericField) {
    return `input${errors[key] ? ' border-crit-600 focus:border-crit-600 focus:ring-crit-100' : ''}`
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    const image: ImageIntent = pendingFile
      ? { kind: 'upload', file: pendingFile }
      : removeExisting
        ? { kind: 'remove' }
        : { kind: 'unchanged' }
    try {
      await onSubmit(values, image)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-[220px_1fr] gap-5">
        <div>
          <span className="label">Product image</span>
          <ImageUpload
            existingKey={initial?.imageUrl}
            pendingFile={pendingFile}
            markedForRemoval={removeExisting}
            onSelectFile={(file) => { setPendingFile(file); setRemoveExisting(false) }}
            onRemoveExisting={() => { setRemoveExisting(true); setPendingFile(undefined) }}
            onCancelPendingFile={() => setPendingFile(undefined)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Product name</label>
            <input className="input" value={values.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Air Max 90" />
            {errors.name && <p className="text-xs text-crit-600 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="label">Brand</label>
            <input className="input" value={values.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Nike" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-crit-600 mt-1">{errors.categoryId}</p>}
          </div>
          <div>
            <label className="label">SKU / Product code</label>
            <input className="input font-mono" value={values.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. SH-0001" />
            {errors.sku && <p className="text-xs text-crit-600 mt-1">{errors.sku}</p>}
          </div>
          <div>
            <label className="label">Size <span className="text-ink-400 normal-case font-normal">(optional)</span></label>
            <input className="input" value={values.size} onChange={(e) => set('size', e.target.value)} placeholder="e.g. 43 or L" />
          </div>
          <div>
            <label className="label">Color <span className="text-ink-400 normal-case font-normal">(optional)</span></label>
            <input className="input" value={values.color} onChange={(e) => set('color', e.target.value)} placeholder="e.g. Black" />
          </div>
          <div>
            <label className="label">Purchase cost (ETB)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className={numericInputClass('purchaseCost')}
              value={values.purchaseCost}
              onChange={(e) => setNumeric('purchaseCost', e.target.value)}
              placeholder="3000"
            />
            {errors.purchaseCost && <p className="text-xs text-crit-600 mt-1">{errors.purchaseCost}</p>}
          </div>
          <div>
            <label className="label">Selling price (ETB)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className={numericInputClass('sellingPrice')}
              value={values.sellingPrice}
              onChange={(e) => setNumeric('sellingPrice', e.target.value)}
              placeholder="4500"
            />
            {errors.sellingPrice && <p className="text-xs text-crit-600 mt-1">{errors.sellingPrice}</p>}
          </div>
          <div>
            <label className="label">{initial ? 'Current quantity' : 'Initial quantity'}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              className={numericInputClass('quantity')}
              value={values.quantity}
              onChange={(e) => setNumeric('quantity', e.target.value)}
              placeholder="10"
            />
            {errors.quantity && <p className="text-xs text-crit-600 mt-1">{errors.quantity}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description / notes <span className="text-ink-400 normal-case font-normal">(optional)</span></label>
            <textarea className="input" rows={2} value={values.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-ink-100 mt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Spinner /> : submitLabel}
        </button>
      </div>
    </form>
  )
}
