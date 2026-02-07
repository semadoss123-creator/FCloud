class FileManager {
    constructor() {
        this.currentPath = '';
        this.selectedItem = null;
        this.files = [];
        this.uploadQueue = [];
        this.isUploading = false;
        this.uploadSpeeds = [];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadServerInfo();
        await this.loadFiles();

        setInterval(() => this.loadFiles(), 30000);
    }

    async loadServerInfo() {
        try {
            const response = await fetch('/api/server-info');
            const info = await response.json();
            
            document.getElementById('serverUrl').textContent = 
                `Server: ${info.ip}:${info.port}`;

            console.log('Local access:', info.urls.local);
            console.log('Local host:', info.urls.network);
            console.log('IP for connection with other devices:', info.ip);
            
        } catch (error) {
            console.error('Error loading server information:', error);
            document.getElementById('serverUrl').textContent = 
                'Server connection error';
        }
    }

    async loadFiles() {
        try {
            const url = `/api/files${this.currentPath ? `?path=${encodeURIComponent(this.currentPath)}` : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.files = await response.json();
            this.displayFiles();
            this.updateBreadcrumb();
            this.updateStatusBar();
            
        } catch (error) {
            console.error('Error loading files:', error);
            this.showError('Failed to load file list');
            this.files = [];
            this.displayFiles();
        }
    }

    displayFiles() {
        const fileList = document.getElementById('fileList');
        
        if (this.files.length === 0) {
            fileList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>Folder is empty</h3>
                    <p>Upload files to get started</p>
                </div>
            `;
            return;
        }

        fileList.innerHTML = this.files.map(file => `
            <div class="file-item ${file.type}" data-path="${file.path}">
                <div class="file-name" onclick="fileManager.openItem('${this.escapeHtml(file.path)}', '${file.type}')">
                    <i class="fas ${file.type === 'folder' ? 'fa-folder' : 'fa-file'} file-icon"></i>
                    <span>${this.escapeHtml(file.name)}</span>
                </div>
                <div class="file-size">${file.type === 'folder' ? '—' : this.formatSize(file.size)}</div>
                <div class="file-modified">${this.formatDate(file.modified)}</div>
                <div class="file-actions">
                    ${file.type === 'folder' ? `
                        <button class="action-btn" onclick="fileManager.downloadFolder('${this.escapeHtml(file.path)}')" title="Download as ZIP">
                            <i class="fas fa-file-archive"></i>
                        </button>
                    ` : `
                        <button class="action-btn" onclick="fileManager.downloadFile('${this.escapeHtml(file.path)}')" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                    `}
                    <button class="action-btn" onclick="fileManager.renameItem('${this.escapeHtml(file.path)}')" title="Rename">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="fileManager.deleteItem('${this.escapeHtml(file.path)}', '${file.type}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatSpeed(bytesPerSecond) {
        if (bytesPerSecond === 0) return '0 B/s';
        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
        const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
        return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        const parts = this.currentPath.split('/').filter(p => p);
        
        let html = '<span class="crumb" data-path="">Root</span>';
        
        let currentPath = '';
        parts.forEach(part => {
            currentPath += (currentPath ? '/' : '') + part;
            html += `<span class="crumb" data-path="${currentPath}">${this.escapeHtml(part)}</span>`;
        });
        
        breadcrumb.innerHTML = html;
        
        breadcrumb.querySelectorAll('.crumb').forEach(crumb => {
            crumb.addEventListener('click', (e) => {
                const path = e.target.dataset.path;
                this.navigateTo(path);
            });
        });
    }

    updateStatusBar() {
        const totalItems = this.files.length;
        const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
        
        document.getElementById('itemCount').textContent = 
            `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
        document.getElementById('totalSize').textContent = this.formatSize(totalSize);
    }

    navigateTo(path) {
        this.currentPath = path;
        this.loadFiles();
    }

    openItem(path, type) {
        if (type === 'folder') {
            this.navigateTo(path);
        } else {
            this.downloadFile(path);
        }
    }

    async downloadFile(filePath) {
        try {
            const response = await fetch(`/api/download?path=${encodeURIComponent(filePath)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Download error');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showSuccess(`File "${filePath.split('/').pop()}" downloaded successfully`);
            
        } catch (error) {
            console.error('Error downloading file:', error);
            this.showError(`Failed to download file: ${error.message}`);
        }
    }

    async downloadFolder(folderPath) {
        try {
            const response = await fetch(`/api/download-folder?path=${encodeURIComponent(folderPath)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Folder download error');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderPath.split('/').pop()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showSuccess(`Folder "${folderPath.split('/').pop()}" downloaded as ZIP archive`);
            
        } catch (error) {
            console.error('Error downloading folder:', error);
            this.showError(`Failed to download folder: ${error.message}`);
        }
    }

    async deleteItem(itemPath, type) {
        if (!confirm(`Delete ${type === 'folder' ? 'folder' : 'file'} "${itemPath.split('/').pop()}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/delete?path=${encodeURIComponent(itemPath)}&type=${type}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Delete error');
            }
            
            this.showSuccess(`Deleted successfully`);
            this.loadFiles();
            
        } catch (error) {
            console.error('Delete error:', error);
            this.showError(`Failed to delete: ${error.message}`);
        }
    }

    async renameItem(oldPath) {
        this.selectedItem = oldPath;
        const currentName = oldPath.split('/').pop();
        
        document.getElementById('renameInput').value = currentName;
        document.getElementById('renameModal').style.display = 'flex';
        document.getElementById('renameInput').focus();
        document.getElementById('renameInput').select();
    }

    async confirmRename() {
        const newName = document.getElementById('renameInput').value.trim();
        
        if (!newName) {
            this.showError('Enter new name');
            return;
        }
        
        if (!this.selectedItem) return;
        
        try {
            const response = await fetch('/api/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldPath: this.selectedItem,
                    newName: newName
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Rename error');
            }
            
            this.showSuccess('Renamed successfully');
            this.hideRenameModal();
            this.loadFiles();
            
        } catch (error) {
            console.error('Rename error:', error);
            this.showError(`Failed to rename: ${error.message}`);
        }
    }

    async uploadFiles(files) {
        if (files.length === 0) return;
        
        this.uploadQueue = Array.from(files);
        this.isUploading = true;
        this.uploadSpeeds = [];
        
        this.showProgressModal();
        
        let uploadedCount = 0;
        const totalFiles = files.length;
        
        for (const file of this.uploadQueue) {
            await this.uploadSingleFile(file, uploadedCount, totalFiles);
            uploadedCount++;
            
            const progress = Math.round((uploadedCount / totalFiles) * 100);
            this.updateProgress(progress, `Uploaded ${uploadedCount} of ${totalFiles} files`, file.name);
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isUploading = false;
        this.uploadQueue = [];
        
        setTimeout(() => {
            this.hideProgressModal();
            this.showSuccess(`Uploaded ${uploadedCount} files`);
            this.loadFiles();
        }, 500);
    }

    async uploadSingleFile(file, index, total) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('files', file);
            
            if (this.currentPath) {
                formData.append('path', this.currentPath);
            }
            
            const xhr = new XMLHttpRequest();
            let startTime = Date.now();
            let lastLoaded = 0;
            let lastTime = startTime;
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const currentTime = Date.now();
                    const timeDiff = (currentTime - lastTime) / 1000;
                    
                    if (timeDiff >= 0.5) {
                        const loadedDiff = e.loaded - lastLoaded;
                        const speed = loadedDiff / timeDiff;
                        this.uploadSpeeds[index] = speed;
                        
                        const validSpeeds = this.uploadSpeeds.filter(s => s > 0);
                        const averageSpeed = validSpeeds.length > 0 
                            ? validSpeeds.reduce((sum, s) => sum + s, 0) / validSpeeds.length 
                            : 0;
                        
                        lastLoaded = e.loaded;
                        lastTime = currentTime;
                        
                        const fileProgress = Math.round((e.loaded / e.total) * 100);
                        const totalProgress = Math.round(((index + (fileProgress / 100)) / total) * 100);
                        this.updateProgress(totalProgress, `Uploading "${file.name}"`, file.name, averageSpeed);
                    }
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    resolve();
                } else {
                    reject(new Error(`Upload error: ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });
            
            xhr.open('POST', '/api/upload');
            xhr.send(formData);
        });
    }

    updateProgress(percent, message, filename, speed = 0) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = `${percent}%`;
        document.getElementById('currentFile').textContent = 
            `${message}${filename ? `: ${filename}` : ''}`;
        
        if (speed > 0) {
            const speedElement = document.getElementById('uploadSpeed');
            const speedValue = document.getElementById('speedValue');
            
            speedElement.style.display = 'block';
            speedValue.textContent = this.formatSpeed(speed);
        }
    }

    showProgressModal() {
        document.getElementById('progressModal').style.display = 'flex';
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressText').textContent = '0%';
        document.getElementById('currentFile').textContent = 'Preparing...';
        document.getElementById('uploadSpeed').style.display = 'none';
    }

    hideProgressModal() {
        document.getElementById('progressModal').style.display = 'none';
    }

    hideRenameModal() {
        document.getElementById('renameModal').style.display = 'none';
        this.selectedItem = null;
    }

    setupEventListeners() {
        document.getElementById('backBtn').addEventListener('click', () => {
            if (this.currentPath) {
                const parts = this.currentPath.split('/');
                parts.pop();
                this.navigateTo(parts.join('/'));
            }
        });
        
        document.getElementById('homeBtn').addEventListener('click', () => {
            this.navigateTo('');
        });
        
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadFiles();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.uploadFiles(e.target.files);
            e.target.value = '';
        });
        
        document.getElementById('confirmRenameBtn').addEventListener('click', () => {
            this.confirmRename();
        });
        
        document.getElementById('cancelRenameBtn').addEventListener('click', () => {
            this.hideRenameModal();
        });
        
        document.getElementById('renameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmRename();
            }
        });
        
        document.getElementById('cancelUploadBtn').addEventListener('click', () => {
            if (this.isUploading) {
                if (confirm('Cancel upload?')) {
                    this.isUploading = false;
                    this.uploadQueue = [];
                    this.hideProgressModal();
                }
            }
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        if (!document.querySelector('.notification')) {
            const style = document.createElement('style');
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 9999;
                    animation: slideIn 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .notification-success {
                    background: #10b981;
                }
                .notification-error {
                    background: #ef4444;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

let fileManager;

document.addEventListener('DOMContentLoaded', () => {
    fileManager = new FileManager();
    
    window.fileManager = fileManager;
});
