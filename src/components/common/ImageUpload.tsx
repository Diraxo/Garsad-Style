import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../context/ToastContext'
import { ProductImage } from './ProductImage'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Fully controlled by the parent form — this component never talks to R2
 * or Supabase itself. It only lets the person pick a file (shown via a
 * TEMPORARY local blob preview, revoked on unmount/change) or mark the
 * existing image for removal. The actual upload/delete happens on Save,
 * once the parent knows the product's real ID — see ProductForm/Products.
 */
export function ImageUpload({
  existingKey,
  pendingFile,
  markedForRemoval,
  onSelectFile,
  onRemoveExisting,
  onCancelPendingFile,
}: {
  existingKey?: string
  pendingFile?: File
  markedForRemoval?: boolean
  onSelectFile: (file: File) => void
  onRemoveExisting: () => void
  onCancelPendingFile: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { show } = useToast()
  const [previewUrl, setPreviewUrl] = useState<string | undefined>()

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(undefined)
      return
    }
    const url = URL.createObjectURL(pendingFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      show('Please choose a JPEG, PNG, or WebP image.', 'error')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      show('Image is too large. Please choose an image smaller than 10 MB.', 'error')
      return
    }
    onSelectFile(file)
  }

  const showingExisting = !pendingFile && !!existingKey && !markedForRemoval

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {pendingFile && previewUrl ? (
        <div className="relative w-full aspect-square max-w-[220px] rounded-xl2 overflow-hidden border border-ink-200 bg-ink-50">
          <img src={previewUrl} alt="Selected preview" className="w-full h-full object-cover" />
          <span className="absolute top-2 left-2 tag bg-white/95 text-ink-600">Will upload on save</span>
          <div className="absolute bottom-2 left-2 right-2 flex gap-2">
            <button type="button" className="btn-secondary flex-1 !py-1.5 !text-xs bg-white/95" onClick={() => inputRef.current?.click()}>
              Choose different
            </button>
            <button type="button" className="btn-danger flex-1 !py-1.5 !text-xs" onClick={onCancelPendingFile}>
              Cancel
            </button>
          </div>
        </div>
      ) : showingExisting ? (
        <div className="relative w-full aspect-square max-w-[220px] rounded-xl2 overflow-hidden border border-ink-200 bg-ink-50">
          <ProductImage imageKey={existingKey} alt="Product" className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 right-2 flex gap-2">
            <button type="button" className="btn-secondary flex-1 !py-1.5 !text-xs bg-white/95" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn-danger flex-1 !py-1.5 !text-xs" onClick={onRemoveExisting}>
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-[220px] aspect-square rounded-xl2 border-2 border-dashed border-ink-200 flex flex-col items-center justify-center gap-2 text-ink-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-semibold">Add image</span>
        </button>
      )}
    </div>
  )
}
