const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://trcborqqqvdcdxqurlxg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyY2JvcnFxcXZkY2R4cXVybHhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk2NTY1MywiZXhwIjoyMDkzNTQxNjUzfQ.E_ZIDCfUC6S7EWUlZJu6kjlWcW1H-UgwacaBhrGIZ7Q' // SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.from('posts').select('*').limit(5);
  console.log("posts:", data);
  if (error) console.error("error:", error);

  // Let's try to insert dummy rows with different statuses to see the exact error
  // First, we need a valid user id for created_by
  const { data: users } = await supabase.from('employees').select('id').limit(1);
  if (users && users.length > 0) {
    const userId = users[0].id;
    const testStatuses = ['pending', 'approve', 'approved', 'reject', 'rejected', 'in_progress', 'completed', 'active', 'inactive'];
    
    for (const st of testStatuses) {
       const { error: insErr } = await supabase.from('posts').insert({
         title: 'Test',
         content: 'Test content',
         created_by: userId,
         status: st
       });
       console.log(`Insert with status '${st}' ->`, insErr ? insErr.message : "SUCCESS!");
       
       if (!insErr) {
          // Cleanup
          await supabase.from('posts').delete().match({ title: 'Test', status: st });
       }
    }
  }
}
run();
