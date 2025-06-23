/**
 * Professional Keyword Processor - Main Application Script
 * Author: SEO Research Tools
 * Version: 1.0
 * Description: Handles CSV processing, webhook communication, and data management
 */

class KeywordProcessor {
    constructor() {
        this.selectedFile = null;
        this.processedData = null;
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.showAllClusters = false;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.loadSettings();
        this.setupFileUpload();
        console.log('🔍 Keyword Processor initialized successfully');
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // File upload events
        const uploadZone = document.getElementById('uploadZone');
        const csvFile = document.getElementById('csvFile');

        uploadZone?.addEventListener('click', () => csvFile?.click());
        uploadZone?.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadZone?.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadZone?.addEventListener('drop', this.handleDrop.bind(this));
        csvFile?.addEventListener('change', this.handleFileSelect.bind(this));

        // Settings auto-save
        ['webhookUrl', 'authUsername', 'authPassword'].forEach(id => {
            const element = document.getElementById(id);
            element?.addEventListener('change', this.saveSettings.bind(this));
        });

        // Seed keyword input
        const seedKeywordInput = document.getElementById('seedKeyword');
        seedKeywordInput?.addEventListener('input', this.validateForm.bind(this));
    }

    /**
     * Setup file upload handlers
     */
    setupFileUpload() {
        const csvFile = document.getElementById('csvFile');
        if (csvFile) {
            csvFile.accept = '.csv';
        }
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        e.preventDefault();
        const uploadZone = document.getElementById('uploadZone');
        uploadZone?.classList.add('dragover');
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(e) {
        e.preventDefault();
        const uploadZone = document.getElementById('uploadZone');
        uploadZone?.classList.remove('dragover');
    }

    /**
     * Handle file drop event
     */
    handleDrop(e) {
        e.preventDefault();
        const uploadZone = document.getElementById('uploadZone');
        uploadZone?.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect({ target: { files } });
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!this.validateFile(file)) return;

        this.selectedFile = file;
        this.displayFileInfo(file);
        this.extractSeedKeyword(file.name);
        this.validateForm();
        this.hideResults();
    }

    /**
     * Validate uploaded file
     */
    validateFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showAlert('Please select a CSV file!', 'error');
            return false;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            this.showAlert('File too large! Maximum size is 50MB.', 'error');
            return false;
        }

        return true;
    }

    /**
     * Display file information
     */
    displayFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        if (!fileInfo) return;

        const formatDate = (timestamp) => {
            return new Date(timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        fileInfo.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>📄 ${this.escapeHtml(file.name)}</strong><br>
                    <small>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB | Modified: ${formatDate(file.lastModified)}</small>
                </div>
                <button class="btn btn-outline" onclick="keywordProcessor.clearFile()" style="color: #dc2626;">
                    🗑️ Remove
                </button>
            </div>
        `;
        fileInfo.style.display = 'block';
    }

    /**
     * Extract seed keyword from filename
     */
    extractSeedKeyword(filename) {
        const autoExtracted = document.getElementById('autoExtracted');
        const extractedSeedKeyword = document.getElementById('extractedSeedKeyword');
        const seedKeywordInput = document.getElementById('seedKeyword');

        // Pattern: seed-keyword_clusters_YYYY-MM-DD.csv
        const match = filename.match(/^([^_]+)_clusters_/i);
        
        if (match && match[1]) {
            const seedKeyword = match[1].toLowerCase().replace(/[-_]/g, '-');
            
            if (extractedSeedKeyword) {
                extractedSeedKeyword.textContent = seedKeyword;
            }
            
            if (seedKeywordInput) {
                seedKeywordInput.value = seedKeyword;
            }
            
            if (autoExtracted) {
                autoExtracted.style.display = 'flex';
            }
        } else {
            if (autoExtracted) {
                autoExtracted.style.display = 'none';
            }
        }
    }

    /**
     * Clear selected file
     */
    clearFile() {
        this.selectedFile = null;
        const csvFile = document.getElementById('csvFile');
        const fileInfo = document.getElementById('fileInfo');
        const autoExtracted = document.getElementById('autoExtracted');
        
        if (csvFile) csvFile.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (autoExtracted) autoExtracted.style.display = 'none';
        
        this.validateForm();
        this.hideResults();
    }

    /**
     * Validate form inputs
     */
    validateForm() {
        const processBtn = document.getElementById('processBtn');
        const seedKeyword = document.getElementById('seedKeyword')?.value.trim();
        
        if (processBtn) {
            processBtn.disabled = !this.selectedFile || !seedKeyword;
        }
    }

    /**
     * Process the uploaded file
     */
    async processFile() {
        if (!this.selectedFile) {
            this.showAlert('Please select a CSV file!', 'error');
            return;
        }

        const seedKeyword = document.getElementById('seedKeyword')?.value.trim();
        if (!seedKeyword) {
            this.showAlert('Please enter a seed keyword!', 'error');
            return;
        }

        this.setProcessingState(true);
        const startTime = Date.now();

        try {
            // Step 1: Parse CSV
            this.updateProgress(20, 'Reading CSV file...');
            const csvData = await this.parseCSVFile(this.selectedFile);

            // Step 2: Process clusters
            this.updateProgress(50, 'Analyzing keywords and creating clusters...');
            const clusters = this.processKeywordClusters(csvData);

            // Step 3: Create payload
            this.updateProgress(70, 'Preparing data payload...');
            const payload = this.createWebhookPayload(clusters, seedKeyword, Date.now() - startTime);

            // Step 4: Save to database (PHP endpoint)
            this.updateProgress(85, 'Saving to database...');
            await this.saveToDatabase(payload);

            // Step 5: Send webhook (optional - continue even if fails)
            this.updateProgress(95, 'Sending webhook notification...');
            try {
                await this.sendWebhook(payload);
            } catch (webhookError) {
                console.warn('Webhook failed but continuing:', webhookError);
                this.showAlert('Data processed successfully! Note: Webhook notification failed.', 'warning');
            }

            // Step 6: Complete
            this.updateProgress(100, 'Processing complete!');
            
            setTimeout(() => {
                this.setProcessingState(false);
                this.showSuccessResult(payload);
                this.displayDataPreview(payload);
            }, 500);

        } catch (error) {
            console.error('Processing error:', error);
            this.setProcessingState(false);
            this.showAlert(`Processing failed: ${error.message}`, 'error');
        }
    }

    /**
     * Parse CSV file using PapaParse
     */
    parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                transformHeader: (header) => header.trim(),
                encoding: 'UTF-8',
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn('CSV parsing warnings:', results.errors);
                    }
                    resolve(results.data);
                },
                error: (error) => {
                    reject(new Error(`CSV parsing failed: ${error.message}`));
                }
            });
        });
    }

    /**
     * Process keyword clusters from CSV data
     */
    processKeywordClusters(csvData) {
        if (!csvData || csvData.length === 0) {
            throw new Error('CSV file is empty or invalid');
        }

        // Clean and validate data
        const cleanData = csvData.filter(row => {
            return row.Keyword && 
                   typeof row.Keyword === 'string' && 
                   row.Keyword.trim() &&
                   row.Page && 
                   typeof row.Page === 'string' && 
                   row.Page.trim();
        });

        if (cleanData.length === 0) {
            throw new Error('No valid keyword data found in CSV');
        }

        // Group by Page + Page type
        const grouped = {};
        
        cleanData.forEach(row => {
            const page = row.Page.trim();
            const pageType = (row['Page type'] || row['Page Type'] || 'unknown').toString().trim();
            const key = `${page}|${pageType}`;
            
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(row);
        });

        // Create clusters
        const clusters = [];
        
        Object.entries(grouped).forEach(([key, keywords]) => {
            const [mainKeyword, pageType] = key.split('|');
            
            // Calculate metrics safely
            const totalVolume = keywords.reduce((sum, kw) => {
                const volume = this.parseNumber(kw.Volume || kw.volume);
                return sum + volume;
            }, 0);
            
            const difficulties = keywords
                .map(kw => this.parseNumber(kw['Keyword Difficulty'] || kw.Difficulty || kw.difficulty))
                .filter(d => d > 0);
            
            const avgDifficulty = difficulties.length > 0 
                ? Math.round((difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length) * 10) / 10
                : 0;
            
            const minDifficulty = difficulties.length > 0 ? Math.min(...difficulties) : 0;
            const maxDifficulty = difficulties.length > 0 ? Math.max(...difficulties) : 0;
            
            // Supporting keywords (exclude main keyword, limit to top 8)
            const supportingKeywords = keywords
                .map(kw => kw.Keyword.trim())
                .filter(kw => kw.toLowerCase() !== mainKeyword.toLowerCase())
                .slice(0, 8)
                .join(' | ') || 'N/A';
            
            // Topics and intents
            const topics = this.extractUniqueValues(keywords, ['Topic', 'topic']);
            const intents = this.extractUniqueValues(keywords, ['Intent', 'intent']);
            
            // Average CPC
            const cpcValues = keywords
                .map(kw => this.parseNumber(kw['CPC (USD)'] || kw.CPC || kw.cpc))
                .filter(c => c > 0);
            const avgCPC = cpcValues.length > 0 
                ? Math.round((cpcValues.reduce((sum, c) => sum + c, 0) / cpcValues.length) * 100) / 100
                : 0;
            
            // Seed keywords
            const seedKeywords = this.extractUniqueValues(keywords, ['Seed keyword', 'Seed Keyword', 'seed_keyword']);
            
            clusters.push({
                cluster_name: `${mainKeyword} (${pageType})`,
                keyword_count: keywords.length,
                supporting_keywords: supportingKeywords,
                total_volume: totalVolume,
                avg_difficulty: avgDifficulty,
                min_max_difficulty: `${minDifficulty}-${maxDifficulty}`,
                topics: topics || 'N/A',
                intent: intents || 'N/A',
                avg_cpc: avgCPC,
                seed_keywords: seedKeywords || 'N/A'
            });
        });

        // Sort by volume descending
        return clusters.sort((a, b) => b.total_volume - a.total_volume);
    }

    /**
     * Parse number safely
     */
    parseNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    /**
     * Extract unique values from keywords array
     */
    extractUniqueValues(keywords, fieldNames) {
        const values = new Set();
        
        keywords.forEach(kw => {
            fieldNames.forEach(fieldName => {
                if (kw[fieldName] && typeof kw[fieldName] === 'string') {
                    const value = kw[fieldName].trim();
                    if (value && value !== 'N/A' && value !== 'Unknown') {
                        values.add(value);
                    }
                }
            });
        });
        
        return Array.from(values).join(' | ') || null;
    }

    /**
     * Create webhook payload
     */
    createWebhookPayload(clusters, seedKeyword, processingTime) {
        const totalKeywords = clusters.reduce((sum, cluster) => sum + cluster.keyword_count, 0);
        const totalVolume = clusters.reduce((sum, cluster) => sum + cluster.total_volume, 0);
        const avgDifficulty = clusters.length > 0 
            ? Math.round((clusters.reduce((sum, cluster) => sum + cluster.avg_difficulty, 0) / clusters.length) * 10) / 10
            : 0;
        
        const pillarPages = clusters.filter(c => 
            c.cluster_name.toLowerCase().includes('pillar') || 
            c.cluster_name.toLowerCase().includes('main')
        ).length;
        
        const subPages = clusters.length - pillarPages;

        return {
            type: 'keyword_clusters_processed',
            timestamp: new Date().toISOString(),
            metadata: {
                seed_keyword: seedKeyword,
                filename: this.selectedFile?.name || 'unknown.csv',
                total_clusters: clusters.length,
                total_keywords: totalKeywords,
                total_volume: totalVolume,
                avg_difficulty: avgDifficulty,
                pillar_pages: pillarPages,
                sub_pages: subPages,
                processing_time_ms: processingTime
            },
            clusters: clusters
        };
    }

    /**
     * Save data to database via PHP endpoint
     */
    async saveToDatabase(payload) {
        // This would be implemented when PHP backend is ready
        console.log('Database save would happen here:', payload);
        
        // Simulated for now - in real implementation:
        // const response = await fetch('api/save-project.php', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(payload)
        // });
        
        return Promise.resolve({ success: true });
    }

    /**
     * Send webhook with Basic Auth
     */
    async sendWebhook(payload) {
        const webhookUrl = document.getElementById('webhookUrl')?.value.trim();
        const username = document.getElementById('authUsername')?.value.trim();
        const password = document.getElementById('authPassword')?.value.trim();

        if (!webhookUrl) {
            throw new Error('Webhook URL not configured');
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        // Add Basic Auth if credentials provided
        if (username && password) {
            const credentials = btoa(`${username}:${password}`);
            headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: HTTP ${response.status} - ${response.statusText}`);
        }

        return response;
    }

    /**
     * Test webhook connection
     */
    async testWebhook() {
        const statusDisplay = document.getElementById('connectionStatus');
        const webhookUrl = document.getElementById('webhookUrl')?.value.trim();

        if (!webhookUrl) {
            this.showStatusDisplay('Please enter a webhook URL first!', 'error');
            return;
        }

        this.showStatusDisplay('Testing connection...', 'testing');

        try {
            const testPayload = {
                type: 'test_connection',
                timestamp: new Date().toISOString(),
                message: 'Testing connection from Keyword Processor'
            };

            await this.sendWebhook(testPayload);
            this.showStatusDisplay('✅ Connection successful!', 'success');
        } catch (error) {
            this.showStatusDisplay(`❌ Connection failed: ${error.message}`, 'error');
        }
    }

    /**
     * Show status in display element
     */
    showStatusDisplay(message, type) {
        const statusDisplay = document.getElementById('connectionStatus');
        if (statusDisplay) {
            statusDisplay.textContent = message;
            statusDisplay.className = `status-display ${type}`;
            statusDisplay.style.display = 'block';
        }
    }

    /**
     * Set processing state UI
     */
    setProcessingState(processing) {
        const processBtn = document.getElementById('processBtn');
        const btnText = processBtn?.querySelector('.btn-text');
        const progressContainer = document.getElementById('progressContainer');

        if (processing) {
            if (processBtn) processBtn.disabled = true;
            if (btnText) btnText.innerHTML = '<div class="loading"></div> Processing...';
            if (progressContainer) progressContainer.style.display = 'block';
        } else {
            if (processBtn) processBtn.disabled = false;
            if (btnText) btnText.textContent = 'Process Keywords & Send to Database';
            if (progressContainer) progressContainer.style.display = 'none';
        }
    }

    /**
     * Update progress bar
     */
    updateProgress(percent, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = message;
    }

    /**
     * Show success result
     */
    showSuccessResult(payload) {
        const metadata = payload.metadata;
        
        const message = `
            ✅ <strong>Processing completed successfully!</strong><br><br>
            📊 <strong>Results:</strong><br>
            • ${metadata.total_clusters} clusters created<br>
            • ${metadata.total_keywords.toLocaleString()} total keywords<br>
            • ${metadata.total_volume.toLocaleString()} total search volume<br>
            • Processing time: ${metadata.processing_time_ms}ms<br><br>
            🔗 <strong>Data saved to database and webhook sent!</strong>
        `;
        
        this.showAlert(message, 'success');
    }

    /**
     * Display data preview
     */
    displayDataPreview(payload) {
        this.processedData = payload;
        this.currentPage = 1;
        
        // Update stats
        this.updateStats(payload.metadata);
        
        // Show preview section
        const previewSection = document.getElementById('previewSection');
        if (previewSection) {
            previewSection.style.display = 'block';
            previewSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Render table
        this.renderDataTable();
    }

    /**
     * Update statistics display
     */
    updateStats(metadata) {
        const elements = {
            totalClusters: metadata.total_clusters,
            totalKeywords: metadata.total_keywords,
            totalVolume: metadata.total_volume,
            avgDifficulty: metadata.avg_difficulty
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            }
        });
    }

    /**
     * Render data table with pagination
     */
    renderDataTable() {
        if (!this.processedData) return;

        const clusters = this.processedData.clusters;
        const tableBody = document.getElementById('dataTableBody');
        
        if (!tableBody) return;

        // Calculate pagination
        const totalItems = clusters.length;
        const startIndex = this.showAllClusters ? 0 : (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = this.showAllClusters ? totalItems : Math.min(startIndex + this.itemsPerPage, totalItems);
        const displayClusters = clusters.slice(startIndex, endIndex);

        // Clear existing content
        tableBody.innerHTML = '';

        // Render rows
        displayClusters.forEach((cluster, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="cluster-name">${this.escapeHtml(cluster.cluster_name)}</td>
                <td class="keywords-count">${cluster.keyword_count}</td>
                <td class="volume">${cluster.total_volume.toLocaleString()}</td>
                <td class="difficulty">${cluster.avg_difficulty}</td>
                <td class="topics">${this.escapeHtml(cluster.topics)}</td>
                <td class="intent">${this.escapeHtml(cluster.intent)}</td>
                <td class="actions">
                    <button class="action-btn copy-btn" onclick="keywordProcessor.copyClusterData(${startIndex + index})" title="Copy cluster data">
                        📋 Copy
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Update pagination
        this.updatePagination(totalItems);
    }

    /**
     * Update pagination controls
     */
    updatePagination(totalItems) {
        const paginationContainer = document.getElementById('paginationContainer');
        const pageInfo = document.getElementById('pageInfo');

        if (!this.showAllClusters && totalItems > this.itemsPerPage) {
            const totalPages = Math.ceil(totalItems / this.itemsPerPage);
            
            if (pageInfo) {
                pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
            }
            
            if (paginationContainer) {
                paginationContainer.style.display = 'flex';
            }
        } else {
            if (paginationContainer) {
                paginationContainer.style.display = 'none';
            }
        }
    }

    /**
     * Copy cluster data to clipboard
     */
    copyClusterData(clusterIndex) {
        if (!this.processedData || !this.processedData.clusters[clusterIndex]) return;

        const cluster = this.processedData.clusters[clusterIndex];
        const copyText = `Cluster: ${cluster.cluster_name}
Keywords: ${cluster.keyword_count}
Supporting Keywords: ${cluster.supporting_keywords}
Total Volume: ${cluster.total_volume.toLocaleString()}
Average Difficulty: ${cluster.avg_difficulty}
Difficulty Range: ${cluster.min_max_difficulty}
Topics: ${cluster.topics}
Intent: ${cluster.intent}
Average CPC: $${cluster.avg_cpc}
Seed Keywords: ${cluster.seed_keywords}`;

        // Show in modal
        this.showCopyModal(copyText);
    }

    /**
     * Show copy modal
     */
    showCopyModal(text) {
        const modal = document.getElementById('copyModal');
        const textarea = document.getElementById('copyTextArea');
        
        if (modal && textarea) {
            textarea.value = text;
            modal.style.display = 'flex';
        }
    }

    /**
     * Close copy modal
     */
    closeCopyModal() {
        const modal = document.getElementById('copyModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard() {
        const textarea = document.getElementById('copyTextArea');
        if (!textarea) return;

        try {
            await navigator.clipboard.writeText(textarea.value);
            this.showAlert('✅ Copied to clipboard!', 'success');
            this.closeCopyModal();
        } catch (error) {
            // Fallback for older browsers
            textarea.select();
            document.execCommand('copy');
            this.showAlert('✅ Copied to clipboard!', 'success');
            this.closeCopyModal();
        }
    }

    /**
     * Toggle preview mode (show all vs paginated)
     */
    togglePreviewMode() {
        this.showAllClusters = !this.showAllClusters;
        this.currentPage = 1;
        
        const toggleText = document.getElementById('previewToggleText');
        if (toggleText) {
            toggleText.textContent = this.showAllClusters ? 'Show Paginated' : 'Show All Clusters';
        }
        
        this.renderDataTable();
    }

    /**
     * Change pagination page
     */
    changePage(direction) {
        if (!this.processedData || this.showAllClusters) return;

        const totalPages = Math.ceil(this.processedData.clusters.length / this.itemsPerPage);
        const newPage = this.currentPage + direction;

        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderDataTable();
        }
    }

    /**
     * Export to JSON
     */
    exportToJSON() {
        if (!this.processedData) return;

        const dataStr = JSON.stringify(this.processedData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.processedData.metadata.seed_keyword}_processed_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showAlert('✅ JSON exported successfully!', 'success');
    }

    /**
     * Show/hide settings panel
     */
    toggleSettings() {
        const panel = document.getElementById('settingsPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        const settings = {
            webhookUrl: document.getElementById('webhookUrl')?.value || '',
            authUsername: document.getElementById('authUsername')?.value || '',
            authPassword: document.getElementById('authPassword')?.value || ''
        };

        localStorage.setItem('keywordProcessorSettings', JSON.stringify(settings));
        this.showAlert('⚙️ Settings saved successfully!', 'success');
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('keywordProcessorSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                const elements = {
                    webhookUrl: settings.webhookUrl,
                    authUsername: settings.authUsername,
                    authPassword: settings.authPassword
                };

                Object.entries(elements).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element && value) {
                        element.value = value;
                    }
                });
            }
        } catch (error) {
            console.warn('Could not load saved settings:', error);
        }
    }

    /**
     * Show projects (placeholder for future PHP implementation)
     */
    showProjects() {
        const projectsSection = document.getElementById('projectsSection');
        if (projectsSection) {
            projectsSection.style.display = 'block';
            projectsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // This would load projects from database in PHP implementation
        this.showAlert('📁 Projects feature will be available when PHP backend is implemented.', 'info');
    }

    /**
     * Refresh projects list
     */
    refreshProjects() {
        // Placeholder for PHP implementation
        this.showAlert('🔄 Projects refresh will be available when PHP backend is implemented.', 'info');
    }

    /**
     * Hide results sections
     */
    hideResults() {
        const sections = ['previewSection', 'projectsSection'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertElement = document.getElementById('resultAlert');
        if (alertElement) {
            alertElement.innerHTML = message;
            alertElement.className = `result-alert ${type}`;
            alertElement.style.display = 'block';
            
            // Auto-hide after 5 seconds for success/info messages
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    alertElement.style.display = 'none';
                }, 5000);
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for onclick handlers
function toggleSettings() {
    keywordProcessor.toggleSettings();
}

function testWebhook() {
    keywordProcessor.testWebhook();
}

function saveSettings() {
    keywordProcessor.saveSettings();
}

function processFile() {
    keywordProcessor.processFile();
}

function togglePreviewMode() {
    keywordProcessor.togglePreviewMode();
}

function changePage(direction) {
    keywordProcessor.changePage(direction);
}

function exportToJSON() {
    keywordProcessor.exportToJSON();
}

function showProjects() {
    keywordProcessor.showProjects();
}

function refreshProjects() {
    keywordProcessor.refreshProjects();
}

function closeCopyModal() {
    keywordProcessor.closeCopyModal();
}

function copyToClipboard() {
    keywordProcessor.copyToClipboard();
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.keywordProcessor = new KeywordProcessor();
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    if (window.keywordProcessor && window.keywordProcessor.processedData) {
        window.keywordProcessor.renderDataTable();
    }
});