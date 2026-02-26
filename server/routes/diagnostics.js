const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

// GET /api/diagnostics/supabase — return counts for key tables
router.get('/supabase', async (req, res) => {
  try {
    const [{ count: entriesCount }, { count: participantsCount }, { data: eventDays }] = await Promise.all([
      supabase.from('entries').select('*', { count: 'exact' }),
      supabase.from('participants').select('*', { count: 'exact' }),
      supabase.from('event_days').select('*'),
    ]);

    res.json({
      ok: true,
      counts: {
        entries: entriesCount || 0,
        participants: participantsCount || 0,
      },
      eventDays: eventDays || [],
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

module.exports = router;
