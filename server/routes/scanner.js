const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

// POST /api/scanner/verify — day-aware scan verification
router.post('/verify', async (req, res) => {
    try {
        const { participant_id, scanned_by } = req.body;

        // Step 1: Validate input
        if (!participant_id) {
            return res.json({ status: 'error', message: 'No participant ID provided' });
        }

        // Step 2: Check participant exists
        const { data: participant, error: pErr } = await supabase
            .from('participants')
            .select('*')
            .eq('participant_id', participant_id)
            .single();

        if (pErr || !participant) {
            return res.json({
                status: 'invalid',
                message: 'Invalid QR Code — Participant not found',
            });
        }

        // Step 3: Get active event day
        const { data: activeDay, error: dErr } = await supabase
            .from('event_days')
            .select('*')
            .eq('is_active', true)
            .single();

        if (dErr || !activeDay) {
            return res.json({
                status: 'inactive',
                message: 'No active event day. Contact admin.',
            });
        }

        // Step 4: Check if already scanned today
        const { data: existingEntry } = await supabase
            .from('entries')
            .select('*')
            .eq('participant_id', participant_id)
            .eq('event_day', activeDay.id)
            .single();

        if (existingEntry) {
            return res.json({
                status: 'duplicate',
                message: `Already Entered for Day ${activeDay.id}`,
                first_scan_time: existingEntry.scanned_at,
                event_day: activeDay.id,
                day_label: activeDay.label,
                participant: {
                    name: participant.name,
                    college_name: participant.college_name,
                    participant_id: participant.participant_id,
                    email: participant.email,
                },
            });
        }

        // Step 4b: Check if attended other day (for info badge)
        const otherDay = activeDay.id === 1 ? 2 : 1;
        const { data: otherDayEntry } = await supabase
            .from('entries')
            .select('scanned_at')
            .eq('participant_id', participant_id)
            .eq('event_day', otherDay)
            .single();

        // Step 5: Insert new entry
        const { data: newEntry, error: insertErr } = await supabase
            .from('entries')
            .insert({
                participant_id: participant.participant_id,
                name: participant.name,
                college_name: participant.college_name,
                email: participant.email,
                event_day: activeDay.id,
                scanned_at: new Date().toISOString(),
                scanned_by: scanned_by || 'Gate Scanner',
            })
            .select()
            .single();

        if (insertErr) {
            return res.status(500).json({
                status: 'error',
                message: `Database error: ${insertErr.message}`,
            });
        }

        res.json({
            status: 'success',
            message: 'Entry Granted',
            event_day: activeDay.id,
            day_label: activeDay.label,
            scanned_at: newEntry.scanned_at,
            also_attended_other_day: otherDayEntry ? otherDay : null,
            participant: {
                name: participant.name,
                college_name: participant.college_name,
                participant_id: participant.participant_id,
                email: participant.email,
            },
        });
    } catch (err) {
        console.error('Scanner error:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;
