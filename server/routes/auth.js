const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        if (password !== process.env.ADMIN_PASSWORD) {
            logger.warn('Failed login attempt from %s', req.ip);
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        res.json({ token, message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Auth middleware
        const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Missing or malformed Authorization header from %s', req.ip);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.warn('Invalid or expired token from %s: %s', req.ip, (error && error.message) || '');
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = router;
module.exports.authMiddleware = authMiddleware;
