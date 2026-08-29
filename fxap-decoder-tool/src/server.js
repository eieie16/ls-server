/**
 * FXAP Decoder Tool - Backend Server
 * Handles plugin ZIP uploads, scans for .fxap files, decodes them, and manages extracted content
 */

const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads - accept both .fxap and .zip
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.fxap') || ext.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .fxap or .zip files are allowed'), false);
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for plugin ZIPs
});

// In-memory storage for processing state
const processingJobs = new Map();

/**
 * Check if a buffer starts with a valid ZIP header (PK magic bytes)
 */
function isValidZipHeader(buffer) {
  if (buffer.length < 4) return false;
  const header = buffer.slice(0, 4).toString('hex');
  return header === '504b0304' || header === '504b0506' || header === '504b0708' || header === '504b0606';
}

/**
 * Apply XOR decryption with a key
 */
function xorDecrypt(data, key) {
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * FiveM .fxap file decoding logic
 * Tries multiple strategies to extract valid ZIP data:
 * 1. Already a valid ZIP (no decryption needed)
 * 2. FXAP header + XOR with various keys (including CFX KEY)
 * 3. Try stripping different header sizes
 * 4. Try raw data (skip small headers)
 * 5. Single-byte XOR brute force
 * 6. Search for embedded ZIP signature
 */
function decodeFxapFile(buffer, cfxKey = '') {
  console.log(`[FXAP] File size: ${buffer.length} bytes`);
  console.log(`[FXAP] First 64 bytes hex: ${buffer.slice(0, 64).toString('hex')}`);
  console.log(`[FXAP] First 16 bytes ascii: ${buffer.slice(0, 16).toString('ascii').replace(/[^\x20-\x7e]/g, '.')}`);

  // Strategy 1: File is already a valid ZIP
  if (isValidZipHeader(buffer)) {
    console.log('[FXAP] File is already a valid ZIP - no decryption needed');
    return buffer;
  }

  // Check for FXAP magic header
  const magicHeader = buffer.slice(0, 4).toString('ascii');
  console.log(`[FXAP] Magic header: "${magicHeader}" (${buffer.slice(0, 4).toString('hex')})`);

  // XOR keys to try (CFX KEY first if provided, then known FiveM patterns)
  const xorKeys = [];
  
  // CFX KEY variants (highest priority)
  if (cfxKey) {
    xorKeys.push(Buffer.from(cfxKey, 'ascii'));
    // Try without prefix
    const stripped = cfxKey.replace(/^cfxk_/, '');
    if (stripped !== cfxKey) {
      xorKeys.push(Buffer.from(stripped, 'ascii'));
    }
    // Try SHA256-derived key
    const sha256 = crypto.createHash('sha256').update(cfxKey).digest();
    xorKeys.push(sha256.slice(0, 32));
    // Try first 16 bytes of SHA256
    xorKeys.push(sha256.slice(0, 16));
    console.log(`[FXAP] Added ${4} CFX KEY variants to try`);
  }

  // Known FiveM patterns (fallback)
  xorKeys.push(
    Buffer.from('FiveM_FXAP_Key_2024', 'ascii'),
    Buffer.from('FXAP', 'ascii'),
    Buffer.from('fivem', 'ascii'),
    Buffer.from('FiveM', 'ascii'),
    Buffer.from('cfx', 'ascii'),
    Buffer.from('CFX', 'ascii'),
    Buffer.from('citizen', 'ascii'),
    Buffer.from('FiveM_FXAP', 'ascii'),
    Buffer.from([0x56, 0x04, 0xCE, 0xA9]),  // Common FiveM XOR pattern
    Buffer.from([0x37, 0x4A, 0x2D, 0x7E])   // Another pattern
  );

  // Header sizes to try
  const headerSizes = [0, 4, 8, 12, 16, 20, 24, 32, 48, 64, 128, 256];

  // Strategy 2: FXAP header + XOR with various keys and header sizes
  if (magicHeader === 'FXAP') {
    console.log('[FXAP] Detected FXAP magic header, trying XOR decryption...');
    
    for (const headerSize of headerSizes) {
      if (headerSize >= buffer.length) continue;
      const encryptedData = buffer.slice(headerSize);
      
      for (const key of xorKeys) {
        const decrypted = xorDecrypt(encryptedData, key);
        if (isValidZipHeader(decrypted)) {
          console.log(`[FXAP] SUCCESS! headerSize=${headerSize}, key="${key.toString('ascii')}"`);
          return decrypted;
        }
      }
    }
  }

  // Strategy 3: Try XOR on full buffer (no header skip) with various keys
  console.log('[FXAP] Trying full-buffer XOR decryption...');
  for (const key of xorKeys) {
    const decrypted = xorDecrypt(buffer, key);
    if (isValidZipHeader(decrypted)) {
      console.log(`[FXAP] SUCCESS with full-buffer XOR, key="${key.toString('ascii')}"`);
      return decrypted;
    }
  }

  // Strategy 4: Try stripping various header sizes without XOR
  console.log('[FXAP] Trying header stripping without XOR...');
  for (const headerSize of headerSizes) {
    if (headerSize >= buffer.length) continue;
    const stripped = buffer.slice(headerSize);
    if (isValidZipHeader(stripped)) {
      console.log(`[FXAP] SUCCESS with header strip only, size=${headerSize}`);
      return stripped;
    }
  }

  // Strategy 5: Try single-byte XOR brute force (0-255)
  console.log('[FXAP] Trying single-byte XOR brute force...');
  for (let xorByte = 0; xorByte < 256; xorByte++) {
    const testKey = Buffer.from([xorByte]);
    const decrypted = xorDecrypt(buffer.slice(4), testKey);
    if (isValidZipHeader(decrypted)) {
      console.log(`[FXAP] SUCCESS with single-byte XOR: 0x${xorByte.toString(16).padStart(2, '0')}`);
      return decrypted;
    }
    // Also try with header skip
    const decrypted2 = xorDecrypt(buffer.slice(16), testKey);
    if (isValidZipHeader(decrypted2)) {
      console.log(`[FXAP] SUCCESS with single-byte XOR + 16-byte skip: 0x${xorByte.toString(16).padStart(2, '0')}`);
      return decrypted2;
    }
  }

  // Strategy 6: Check if there's a ZIP somewhere inside the file
  console.log('[FXAP] Searching for embedded ZIP signature...');
  const pkSignature = Buffer.from('504b0304', 'hex');
  let searchOffset = 0;
  while (searchOffset < buffer.length - 4) {
    const idx = buffer.indexOf(pkSignature, searchOffset);
    if (idx === -1) break;
    console.log(`[FXAP] Found PK signature at offset ${idx}`);
    const candidate = buffer.slice(idx);
    try {
      const zip = new AdmZip(candidate);
      console.log(`[FXAP] SUCCESS! ZIP found at offset ${idx}`);
      return candidate;
    } catch (e) {
      // Not a valid ZIP at this offset, continue searching
    }
    searchOffset = idx + 1;
  }

  // Strategy 7: Try zlib/deflate decompression of payload (after FXAP header)
  console.log('[FXAP] Trying zlib/deflate decompression of payload...');
  if (buffer.length > 16) {
    const payload = buffer.slice(16); // Skip 16-byte FXAP header
    const zlib = require('zlib');
    
    // Try different zlib formats
    const decompressAttempts = [
      { name: 'inflate (zlib)', fn: zlib.inflateSync },
      { name: 'inflateRaw (deflate)', fn: zlib.inflateRawSync },
      { name: 'unzip (gzip/zlib auto)', fn: zlib.unzipSync },
    ];
    
    for (const attempt of decompressAttempts) {
      try {
        const decompressed = attempt.fn(payload);
        console.log(`[FXAP] ${attempt.name} succeeded: ${decompressed.length} bytes`);
        if (isValidZipHeader(decompressed)) {
          console.log(`[FXAP] SUCCESS! ${attempt.name} decompressed to valid ZIP`);
          return decompressed;
        }
        // Even if not ZIP, return if it looks like valid data
        if (decompressed.length > 0) {
          console.log(`[FXAP] ${attempt.name} produced data, checking if valid...`);
          // Check for common file signatures
          const sig = decompressed.slice(0, 4).toString('hex');
          if (sig === '504b0304' || sig === '504b0506' || sig === '504b0708' ||
              sig === '1f8b08' || sig === '377abcaf' || sig === '52617221') {
            console.log(`[FXAP] SUCCESS! ${attempt.name} produced valid ${sig} data`);
            return decompressed;
          }
        }
      } catch (e) {
        // Try next method
      }
    }
  }

  // Strategy 8: Try XOR with CFX KEY on payload specifically (detailed logging)
  if (cfxKey) {
    console.log('[FXAP] Trying CFX KEY XOR on payload with detailed logging...');
    const cfxVariants = [
      { name: 'full key', key: Buffer.from(cfxKey, 'ascii') },
      { name: 'no prefix', key: Buffer.from(cfxKey.replace(/^cfxk_/, ''), 'ascii') },
      { name: 'sha256-32', key: crypto.createHash('sha256').update(cfxKey).digest().slice(0, 32) },
      { name: 'sha256-16', key: crypto.createHash('sha256').update(cfxKey).digest().slice(0, 16) },
    ];
    
    for (const variant of cfxVariants) {
      console.log(`[FXAP]   Trying ${variant.name} (${variant.key.length} bytes): ${variant.key.slice(0, 16).toString('hex')}...`);
      // Try on payload only (after 16-byte header)
      const payload = buffer.slice(16);
      const decrypted = xorDecrypt(payload, variant.key);
      const sig = decrypted.slice(0, 4).toString('hex');
      console.log(`[FXAP]   Result first 4 bytes: ${sig} (${sig === '504b0304' || sig === '504b0506' || sig === '504b0708' ? 'ZIP!' : 'not ZIP'})`);
      console.log(`[FXAP]   Result first 16 bytes hex: ${decrypted.slice(0, 16).toString('hex')}`);
      console.log(`[FXAP]   Result first 16 bytes ascii: ${decrypted.slice(0, 16).toString('ascii').replace(/[^\x20-\x7e]/g, '.')}`);
      
      if (isValidZipHeader(decrypted)) {
        console.log(`[FXAP] SUCCESS! CFX KEY XOR (${variant.name}) on payload produced ZIP`);
        return decrypted;
      }
      
      // Also try with different header skips
      for (const headerSize of [0, 4, 8, 12, 16, 20, 24, 32]) {
        if (headerSize >= buffer.length) continue;
        const data = buffer.slice(headerSize);
        const decrypted2 = xorDecrypt(data, variant.key);
        if (isValidZipHeader(decrypted2)) {
          console.log(`[FXAP] SUCCESS! CFX KEY XOR (${variant.name}) with headerSize=${headerSize} produced ZIP`);
          return decrypted2;
        }
      }
    }
  }

  // Strategy 9: Try AES decryption with CFX KEY (if provided)
  if (cfxKey) {
    console.log('[FXAP] Trying AES decryption with CFX KEY...');
    const aesKeys = [
      cfxKey,
      cfxKey.replace(/^cfxk_/, ''),
      crypto.createHash('sha256').update(cfxKey).digest('hex').substring(0, 32),
      crypto.createHash('sha256').update(cfxKey).digest('hex').substring(0, 16),
    ];
    
    for (const aesKey of aesKeys) {
      try {
        // Try AES-256-CBC with zero IV
        const key = Buffer.from(aesKey.padEnd(32, '0').substring(0, 32), 'utf8');
        const iv = Buffer.alloc(16, 0);
        
        for (const headerSize of headerSizes) {
          if (headerSize >= buffer.length) continue;
          const encryptedData = buffer.slice(headerSize);
          
          try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            decipher.setAutoPadding(true);
            let decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
            if (isValidZipHeader(decrypted)) {
              console.log(`[FXAP] SUCCESS with AES-256-CBC, headerSize=${headerSize}, key="${aesKey.substring(0, 10)}..."`);
              return decrypted;
            }
          } catch (e) {
            // Try without padding
            try {
              const decipher2 = crypto.createDecipheriv('aes-256-cbc', key, iv);
              decipher2.setAutoPadding(false);
              let decrypted2 = Buffer.concat([decipher2.update(encryptedData), decipher2.final()]);
              if (isValidZipHeader(decrypted2)) {
                console.log(`[FXAP] SUCCESS with AES-256-CBC (no padding), headerSize=${headerSize}`);
                return decrypted2;
              }
            } catch (e2) {}
          }
        }
      } catch (e) {
        // Continue to next key
      }
    }
  }

  // Strategy 8: Try other archive signatures (RAR, 7z, etc.)
  console.log('[FXAP] Searching for other archive signatures...');
  const signatures = {
    'RAR': '526172211a070100',
    '7z': '377abcaf271c',
    'gzip': '1f8b',
    'zlib': '789c',
    'zlib2': '78da',
    'zlib3': '7801',
  };
  
  for (const [format, sigHex] of Object.entries(signatures)) {
    const sig = Buffer.from(sigHex, 'hex');
    const idx = buffer.indexOf(sig);
    if (idx !== -1) {
      console.log(`[FXAP] Found ${format} signature at offset ${idx}`);
      // Try to extract from this offset
      const candidate = buffer.slice(idx);
      if (format === 'zlib' || format === 'zlib2' || format === 'zlib3') {
        try {
          const zlib = require('zlib');
          const decompressed = zlib.inflateSync(candidate);
          if (isValidZipHeader(decompressed)) {
            console.log(`[FXAP] SUCCESS! ${format} decompressed to ZIP at offset ${idx}`);
            return decompressed;
          }
        } catch (e) {
          // Try deflate
          try {
            const zlib = require('zlib');
            const decompressed = zlib.inflateRawSync(candidate);
            if (isValidZipHeader(decompressed)) {
              console.log(`[FXAP] SUCCESS! ${format} inflateRaw to ZIP at offset ${idx}`);
              return decompressed;
            }
          } catch (e2) {}
        }
      }
    }
  }

  // Strategy 9: Try byte-swapping (endianness) and XOR
  console.log('[FXAP] Trying byte-swapped XOR...');
  for (const key of xorKeys) {
    // Try word-swapped (16-bit) XOR
    const swapped = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length; i += 2) {
      if (i + 1 < buffer.length) {
        swapped[i] = buffer[i + 1] ^ key[i % key.length];
        swapped[i + 1] = buffer[i] ^ key[(i + 1) % key.length];
      } else {
        swapped[i] = buffer[i] ^ key[i % key.length];
      }
    }
    if (isValidZipHeader(swapped)) {
      console.log(`[FXAP] SUCCESS with word-swapped XOR, key="${key.toString('ascii')}"`);
      return swapped;
    }
  }

  // Strategy 10: Try rolling XOR with different patterns
  console.log('[FXAP] Trying rolling/incrementing XOR patterns...');
  for (let startByte = 0; startByte < 256; startByte++) {
    for (let increment = -1; increment <= 1; increment += 2) {
      const decrypted = Buffer.alloc(buffer.length);
      let currentByte = startByte;
      for (let i = 0; i < buffer.length; i++) {
        decrypted[i] = buffer[i] ^ currentByte;
        currentByte = (currentByte + increment + 256) % 256;
      }
      if (isValidZipHeader(decrypted)) {
        console.log(`[FXAP] SUCCESS with rolling XOR: start=0x${startByte.toString(16).padStart(2, '0')}, inc=${increment}`);
        return decrypted;
      }
    }
  }

  // If nothing worked, dump detailed info and return raw buffer
  console.warn('[FXAP] WARNING: Could not find valid ZIP data after all strategies.');
  console.log(`[FXAP] Raw first 32 bytes: ${buffer.slice(0, 32).toString('hex')}`);
  console.log(`[FXAP] Raw bytes 32-64: ${buffer.slice(32, 64).toString('hex')}`);
  console.log(`[FXAP] Raw bytes 64-96: ${buffer.slice(64, 96).toString('hex')}`);
  console.log(`[FXAP] File entropy check: calculating...`);
  
  // Calculate entropy to detect encryption vs compression
  const freq = new Uint32Array(256);
  for (const b of buffer) freq[b]++;
  let entropy = 0;
  for (const f of freq) {
    if (f > 0) {
      const p = f / buffer.length;
      entropy -= p * Math.log2(p);
    }
  }
  console.log(`[FXAP] Entropy: ${entropy.toFixed(4)} (8.0 = encrypted/compressed, <6 = plain)`);
  
  return buffer;
}

/**
 * Extract ZIP archive and return file list
 */
function extractZip(zipBuffer, extractPath) {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();
  
  const files = [];
  zipEntries.forEach(entry => {
    files.push({
      name: entry.entryName,
      size: entry.header.size,
      compressedSize: entry.header.compressedSize,
      isDirectory: entry.isDirectory,
      lastModified: entry.header.time
    });
  });

  // Extract all files
  zip.extractAllTo(extractPath, true);
  
  return files;
}

/**
 * Scan directory recursively for .fxap files
 */
function findFxapFiles(dirPath, basePath = '') {
  const fxapFiles = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      fxapFiles.push(...findFxapFiles(fullPath, relativePath));
    } else if (entry.name.toLowerCase().endsWith('.fxap')) {
      fxapFiles.push({
        name: entry.name,
        path: fullPath,
        relativePath: relativePath,
        size: entry.size || fs.statSync(fullPath).size
      });
    }
  }
  
  return fxapFiles;
}

/**
 * Process a single .fxap file - decode and extract
 */
function processFxapFile(fxapFile, jobDir, fxapIndex, cfxKey = '') {
  const fileBuffer = fs.readFileSync(fxapFile.path);
  
  let decryptedBuffer;
  try {
    decryptedBuffer = decodeFxapFile(fileBuffer, cfxKey);
  } catch (decodeError) {
    throw new Error(`Failed to decode ${fxapFile.name}: ${decodeError.message}`);
  }

  // Save decrypted data
  const fxapName = fxapFile.name.replace('.fxap', '');
  const decryptedPath = path.join(jobDir, `decrypted_${fxapIndex}_${fxapName}.zip`);
  fs.writeFileSync(decryptedPath, decryptedBuffer);

  // Extract ZIP
  const extractDir = path.join(jobDir, `extracted_${fxapIndex}_${fxapName}`);
  fs.mkdirSync(extractDir, { recursive: true });
  
  let extractedFiles;
  try {
    extractedFiles = extractZip(decryptedBuffer, extractDir);
  } catch (extractError) {
    throw new Error(`Failed to extract ZIP from ${fxapFile.name}: ${extractError.message}`);
  }

  return {
    fxapName: fxapFile.name,
    fxapRelativePath: fxapFile.relativePath,
    fxapSize: fxapFile.size,
    decryptedPath: decryptedPath,
    extractDir: extractDir,
    files: extractedFiles,
    totalSize: extractedFiles.reduce((sum, f) => sum + (f.size || 0), 0),
    fileCount: extractedFiles.filter(f => !f.isDirectory).length
  };
}

/**
 * Create a new ZIP archive with specified files removed
 */
function createZipWithoutFiles(sourcePath, filesToRemove, outputPath) {
  const zip = new AdmZip();
  const allFiles = getAllFiles(sourcePath);
  
  allFiles.forEach(file => {
    const relativePath = path.relative(sourcePath, file);
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Check if this file should be removed
    const shouldRemove = filesToRemove.some(removeFile => {
      const normalizedRemove = removeFile.replace(/\\/g, '/');
      return normalizedPath === normalizedRemove || 
             normalizedPath.startsWith(normalizedRemove + '/');
    });
    
    if (!shouldRemove) {
      const fileData = fs.readFileSync(file);
      zip.addFile(normalizedPath, fileData);
    }
  });
  
  zip.writeZip(outputPath);
  return outputPath;
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles(...paths) {
  paths.forEach(p => {
    if (fs.existsSync(p)) {
      if (fs.statSync(p).isDirectory()) {
        fs.rmSync(p, { recursive: true, force: true });
      } else {
        fs.unlinkSync(p);
      }
    }
  });
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'FXAP Decoder Tool API is running' });
});

// Upload and process plugin ZIP or .fxap file
app.post('/api/decode', upload.single('pluginFile'), async (req, res) => {
  const jobId = Date.now().toString();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get optional CFX KEY
    const cfxKey = req.body.cfxKey || '';
    console.log(`[FXAP] CFX KEY provided: ${cfxKey ? 'Yes (' + cfxKey.substring(0, 10) + '...)' : 'No'}`);

    const filePath = req.file.path;
    const jobDir = path.join(__dirname, `../temp/job_${jobId}`);
    const outputDir = path.join(jobDir, 'output');
    
    fs.mkdirSync(outputDir, { recursive: true });

    // Initialize job tracking
    processingJobs.set(jobId, {
      status: 'scanning',
      progress: 5,
      originalFileName: req.file.originalname,
      filePath: filePath,
      jobDir: jobDir,
      outputDir: outputDir,
      fxapResults: [],
      error: null
    });

    let fxapFiles = [];
    let isDirectFxap = false;

    // Check if uploaded file is a .fxap directly
    if (req.file.originalname.toLowerCase().endsWith('.fxap')) {
      isDirectFxap = true;
      fxapFiles = [{
        name: req.file.originalname,
        path: filePath,
        relativePath: req.file.originalname,
        size: req.file.size
      }];
      processingJobs.get(jobId).progress = 20;
      processingJobs.get(jobId).status = 'decoding';
    } else {
      // It's a ZIP - extract and scan for .fxap files
      processingJobs.get(jobId).progress = 10;
      processingJobs.get(jobId).status = 'extracting';
      
      const pluginExtractDir = path.join(jobDir, 'plugin_extracted');
      fs.mkdirSync(pluginExtractDir, { recursive: true });
      
      try {
        const pluginZip = new AdmZip(filePath);
        pluginZip.extractAllTo(pluginExtractDir, true);
        
        processingJobs.get(jobId).progress = 20;
        processingJobs.get(jobId).status = 'scanning';
        
        fxapFiles = findFxapFiles(pluginExtractDir);
        
        if (fxapFiles.length === 0) {
          processingJobs.get(jobId).status = 'error';
          processingJobs.get(jobId).error = 'No .fxap files found in the uploaded ZIP';
          cleanupTempFiles(filePath, jobDir);
          return res.status(400).json({ 
            error: 'No .fxap files found in plugin ZIP',
            jobId 
          });
        }
      } catch (zipError) {
        processingJobs.get(jobId).status = 'error';
        processingJobs.get(jobId).error = zipError.message;
        cleanupTempFiles(filePath, jobDir);
        return res.status(400).json({ 
          error: 'Failed to extract plugin ZIP', 
          details: zipError.message,
          jobId 
        });
      }
    }

    // Process each .fxap file found
    processingJobs.get(jobId).progress = 30;
    processingJobs.get(jobId).status = 'decoding';
    
    const fxapResults = [];
    for (let i = 0; i < fxapFiles.length; i++) {
      const fxapFile = fxapFiles[i];
      processingJobs.get(jobId).progress = 30 + Math.floor((i / fxapFiles.length) * 50);
      
      try {
        const result = processFxapFile(fxapFile, jobDir, i, cfxKey);
        fxapResults.push(result);
      } catch (processError) {
        // Continue processing other files but record error
        fxapResults.push({
          fxapName: fxapFile.name,
          fxapRelativePath: fxapFile.relativePath,
          fxapSize: fxapFile.size,
          error: processError.message,
          files: [],
          fileCount: 0,
          totalSize: 0
        });
      }
    }

    const successCount = fxapResults.filter(r => !r.error).length;
    const failCount = fxapResults.filter(r => r.error).length;

    processingJobs.get(jobId).progress = 90;
    processingJobs.get(jobId).status = 'completed';
    processingJobs.get(jobId).fxapResults = fxapResults;
    processingJobs.get(jobId).progress = 100;
    processingJobs.get(jobId).isDirectFxap = isDirectFxap;

    res.json({
      success: true,
      jobId,
      originalFileName: req.file.originalname,
      isDirectFxap,
      fxapCount: fxapFiles.length,
      successCount,
      failCount,
      fxapResults,
      message: `Found ${fxapFiles.length} .fxap file(s), successfully decoded ${successCount}${failCount > 0 ? `, ${failCount} failed` : ''}`
    });

  } catch (error) {
    console.error('Decode error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get job status
app.get('/api/job/:jobId', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Remove files from a specific .fxap's extracted archive
app.post('/api/job/:jobId/remove-files', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const { fxapIndex, filesToRemove } = req.body;
  if (fxapIndex === undefined || !filesToRemove || !Array.isArray(filesToRemove) || filesToRemove.length === 0) {
    return res.status(400).json({ error: 'Invalid parameters: fxapIndex and filesToRemove required' });
  }

  const fxapResult = job.fxapResults[fxapIndex];
  if (!fxapResult) {
    return res.status(404).json({ error: 'FXAP result not found' });
  }

  if (fxapResult.error) {
    return res.status(400).json({ error: 'Cannot remove files from failed decode' });
  }

  try {
    job.status = 'processing';
    job.progress = 10;

    const outputZipPath = path.join(job.outputDir, `modified_${fxapResult.fxapName.replace('.fxap', '.zip')}`);
    
    createZipWithoutFiles(fxapResult.extractDir, filesToRemove, outputZipPath);
    
    job.progress = 80;
    if (!fxapResult.outputZipPaths) fxapResult.outputZipPaths = {};
    fxapResult.outputZipPaths[JSON.stringify(filesToRemove)] = outputZipPath;
    fxapResult.removedFiles = filesToRemove;
    job.status = 'completed';
    job.progress = 100;

    res.json({
      success: true,
      jobId: req.params.jobId,
      fxapIndex,
      removedFiles: filesToRemove,
      outputZipPath: outputZipPath,
      message: `Removed ${filesToRemove.length} file(s) from ${fxapResult.fxapName}`
    });
  } catch (error) {
    job.status = 'error';
    job.error = error.message;
    res.status(500).json({ error: 'Failed to remove files', details: error.message });
  }
});

// Download processed ZIP for a specific .fxap
app.get('/api/job/:jobId/download/:fxapIndex', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const fxapIndex = parseInt(req.params.fxapIndex);
  const fxapResult = job.fxapResults[fxapIndex];
  if (!fxapResult) {
    return res.status(404).json({ error: 'FXAP result not found' });
  }

  const zipPath = fxapResult.outputZipPaths 
    ? Object.values(fxapResult.outputZipPaths)[0] 
    : fxapResult.decryptedPath;
  
  if (!zipPath || !fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'No processed file available for download' });
  }

  const isModified = fxapResult.outputZipPaths && Object.keys(fxapResult.outputZipPaths).length > 0;
  const fileName = isModified 
    ? `modified_${fxapResult.fxapName.replace('.fxap', '.zip')}` 
    : `decoded_${fxapResult.fxapName.replace('.fxap', '.zip')}`;
  
  res.download(zipPath, fileName, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Download failed' });
    }
  });
});

// Download all decoded .fxap files as a combined ZIP
app.get('/api/job/:jobId/download-all', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Create a combined ZIP with all decoded .fxap contents
  const combinedZip = new AdmZip();
  
  job.fxapResults.forEach((result, index) => {
    if (result.error) return;
    
    const zipPath = result.outputZipPaths 
      ? Object.values(result.outputZipPaths)[0] 
      : result.decryptedPath;
    
    if (zipPath && fs.existsSync(zipPath)) {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();
      
      entries.forEach(entry => {
        const prefix = result.fxapName.replace('.fxap', '');
        const entryName = `${prefix}/${entry.entryName}`;
        combinedZip.addFile(entryName, entry.getData());
      });
    }
  });

  const combinedPath = path.join(job.outputDir, `all_decoded_${job.originalFileName.replace('.zip', '').replace('.fxap', '')}.zip`);
  combinedZip.writeZip(combinedPath);

  const fileName = `all_decoded_${job.originalFileName.replace('.zip', '').replace('.fxap', '')}.zip`;
  res.download(combinedPath, fileName, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Download failed' });
    }
  });
});

// Cleanup job
app.delete('/api/job/:jobId', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (job) {
    cleanupTempFiles(job.filePath, job.jobDir);
    processingJobs.delete(req.params.jobId);
    res.json({ success: true, message: 'Job cleaned up' });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Get list of files for a specific .fxap
app.get('/api/job/:jobId/files/:fxapIndex', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const fxapIndex = parseInt(req.params.fxapIndex);
  const fxapResult = job.fxapResults[fxapIndex];
  if (!fxapResult) {
    return res.status(404).json({ error: 'FXAP result not found' });
  }

  res.json({ 
    files: fxapResult.files, 
    fxapName: fxapResult.fxapName,
    fxapRelativePath: fxapResult.fxapRelativePath,
    error: fxapResult.error 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`FXAP Decoder Tool server running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${path.join(__dirname, '../temp/uploads')}`);
});

module.exports = app;