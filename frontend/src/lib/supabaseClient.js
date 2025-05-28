import { createClient } from '@supabase/supabase-js'

// Use environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://twwzgbjghrtskstgrdqs.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3d3pnYmpnaHJ0c2tzdGdyZHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NDYzNjksImV4cCI6MjA2MDIyMjM2OX0.da6t6wmPi7NQm0bijhNWLYeDcPSjJkwhuO2_w_f2-0I'

// Create the Supabase client with additional options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
})

// Log initialization status to console
console.log('Supabase client initialized:', !!supabase)
