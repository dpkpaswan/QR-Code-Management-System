require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const logger = require('./lib/logger');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const participantRoutes = require('./routes/participants');
const emailRoutes = require('./routes/email');
const scannerRoutes = require('./routes/scanner');
const entriesRoutes = require('./routes/entries');
const statsRoutes = require('./routes/stats');
const eventDaysRoutes = require('./routes/eventDays');
const diagnosticsRoutes = require('./routes/diagnostics');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// HTTP request logging via morgan -> winston
app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
}));

app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/event-days', eventDaysRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);

app.get('/api/health', (req, res) => {
    logger.info('health check');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error: %o', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
