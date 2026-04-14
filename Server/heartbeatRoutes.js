const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // Heartbeat route to keep Aiven MySQL connection alive
    router.get('/', async (req, res) => {
        try {
            // Execute minimal query to keep connection warm
            await db.query('SELECT 1');
            // Minimal response to avoid "output too large" error
            res.status(200).send('OK');
        } catch (err) {
            // Still respond with minimal output on error
            res.status(500).send('FAIL');
        }
    });

    return router;
};
