import { useEffect, useState } from 'react'
import { imageService } from '../../services/imageService'

/**
 * Resolves a private R2 object key to a short-lived signed URL and renders
 * it. Renders nothing while resolving or when there's no image — same as
 * the old `{p.imageUrl && <img ... />}` pattern, so it drops straight into
 * the existing bg-ink-100 placeholder containers without any layout change.
 */
export function ProductImage({
  imageKey,
  alt = '',
  className = '',
}: {
  imageKey?: string
  alt?: string
  className?: string
}) {
  const [url, setUrl] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    setUrl(undefined)
    if (!imageKey) return
    imageService
      .getDisplayUrls([imageKey])
      .then((map) => {
        if (active) setUrl(map[imageKey])
      })
      .catch(() => {
        if (active) setUrl(undefined)
      })
    return () => {
      active = false
    }
  }, [imageKey])

  if (!url) return null
  return <img src={url} alt={alt} className={className} />
}
