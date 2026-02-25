const express = require('express');
const supabase = require('../lib/supabase');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /api/stats — day-wise stats breakdown
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Total participants
        const { count: totalParticipants } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true });

        // Emails sent
        const { count: emailsSent } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('email_sent', true);

        // Day 1 entries
        const { count: day1Entries } = await supabase
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('event_day', 1);

        // Day 2 entries
        const { count: day2Entries } = await supabase
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('event_day', 2);

        // Active day
        const { data: activeDay } = await supabase
            .from('event_days')
            .select('*')
            .eq('is_active', true)
            .single();

        res.json({
            totalParticipants: totalParticipants || 0,
            emailsSent: emailsSent || 0,
            day1Entries: day1Entries || 0,
            day2Entries: day2Entries || 0,
            day1Remaining: (totalParticipants || 0) - (day1Entries || 0),
            day2Remaining: (totalParticipants || 0) - (day2Entries || 0),
            totalEntries: (day1Entries || 0) + (day2Entries || 0),
            activeDay: activeDay || null,
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
