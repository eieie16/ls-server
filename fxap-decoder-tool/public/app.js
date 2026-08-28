/**
 * FXAP Decoder Tool - Frontend Application
 * Handles file upload, decoding progress, file management, and downloads
 */

class FXAPDecoderApp {
    constructor() {
        this.currentJobId = null;
        this.currentFiles = [];
        this.selectedFiles = new Set();
        this.pollInterval = null;
        
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // Steps
        this.steps = {
            upload: document.getElementById('step-upload'),
            processing: document.getElementById('step-processing'),
            results: document.getElementById('step-results'),
            error: document.getElementById('step-error')
        };

        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileNameEl = document.getElementById('fileName');
        this.fileSizeEl = document.getElementById('fileSize');
        this.removeFileBtn = document.getElementById('removeFile');
        this.decodeBtn = document.getElementById('decodeBtn');

        // Processing elements
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');
        this.statusLog = document.getElementById('statusLog');

        // Results elements
        this.resultFileName = document.getElementById('resultFileName');
        this.resultFileCount = document.getElementById('resultFileCount');
        this.resultTotalSize = document.getElementById('resultTotalSize');
        this.downloadOriginalBtn = document.getElementById('downloadOriginalBtn');
        this.downloadModifiedBtn = document.getElementById('downloadModifiedBtn');
        this.fileTree = document.getElementById('fileTree');
        this.selectAllCheckbox = document.getElementById('selectAllFiles');
        this.removeSelectedBtn = document.getElementById('removeSelectedBtn');

        // Error elements
        this.errorMessage = document.getElementById('errorMessage');
        this.retryBtn = document.getElementById('retryBtn');
    }

    bindEvents() {
        // File upload
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removeFileBtn.addEventListener('click', () => this.resetFileUpload());
        this.decodeBtn.addEventListener('click', () => this.startDecoding());

        // Results
        this.downloadOriginalBtn.addEventListener('click', () => this.downloadOriginal());
        this.downloadModifiedBtn.addEventListener('click', () => this.downloadModified());
        this.selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e));
        this.removeSelectedBtn.addEventListener('click', () => this.removeSelectedFiles());

        // Error
        this.retryBtn.addEventListener('click', () => this.resetToUpload());
    }

    // Drag and drop handlers
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        if (!file.name.toLowerCase().endsWith('.fxap')) {
            this.showError('Please select a valid .fxap file');
            return;
        }

        if (file.size > 100 * 1024 * 1024) {
            this.showError('File size exceeds 100MB limit');
            return;
        }

        this.fileNameEl.textContent = file.name;
        this.fileSizeEl.textContent = this.formatFileSize(file.size);
        this.fileInfo.classList.remove('hidden');
        this.uploadArea.querySelector('.upload-content').style.display = 'none';
        this.decodeBtn.disabled = false;
        this.selectedFile = file;
    }

    resetFileUpload() {
        this.fileInput.value = '';
        this.fileInfo.classList.add('hidden');
        this.uploadArea.querySelector('.upload-content').style.display = 'block';
        this.decodeBtn.disabled = true;
        this.selectedFile = null;
    }

    // Step management
    showStep(stepName) {
        Object.values(this.steps).forEach(step => step.classList.add('hidden'));
        this.steps[stepName].classList.remove('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.showStep('error');
    }

    resetToUpload() {
        this.showStep('upload');
        this.resetFileUpload();
        this.currentJobId = null;
        this.currentFiles = [];
        this.selectedFiles.clear();
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    // Decoding process
    async startDecoding() {
        if (!this.selectedFile) return;

        this.showStep('processing');
        this.resetProgress();
        this.addLogEntry('Starting upload...', 'info');

        const formData = new FormData();
        formData.append('fxapFile', this.selectedFile);

        try {
            this.addLogEntry('Uploading file to server...', 'info');
            const response = await fetch('/api/decode', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            this.currentJobId = result.jobId;
            this.addLogEntry('File uploaded successfully. Decoding...', 'success');
            this.startPolling();
            
        } catch (error) {
            this.addLogEntry(`Error: ${error.message}`, 'error');
            setTimeout(() => this.showError(error.message), 1000);
        }
    }

    startPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/job/${this.currentJobId}`);
                const job = await response.json();

                this.updateProgress(job);

                if (job.status === 'completed') {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                    this.handleJobComplete(job);
                } else if (job.status === 'error') {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                    this.addLogEntry(`Error: ${job.error}`, 'error');
                    setTimeout(() => this.showError(job.error), 1000);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 1000);
    }

    updateProgress(job) {
        this.progressFill.style.width = `${job.progress}%`;
        this.progressPercent.textContent = `${job.progress}%`;

        const statusMessages = {
            'decoding': 'Decoding .fxap file...',
            'extracting': 'Extracting ZIP archive...',
            'processing': 'Processing file removal...',
            'completed': 'Completed!'
        };

        this.progressText.textContent = statusMessages[job.status] || job.status;

        // Add log entries for progress milestones
        if (job.progress === 30) this.addLogEntry('FXAP header validated', 'success');
        if (job.progress === 50) this.addLogEntry('Decryption complete', 'success');
        if (job.progress === 80) this.addLogEntry('ZIP extraction complete', 'success');
    }

    resetProgress() {
        this.progressFill.style.width = '0%';
        this.progressPercent.textContent = '0%';
        this.progressText.textContent = 'Initializing...';
        this.statusLog.innerHTML = '';
    }

    addLogEntry(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;
        this.statusLog.appendChild(entry);
        this.statusLog.scrollTop = this.statusLog.scrollHeight;
    }

    handleJobComplete(job) {
        this.addLogEntry('All operations completed successfully!', 'success');
        this.currentFiles = job.files || [];
        
        // Update results summary
        this.resultFileName.textContent = job.fileName;
        this.resultFileCount.textContent = this.currentFiles.length;
        this.resultTotalSize.textContent = this.formatFileSize(
            this.currentFiles.reduce((sum, f) => sum + (f.size || 0), 0)
        );

        // Build file tree
        this.renderFileTree(this.currentFiles);
        
        // Enable download buttons
        this.downloadOriginalBtn.disabled = false;
        this.downloadModifiedBtn.disabled = true; // Will enable after file removal

        this.showStep('results');
    }

    // File tree rendering
    renderFileTree(files) {
        // Build directory tree
        const tree = this.buildFileTree(files);
        this.fileTree.innerHTML = this.renderTreeNode(tree, 0);
        
        // Bind checkbox events
        this.fileTree.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleFileCheckboxChange(e));
        });
    }

    buildFileTree(files) {
        const root = { name: '', children: {}, files: [], isRoot: true };
        
        files.forEach(file => {
            if (file.isDirectory) return;
            
            const parts = file.name.split('/');
            let current = root;
            
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    // It's a file
                    current.files.push({
                        name: part,
                        fullPath: file.name,
                        size: file.size,
                        lastModified: file.lastModified
                    });
                } else {
                    // It's a directory
                    if (!current.children[part]) {
                        current.children[part] = { name: part, children: {}, files: [] };
                    }
                    current = current.children[part];
                }
            });
        });
        
        return root;
    }

    renderTreeNode(node, depth) {
        let html = '';
        
        // Render directories first
        Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name)).forEach(dir => {
            const isSelected = this.selectedFiles.has(dir.name);
            html += `
                <div class="file-tree-item file-depth-${depth}" data-path="${this.escapeHtml(dir.name)}">
                    <input type="checkbox" data-path="${this.escapeHtml(dir.name)}" data-type="directory" ${isSelected ? 'checked' : ''}>
                    <svg class="file-icon folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <div class="file-info">
                        <span class="file-name">${this.escapeHtml(dir.name)}/</span>
                    </div>
                </div>
            `;
            html += this.renderTreeNode(dir, depth + 1);
        });
        
        // Render files
        node.files.sort((a, b) => a.name.localeCompare(b.name)).forEach(file => {
            const isSelected = this.selectedFiles.has(file.fullPath);
            html += `
                <div class="file-tree-item file-depth-${depth + 1}" data-path="${this.escapeHtml(file.fullPath)}">
                    <input type="checkbox" data-path="${this.escapeHtml(file.fullPath)}" data-type="file" ${isSelected ? 'checked' : ''}>
                    <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div class="file-info">
                        <span class="file-name">${this.escapeHtml(file.name)}</span>
                        <span class="file-meta">${this.formatFileSize(file.size)}</span>
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    handleFileCheckboxChange(e) {
        const checkbox = e.target;
        const path = checkbox.dataset.path;
        const type = checkbox.dataset.type;
        
        if (checkbox.checked) {
            this.selectedFiles.add(path);
            // If directory, select all children
            if (type === 'directory') {
                this.selectDirectoryChildren(path);
            }
        } else {
            this.selectedFiles.delete(path);
            // If directory, deselect all children
            if (type === 'directory') {
                this.deselectDirectoryChildren(path);
            }
        }
        
        this.updateUIAfterSelection();
    }

    selectDirectoryChildren(dirPath) {
        this.fileTree.querySelectorAll(`input[data-path^="${dirPath}/"]`).forEach(cb => {
            cb.checked = true;
            this.selectedFiles.add(cb.dataset.path);
        });
    }

    deselectDirectoryChildren(dirPath) {
        this.fileTree.querySelectorAll(`input[data-path^="${dirPath}/"]`).forEach(cb => {
            cb.checked = false;
            this.selectedFiles.delete(cb.dataset.path);
        });
    }

    toggleSelectAll(e) {
        const checked = e.target.checked;
        this.fileTree.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = checked;
            if (checked) {
                this.selectedFiles.add(cb.dataset.path);
            } else {
                this.selectedFiles.delete(cb.dataset.path);
            }
        });
        this.updateUIAfterSelection();
    }

    updateUIAfterSelection() {
        const hasSelection = this.selectedFiles.size > 0;
        this.removeSelectedBtn.disabled = !hasSelection;
        
        // Update row highlighting
        this.fileTree.querySelectorAll('.file-tree-item').forEach(item => {
            const path = item.dataset.path;
            if (this.selectedFiles.has(path)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });

        // Update select all checkbox
        const allCheckboxes = this.fileTree.querySelectorAll('input[type="checkbox"]');
        const checkedCount = this.fileTree.querySelectorAll('input[type="checkbox"]:checked').length;
        this.selectAllCheckbox.checked = checkedCount === allCheckboxes.length && allCheckboxes.length > 0;
        this.selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
    }

    // File removal
    async removeSelectedFiles() {
        if (this.selectedFiles.size === 0) return;

        this.removeSelectedBtn.disabled = true;
        this.removeSelectedBtn.innerHTML = '<span class="btn-loader"></span> Removing...';

        try {
            const response = await fetch(`/api/job/${this.currentJobId}/remove-files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filesToRemove: Array.from(this.selectedFiles) })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove files');
            }

            this.addLogEntry(`Removed ${result.removedFiles.length} file(s)`, 'success');
            this.downloadModifiedBtn.disabled = false;
            this.selectedFiles.clear();
            this.updateUIAfterSelection();
            
            // Refresh file tree to show remaining files
            // For simplicity, we'll just update the UI - in a real app you might refetch
            
        } catch (error) {
            this.addLogEntry(`Error removing files: ${error.message}`, 'error');
            alert(`Failed to remove files: ${error.message}`);
        } finally {
            this.removeSelectedBtn.innerHTML = 'Remove Selected';
            this.removeSelectedBtn.disabled = this.selectedFiles.size === 0;
        }
    }

    // Downloads
    downloadOriginal() {
        if (!this.currentJobId) return;
        window.location.href = `/api/job/${this.currentJobId}/download-original`;
    }

    downloadModified() {
        if (!this.currentJobId) return;
        window.location.href = `/api/job/${this.currentJobId}/download`;
    }

    // Utilities
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FXAPDecoderApp();
});