// server/src/supabase.ts
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
	realtime: {
		transport: WebSocket,
	},
});