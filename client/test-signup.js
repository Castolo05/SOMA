import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xsvvxczpwctkctbgplok.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdnZ4Y3pwd2N0a2N0YmdwbG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4Mzg1NTgsImV4cCI6MjEwMzQxNDU1OH0.CKnK6oOAN141y9R-Lg-YNxerzwTJCI_QRF-a75oY4-Q'
)

async function test() {
  const email = `test_${Date.now()}@example.com`
  console.log('Signing up:', email)
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: { name: 'Test User', role: 'PATIENT' }
    }
  })
  
  if (error) {
    console.error('Signup error:', error.message)
    return
  }
  
  console.log('Signup success! User ID:', data.user.id)
  
  // Wait 1 sec
  await new Promise(r => setTimeout(r, 1000))
  
  console.log('Fetching profile for ID:', data.user.id)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()
    
  if (profileErr) {
    console.error('Profile fetch error:', profileErr.message)
  } else {
    console.log('Profile found:', profile)
  }
}

test()
