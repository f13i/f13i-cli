require('dotenv').config({ quiet: true }); // quiet: banner on stdout would corrupt JSON consumers
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const obsidian = require('./obsidian-reader');
const logger = require('./logger');

/**
 * Change detector: Compare current vault state against last sync.
 * Hashes key files to detect if new data was written since the last Tier 2 run.
 * Prevents unnecessary Claude calls when nothing has changed.
 */

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH ||
  `${process.env.HOME}/Library/Mobile Documents/iCloud~md~obsidian/Documents/f13i-brain`;

const STATE_FILE = `${VAULT_PATH}/90-scratch/.last-sync-state.json`;

/**
 * Paths to monitor for changes.
 * If any of these change, we consider "new data exists".
 */
const WATCHED_PATHS = [
  '90-scratch/daily',           // Daily brief updates
  '00-f13i/ACTION-ITEMS.md',    // Action items
  '30-deals',                    // Deal index updates
  '10-brain/06-companies-to-monitor.md', // Pricing intel targets
];

/**
 * Compute a hash of file content at a given path.
 * For directories, hashes all .md files recursively.
 * Returns null if path doesn't exist.
 */
function hashPath(relativePath) {
  const fullPath = path.join(VAULT_PATH, relativePath);

  try {
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Hash all .md files in directory
      const files = [];
      const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullEntry = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullEntry);
          } else if (entry.name.endsWith('.md')) {
            files.push(fullEntry);
          }
        }
      };
      walk(fullPath);

      files.sort(); // Deterministic order
      const hash = crypto.createHash('sha256');
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        hash.update(content);
      }
      return hash.digest('hex');
    } else if (stat.isFile()) {
      // Hash single file
      const content = fs.readFileSync(fullPath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    }
  } catch (err) {
    logger.debug(`Could not hash ${relativePath}: ${err.message}`);
    return null;
  }
}

/**
 * Compute current state: hash each watched path.
 * @returns {Object} { path: hash, ... }
 */
function getCurrentState() {
  const state = {};
  for (const watchPath of WATCHED_PATHS) {
    const hash = hashPath(watchPath);
    if (hash !== null) {
      state[watchPath] = hash;
    }
  }
  return state;
}

/**
 * Load the previous state from disk.
 * @returns {Object} Previous state or empty if file doesn't exist.
 */
function getPreviousState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch (err) {
    logger.warn(`Could not load state file: ${err.message}`);
    return {};
  }
}

/**
 * Check if state has changed since last sync.
 * @returns {Object} { hasChanged: boolean, newPaths: [...], modifiedPaths: [...] }
 */
function detectChanges() {
  const current = getCurrentState();
  const previous = getPreviousState();

  const newPaths = [];
  const modifiedPaths = [];

  for (const [path, hash] of Object.entries(current)) {
    if (!(path in previous)) {
      newPaths.push(path);
    } else if (previous[path] !== hash) {
      modifiedPaths.push(path);
    }
  }

  const hasChanged = newPaths.length > 0 || modifiedPaths.length > 0;

  logger.info('Change detection', {
    hasChanged,
    newPaths: newPaths.length,
    modifiedPaths: modifiedPaths.length,
  });

  return {
    hasChanged,
    newPaths,
    modifiedPaths,
    currentState: current,
  };
}

/**
 * Save the current state to disk for next comparison.
 */
function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    logger.info('State saved', { stateFile: STATE_FILE });
  } catch (err) {
    logger.error(`Could not save state: ${err.message}`);
  }
}

module.exports = {
  detectChanges,
  saveState,
  getPreviousState,
  getCurrentState,
};

// CLI usage: node utils/change-detector.js
if (require.main === module) {
  const result = detectChanges();
  console.log(JSON.stringify(result, null, 2));
}
