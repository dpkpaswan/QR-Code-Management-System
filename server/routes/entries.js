const express = require('express');
const XLSX = require('xlsx');
const supabase = require('../lib/supabase');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /api/entries — get all entries
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .order('scanned_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    } catch (err) {
        console.error('Fetch entries error:', err);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// GET /api/entries/export — export 2-sheet Excel (Day 1 + Day 2)
router.get('/export', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .order('scanned_at', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        const formatRows = (entries) =>
            entries.map((e, i) => ({
                'S.NO': i + 1,
                'PARTICIPANT ID': e.participant_id,
                'NAME': e.name,
                'COLLEGE': e.college_name,
                'EMAIL': e.email || '',
                'SCANNED AT': new Date(e.scanned_at).toLocaleString(),
                'SCANNED BY': e.scanned_by || '',
            }));

        const day1 = (data || []).filter((e) => e.event_day === 1);
        const day2 = (data || []).filter((e) => e.event_day === 2);

        const workbook = XLSX.utils.book_new();

        const colWidths = [
            { wch: 6 }, { wch: 18 }, { wch: 25 },
            { wch: 25 }, { wch: 28 }, { wch: 22 }, { wch: 15 },
        ];

        // Sheet 1 — Day 1
        const ws1 = XLSX.utils.json_to_sheet(formatRows(day1));
        ws1['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(workbook, ws1, 'Day 1 Entries');

        // Sheet 2 — Day 2
        const ws2 = XLSX.utils.json_to_sheet(formatRows(day2));
        ws2['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(workbook, ws2, 'Day 2 Entries');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=event_entries_export.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export entries' });
    }
});

module.exports = router;
