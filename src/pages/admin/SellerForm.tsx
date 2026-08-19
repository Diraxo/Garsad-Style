import { useState, type FormEvent } from 'react'
import { Spinner } from '../../components/common/Basics'

export interface SellerFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export interface ServerFieldError {
  field: 'email'
  message: string
}

export function SellerForm({
  submitLabel,
  serverError,
  onSubmit,
  onDismissServerError,
  onCancel,
}: {
  submitLabel: string
  serverError?: ServerFieldError | null
  onSubmit: (values: SellerFormValues) => Promise<void>
  onDismissServerError: () => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<SellerFormValues>({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof SellerFormValues>(key: K, val: SellerFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }))
    if (key === 'email' && serverError?.field === 'email') onDismissServerError()
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!values.name.trim()) e.name = 'Seller name is required.'
    if (!values.email.trim()) {
      e.email = 'Email is required.'
    } else if (!EMAIL_RE.test(values.email.trim())) {
      e.email = 'Enter a valid email address.'
    }
    if (!values.password) {
      e.password = 'Password is required.'
    } else if (values.password.length < MIN_PASSWORD_LENGTH) {
      e.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (!values.confirmPassword) {
      e.confirmPassword = 'Please confirm the password.'
    } else if (values.password && values.confirmPassword !== values.password) {
      e.confirmPassword = 'Passwords do not match.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setSubmitting(false)
    }
  }

  const emailError = errors.email || (serverError?.field === 'email' ? serverError.message : undefined)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Seller name</label>
        <input
          className={`input${errors.name ? ' border-crit-600 focus:border-crit-600 focus:ring-crit-100' : ''}`}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Amina Yusuf"
          autoComplete="off"
        />
        {errors.name && <p className="text-xs text-crit-600 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="label">Gmail / email</label>
        <input
          type="email"
          className={`input${emailError ? ' border-crit-600 focus:border-crit-600 focus:ring-crit-100' : ''}`}
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="e.g. seller@gmail.com"
          autoComplete="off"
        />
        {emailError && <p className="text-xs text-crit-600 mt-1">{emailError}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className={`input${errors.password ? ' border-crit-600 focus:border-crit-600 focus:ring-crit-100' : ''}`}
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          {errors.password && <p className="text-xs text-crit-600 mt-1">{errors.password}</p>}
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input
            type="password"
            className={`input${errors.confirmPassword ? ' border-crit-600 focus:border-crit-600 focus:ring-crit-100' : ''}`}
            value={values.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
          {errors.confirmPassword && <p className="text-xs text-crit-600 mt-1">{errors.confirmPassword}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-ink-100 mt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><Spinner /> Creating seller…</> : submitLabel}
        </button>
      </div>
    </form>
  )
}
