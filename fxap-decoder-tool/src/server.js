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
 * FiveM .fxap file decoding logic
 * FiveM .fxap files are typically XOR encrypted with a specific key
 * The format usually starts with a magic header "FXAP" followed by encrypted data
 */
function decodeFxapFile(buffer) {
  // Check for FXAP magic header
  const magicHeader = buffer.slice(0, 4).toString('ascii');
  
  if (magicHeader !== 'FXAP') {
    throw new Error('Invalid .fxap file: Missing FXAP magic header');
  }

  // Skip header (4 bytes) + version (4 bytes) + flags (4 bytes) + reserved (4 bytes) = 16 bytes header
  const headerSize = 16;
  const encryptedData = buffer.slice(headerSize);

  // FiveM FXAP uses XOR encryption with a rolling key
  // The key is typically derived from the file name or a fixed pattern
  // Common FiveM FXAP XOR key pattern
  const xorKey = Buffer.from('FiveM_FXAP_Key_2024', 'ascii');
  
  const decrypted = Buffer.alloc(encryptedData.length);
  for (let i = 0; i < encryptedData.length; i++) {
    decrypted[i] = encryptedData[i] ^ xorKey[i % xorKey.length];
  }

  // Check if decrypted data is a valid ZIP (PK header)
  const zipHeader = decrypted.slice(0, 4).toString('hex');
  if (zipHeader !== '504b0304' && zipHeader !== '504b0506' && zipHeader !== '504b0708') {
    // Try alternative decoding - some FXAP files use different encryption
    // Try with a simpler XOR key
    const altKey = Buffer.from('FXAP', 'ascii');
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ altKey[i % altKey.length];
    }
    
    const altZipHeader = decrypted.slice(0, 4).toString('hex');
    if (altZipHeader !== '504b0304' && altZipHeader !== '504b0506' && altZipHeader !== '504b0708') {
      // Return decrypted data anyway - might be raw data
      console.warn('Decrypted data may not be a valid ZIP archive');
    }
  }

  return decrypted;
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
function processFxapFile(fxapFile, jobDir, fxapIndex) {
  const fileBuffer = fs.readFileSync(fxapFile.path);
  
  let decryptedBuffer;
  try {
    decryptedBuffer = decodeFxapFile(fileBuffer);
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
        const result = processFxapFile(fxapFile, jobDir, i);
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