# FXAP Decoder Tool

A web-based tool for decoding FiveM `.fxap` files from plugin ZIPs, extracting their content, and managing zip archives.

## Features

- **Upload plugin ZIP or .fxap directly**: Accepts FiveM plugin ZIP files or individual `.fxap` files
- **Auto-scan for .fxap**: Automatically extracts plugin ZIP and finds all `.fxap` files inside
- **Batch decode**: Decodes multiple `.fxap` files in one go using FiveM's XOR encryption
- **Tabbed results**: Each `.fxap` gets its own tab with file tree
- **File management**: Select and remove specific files from each decoded archive
- **Multiple download options**: 
  - Download individual original/modified ZIP per `.fxap`
  - Download all decoded content as combined ZIP
- **Progress tracking**: Real-time progress updates during scanning, extraction, and decoding
- **Clean UI**: Modern, responsive interface with drag-and-drop support

## Project Structure

```
fxap-decoder-tool/
├── package.json           # Node.js dependencies and scripts
├── README.md              # This file
├── public/                # Frontend assets
│   ├── index.html         # Main HTML page
│   ├── styles.css         # Styling
│   └── app.js             # Frontend JavaScript
├── src/                   # Backend source
│   └── server.js          # Express server with API endpoints
└── temp/                  # Temporary files (auto-created)
    ├── uploads/           # Uploaded files
    └── job_*/             # Processing job directories
```

## Installation

```bash
cd fxap-decoder-tool
npm install
```

## Usage

1. **Start the server**:
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`

2. **Open the web interface**:
   Navigate to `http://localhost:3000` in your browser

3. **Upload a plugin**:
   - Drag and drop a FiveM plugin `.zip` file or a `.fxap` file
   - Click "Scan & Decode" to process

4. **View results**:
   - Each `.fxap` found appears as a tab
   - See file count and total size per `.fxap`
   - Failed decodes show error message

5. **Manage files**:
   - Select files/folders to remove using checkboxes
   - Click "Remove Selected" to create a modified archive
   - "Select All" for bulk operations

6. **Download results**:
   - Per-tab: "Download Original ZIP" / "Download Modified ZIP"
   - Global: "Download All Decoded (Combined ZIP)"

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/decode` | Upload plugin ZIP or .fxap, scan & decode |
| GET | `/api/job/:jobId` | Get job status and progress |
| GET | `/api/job/:jobId/files/:fxapIndex` | List extracted files for a specific .fxap |
| POST | `/api/job/:jobId/remove-files` | Remove selected files from a specific .fxap |
| GET | `/api/job/:jobId/download/:fxapIndex` | Download original/modified ZIP for .fxap |
| GET | `/api/job/:jobId/download-all` | Download all decoded .fxap as combined ZIP |
| DELETE | `/api/job/:jobId` | Clean up job temporary files |

## Technical Details

### .fxap Decoding

The tool implements FiveM's `.fxap` file decoding:
- Checks for `FXAP` magic header (4 bytes)
- Skips 16-byte header (magic + version + flags + reserved)
- Applies XOR decryption with rolling key (`FiveM_FXAP_Key_2024`)
- Falls back to alternative key (`FXAP`) if primary fails
- Validates result is a valid ZIP archive (PK header)

### Plugin ZIP Processing

1. Extract uploaded plugin ZIP to temporary directory
2. Recursively scan for `.fxap` files
3. For each `.fxap` found:
   - Decode using FiveM XOR decryption
   - Extract resulting ZIP
   - Present file tree for management

### ZIP Handling

Uses `adm-zip` library for:
- Extracting ZIP archives to temporary directories
- Creating new ZIP archives with specified files removed
- Combining multiple decoded archives into one
- Preserving directory structure and file metadata

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)

## Dependencies

- **express** - Web framework
- **multer** - File upload handling (500MB limit)
- **adm-zip** - ZIP archive manipulation
- **cors** - Cross-origin resource sharing

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT