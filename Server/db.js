const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// SSL Configuration for Aiven / Production
const caPath = "/etc/secrets/ca.pem";
let sslConfig = {
    rejectUnauthorized: true // Secure by default
};

try {
    if (fs.existsSync(caPath)) {
        sslConfig.ca = fs.readFileSync(caPath);
        console.log("✅ Database CA certificate loaded successfully.");
    } else {
        console.warn("⚠️ CA certificate not found at /etc/secrets/ca.pem. Falling back to unauthorized-allow for local development.");
        sslConfig.rejectUnauthorized = false;
    }
} catch (error) {
    console.error("❌ Error reading CA certificate:", error);
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Utility to check connection on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Database pool initialized and connection verified.");
        connection.release();
    } catch (err) {
        console.error("❌ Database connection failed during pool initialization:", err.message);
    }
})();

module.exports = pool;
