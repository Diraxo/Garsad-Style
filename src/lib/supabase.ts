import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill them in.'
  )
}

// Fail loudly (in the console) if the URL is malformed, instead of a vague login error later.
try {
  new URL(url)
} catch {
  throw new Error(`VITE_SUPABASE_URL is not a valid URL: "${url}"`)
}

// Single shared client. Only the service layer (src/services/*) should
// import this — components talk to services, never to Supabase directly.
export const supabase = createClient<Database>(url, key)
