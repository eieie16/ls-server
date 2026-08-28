# FXAP Decoder Tool

A web-based tool for decoding FiveM `.fxap` files, extracting their content, and managing zip archives.

## Features

- **Decode .fxap files**: Handles FiveM-specific XOR encryption to decode `.fxap` files
- **Extract ZIP archives**: Automatically extracts the decoded ZIP content
- **File management**: Select and remove specific files from the extracted archive
- **Download options**: Download original decoded ZIP or modified ZIP with removed files
- **Progress tracking**: Real-time progress updates during decoding and extraction
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
    ├── uploads/           # Uploaded .fxap files
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

3. **Decode a .fxap file**:
   - Drag and drop a `.fxap` file onto the upload area, or click to browse
   - Click "Decode & Extract" to process the file
   - Wait for the decoding and extraction to complete

4. **Manage extracted files**:
   - View the list of extracted files in a tree structure
   - Select files/folders to remove using checkboxes
   - Click "Remove Selected" to create a modified archive

5. **Download results**:
   - "Download Original ZIP" - Downloads the decoded ZIP without modifications
   - "Download Modified ZIP" - Downloads the ZIP with selected files removed

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/decode` | Upload and decode .fxap file |
| GET | `/api/job/:jobId` | Get job status and progress |
| GET | `/api/job/:jobId/files` | List extracted files |
| POST | `/api/job/:jobId/remove-files` | Remove selected files from archive |
| GET | `/api/job/:jobId/download` | Download modified ZIP |
| GET | `/api/job/:jobId/download-original` | Download original decoded ZIP |
| DELETE | `/api/job/:jobId` | Clean up job temporary files |

## Technical Details

### .fxap Decoding

The tool implements FiveM's `.fxap` file decoding:
- Checks for `FXAP` magic header (4 bytes)
- Skips 16-byte header (magic + version + flags + reserved)
- Applies XOR decryption with rolling key (`FiveM_FXAP_Key_2024`)
- Falls back to alternative key (`FXAP`) if primary fails
- Validates result is a valid ZIP archive (PK header)

### ZIP Handling

Uses `adm-zip` library for:
- Extracting ZIP archives to temporary directories
- Creating new ZIP archives with specified files removed
- Preserving directory structure and file metadata

### Temporary File Management

- All temporary files are stored in `temp/` directory
- Automatic cleanup via `/api/job/:jobId` DELETE endpoint
- Job directories are named `job_<timestamp>` for isolation

## Configuration

Environment variables:
- `PORT` - Server port (default: 3000)

## Dependencies

- **express** - Web framework
- **multer** - File upload handling
- **adm-zip** - ZIP archive manipulation
- **cors** - Cross-origin resource sharing

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT