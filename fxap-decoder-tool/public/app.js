/**
 * FXAP Decoder Tool - Frontend Application
 * Handles plugin ZIP/.fxap upload, scanning, decoding, file management, and downloads
 */

class FXAPDecoderApp {
    constructor() {
        this.currentJobId = null;
        this.currentFxapResults = [];
        this.activeFxapIndex = 0;
        this.selectedFiles = new Map(); // fxapIndex -> Set of selected file paths
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
        this.cfxKeyInput = document.getElementById('cfxKeyInput');

        // Processing elements
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressPercent = document.getElementById('progressPercent');
        this.statusLog = document.getElementById('statusLog');

        // Results elements
        this.resultFileName = document.getElementById('resultFileName');
        this.resultFxapCount = document.getElementById('resultFxapCount');
        this.resultSuccessCount = document.getElementById('resultSuccessCount');
        this.resultFailCount = document.getElementById('resultFailCount');
        this.fxapTabs = document.getElementById('fxapTabs');
        this.tabPanels = document.getElementById('tabPanels');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');

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

        // Global download
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());

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
        const ext = file.name.toLowerCase();
        if (!ext.endsWith('.fxap') && !ext.endsWith('.zip')) {
            this.showError('Please select a valid .fxap or .zip file');
            return;
        }

        if (file.size > 500 * 1024 * 1024) {
            this.showError('File size exceeds 500MB limit');
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
        this.currentFxapResults = [];
        this.activeFxapIndex = 0;
        this.selectedFiles.clear();
        this.fxapTabs.innerHTML = '';
        this.tabPanels.innerHTML = '';
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
        formData.append('pluginFile', this.selectedFile);
        
        // Include CFX KEY if provided
        const cfxKey = this.cfxKeyInput.value.trim();
        if (cfxKey) {
            formData.append('cfxKey', cfxKey);
        }

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
            this.currentFxapResults = result.fxapResults || [];
            
            if (result.isDirectFxap) {
                this.addLogEntry('Direct .fxap file detected. Decoding...', 'success');
            } else {
                this.addLogEntry(`Plugin ZIP uploaded. Found ${result.fxapCount} .fxap file(s). Decoding...`, 'success');
            }
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
            'scanning': 'Scanning for .fxap files...',
            'extracting': 'Extracting plugin ZIP...',
            'decoding': 'Decoding .fxap files...',
            'processing': 'Processing file removal...',
            'completed': 'Completed!'
        };

        this.progressText.textContent = statusMessages[job.status] || job.status;

        // Add log entries for progress milestones
        if (job.progress === 10) this.addLogEntry('Plugin ZIP extracted', 'success');
        if (job.progress === 20) this.addLogEntry(`Found ${job.fxapResults?.length || 0} .fxap file(s)`, 'success');
        if (job.progress >= 30 && job.progress < 80) {
            // Decoding in progress
        }
        if (job.progress === 80) this.addLogEntry('All .fxap files decoded', 'success');
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
        this.currentFxapResults = job.fxapResults || [];
        
        // Update summary
        this.resultFileName.textContent = job.originalFileName;
        this.resultFxapCount.textContent = job.fxapCount || 0;
        this.resultSuccessCount.textContent = job.successCount || 0;
        this.resultFailCount.textContent = job.failCount || 0;

        // Build tabs and panels
        this.buildTabsAndPanels();
        
        // Enable global download if any succeeded
        this.downloadAllBtn.disabled = job.successCount === 0;

        this.showStep('results');
    }

    buildTabsAndPanels() {
        this.fxapTabs.innerHTML = '';
        this.tabPanels.innerHTML = '';
        
        this.currentFxapResults.forEach((result, index) => {
            // Create tab
            const tab = document.createElement('button');
            tab.className = `fxap-tab ${index === 0 ? 'active' : ''}`;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', index === 0);
            tab.dataset.index = index;
            
            const hasError = !!result.error;
            const fileCount = result.fileCount || 0;
            
            tab.innerHTML = `
                <span class="tab-name">${this.escapeHtml(result.fxapName)}</span>
                <span class="tab-badge">${fileCount} files</span>
                ${hasError ? '<span class="tab-error">⚠ Failed</span>' : ''}
            `;
            
            tab.addEventListener('click', () => this.switchTab(index));
            this.fxapTabs.appendChild(tab);

            // Create panel
            const panel = document.createElement('div');
            panel.className = `tab-panel ${index === 0 ? 'active' : ''}`;
            panel.setAttribute('role', 'tabpanel');
            panel.dataset.index = index;
            panel.innerHTML = this.renderFxapPanel(result, index);
            this.tabPanels.appendChild(panel);

            // Initialize selection set for this fxap
            if (!this.selectedFiles.has(index)) {
                this.selectedFiles.set(index, new Set());
            }
        });

        // Bind events for the first panel
        this.bindPanelEvents(0);
    }

    renderFxapPanel(result, index) {
        if (result.error) {
            return `
                <div class="fxap-panel">
                    <div class="fxap-header">
                        <div class="fxap-title">
                            <svg class="fxap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <div>
                                <div class="fxap-name">${this.escapeHtml(result.fxapName)}</div>
                                <div class="fxap-path">${this.escapeHtml(result.fxapRelativePath)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="fxap-error">
                        <strong>Failed to decode:</strong> ${this.escapeHtml(result.error)}
                    </div>
                </div>
            `;
        }

        return `
            <div class="fxap-panel">
                <div class="fxap-header">
                    <div class="fxap-title">
                        <svg class="fxap-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <div>
                            <div class="fxap-name">${this.escapeHtml(result.fxapName)}</div>
                            <div class="fxap-path">${this.escapeHtml(result.fxapRelativePath)}</div>
                        </div>
                    </div>
                    <div class="fxap-stats">
                        <div class="fxap-stat">
                            <span class="stat-value">${result.fileCount}</span> files
                        </div>
                        <div class="fxap-stat">
                            <span class="stat-value">${this.formatFileSize(result.totalSize)}</span> total
                        </div>
                    </div>
                </div>

                <div class="file-management">
                    <h3>Select Files to Remove</h3>
                    <div class="file-list-header">
                        <label class="checkbox-select-all">
                            <input type="checkbox" id="selectAllFiles_${index}">
                            <span>Select All</span>
                        </label>
                        <button id="removeSelectedBtn_${index}" class="btn btn-danger btn-sm" disabled>
                            Remove Selected
                        </button>
                    </div>
                    <div class="file-tree" id="fileTree_${index}">${this.renderFileTree(result.files, index)}</div>
                </div>

                <div class="fxap-actions">
                    <button id="downloadOriginalBtn_${index}" class="btn btn-outline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download Original ZIP
                    </button>
                    <button id="downloadModifiedBtn_${index}" class="btn btn-primary" disabled>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download Modified ZIP
                    </button>
                </div>
            </div>
        `;
    }

    renderFileTree(files, fxapIndex) {
        // Build directory tree
        const tree = this.buildFileTree(files);
        return this.renderTreeNode(tree, 0, fxapIndex);
    }

    buildFileTree(files) {
        const root = { name: '', children: {}, files: [], isRoot: true };
        
        files.forEach(file => {
            if (file.isDirectory) return;
            
            const parts = file.name.split('/');
            let current = root;
            
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    current.files.push({
                        name: part,
                        fullPath: file.name,
                        size: file.size,
                        lastModified: file.lastModified
                    });
                } else {
                    if (!current.children[part]) {
                        current.children[part] = { name: part, children: {}, files: [] };
                    }
                    current = current.children[part];
                }
            });
        });
        
        return root;
    }

    renderTreeNode(node, depth, fxapIndex) {
        let html = '';
        
        // Render directories first
        Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name)).forEach(dir => {
            const dirPath = this.getDirPath(node, dir.name);
            const isSelected = this.selectedFiles.get(fxapIndex)?.has(dirPath);
            html += `
                <div class="file-tree-item file-depth-${depth}" data-path="${this.escapeHtml(dirPath)}">
                    <input type="checkbox" data-path="${this.escapeHtml(dirPath)}" data-type="directory" data-fxap="${fxapIndex}" ${isSelected ? 'checked' : ''}>
                    <svg class="file-icon folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <div class="file-info">
                        <span class="file-name">${this.escapeHtml(dir.name)}/</span>
                    </div>
                </div>
            `;
            html += this.renderTreeNode(dir, depth + 1, fxapIndex);
        });
        
        // Render files
        node.files.sort((a, b) => a.name.localeCompare(b.name)).forEach(file => {
            const isSelected = this.selectedFiles.get(fxapIndex)?.has(file.fullPath);
            html += `
                <div class="file-tree-item file-depth-${depth + 1}" data-path="${this.escapeHtml(file.fullPath)}">
                    <input type="checkbox" data-path="${this.escapeHtml(file.fullPath)}" data-type="file" data-fxap="${fxapIndex}" ${isSelected ? 'checked' : ''}>
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

    getDirPath(parentNode, dirName) {
        // This is a simplified version - in reality we'd track full path
        // For now, we'll use a data attribute approach
        return dirName;
    }

    switchTab(index) {
        // Update tabs
        this.fxapTabs.querySelectorAll('.fxap-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
            tab.setAttribute('aria-selected', i === index);
        });

        // Update panels
        this.tabPanels.querySelectorAll('.tab-panel').forEach((panel, i) => {
            panel.classList.toggle('active', i === index);
        });

        this.activeFxapIndex = index;
        this.bindPanelEvents(index);
    }

    bindPanelEvents(fxapIndex) {
        const panel = this.tabPanels.querySelector(`[data-index="${fxapIndex}"]`);
        if (!panel) return;

        // Checkbox events
        panel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            // Remove old listeners by cloning
            const newCheckbox = checkbox.cloneNode(true);
            checkbox.parentNode.replaceChild(newCheckbox, checkbox);
            newCheckbox.addEventListener('change', (e) => this.handleFileCheckboxChange(e, fxapIndex));
        });

        // Button events
        const removeBtn = panel.querySelector(`#removeSelectedBtn_${fxapIndex}`);
        const downloadOriginalBtn = panel.querySelector(`#downloadOriginalBtn_${fxapIndex}`);
        const downloadModifiedBtn = panel.querySelector(`#downloadModifiedBtn_${fxapIndex}`);
        const selectAllCheckbox = panel.querySelector(`#selectAllFiles_${fxapIndex}`);

        if (removeBtn) {
            removeBtn.onclick = () => this.removeSelectedFiles(fxapIndex);
        }
        if (downloadOriginalBtn) {
            downloadOriginalBtn.onclick = () => this.downloadOriginal(fxapIndex);
        }
        if (downloadModifiedBtn) {
            downloadModifiedBtn.onclick = () => this.downloadModified(fxapIndex);
        }
        if (selectAllCheckbox) {
            selectAllCheckbox.onchange = (e) => this.toggleSelectAll(e, fxapIndex);
        }

        this.updateUIAfterSelection(fxapIndex);
    }

    handleFileCheckboxChange(e, fxapIndex) {
        const checkbox = e.target;
        const path = checkbox.dataset.path;
        const type = checkbox.dataset.type;
        const selectedSet = this.selectedFiles.get(fxapIndex) || new Set();
        
        if (checkbox.checked) {
            selectedSet.add(path);
            // If directory, select all children
            if (type === 'directory') {
                this.selectDirectoryChildren(path, fxapIndex);
            }
        } else {
            selectedSet.delete(path);
            // If directory, deselect all children
            if (type === 'directory') {
                this.deselectDirectoryChildren(path, fxapIndex);
            }
        }
        
        this.selectedFiles.set(fxapIndex, selectedSet);
        this.updateUIAfterSelection(fxapIndex);
    }

    selectDirectoryChildren(dirPath, fxapIndex) {
        const panel = this.tabPanels.querySelector(`[data-index="${fxapIndex}"]`);
        if (!panel) return;
        
        panel.querySelectorAll(`input[data-path^="${dirPath}/"]`).forEach(cb => {
            cb.checked = true;
            this.selectedFiles.get(fxapIndex)?.add(cb.dataset.path);
        });
    }

    deselectDirectoryChildren(dirPath, fxapIndex) {
        const panel = this.tabPanels.querySelector(`[data-index="${fxapIndex}"]`);
        if (!panel) return;
        
        panel.querySelectorAll(`input[data-path^="${dirPath}/"]`).forEach(cb => {
            cb.checked = false;
            this.selectedFiles.get(fxapIndex)?.delete(cb.dataset.path);
        });
    }

    toggleSelectAll(e, fxapIndex) {
        const checked = e.target.checked;
        const panel = this.tabPanels.querySelector(`[data-index="${fxapIndex}"]`);
        if (!panel) return;
        
        const selectedSet = this.selectedFiles.get(fxapIndex) || new Set();
        
        panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = checked;
            if (checked) {
                selectedSet.add(cb.dataset.path);
            } else {
                selectedSet.delete(cb.dataset.path);
            }
        });
        
        this.selectedFiles.set(fxapIndex, selectedSet);
        this.updateUIAfterSelection(fxapIndex);
    }

    updateUIAfterSelection(fxapIndex) {
        const panel = this.tabPanels.querySelector(`[data-index="${fxapIndex}"]`);
        if (!panel) return;

        const selectedSet = this.selectedFiles.get(fxapIndex) || new Set();
        const hasSelection = selectedSet.size > 0;
        
        const removeBtn = panel.querySelector(`#removeSelectedBtn_${fxapIndex}`);
        const downloadModifiedBtn = panel.querySelector(`#downloadModifiedBtn_${fxapIndex}`);
        
        if (removeBtn) removeBtn.disabled = !hasSelection;
        if (downloadModifiedBtn) downloadModifiedBtn.disabled = !hasSelection;
        
        // Update row highlighting
        panel.querySelectorAll('.file-tree-item').forEach(item => {
            const path = item.dataset.path;
            if (selectedSet.has(path)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });

        // Update select all checkbox
        const allCheckboxes = panel.querySelectorAll('input[type="checkbox"]');
        const checkedCount = panel.querySelectorAll('input[type="checkbox"]:checked').length;
        const selectAllCheckbox = panel.querySelector(`#selectAllFiles_${fxapIndex}`);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkedCount === allCheckboxes.length && allCheckboxes.length > 0;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
        }
    }

    // File removal
    async removeSelectedFiles(fxapIndex) {
        const selectedSet = this.selectedFiles.get(fxapIndex);
        if (!selectedSet || selectedSet.size === 0) return;

        const removeBtn = this.tabPanels.querySelector(`#removeSelectedBtn_${fxapIndex}`);
        if (removeBtn) {
            removeBtn.disabled = true;
            removeBtn.innerHTML = '<span class="btn-loader"></span> Removing...';
        }

        try {
            const response = await fetch(`/api/job/${this.currentJobId}/remove-files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    fxapIndex, 
                    filesToRemove: Array.from(selectedSet) 
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove files');
            }

            this.addLogEntry(`Removed ${result.removedFiles.length} file(s) from ${this.currentFxapResults[fxapIndex].fxapName}`, 'success');
            
            const downloadModifiedBtn = this.tabPanels.querySelector(`#downloadModifiedBtn_${fxapIndex}`);
            if (downloadModifiedBtn) downloadModifiedBtn.disabled = false;
            
            // Clear selection
            selectedSet.clear();
            this.updateUIAfterSelection(fxapIndex);
            
        } catch (error) {
            this.addLogEntry(`Error removing files: ${error.message}`, 'error');
            alert(`Failed to remove files: ${error.message}`);
        } finally {
            if (removeBtn) {
                removeBtn.innerHTML = 'Remove Selected';
                removeBtn.disabled = selectedSet.size === 0;
            }
        }
    }

    // Downloads
    downloadOriginal(fxapIndex) {
        if (!this.currentJobId) return;
        window.location.href = `/api/job/${this.currentJobId}/download/${fxapIndex}`;
    }

    downloadModified(fxapIndex) {
        if (!this.currentJobId) return;
        window.location.href = `/api/job/${this.currentJobId}/download/${fxapIndex}`;
    }

    downloadAll() {
        if (!this.currentJobId) return;
        window.location.href = `/api/job/${this.currentJobId}/download-all`;
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