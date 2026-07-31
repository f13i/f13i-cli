const fs = require('fs');
const path = require('path');
const os = require('os');

// Expand tilde in paths
function expandPath(p) {
  return p.replace('~', os.homedir());
}

// Read a note from Obsidian vault
async function readNote(relativePath) {
  const vaultPath = expandPath(process.env.OBSIDIAN_VAULT_PATH);
  const fullPath = path.join(vaultPath, relativePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Note not found: ${relativePath}`);
  }
  
  return fs.readFileSync(fullPath, 'utf-8');
}

// Write/append to a note
async function writeNote(relativePath, content, append = false) {
  const vaultPath = expandPath(process.env.OBSIDIAN_VAULT_PATH);
  const fullPath = path.join(vaultPath, relativePath);
  
  // Create directories if needed
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (append) {
    fs.appendFileSync(fullPath, content);
  } else {
    fs.writeFileSync(fullPath, content);
  }
  
  console.log(`✓ Wrote: ${relativePath}`);
}

// Parse YAML frontmatter from a note
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') return { data: {}, body: content };
  
  const endIdx = lines.slice(1).findIndex(l => l === '---') + 1;
  const frontmatterLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join('\n');
  
  const data = {};
  frontmatterLines.forEach(line => {
    const [key, val] = line.split(':').map(s => s.trim());
    data[key] = val;
  });
  
  return { data, body };
}

// List files in a directory
async function listNotes(relativeDir) {
  const vaultPath = expandPath(process.env.OBSIDIAN_VAULT_PATH);
  const fullPath = path.join(vaultPath, relativeDir);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  return fs.readdirSync(fullPath)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(relativeDir, f));
}

module.exports = {
  readNote,
  writeNote,
  parseFrontmatter,
  listNotes,
  expandPath
};
