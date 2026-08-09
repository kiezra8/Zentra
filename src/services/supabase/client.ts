import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Guard: if not configured, return a mock-safe client
const isConfigured = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co'

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

export { isConfigured as isSupabaseConfigured }
