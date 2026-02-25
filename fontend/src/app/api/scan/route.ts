import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { qr_data, scanned_by } = await request.json();

    if (!qr_data) {
      return NextResponse.json({ status: 'invalid' });
    }

    const supabase = createServiceClient();
    const participant_id = qr_data.trim();

    // 1. Find participant
    const { data: participant, error: pErr } = await supabase
      .from('participants')
      .select('*')
      .eq('participant_id', participant_id)
      .single();

    if (pErr || !participant) {
      return NextResponse.json({ status: 'invalid' });
    }

    // 2. Find active day
    const { data: activeDays } = await supabase
      .from('event_days')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    const activeDay = activeDays?.[0];
    if (!activeDay) {
      return NextResponse.json({ status: 'inactive' });
    }

    // 3. Check duplicate
    const { data: existingEntry } = await supabase
      .from('entries')
      .select('*')
      .eq('participant_id', participant_id)
      .eq('event_day', activeDay.id)
      .single();

    if (existingEntry) {
      return NextResponse.json({
        status: 'duplicate',
        first_scan_time: existingEntry.scanned_at,
        participant,
        day_label: activeDay.label,
      });
    }

    // 4. Check other day attendance
    const { data: otherDayEntry } = await supabase
      .from('entries')
      .select('event_day')
      .eq('participant_id', participant_id)
      .neq('event_day', activeDay.id)
      .limit(1);

    const also_attended_day = otherDayEntry?.[0]?.event_day ?? null;

    // 5. Insert entry
    const scannedAt = new Date().toISOString();
    const { error: insertErr } = await supabase.from('entries').insert({
      participant_id: participant.participant_id,
      name: participant.name,
      college_name: participant.college_name,
      email: participant.email,
      event_day: activeDay.id,
      scanned_at: scannedAt,
      scanned_by: scanned_by || null,
    });

    if (insertErr) {
      return NextResponse.json({ status: 'error', error: insertErr.message });
    }

    return NextResponse.json({
      status: 'success',
      participant,
      day_label: activeDay.label,
      scanned_at: scannedAt,
      also_attended_day,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: 'Server error' }, { status: 500 });
  }
}