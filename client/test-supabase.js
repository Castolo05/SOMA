import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xsvvxczpwctkctbgplok.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdnZ4Y3pwd2N0a2N0YmdwbG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg1NTgsImV4cCI6MjEwMzQxNDU1OH0.CKnK6oOAN141y9R-Lg-YNxerzwTJCI_QRF-a75oY4-Q'
)

async function test() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1)
  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
  console.log('Success! Tables exist.')
}

test()
