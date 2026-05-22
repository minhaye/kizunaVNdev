const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('--- Checking for settings tables ---');
  const likelyTables = ['settings', 'user_settings', 'preferences'];
  for (const table of likelyTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(Table found: \);
    } else if (error.code !== '42P01') {
      console.log(Table \ error: \);
    }
  }

  const focusTables = ['notifications', 'employees', 'admins'];
  for (const table of focusTables) {
    console.log(\n--- Columns for \ ---);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(Error querying \: \);
    } else if (data && data.length > 0) {
      console.log(\ columns:, Object.keys(data[0]));
      if (table === 'notifications') {
        console.log(Sample notification row keys:, Object.keys(data[0]));
      }
    } else {
       // If no data, we might need another way to find columns, 
       // but typically select('*') with limit 0 or 1 is the best way without direct schema access in anon
       console.log(No data in \ to infer columns.);
       // Try a head-only request to see if we can get any info, though JS client doesn't expose headers easily
    }
  }
}

run();
