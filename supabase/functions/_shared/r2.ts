// Cloudflare R2 signing helper, shared by the three r2-* functions.
// Credentials are read from Edge Function secrets (Deno.env) — set via
// `supabase secrets set ...` — and never touch the browser.
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required secret: ${name}`)
  return value
}

export function getR2Client() {
  return new AwsClient({
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    service: 's3',
    region: 'auto',
  })
}

export function getBucketBase(): string {
  const endpoint = env('R2_ENDPOINT').replace(/\/$/, '')
  const bucket = env('R2_BUCKET_NAME')
  return `${endpoint}/${bucket}`
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const ALLOWED_CONTENT_TYPES = Object.keys(EXT_BY_CONTENT_TYPE)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/** Deterministic, safe object key — never derived from the user's filename. */
export function buildObjectKey(productId: string, contentType: string): string {
  const ext = EXT_BY_CONTENT_TYPE[contentType]
  if (!ext) throw new Error('Unsupported image type')
  // productId comes from a uuid column we control; still guard against
  // anything that isn't a plain UUID before it goes into an object path.
  if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error('Invalid product id')
  return `products/${productId}/${crypto.randomUUID()}.${ext}`
}

/** Presigned PUT URL, valid briefly — just long enough for one upload. */
export async function presignPut(objectKey: string, contentType: string): Promise<string> {
  const client = getR2Client()
  const url = new URL(`${getBucketBase()}/${objectKey}`)
  url.searchParams.set('X-Amz-Expires', '300') // 5 minutes
  const signed = await client.sign(
    new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
    { aws: { signQuery: true } }
  )
  return signed.url
}

/** Presigned GET URL for displaying a private-bucket image in the browser. */
export async function presignGet(objectKey: string): Promise<string> {
  const client = getR2Client()
  const url = new URL(`${getBucketBase()}/${objectKey}`)
  url.searchParams.set('X-Amz-Expires', '3600') // 1 hour
  const signed = await client.sign(new Request(url, { method: 'GET' }), { aws: { signQuery: true } })
  return signed.url
}

/** Deletes an object directly (server-side; DELETE is not presigned to the browser). */
export async function deleteObject(objectKey: string): Promise<void> {
  const client = getR2Client()
  const url = `${getBucketBase()}/${objectKey}`
  const res = await client.fetch(url, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed with status ${res.status}`)
  }
}
