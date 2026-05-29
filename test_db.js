const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkDb() {
  console.log('Checking database...');
  
  // 1. Check users
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth Error:', authErr);
    return;
  }
  const users = authData?.users || [];
  console.log('Total Auth Users:', users.length);

  // 2. Check profiles
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) {
    console.error('Profiles Error:', profErr);
    return;
  }
  console.log('Total Profiles:', profiles?.length || 0);

  // 3. Fix missing profiles
  for (const u of users) {
    const hasProfile = profiles.some(p => p.id === u.id);
    if (!hasProfile) {
      console.log(`Profile missing for user ${u.email}. Creating...`);
      const { error: insertErr } = await supabase.from('profiles').insert({
        id: u.id,
        email: u.email,
        display_name: u.user_metadata?.display_name || u.email.split('@')[0]
      });
      console.log(`-> Insert result:`, insertErr ? insertErr.message : 'SUCCESS');
    }
  }

  console.log('Check complete!');
}

checkDb();
