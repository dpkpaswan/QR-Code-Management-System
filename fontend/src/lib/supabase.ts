import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for API routes)
export const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export type Participant = {
  id: string;
  participant_id: string;
  name: string;
  college_name: string | null;
  email: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
};

export type Entry = {
  id: string;
  participant_id: string;
  name: string | null;
  college_name: string | null;
  email: string | null;
  event_day: number;
  scanned_at: string;
  scanned_by: string | null;
};

export type EventDay = {
  id: number;
  label: string;
  event_date: string;
  is_active: boolean;
};