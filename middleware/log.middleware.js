// log.middleware.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create a write stream for the log file
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

/**
 * Middleware to log all incoming requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request when it completes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl || req.url,
            ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent'],
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0,
        };

        // Log to console
        console.log(`[${log.timestamp}] ${log.method} ${log.url} ${log.statusCode} ${log.duration}`);

        // Log to file
        accessLogStream.write(JSON.stringify(log) + '\n');
    });

    next();
};

export default requestLogger;