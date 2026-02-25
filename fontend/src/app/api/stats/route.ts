import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [totalRes, emailSentRes, day1Res, day2Res, activeDayRes] = await Promise.all([
      supabase?.from('participants')?.select('*', { count: 'exact', head: true }),
      supabase?.from('participants')?.select('*', { count: 'exact', head: true })?.eq('email_sent', true),
      supabase?.from('entries')?.select('*', { count: 'exact', head: true })?.eq('event_day', 1),
      supabase?.from('entries')?.select('*', { count: 'exact', head: true })?.eq('event_day', 2),
      supabase?.from('event_days')?.select('*')?.eq('is_active', true)?.limit(1),
    ]);

    return NextResponse?.json({
      total: totalRes?.count ?? 0,
      emailSent: emailSentRes?.count ?? 0,
      day1Entries: day1Res?.count ?? 0,
      day2Entries: day2Res?.count ?? 0,
      activeDay: activeDayRes?.data?.[0] ?? null,
    });
  } catch (error) {
    return NextResponse?.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}