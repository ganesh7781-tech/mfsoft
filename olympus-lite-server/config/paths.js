const path = require('path');
const fs = require('fs');
const os = require('os');

// Ensure the directory exists and is writable
function ensureDirWritable(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Test write access by writing and immediately deleting a temp file
    const testFile = path.join(dir, '.write-test-' + Date.now());
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    return false;
  }
}

// Determine upload directory path
const defaultUploadDir = path.join(__dirname, '../uploads');
let uploadDir = defaultUploadDir;
if (!ensureDirWritable(defaultUploadDir)) {
  uploadDir = path.join(os.tmpdir(), 'olympus-uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

// Determine database fallback file path
const defaultDbFallbackPath = path.join(__dirname, 'db_fallback.json');
let dbFallbackPath = defaultDbFallbackPath;

const configDir = __dirname;
if (!ensureDirWritable(configDir)) {
  dbFallbackPath = path.join(os.tmpdir(), 'db_fallback.json');
  // Seed the temp file with default db fallback JSON if not exists
  if (!fs.existsSync(dbFallbackPath) && fs.existsSync(defaultDbFallbackPath)) {
    try {
      fs.copyFileSync(defaultDbFallbackPath, dbFallbackPath);
    } catch (err) {
      console.error("Failed to copy default db_fallback.json to temp directory:", err);
    }
  }
}

module.exports = {
  uploadDir,
  dbFallbackPath
};
