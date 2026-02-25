const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');
const router = express.Router();

// Load users from environment variable
const getUsers = () => {
    try {
        return JSON.parse(process.env.USERS || '[]');
    } catch {
        logger.error('Failed to parse USERS env variable');
        return [];
    }
};

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const users = getUsers();
        const user = users.find(
            (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        );

        if (!user) {
            logger.warn('Failed login attempt for username "%s" from %s', username, req.ip);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            {
                username: user.username,
                role: user.role,
                displayName: user.displayName,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info('Successful login: %s (%s) from %s', user.displayName, user.role, req.ip);

        res.json({
            token,
            message: 'Login successful',
            user: {
                username: user.username,
                role: user.role,
                displayName: user.displayName,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Auth middleware — verifies JWT token
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

// Role middleware — checks if user's role is in the allowed list
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(
                'Access denied for %s (%s) — required roles: %s, path: %s',
                req.user.displayName || req.user.username,
                req.user.role,
                allowedRoles.join(', '),
                req.originalUrl
            );
            return res.status(403).json({ error: 'You do not have permission to access this resource' });
        }

        next();
    };
};

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.roleMiddleware = roleMiddleware;
