import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Initialize the Supabase client with the Service Role Key.
// WARNING: This key bypasses Row Level Security (RLS) policies.
// It should only be used on the server side to perform administrative or AI orchestration tasks.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
