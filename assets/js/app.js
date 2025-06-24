/**
 * Professional Keyword Processor - Enhanced Main Application Script
 * Author: SEO Research Tools
 * Version: 1.1 - Enhanced UX & Separated Functions
 * Description: Handles CSV processing, database storage, webhook communication, and project management
 */

class KeywordProcessor {
    constructor() {
        this.selectedFile = null;
        this.processedData = null;
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.showAllClusters = false;
        this.editingClusterIndex = -1;
        
        // Project management
        this.currentProjectPage = 1;
        this.projectsPerPage = 12;
        this.currentProjectSearch = '';
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.loadSettings();
        this.setupFileUpload();
        console.log('🔍 Keyword Processor v1.1 initialized successfully');
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
        this.processedData = null;
        const csvFile = document.getElementById('csvFile');
        const fileInfo = document.getElementById('fileInfo');
        const autoExtracted = document.getElementById('autoExtracted');
        
        if (csvFile) csvFile.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (autoExtracted) autoExtracted.style.display = 'none';
        
        this.validateForm();
        this.hideResults();
        this.updateButtonStates();
    }

    /**
     * Validate form inputs and update button states
     */
    validateForm() {
        const processBtn = document.getElementById('processBtn');
        const seedKeyword = document.getElementById('seedKeyword')?.value.trim();
        
        if (processBtn) {
            processBtn.disabled = !this.selectedFile || !seedKeyword;
        }
        
        this.updateButtonStates();
    }

    /**
     * Update button states based on current state
     */
    updateButtonStates() {
        const saveBtn = document.getElementById('saveBtn');
        const webhookBtn = document.getElementById('webhookBtn');
        
        const hasProcessedData = this.processedData !== null;
        
        if (saveBtn) saveBtn.disabled = !hasProcessedData;
        if (webhookBtn) webhookBtn.disabled = !hasProcessedData;
    }

    /**
     * STEP 1: Process keywords only
     */
    async processKeywords() {
        if (!this.selectedFile) {
            this.showAlert('Please select a CSV file!', 'error');
            return;
        }

        const seedKeyword = document.getElementById('seedKeyword')?.value.trim();
        if (!seedKeyword) {
            this.showAlert('Please enter a seed keyword!', 'error');
            return;
        }

        this.setProcessingState('process', true);
        const startTime = Date.now();

        try {
            // Step 1: Parse CSV
            this.updateProgress(25, 'Reading CSV file...');
            const csvData = await this.parseCSVFile(this.selectedFile);

            // Step 2: Process clusters
            this.updateProgress(75, 'Analyzing keywords and creating clusters...');
            const clusters = this.processKeywordClusters(csvData);

            // Step 3: Create payload
            this.updateProgress(100, 'Creating data structure...');
            const payload = this.createWebhookPayload(clusters, seedKeyword, Date.now() - startTime);

            this.processedData = payload;
            
            setTimeout(() => {
                this.setProcessingState('process', false);
                this.showAlert('✅ Keywords processed successfully! Ready to save to database.', 'success');
                this.displayDataPreview(payload);
                this.updateButtonStates();
            }, 500);

        } catch (error) {
            console.error('Processing error:', error);
            this.setProcessingState('process', false);
            this.showAlert(`Processing failed: ${error.message}`, 'error');
        }
    }

    /**
     * STEP 2: Save to database
     */
    async saveProject() {
        if (!this.processedData) {
            this.showAlert('Please process keywords first!', 'warning');
            return;
        }

        this.setProcessingState('save', true);

        try {
            this.updateProgress(50, 'Saving to database...');
            await this.saveToDatabase(this.processedData);
            
            this.updateProgress(100, 'Saved successfully!');
            
            setTimeout(() => {
                this.setProcessingState('save', false);
                this.showAlert('✅ Project saved to database successfully!', 'success');
            }, 500);

        } catch (error) {
            console.error('Save error:', error);
            this.setProcessingState('save', false);
            this.showAlert(`Save failed: ${error.message}`, 'error');
        }
    }

    /**
     * STEP 3: Send webhook
     */
    async sendWebhook() {
        if (!this.processedData) {
            this.showAlert('Please process keywords first!', 'warning');
            return;
        }

        this.setProcessingState('webhook', true);

        try {
            this.updateProgress(50, 'Sending webhook...');
            await this.sendWebhookData(this.processedData);
            
            this.updateProgress(100, 'Webhook sent!');
            
            setTimeout(() => {
                this.setProcessingState('webhook', false);
                this.showAlert('✅ Webhook sent successfully!', 'success');
            }, 500);

        } catch (error) {
            console.error('Webhook error:', error);
            this.setProcessingState('webhook', false);
            this.showAlert(`Webhook failed: ${error.message}`, 'error');
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
                cluster_name: mainKeyword, // Clean name without page type
                page_type: pageType,
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
            c.page_type && (
                c.page_type.toLowerCase().includes('pillar') || 
                c.page_type.toLowerCase().includes('main')
            )
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
        try {
            const response = await fetch('api/endpoints/save-project.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Database save successful:', result);
            return result;
            
        } catch (error) {
            console.error('Database save failed:', error);
            throw new Error(`Database save failed: ${error.message}`);
        }
    }

    /**
     * Send webhook with Basic Auth
     */
    async sendWebhookData(payload) {
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

            await this.sendWebhookData(testPayload);
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
    setProcessingState(action, processing) {
        const buttons = {
            'process': document.getElementById('processBtn'),
            'save': document.getElementById('saveBtn'),
            'webhook': document.getElementById('webhookBtn')
        };
        
        const progressContainer = document.getElementById('progressContainer');
        
        if (processing) {
            // Disable all buttons during processing
            Object.values(buttons).forEach(btn => {
                if (btn) btn.disabled = true;
            });
            
            const currentBtn = buttons[action];
            if (currentBtn) {
                const btnText = currentBtn.querySelector('.btn-text');
                if (btnText) {
                    btnText.innerHTML = '<div class="loading"></div> Processing...';
                }
            }
            
            if (progressContainer) progressContainer.style.display = 'block';
        } else {
            // Reset all buttons
            const btnTexts = {
                'process': 'Process Keywords',
                'save': 'Save to Database', 
                'webhook': 'Send Webhook'
            };
            
            Object.entries(buttons).forEach(([key, btn]) => {
                if (btn) {
                    const btnText = btn.querySelector('.btn-text');
                    if (btnText) btnText.textContent = btnTexts[key];
                }
            });
            
            if (progressContainer) progressContainer.style.display = 'none';
            this.updateButtonStates();
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
            avgDifficulty: metadata.avg_difficulty,
            pillarPages: metadata.pillar_pages,
            subPages: metadata.sub_pages
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            }
        });
    }

    /**
     * Render data table with pagination and enhanced styling
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
            
            // Add row class based on page type
            if (cluster.page_type) {
                if (cluster.page_type.toLowerCase().includes('pillar') || 
                    cluster.page_type.toLowerCase().includes('main')) {
                    row.classList.add('pillar-page');
                } else if (cluster.page_type.toLowerCase().includes('sub')) {
                    row.classList.add('sub-page');
                }
            }
            
            // Difficulty color coding
            const difficultyClass = this.getDifficultyClass(cluster.avg_difficulty);
            
            // Truncate intent for display
            const displayIntent = this.truncateText(cluster.intent, 40);
            const displayTopics = this.truncateText(cluster.topics, 50);
            
            row.innerHTML = `
                <td class="cluster-name">${this.escapeHtml(cluster.cluster_name)}</td>
                <td class="keywords-count">${cluster.keyword_count}</td>
                <td class="volume">${cluster.total_volume.toLocaleString()}</td>
                <td class="difficulty ${difficultyClass}">${Math.round(cluster.avg_difficulty)}</td>
                <td class="topics truncate" title="${this.escapeHtml(cluster.topics)}">${this.escapeHtml(displayTopics)}</td>
                <td class="intent truncate" title="${this.escapeHtml(cluster.intent)}">${this.escapeHtml(displayIntent)}</td>
                <td class="actions">
                    <button class="action-btn detail-btn" onclick="keywordProcessor.showClusterDetail(${startIndex + index})" title="View & edit details">
                        📋 Detail
                    </button>
                    <button class="action-btn delete-btn" onclick="keywordProcessor.deleteClusterConfirm(${startIndex + index})" title="Delete cluster">
                        ✕
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Update pagination
        this.updatePagination(totalItems);
    }

    /**
     * Get difficulty class for color coding
     */
    getDifficultyClass(difficulty) {
        if (difficulty <= 30) return 'difficulty-easy';
        if (difficulty <= 60) return 'difficulty-medium';
        return 'difficulty-hard';
    }

    /**
     * Truncate text for display
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
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
     * Show cluster detail modal
     */
    showClusterDetail(clusterIndex) {
        if (!this.processedData || !this.processedData.clusters[clusterIndex]) return;

        this.editingClusterIndex = clusterIndex;
        const cluster = this.processedData.clusters[clusterIndex];
        
        // Populate modal fields
        const fields = {
            'editClusterName': cluster.cluster_name,
            'editKeywordCount': cluster.keyword_count,
            'editTotalVolume': cluster.total_volume,
            'editAvgDifficulty': cluster.avg_difficulty,
            'editDifficultyRange': cluster.min_max_difficulty,
            'editAvgCPC': cluster.avg_cpc,
            'editSupportingKeywords': cluster.supporting_keywords,
            'editTopics': cluster.topics,
            'editIntent': cluster.intent,
            'editSeedKeywords': cluster.seed_keywords
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
            }
        });

        // Show modal
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Close detail modal
     */
    closeDetailModal() {
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingClusterIndex = -1;
    }

    /**
     * Save cluster changes
     */
    saveClusterChanges() {
        if (this.editingClusterIndex === -1 || !this.processedData) return;

        const cluster = this.processedData.clusters[this.editingClusterIndex];
        
        // Update cluster with new values
        cluster.cluster_name = document.getElementById('editClusterName')?.value || cluster.cluster_name;
        cluster.keyword_count = parseInt(document.getElementById('editKeywordCount')?.value) || cluster.keyword_count;
        cluster.total_volume = parseInt(document.getElementById('editTotalVolume')?.value) || cluster.total_volume;
        cluster.avg_difficulty = parseFloat(document.getElementById('editAvgDifficulty')?.value) || cluster.avg_difficulty;
        cluster.min_max_difficulty = document.getElementById('editDifficultyRange')?.value || cluster.min_max_difficulty;
        cluster.avg_cpc = parseFloat(document.getElementById('editAvgCPC')?.value) || cluster.avg_cpc;
        cluster.supporting_keywords = document.getElementById('editSupportingKeywords')?.value || cluster.supporting_keywords;
        cluster.topics = document.getElementById('editTopics')?.value || cluster.topics;
        cluster.intent = document.getElementById('editIntent')?.value || cluster.intent;
        cluster.seed_keywords = document.getElementById('editSeedKeywords')?.value || cluster.seed_keywords;

        // Update metadata
        this.updateMetadata();
        
        // Re-render table and stats
        this.updateStats(this.processedData.metadata);
        this.renderDataTable();
        
        this.closeDetailModal();
        this.showAlert('✅ Cluster updated successfully!', 'success');
    }

    /**
     * Delete cluster with confirmation
     */
    deleteClusterConfirm(clusterIndex) {
        if (!this.processedData || !this.processedData.clusters[clusterIndex]) return;

        const cluster = this.processedData.clusters[clusterIndex];
        if (confirm(`Are you sure you want to delete cluster "${cluster.cluster_name}"?`)) {
            this.deleteClusterByIndex(clusterIndex);
        }
    }

    /**
     * Delete cluster by index
     */
    deleteClusterByIndex(clusterIndex) {
        if (!this.processedData || !this.processedData.clusters[clusterIndex]) return;

        // Remove cluster
        this.processedData.clusters.splice(clusterIndex, 1);
        
        // Update metadata
        this.updateMetadata();
        
        // Re-render
        this.updateStats(this.processedData.metadata);
        this.renderDataTable();
        
        this.showAlert('✅ Cluster deleted successfully!', 'success');
    }

    /**
     * Delete cluster from detail modal
     */
    deleteCluster() {
        if (this.editingClusterIndex === -1) return;
        
        const cluster = this.processedData.clusters[this.editingClusterIndex];
        if (confirm(`Are you sure you want to delete cluster "${cluster.cluster_name}"?`)) {
            this.deleteClusterByIndex(this.editingClusterIndex);
            this.closeDetailModal();
        }
    }

    /**
     * Update metadata after cluster changes
     */
    updateMetadata() {
        if (!this.processedData) return;

        const clusters = this.processedData.clusters;
        const totalKeywords = clusters.reduce((sum, cluster) => sum + cluster.keyword_count, 0);
        const totalVolume = clusters.reduce((sum, cluster) => sum + cluster.total_volume, 0);
        const avgDifficulty = clusters.length > 0 
            ? Math.round((clusters.reduce((sum, cluster) => sum + cluster.avg_difficulty, 0) / clusters.length) * 10) / 10
            : 0;
        
        const pillarPages = clusters.filter(c => 
            c.page_type && (
                c.page_type.toLowerCase().includes('pillar') || 
                c.page_type.toLowerCase().includes('main')
            )
        ).length;
        
        const subPages = clusters.length - pillarPages;

        // Update metadata
        this.processedData.metadata.total_clusters = clusters.length;
        this.processedData.metadata.total_keywords = totalKeywords;
        this.processedData.metadata.total_volume = totalVolume;
        this.processedData.metadata.avg_difficulty = avgDifficulty;
        this.processedData.metadata.pillar_pages = pillarPages;
        this.processedData.metadata.sub_pages = subPages;
    }

    /**
     * Copy cluster data to clipboard
     */
    copyClusterToClipboard() {
        if (this.editingClusterIndex === -1 || !this.processedData) return;

        const cluster = this.processedData.clusters[this.editingClusterIndex];
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

        // Copy to clipboard
        navigator.clipboard.writeText(copyText).then(() => {
            this.showAlert('✅ Cluster data copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback - show in copy modal
            this.showCopyModal(copyText);
        });
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
     * Copy text to clipboard from modal
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
     * Export to CSV
     */
    exportToCSV() {
        if (!this.processedData) return;

        const clusters = this.processedData.clusters;
        const csvHeaders = [
            'Cluster Name',
            'Page Type', 
            'Keyword Count',
            'Supporting Keywords',
            'Total Volume',
            'Average Difficulty',
            'Difficulty Range',
            'Topics',
            'Intent',
            'Average CPC',
            'Seed Keywords'
        ];

        const csvData = clusters.map(cluster => [
            cluster.cluster_name,
            cluster.page_type || '',
            cluster.keyword_count,
            cluster.supporting_keywords,
            cluster.total_volume,
            cluster.avg_difficulty,
            cluster.min_max_difficulty,
            cluster.topics,
            cluster.intent,
            cluster.avg_cpc,
            cluster.seed_keywords
        ]);

        csvData.unshift(csvHeaders);
        
        const csvContent = csvData.map(row => 
            row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.processedData.metadata.seed_keyword}_clusters_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showAlert('✅ CSV exported successfully!', 'success');
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
     * Show projects section
     */
    async showProjects() {
        const projectsSection = document.getElementById('projectsSection');
        if (projectsSection) {
            projectsSection.style.display = 'block';
            projectsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        await this.loadProjects();
    }

    /**
     * Load projects from database
     */
    async loadProjects() {
        try {
            const response = await fetch(`api/endpoints/get-projects.php?page=${this.currentProjectPage}&limit=${this.projectsPerPage}&search=${encodeURIComponent(this.currentProjectSearch)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.renderProjects(result.data.projects, result.data.pagination);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('Load projects error:', error);
            this.showAlert('⚠️ Could not load projects. Please check if PHP backend is properly configured.', 'warning');
            
            // Show placeholder message
            const projectsGrid = document.getElementById('projectsGrid');
            if (projectsGrid) {
                projectsGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 3rem; margin-bottom: 20px;">📁</div>
                        <h3>No Projects Found</h3>
                        <p>Either no projects exist or the PHP backend needs to be configured.</p>
                        <button class="btn btn-primary" onclick="keywordProcessor.processKeywords()" style="margin-top: 20px;">
                            Process Your First Dataset
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * Render projects grid
     */
    renderProjects(projects, pagination) {
        const projectsGrid = document.getElementById('projectsGrid');
        if (!projectsGrid) return;

        if (!projects || projects.length === 0) {
            projectsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📁</div>
                    <h3>No Projects Found</h3>
                    <p>Start by processing your first keyword dataset.</p>
                    <button class="btn btn-primary" onclick="keywordProcessor.processKeywords()" style="margin-top: 20px;">
                        Process Your First Dataset
                    </button>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = projects.map(project => `
            <div class="project-card" onclick="keywordProcessor.showProjectDetail(${project.id})">
                <h3>${this.escapeHtml(project.seed_keyword)}</h3>
                <div class="project-meta">
                    <div><strong>Clusters:</strong> ${project.total_clusters}</div>
                    <div><strong>Keywords:</strong> ${project.total_keywords.toLocaleString()}</div>
                    <div><strong>Volume:</strong> ${project.total_volume.toLocaleString()}</div>
                    <div><strong>Difficulty:</strong> ${project.avg_difficulty}</div>
                    <div><strong>Created:</strong> ${new Date(project.created_at).toLocaleDateString()}</div>
                    <div><strong>Status:</strong> <span style="color: ${project.status === 'completed' ? '#059669' : '#d97706'};">${project.status}</span></div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-outline" onclick="event.stopPropagation(); keywordProcessor.loadProjectData(${project.id})">📊 Load</button>
                    <button class="btn btn-outline" onclick="event.stopPropagation(); keywordProcessor.exportProjectData(${project.id})">📤 Export</button>
                </div>
            </div>
        `).join('');

        // Update pagination
        this.updateProjectPagination(pagination);
    }

    /**
     * Update project pagination
     */
    updateProjectPagination(pagination) {
        const paginationContainer = document.getElementById('projectsPagination');
        const pageInfo = document.getElementById('projectPageInfo');

        if (pagination.total_pages > 1) {
            if (pageInfo) {
                pageInfo.textContent = `Page ${pagination.current_page} of ${pagination.total_pages}`;
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
     * Search projects
     */
    searchProjects() {
        const searchInput = document.getElementById('projectSearch');
        if (searchInput) {
            this.currentProjectSearch = searchInput.value.trim();
            this.currentProjectPage = 1;
            this.loadProjects();
        }
    }

    /**
     * Change project page
     */
    changeProjectPage(direction) {
        this.currentProjectPage += direction;
        if (this.currentProjectPage < 1) this.currentProjectPage = 1;
        this.loadProjects();
    }

    /**
     * Refresh projects
     */
    refreshProjects() {
        this.currentProjectPage = 1;
        this.currentProjectSearch = '';
        const searchInput = document.getElementById('projectSearch');
        if (searchInput) searchInput.value = '';
        this.loadProjects();
    }

    /**
     * Show project detail modal (placeholder)
     */
    showProjectDetail(projectId) {
        this.showAlert(`📁 Project detail view (ID: ${projectId}) will be implemented when full project management is added.`, 'info');
    }

    /**
     * Load project data (placeholder)
     */
    loadProjectData(projectId) {
        this.showAlert(`📊 Loading project data (ID: ${projectId}) will be implemented when full project management is added.`, 'info');
    }

    /**
     * Export project data (placeholder)
     */
    exportProjectData(projectId) {
        this.showAlert(`📤 Exporting project data (ID: ${projectId}) will be implemented when full project management is added.`, 'info');
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

// ============================================
// GLOBAL FUNCTIONS - ENSURE THESE EXIST
// ============================================

// Global variable to hold the instance
let keywordProcessor;

// Global functions for onclick handlers
function toggleSettings() {
    if (window.keywordProcessor) {
        window.keywordProcessor.toggleSettings();
    }
}

function testWebhook() {
    if (window.keywordProcessor) {
        window.keywordProcessor.testWebhook();
    }
}

function saveSettings() {
    if (window.keywordProcessor) {
        window.keywordProcessor.saveSettings();
    }
}

function processKeywords() {
    if (window.keywordProcessor) {
        window.keywordProcessor.processKeywords();
    } else {
        console.error('keywordProcessor not initialized');
        alert('Application not ready. Please refresh the page.');
    }
}

function saveProject() {
    if (window.keywordProcessor) {
        window.keywordProcessor.saveProject();
    }
}

function sendWebhook() {
    if (window.keywordProcessor) {
        window.keywordProcessor.sendWebhook();
    }
}

function togglePreviewMode() {
    if (window.keywordProcessor) {
        window.keywordProcessor.togglePreviewMode();
    }
}

function changePage(direction) {
    if (window.keywordProcessor) {
        window.keywordProcessor.changePage(direction);
    }
}

function exportToJSON() {
    if (window.keywordProcessor) {
        window.keywordProcessor.exportToJSON();
    }
}

function exportToCSV() {
    if (window.keywordProcessor) {
        window.keywordProcessor.exportToCSV();
    }
}

function showProjects() {
    if (window.keywordProcessor) {
        window.keywordProcessor.showProjects();
    }
}

function refreshProjects() {
    if (window.keywordProcessor) {
        window.keywordProcessor.refreshProjects();
    }
}

function searchProjects() {
    if (window.keywordProcessor) {
        window.keywordProcessor.searchProjects();
    }
}

function changeProjectPage(direction) {
    if (window.keywordProcessor) {
        window.keywordProcessor.changeProjectPage(direction);
    }
}

function closeDetailModal() {
    if (window.keywordProcessor) {
        window.keywordProcessor.closeDetailModal();
    }
}

function saveClusterChanges() {
    if (window.keywordProcessor) {
        window.keywordProcessor.saveClusterChanges();
    }
}

function deleteCluster() {
    if (window.keywordProcessor) {
        window.keywordProcessor.deleteCluster();
    }
}

function copyClusterToClipboard() {
    if (window.keywordProcessor) {
        window.keywordProcessor.copyClusterToClipboard();
    }
}

function closeCopyModal() {
    if (window.keywordProcessor) {
        window.keywordProcessor.closeCopyModal();
    }
}

function copyToClipboard() {
    if (window.keywordProcessor) {
        window.keywordProcessor.copyToClipboard();
    }
}

function closeProjectDetailModal() {
    // Placeholder for project detail modal
}

function loadProjectData() {
    // Placeholder for loading project data
}

function exportProjectData() {
    // Placeholder for exporting project data
}

function deleteProject() {
    // Placeholder for deleting project
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add delay to ensure Papa Parse is loaded
    setTimeout(() => {
        window.keywordProcessor = new KeywordProcessor();
        console.log('Keyword Processor initialized and available globally');
    }, 100);
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    if (window.keywordProcessor && window.keywordProcessor.processedData) {
        window.keywordProcessor.renderDataTable();
    }
});

// Debug function for troubleshooting
function debugKeywordProcessor() {
    console.log('=== KEYWORD PROCESSOR DEBUG ===');
    console.log('1. keywordProcessor object:', window.keywordProcessor);
    console.log('2. processKeywords function:', typeof processKeywords);
    console.log('3. saveProject function:', typeof saveProject);
    console.log('4. sendWebhook function:', typeof sendWebhook);
    
    // Check buttons
    const buttons = ['processBtn', 'saveBtn', 'webhookBtn'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        console.log(`5. ${id}:`, btn ? 'EXISTS' : 'MISSING', btn?.disabled ? 'DISABLED' : 'ENABLED');
    });
    
    console.log('=== END DEBUG ===');
}

// Make debug function available globally
window.debugKeywordProcessor = debugKeywordProcessor;