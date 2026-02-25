const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const supabase = require('../lib/supabase');
const { authMiddleware, roleMiddleware } = require('./auth');
const logger = require('../lib/logger');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/participants/upload - Upload Excel and upsert participants (admin + data_upload)
router.post('/upload', authMiddleware, roleMiddleware('admin', 'data_upload'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Log upload metadata for debugging
        logger.info('Upload received: name=%s size=%d mimetype=%s uploader=%s',
            req.file.originalname, req.file.size, req.file.mimetype, req.ip);

        let workbook;
        let rows = [];

        // Try primary parsing strategy (buffer)
        try {
            workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        } catch (errPrimary) {
            logger.warn('Primary XLSX.parse failed for %s: %s', req.file.originalname, errPrimary?.message || errPrimary);
            // Try binary string parse
            try {
                const bin = req.file.buffer.toString('binary');
                workbook = XLSX.read(bin, { type: 'binary' });
            } catch (errBinary) {
                logger.warn('Binary XLSX.parse failed for %s: %s', req.file.originalname, errBinary?.message || errBinary);
                // If CSV, try string parse
                if (req.file.originalname.toLowerCase().endsWith('.csv') || req.file.mimetype === 'text/csv') {
                    try {
                        const csvText = req.file.buffer.toString('utf8');
                        workbook = XLSX.read(csvText, { type: 'string' });
                    } catch (errCsv) {
                        logger.error('CSV parse also failed for %s: %s', req.file.originalname, errCsv?.message || errCsv);
                        return res.status(400).json({ error: 'Failed to parse file on server. Ensure file is a valid .xlsx or .csv and not password-protected.' });
                    }
                } else {
                    logger.error('All parsing strategies failed for %s', req.file.originalname);
                    return res.status(400).json({ error: 'Failed to parse file on server. Ensure file is a valid .xlsx or .csv and not password-protected.' });
                }
            }
        }

        try {
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        } catch (errRows) {
            logger.error('Converting sheet to json failed for %s: %s', req.file.originalname, errRows?.message || errRows);
            return res.status(400).json({ error: 'Failed to read rows from sheet. The sheet may be malformed.' });
        }

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        const participants = rows.map((row) => ({
            participant_id: String(row['PARTICIPANT ID'] || row['participant_id'] || '').trim(),
            name: String(row['PARTICIPANT NAME'] || row['name'] || '').trim(),
            college_name: String(row['COLLEGE NAME'] || row['college_name'] || '').trim(),
            email: String(row['MAIL ID'] || row['email'] || '').trim(),
        })).filter(p => p.participant_id && p.name && p.email);

        if (participants.length === 0) {
            return res.status(400).json({
                error: 'No valid participants found. Expected columns: PARTICIPANT ID, PARTICIPANT NAME, COLLEGE NAME, MAIL ID'
            });
        }

        // Upsert in batches of 100
        const batchSize = 100;
        let inserted = 0;
        let skipped = 0;

        for (let i = 0; i < participants.length; i += batchSize) {
            const batch = participants.slice(i, i + batchSize);
            const { data, error } = await supabase
                .from('participants')
                .upsert(batch, {
                    onConflict: 'participant_id',
                    ignoreDuplicates: true
                });

            if (error) {
                console.error('Upsert error:', error);
                return res.status(500).json({ error: `Database error: ${error.message}` });
            }

            inserted += batch.length;
        }

        res.json({
            message: `Successfully processed ${participants.length} participants`,
            total: participants.length
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// GET /api/participants - Get all participants (admin + data_upload)
router.get('/', authMiddleware, roleMiddleware('admin', 'data_upload'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('participants')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (error) {
        console.error('Fetch participants error:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

module.exports = router;
