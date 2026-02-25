import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { day_id } = await request.json();
    const supabase = createServiceClient();

    // Deactivate all
    await supabase.from('event_days').update({ is_active: false }).neq('id', 0);

    if (day_id !== null) {
      // Activate selected
      await supabase.from('event_days').update({ is_active: true }).eq('id', day_id);
    }

    const { data, error } = await supabase.from('event_days').select('*').order('id');
    if (error) throw error;

    return NextResponse.json({ success: true, days: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update day' }, { status: 500 });
  }
}