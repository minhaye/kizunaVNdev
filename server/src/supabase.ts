// server/src/supabase.ts
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const keyToUse = env.supabaseServiceRoleKey && env.supabaseServiceRoleKey.length > 0 ? env.supabaseServiceRoleKey : env.supabaseAnonKey;

export const supabase = createClient(env.supabaseUrl, keyToUse, {
  realtime: {
    transport: WebSocket,
  },
});