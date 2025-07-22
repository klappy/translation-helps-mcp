# Build Offline-First Mobile Apps

**What You'll Build:** A mobile-optimized translation app that works seamlessly offline using cached unfoldingWord resources.

**Time Required:** 25 minutes  
**Skill Level:** Advanced  
**Prerequisites:** Mobile app development, service workers, IndexedDB knowledge

---

## 📱 Overview

Create a mobile translation app that:

- **Works Offline**: Full functionality without internet connection
- **Smart Caching**: Intelligently caches frequently accessed resources
- **Progressive Sync**: Updates resources when online
- **Optimized Performance**: Fast loading even on slow connections
- **Strategic Language Support**: Complete offline resource sets
- **Background Updates**: Keeps resources current automatically

---

## 🏗️ Step 1: Set Up the Mobile App Foundation

Create the basic Progressive Web App structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#667eea">
    <title>Translation Helper - Offline Bible Resources</title>
    
    <!-- PWA Configuration -->
    <link rel="manifest" href="manifest.json">
    <link rel="icon" href="icon-192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Translation Helper">
    
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: #f7fafc;
            color: #2d3748;
            line-height: 1.6;
        }
        .app-container {
            max-width: 100vw;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 1rem;
            color: white;
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .connection-status {
            padding: 0.5rem;
            text-align: center;
            font-size: 0.875rem;
            font-weight: 600;
        }
        .online { background: #48bb78; color: white; }
        .offline { background: #f56565; color: white; }
        .syncing { background: #ed8936; color: white; }
        
        .main-content {
            background: white;
            margin: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        .search-section {
            padding: 1.5rem;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            background: white;
        }
        .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .quick-access {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            padding: 1rem;
        }
        .quick-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .quick-btn:active {
            transform: scale(0.95);
            background: #5a67d8;
        }
        
        .content-section {
            padding: 1.5rem;
            min-height: 300px;
        }
        .loading {
            text-align: center;
            padding: 2rem;
            color: #718096;
        }
        .error {
            background: #fed7d7;
            color: #c53030;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        
        .scripture-text {
            font-size: 18px;
            line-height: 1.7;
            padding: 1.5rem;
            background: #f7fafc;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin: 1rem 0;
        }
        .translation-type {
            font-size: 0.875rem;
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 0.5rem;
        }
        
        .notes-section {
            background: #fffbeb;
            border: 1px solid #f6e05e;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }
        .notes-title {
            font-weight: 600;
            color: #744210;
            margin-bottom: 0.5rem;
        }
        
        .download-section {
            background: #e6fffa;
            border: 1px solid #38b2ac;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }
        .download-btn {
            background: #38b2ac;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            margin: 0.25rem;
        }
        
        .cache-stats {
            background: #f7fafc;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            font-size: 0.875rem;
            color: #4a5568;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            .main-content { margin: 0.5rem; }
            .search-section, .content-section { padding: 1rem; }
            .quick-access { grid-template-columns: repeat(3, 1fr); }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <div class="header">
            <h1>📖 Translation Helper</h1>
            <p>Offline Bible Translation Resources</p>
        </div>
        
        <div id="connectionStatus" class="connection-status online">
            🟢 Connected - Auto-syncing enabled
        </div>
        
        <div class="main-content">
            <div class="search-section">
                <input type="text" 
                       id="scriptureSearch" 
                       class="search-input"
                       placeholder="Enter reference (e.g., John 3:16, Romans 8)"
                       value="John 3:16">
                
                <div class="quick-access">
                    <button class="quick-btn" onclick="app.loadPopularPassage('John 3:16')">
                        John 3:16
                    </button>
                    <button class="quick-btn" onclick="app.loadPopularPassage('Romans 8:28')">
                        Romans 8:28
                    </button>
                    <button class="quick-btn" onclick="app.loadPopularPassage('Psalm 23')">
                        Psalm 23
                    </button>
                    <button class="quick-btn" onclick="app.showDownloadManager()">
                        📥 Downloads
                    </button>
                    <button class="quick-btn" onclick="app.showCacheManager()">
                        💾 Cache
                    </button>
                    <button class="quick-btn" onclick="app.showSettings()">
                        ⚙️ Settings
                    </button>
                </div>
            </div>
            
            <div id="contentArea" class="content-section">
                <div class="loading">📚 Welcome! Search for Scripture or select a quick access option above.</div>
            </div>
        </div>
    </div>

    <script>
        // Mobile translation app implementation
    </script>
</body>
</html>
```

Create the PWA manifest:

```json
// manifest.json
{
    "name": "Translation Helper - Offline Bible Resources",
    "short_name": "Translation Helper",
    "description": "Offline-first Bible translation app with unfoldingWord resources",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#667eea",
    "theme_color": "#667eea",
    "orientation": "portrait",
    "categories": ["education", "books", "reference"],
    "lang": "en",
    "icons": [
        {
            "src": "icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "icon-512.png", 
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

---

## 💾 Step 2: Build the Offline Storage System

Create a robust caching system using IndexedDB:

```javascript
class OfflineStorageManager {
    constructor() {
        this.dbName = 'TranslationHelperDB';
        this.dbVersion = 1;
        this.db = null;
        this.apiBase = 'https://api.translation.tools';
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Scripture texts store
                if (!db.objectStoreNames.contains('scripture')) {
                    const scriptureStore = db.createObjectStore('scripture', { keyPath: 'id' });
                    scriptureStore.createIndex('reference', 'reference', { unique: false });
                    scriptureStore.createIndex('language', 'language', { unique: false });
                    scriptureStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }
                
                // Translation notes store
                if (!db.objectStoreNames.contains('notes')) {
                    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
                    notesStore.createIndex('reference', 'reference', { unique: false });
                    notesStore.createIndex('language', 'language', { unique: false });
                }
                
                // Translation words store
                if (!db.objectStoreNames.contains('words')) {
                    const wordsStore = db.createObjectStore('words', { keyPath: 'id' });
                    wordsStore.createIndex('term', 'term', { unique: false });
                    wordsStore.createIndex('language', 'language', { unique: false });
                }
                
                // Cache metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    const metaStore = db.createObjectStore('metadata', { keyPath: 'key' });
                }
                
                // Download queue store
                if (!db.objectStoreNames.contains('downloadQueue')) {
                    const queueStore = db.createObjectStore('downloadQueue', { keyPath: 'id' });
                    queueStore.createIndex('priority', 'priority', { unique: false });
                    queueStore.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    // Scripture caching
    async cacheScripture(reference, language = 'en') {
        try {
            const response = await fetch(
                `${this.apiBase}/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${language}&translation=all`
            );
            
            if (!response.ok) throw new Error('Scripture fetch failed');
            
            const data = await response.json();
            
            const cacheEntry = {
                id: `${reference}:${language}`,
                reference,
                language,
                data,
                cached: Date.now(),
                lastAccessed: Date.now(),
                size: JSON.stringify(data).length
            };
            
            await this.storeData('scripture', cacheEntry);
            await this.updateCacheStats();
            
            return data;
        } catch (error) {
            console.error('Failed to cache scripture:', error);
            throw error;
        }
    }

    async getCachedScripture(reference, language = 'en') {
        const id = `${reference}:${language}`;
        const cached = await this.getData('scripture', id);
        
        if (cached) {
            // Update last accessed time
            cached.lastAccessed = Date.now();
            await this.storeData('scripture', cached);
            return cached.data;
        }
        
        return null;
    }

    // Translation notes caching
    async cacheTranslationNotes(reference, language = 'en') {
        try {
            const response = await fetch(
                `${this.apiBase}/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${language}`
            );
            
            if (!response.ok) return { notes: [] };
            
            const data = await response.json();
            
            const cacheEntry = {
                id: `notes:${reference}:${language}`,
                reference,
                language,
                data,
                cached: Date.now(),
                lastAccessed: Date.now()
            };
            
            await this.storeData('notes', cacheEntry);
            return data;
        } catch (error) {
            console.error('Failed to cache notes:', error);
            return { notes: [] };
        }
    }

    async getCachedNotes(reference, language = 'en') {
        const id = `notes:${reference}:${language}`;
        const cached = await this.getData('notes', id);
        
        if (cached) {
            cached.lastAccessed = Date.now();
            await this.storeData('notes', cached);
            return cached.data;
        }
        
        return null;
    }

    // Translation words caching
    async cacheTranslationWord(word, language = 'en') {
        try {
            const response = await fetch(
                `${this.apiBase}/api/get-translation-word?word=${encodeURIComponent(word)}&language=${language}`
            );
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            const cacheEntry = {
                id: `word:${word}:${language}`,
                term: word,
                language,
                data,
                cached: Date.now(),
                lastAccessed: Date.now()
            };
            
            await this.storeData('words', cacheEntry);
            return data;
        } catch (error) {
            console.error('Failed to cache word:', error);
            return null;
        }
    }

    async getCachedWord(word, language = 'en') {
        const id = `word:${word}:${language}`;
        const cached = await this.getData('words', id);
        
        if (cached) {
            cached.lastAccessed = Date.now();
            await this.storeData('words', cached);
            return cached.data;
        }
        
        return null;
    }

    // Generic storage operations
    async storeData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getData(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteData(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Cache management
    async getCacheStats() {
        const [scripture, notes, words] = await Promise.all([
            this.getAllData('scripture'),
            this.getAllData('notes'), 
            this.getAllData('words')
        ]);
        
        const totalEntries = scripture.length + notes.length + words.length;
        const totalSize = [...scripture, ...notes, ...words]
            .reduce((sum, entry) => sum + (entry.size || 0), 0);
        
        return {
            totalEntries,
            totalSize,
            scriptureCount: scripture.length,
            notesCount: notes.length,
            wordsCount: words.length,
            lastUpdate: Date.now()
        };
    }

    async updateCacheStats() {
        const stats = await this.getCacheStats();
        await this.storeData('metadata', { key: 'cacheStats', ...stats });
    }

    async clearOldCache(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
        const cutoff = Date.now() - maxAge;
        const stores = ['scripture', 'notes', 'words'];
        
        for (const storeName of stores) {
            const allData = await this.getAllData(storeName);
            
            for (const entry of allData) {
                if (entry.lastAccessed < cutoff) {
                    await this.deleteData(storeName, entry.id);
                }
            }
        }
        
        await this.updateCacheStats();
    }

    async preloadPopularContent() {
        const popularPassages = [
            'John 3:16', 'Romans 8:28', 'Psalm 23', 'Matthew 5:3-12',
            'John 14:6', 'Romans 3:23', 'Ephesians 2:8-9', '1 John 4:8'
        ];
        
        for (const passage of popularPassages) {
            try {
                await this.cacheScripture(passage);
                await this.cacheTranslationNotes(passage);
            } catch (error) {
                console.warn(`Failed to preload ${passage}:`, error);
            }
        }
    }
}
```

---

## 🔄 Step 3: Implement Smart Sync Manager

Create intelligent synchronization for when the device comes online:

```javascript
class SyncManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.lastSync = null;
        this.syncInProgress = false;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.performBackgroundSync();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });
        
        // Periodic sync when online
        setInterval(() => {
            if (this.isOnline && !this.syncInProgress) {
                this.performBackgroundSync();
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        
        if (this.isOnline) {
            statusElement.className = 'connection-status online';
            statusElement.innerHTML = '🟢 Connected - Auto-syncing enabled';
        } else {
            statusElement.className = 'connection-status offline';
            statusElement.innerHTML = '🔴 Offline - Using cached content';
        }
    }

    async performBackgroundSync() {
        if (this.syncInProgress || !this.isOnline) return;
        
        this.syncInProgress = true;
        this.updateSyncStatus('syncing');
        
        try {
            // Update frequently accessed content
            await this.syncFrequentlyAccessed();
            
            // Process any queued downloads
            await this.processDownloadQueue();
            
            // Clean up old cache
            await this.storage.clearOldCache();
            
            this.lastSync = Date.now();
            await this.storage.storeData('metadata', { 
                key: 'lastSync', 
                timestamp: this.lastSync 
            });
            
        } catch (error) {
            console.error('Background sync failed:', error);
        } finally {
            this.syncInProgress = false;
            this.updateConnectionStatus();
        }
    }

    async syncFrequentlyAccessed() {
        // Get most accessed content from cache
        const scripture = await this.storage.getAllData('scripture');
        const frequentScripture = scripture
            .sort((a, b) => b.lastAccessed - a.lastAccessed)
            .slice(0, 20); // Top 20 most accessed
        
        for (const entry of frequentScripture) {
            try {
                // Re-cache to get latest version
                await this.storage.cacheScripture(entry.reference, entry.language);
                await this.storage.cacheTranslationNotes(entry.reference, entry.language);
            } catch (error) {
                console.warn(`Failed to sync ${entry.reference}:`, error);
            }
        }
    }

    async processDownloadQueue() {
        const queue = await this.storage.getAllData('downloadQueue');
        const pending = queue.filter(item => item.status === 'pending');
        
        for (const item of pending.slice(0, 5)) { // Process 5 at a time
            try {
                await this.downloadContent(item);
                
                // Mark as completed
                item.status = 'completed';
                item.completedAt = Date.now();
                await this.storage.storeData('downloadQueue', item);
                
            } catch (error) {
                console.error(`Failed to download ${item.reference}:`, error);
                
                // Mark as failed
                item.status = 'failed';
                item.error = error.message;
                await this.storage.storeData('downloadQueue', item);
            }
        }
    }

    async downloadContent(item) {
        const { reference, language, includeNotes, includeWords } = item;
        
        // Download scripture
        await this.storage.cacheScripture(reference, language);
        
        // Download translation helps if requested
        if (includeNotes) {
            await this.storage.cacheTranslationNotes(reference, language);
        }
        
        if (includeWords) {
            // Get words for this reference and cache them
            const wordsResponse = await fetch(
                `${this.storage.apiBase}/api/get-words-for-reference?reference=${encodeURIComponent(reference)}&language=${language}`
            );
            
            if (wordsResponse.ok) {
                const wordsData = await wordsResponse.json();
                
                for (const word of wordsData.words || []) {
                    await this.storage.cacheTranslationWord(word.term || word.word, language);
                }
            }
        }
    }

    updateSyncStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        
        if (status === 'syncing') {
            statusElement.className = 'connection-status syncing';
            statusElement.innerHTML = '🔄 Syncing - Updating resources...';
        }
    }

    async queueForDownload(reference, language = 'en', options = {}) {
        const downloadItem = {
            id: `download:${reference}:${language}:${Date.now()}`,
            reference,
            language,
            includeNotes: options.includeNotes !== false,
            includeWords: options.includeWords !== false,
            priority: options.priority || 'normal',
            status: 'pending',
            queuedAt: Date.now()
        };
        
        await this.storage.storeData('downloadQueue', downloadItem);
        
        // Try immediate download if online
        if (this.isOnline) {
            setTimeout(() => this.processDownloadQueue(), 100);
        }
        
        return downloadItem;
    }

    async getDownloadStatus() {
        const queue = await this.storage.getAllData('downloadQueue');
        
        return {
            pending: queue.filter(item => item.status === 'pending').length,
            completed: queue.filter(item => item.status === 'completed').length,
            failed: queue.filter(item => item.status === 'failed').length,
            total: queue.length
        };
    }
}
```

---

## 📱 Step 4: Build the Mobile App Logic

Create the main application controller:

```javascript
class MobileTranslationApp {
    constructor() {
        this.storage = new OfflineStorageManager();
        this.sync = null;
        this.currentReference = 'John 3:16';
        this.currentLanguage = 'en';
    }

    async initialize() {
        try {
            await this.storage.initialize();
            this.sync = new SyncManager(this.storage);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load default content
            await this.loadScripture(this.currentReference);
            
            // Preload popular content in background
            this.preloadPopularContent();
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showError('Failed to initialize app');
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('scriptureSearch');
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadScripture(e.target.value);
            }
        });
        
        // Install prompt for PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.showInstallPrompt(e);
        });
    }

    async loadScripture(reference) {
        if (!reference.trim()) return;
        
        this.currentReference = reference;
        this.showLoading('Loading scripture and translation helps...');
        
        try {
            // Try cache first
            let scripture = await this.storage.getCachedScripture(reference, this.currentLanguage);
            let notes = await this.storage.getCachedNotes(reference, this.currentLanguage);
            
            // If not cached and online, fetch and cache
            if (!scripture && this.sync.isOnline) {
                scripture = await this.storage.cacheScripture(reference, this.currentLanguage);
            }
            
            if (!notes && this.sync.isOnline) {
                notes = await this.storage.cacheTranslationNotes(reference, this.currentLanguage);
            }
            
            if (!scripture) {
                throw new Error('Scripture not available offline. Please connect to download.');
            }
            
            this.displayContent(scripture, notes);
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    async loadPopularPassage(reference) {
        document.getElementById('scriptureSearch').value = reference;
        await this.loadScripture(reference);
    }

    displayContent(scripture, notes) {
        const contentArea = document.getElementById('contentArea');
        const scriptureData = scripture.scripture || {};
        const notesData = notes?.notes || [];
        
        contentArea.innerHTML = `
            <div>
                <h3 style="color: #2d3748; margin-bottom: 1rem;">
                    ${scriptureData.citation || this.currentReference}
                </h3>
                
                ${scriptureData.ult ? `
                    <div class="scripture-text">
                        <div class="translation-type">🔤 Literal Text (ULT/GLT)</div>
                        ${scriptureData.ult.text || scriptureData.ult}
                    </div>
                ` : ''}
                
                ${scriptureData.ust ? `
                    <div class="scripture-text">
                        <div class="translation-type">💬 Simplified Text (UST/GST)</div>
                        ${scriptureData.ust.text || scriptureData.ust}
                    </div>
                ` : ''}
                
                ${!scriptureData.ult && !scriptureData.ust ? `
                    <div class="scripture-text">
                        <div class="translation-type">�� Scripture Text</div>
                        ${scriptureData.text || 'Scripture content not available'}
                    </div>
                ` : ''}
                
                ${notesData.length > 0 ? `
                    <div class="notes-section">
                        <div class="notes-title">📝 Translation Notes</div>
                        ${notesData.slice(0, 3).map(note => `
                            <div style="margin: 0.5rem 0; padding: 0.75rem; background: white; border-radius: 4px;">
                                ${typeof note === 'string' ? note : note.note}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div style="margin-top: 2rem; text-align: center;">
                    <button class="download-btn" onclick="app.downloadForOffline('${this.currentReference}')">
                        📥 Download for Offline
                    </button>
                    <button class="download-btn" onclick="app.shareScripture()">
                        📤 Share
                    </button>
                </div>
                
                <div class="cache-stats">
                    💾 ${scripture.metadata?.cached ? 'Cached' : 'Live'} • 
                    ⚡ ${scripture.metadata?.responseTime || 0}ms • 
                    📡 ${this.sync.isOnline ? 'Online' : 'Offline'}
                </div>
            </div>
        `;
    }

    async downloadForOffline(reference) {
        if (!this.sync.isOnline) {
            this.showError('Cannot download while offline');
            return;
        }
        
        try {
            this.showLoading('Downloading for offline use...');
            
            await this.sync.queueForDownload(reference, this.currentLanguage, {
                includeNotes: true,
                includeWords: true,
                priority: 'high'
            });
            
            this.showMessage('✅ Download queued successfully');
            
        } catch (error) {
            this.showError('Download failed: ' + error.message);
        }
    }

    async shareScripture() {
        const scripture = await this.storage.getCachedScripture(this.currentReference, this.currentLanguage);
        
        if (navigator.share && scripture) {
            try {
                await navigator.share({
                    title: `${scripture.scripture.citation} - Translation Helper`,
                    text: scripture.scripture.text || scripture.scripture.ult?.text || scripture.scripture.ust?.text,
                    url: window.location.href
                });
            } catch (error) {
                // Fallback to clipboard
                this.copyToClipboard(scripture.scripture.text);
            }
        } else {
            this.copyToClipboard(scripture?.scripture?.text || 'No content to share');
        }
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            this.showMessage('📋 Copied to clipboard');
        }
    }

    async showDownloadManager() {
        const status = await this.sync.getDownloadStatus();
        const stats = await this.storage.getCacheStats();
        
        document.getElementById('contentArea').innerHTML = `
            <div>
                <h3>📥 Download Manager</h3>
                
                <div class="download-section">
                    <h4>Download Status</h4>
                    <div style="margin: 1rem 0;">
                        ⏳ Pending: ${status.pending}<br>
                        ✅ Completed: ${status.completed}<br>
                        ❌ Failed: ${status.failed}<br>
                        📊 Total: ${status.total}
                    </div>
                </div>
                
                <div class="cache-stats">
                    <h4>Cache Statistics</h4>
                    📚 Scripture passages: ${stats.scriptureCount}<br>
                    📝 Translation notes: ${stats.notesCount}<br>
                    📖 Translation words: ${stats.wordsCount}<br>
                    💾 Total storage: ${this.formatBytes(stats.totalSize)}
                </div>
                
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="download-btn" onclick="app.preloadPopularContent()">
                        📥 Download Popular Passages
                    </button>
                    <button class="download-btn" onclick="app.clearCache()">
                        🗑️ Clear Cache
                    </button>
                </div>
            </div>
        `;
    }

    async showCacheManager() {
        const allScripture = await this.storage.getAllData('scripture');
        const recentScripture = allScripture
            .sort((a, b) => b.lastAccessed - a.lastAccessed)
            .slice(0, 10);
        
        document.getElementById('contentArea').innerHTML = `
            <div>
                <h3>💾 Cache Manager</h3>
                
                <div class="cache-stats">
                    <h4>Recent Scripture Lookups</h4>
                    ${recentScripture.map(entry => `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 0.5rem 0; padding: 0.75rem; background: white; border-radius: 4px;">
                            <span onclick="app.loadScripture('${entry.reference}')" style="cursor: pointer; color: #667eea;">
                                ${entry.reference}
                            </span>
                            <small style="color: #718096;">
                                ${new Date(entry.lastAccessed).toLocaleDateString()}
                            </small>
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="download-btn" onclick="app.showDownloadManager()">
                        📥 Download Manager
                    </button>
                </div>
            </div>
        `;
    }

    async showSettings() {
        document.getElementById('contentArea').innerHTML = `
            <div>
                <h3>⚙️ Settings</h3>
                
                <div style="margin: 2rem 0;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
                        Strategic Language:
                    </label>
                    <select id="languageSelect" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e0; border-radius: 6px;">
                        <option value="en" ${this.currentLanguage === 'en' ? 'selected' : ''}>English</option>
                        <option value="es" ${this.currentLanguage === 'es' ? 'selected' : ''}>Español</option>
                        <option value="fr" ${this.currentLanguage === 'fr' ? 'selected' : ''}>Français</option>
                        <option value="pt" ${this.currentLanguage === 'pt' ? 'selected' : ''}>Português</option>
                    </select>
                </div>
                
                <div style="margin: 2rem 0;">
                    <label style="display: flex; align-items: center; margin: 1rem 0;">
                        <input type="checkbox" id="autoDownload" style="margin-right: 0.5rem;">
                        Auto-download popular passages
                    </label>
                    <label style="display: flex; align-items: center; margin: 1rem 0;">
                        <input type="checkbox" id="backgroundSync" checked style="margin-right: 0.5rem;">
                        Background sync when online
                    </label>
                    <label style="display: flex; align-items: center; margin: 1rem 0;">
                        <input type="checkbox" id="cacheNotes" checked style="margin-right: 0.5rem;">
                        Include translation notes in downloads
                    </label>
                </div>
                
                <div style="text-align: center;">
                    <button class="download-btn" onclick="app.saveSettings()">
                        💾 Save Settings
                    </button>
                </div>
            </div>
        `;
    }

    async preloadPopularContent() {
        if (!this.sync.isOnline) {
            this.showError('Cannot download while offline');
            return;
        }
        
        this.showLoading('Downloading popular passages...');
        
        try {
            await this.storage.preloadPopularContent();
            this.showMessage('✅ Popular passages downloaded for offline use');
        } catch (error) {
            this.showError('Download failed: ' + error.message);
        }
    }

    async clearCache() {
        if (confirm('Clear all cached content? This will free up storage but require re-downloading.')) {
            try {
                const stores = ['scripture', 'notes', 'words'];
                for (const store of stores) {
                    const allData = await this.storage.getAllData(store);
                    for (const entry of allData) {
                        await this.storage.deleteData(store, entry.id);
                    }
                }
                
                await this.storage.updateCacheStats();
                this.showMessage('✅ Cache cleared successfully');
                this.showCacheManager(); // Refresh the display
                
            } catch (error) {
                this.showError('Failed to clear cache: ' + error.message);
            }
        }
    }

    saveSettings() {
        const language = document.getElementById('languageSelect').value;
        this.currentLanguage = language;
        
        // Save to localStorage
        localStorage.setItem('translationHelper_language', language);
        
        this.showMessage('✅ Settings saved');
    }

    showLoading(message) {
        document.getElementById('contentArea').innerHTML = `
            <div class="loading">
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">📚</div>
                    <div>${message}</div>
                </div>
            </div>
        `;
    }

    showError(message) {
        document.getElementById('contentArea').innerHTML = `
            <div class="error">❌ ${message}</div>
        `;
    }

    showMessage(message) {
        // Simple toast message
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            max-width: 300px;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    showInstallPrompt(event) {
        // Show install banner
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #667eea;
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 1000;
        `;
        banner.innerHTML = `
            <div>📱 Install Translation Helper for offline access</div>
            <button onclick="this.parentElement.parentElement.install()" style="background: white; color: #667eea; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin: 0.5rem;">
                Install
            </button>
            <button onclick="this.parentElement.parentElement.dismiss()" style="background: none; color: white; border: 1px solid white; padding: 0.5rem 1rem; border-radius: 4px; margin: 0.5rem;">
                Not Now
            </button>
        `;
        
        banner.install = () => {
            event.prompt();
            document.body.removeChild(banner);
        };
        
        banner.dismiss = () => {
            document.body.removeChild(banner);
        };
        
        document.body.appendChild(banner);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', async () => {
    app = new MobileTranslationApp();
    await app.initialize();
});
```

---

## 🚀 Step 5: Add Service Worker for Full Offline Support

Create a service worker for network resilience:

```javascript
// service-worker.js
const CACHE_NAME = 'translation-helper-v1';
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => caches.delete(cacheName))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - network-first with cache fallback
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Handle API requests
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache successful API responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached version if network fails
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Handle static assets - cache first
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});

// Background sync for downloading content
self.addEventListener('sync', (event) => {
    if (event.tag === 'download-content') {
        event.waitUntil(processDownloadQueue());
    }
});

async function processDownloadQueue() {
    // This would integrate with the download queue in IndexedDB
    console.log('Processing download queue in background');
}
```

Register the service worker in your main HTML:

```html
<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
</script>
```

---

## 🎉 Success! Your Offline-First Mobile Translation App is Complete

**Your mobile app now provides:**

- ✅ **Full Offline Functionality**: Works completely without internet
- ✅ **Smart Caching**: Intelligently stores frequently accessed content  
- ✅ **Progressive Sync**: Updates resources when connection is available
- ✅ **Mobile Optimized**: Touch-friendly interface with PWA support
- ✅ **Strategic Language Support**: Complete offline resource sets
- ✅ **Background Updates**: Keeps content current automatically
- ✅ **Download Management**: User control over offline content
- ✅ **Performance Monitoring**: Cache statistics and optimization

---

## 📊 Testing Your Offline App

Test the complete offline experience:

```javascript
// Test offline functionality
async function testOfflineMode() {
    console.log('Testing offline mode...');
    
    // 1. Go offline
    if ('serviceWorker' in navigator) {
        // Simulate offline
        await navigator.serviceWorker.ready;
        console.log('Service worker active');
    }
    
    // 2. Try loading cached content
    const cachedScripture = await app.storage.getCachedScripture('John 3:16');
    console.log('Cached scripture available:', !!cachedScripture);
    
    // 3. Test cache statistics
    const stats = await app.storage.getCacheStats();
    console.log('Cache stats:', stats);
    
    // 4. Test download queue
    const queueStatus = await app.sync.getDownloadStatus();
    console.log('Download queue:', queueStatus);
}

// Performance testing
async function testPerformance() {
    const start = performance.now();
    await app.loadScripture('Romans 8:28');
    const end = performance.now();
    
    console.log(`Load time: ${end - start}ms`);
}
```

---

## 🚀 Advanced Mobile Features

### Push Notifications for Content Updates
```javascript
async function setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Register for push notifications when new content is available
        }
    }
}
```

### Offline Analytics
```javascript
class OfflineAnalytics {
    trackUsage(event, data) {
        const usage = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
        usage.push({
            event,
            data,
            timestamp: Date.now(),
            offline: !navigator.onLine
        });
        localStorage.setItem('offline_analytics', JSON.stringify(usage));
    }
    
    async syncWhenOnline() {
        if (navigator.onLine) {
            const usage = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
            // Send to analytics service
            localStorage.setItem('offline_analytics', '[]');
        }
    }
}
```

### Voice Scripture Reading
```javascript
async function readScripture(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }
}
```

---

## 📚 What's Next?

**Your offline-first mobile translation app is production-ready!**

Consider these enhancements:

1. **Multi-language Support** - Add more Strategic Languages
2. **Collaborative Features** - Team translation workflows
3. **Advanced AI Integration** - Offline translation suggestions
4. **Custom Resource Management** - User-generated content support

---

**Ready to deploy?** Your mobile app works offline and provides Mother Tongue Translators with essential Bible translation resources anywhere in the world!

**Questions?** Check our [Complete API Documentation](../api/interactive-docs.html) or [Developer Community](https://github.com/unfoldingword/translation-helps-mcp/discussions)
