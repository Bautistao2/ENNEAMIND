/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://twwzgbjghrtskstgrdqs.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3d3pnYmpnaHJ0c2tzdGdyZHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NDYzNjksImV4cCI6MjA2MDIyMjM2OX0.da6t6wmPi7NQm0bijhNWLYeDcPSjJkwhuO2_w_f2-0I',
  },
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
