const express = require('express');
const supabase = require('../lib/supabase');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /api/event-days — get all event days
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('event_days')
            .select('*')
            .order('id', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        console.error('Event days fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch event days' });
    }
});

// POST /api/event-days/activate — activate a specific day (1 or 2)
router.post('/activate', authMiddleware, async (req, res) => {
    try {
        const { dayId } = req.body;
        if (!dayId || ![1, 2].includes(dayId)) {
            return res.status(400).json({ error: 'Invalid day ID. Must be 1 or 2.' });
        }

        // Deactivate all days first
        const { error: resetError } = await supabase
            .from('event_days')
            .update({ is_active: false })
            .in('id', [1, 2]);

        if (resetError) return res.status(500).json({ error: resetError.message });

        // Activate selected day
        const { data, error } = await supabase
            .from('event_days')
            .update({ is_active: true })
            .eq('id', dayId)
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });

        res.json({ message: `Day ${dayId} is now ACTIVE`, day: data });
    } catch (err) {
        console.error('Activate day error:', err);
        res.status(500).json({ error: 'Failed to activate day' });
    }
});

// POST /api/event-days/deactivate — deactivate all days
router.post('/deactivate', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('event_days')
            .update({ is_active: false })
            .in('id', [1, 2]);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'All event days deactivated' });
    } catch (err) {
        console.error('Deactivate error:', err);
        res.status(500).json({ error: 'Failed to deactivate days' });
    }
});

module.exports = router;
