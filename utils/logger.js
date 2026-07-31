const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  // Diagnostics go to stderr so stdout stays reserved for command data.
  console.error(`[${timestamp}] ${level}: ${message}`);

  if (process.env.DEBUG === 'true') {
    console.error(JSON.stringify(data, null, 2));
  }
  
  // Write to log file
  const logFile = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

module.exports = {
  info: (msg, data) => log('INFO', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  error: (msg, data) => log('ERROR', msg, data),
  debug: (msg, data) => process.env.DEBUG === 'true' && log('DEBUG', msg, data)
};
