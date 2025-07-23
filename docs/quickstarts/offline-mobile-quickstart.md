# Build Offline-First Mobile Apps

## What You'll Build

A mobile-first Progressive Web App (PWA) that works offline, caches translation resources locally, and syncs data when connectivity is available. Perfect for field translators working in areas with limited internet access.

## Prerequisites

- Mobile web development knowledge
- Understanding of Service Workers and PWAs
- Basic knowledge of IndexedDB or similar client-side storage
- Node.js for development server

## Step 1: Project Setup with PWA Foundation

```bash
mkdir translation-offline-app
cd translation-offline-app

# Create project structure
mkdir src css js sw assets icons
touch index.html manifest.json sw.js css/mobile.css js/app.js js/storage.js js/sync.js

# Initialize package.json
npm init -y
npm install express cors axios idb workbox-webpack-plugin
```

## Step 2: Create the PWA Manifest

```json
// manifest.json
{
  "name": "Translation Helps Offline",
  "short_name": "TransHelps",
  "description": "Offline-first Bible translation helper",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#3498db",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "icons/icon-152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "capabilities": ["cross_origin_isolated"],
  "categories": ["education", "productivity", "utilities"],
  "screenshots": [
    {
      "src": "screenshots/mobile-1.png",
      "sizes": "400x800",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

## Step 3: Implement Advanced Storage Layer

```javascript
// js/storage.js
import { openDB } from "idb";

class OfflineStorage {
  constructor() {
    this.dbName = "TranslationHelpsDB";
    this.version = 1;
    this.db = null;
  }

  async init() {
    this.db = await openDB(this.dbName, this.version, {
      upgrade(db) {
        // Scripture store
        if (!db.objectStoreNames.contains("scripture")) {
          const scriptureStore = db.createObjectStore("scripture", { keyPath: "id" });
          scriptureStore.createIndex("reference", "reference", { unique: false });
          scriptureStore.createIndex("language", "language", { unique: false });
          scriptureStore.createIndex("book", "book", { unique: false });
        }

        // Translation notes store
        if (!db.objectStoreNames.contains("notes")) {
          const notesStore = db.createObjectStore("notes", { keyPath: "id" });
          notesStore.createIndex("reference", "reference", { unique: false });
          notesStore.createIndex("language", "language", { unique: false });
        }

        // Translation words store
        if (!db.objectStoreNames.contains("words")) {
          const wordsStore = db.createObjectStore("words", { keyPath: "id" });
          wordsStore.createIndex("word", "word", { unique: false });
          wordsStore.createIndex("language", "language", { unique: false });
        }

        // Translation questions store
        if (!db.objectStoreNames.contains("questions")) {
          const questionsStore = db.createObjectStore("questions", { keyPath: "id" });
          questionsStore.createIndex("reference", "reference", { unique: false });
          questionsStore.createIndex("language", "language", { unique: false });
        }

        // User translations store
        if (!db.objectStoreNames.contains("translations")) {
          const translationsStore = db.createObjectStore("translations", { keyPath: "id" });
          translationsStore.createIndex("reference", "reference", { unique: false });
          translationsStore.createIndex("status", "status", { unique: false });
          translationsStore.createIndex("lastModified", "lastModified", { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
          syncStore.createIndex("action", "action", { unique: false });
          syncStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Download queue store
        if (!db.objectStoreNames.contains("downloadQueue")) {
          const downloadStore = db.createObjectStore("downloadQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
          downloadStore.createIndex("priority", "priority", { unique: false });
          downloadStore.createIndex("status", "status", { unique: false });
        }

        // Resource metadata store
        if (!db.objectStoreNames.contains("metadata")) {
          const metadataStore = db.createObjectStore("metadata", { keyPath: "key" });
        }
      },
    });
  }

  // Scripture operations
  async saveScripture(reference, data, language = "en") {
    const id = `${language}:${reference}`;
    const record = {
      id,
      reference,
      language,
      book: reference.split(" ")[0],
      data,
      timestamp: Date.now(),
      synced: false,
    };

    await this.db.put("scripture", record);
    return record;
  }

  async getScripture(reference, language = "en") {
    const id = `${language}:${reference}`;
    return await this.db.get("scripture", id);
  }

  async getScripturesByBook(book, language = "en") {
    const tx = this.db.transaction("scripture", "readonly");
    const index = tx.store.index("book");
    const results = [];

    for await (const cursor of index.iterate()) {
      if (cursor.value.book === book && cursor.value.language === language) {
        results.push(cursor.value);
      }
    }

    return results;
  }

  // Translation notes operations
  async saveTranslationNotes(reference, notes, language = "en") {
    const id = `${language}:${reference}:notes`;
    const record = {
      id,
      reference,
      language,
      notes,
      timestamp: Date.now(),
      synced: false,
    };

    await this.db.put("notes", record);
    return record;
  }

  async getTranslationNotes(reference, language = "en") {
    const id = `${language}:${reference}:notes`;
    return await this.db.get("notes", id);
  }

  // Translation words operations
  async saveTranslationWord(word, definition, language = "en") {
    const id = `${language}:${word}`;
    const record = {
      id,
      word,
      language,
      definition,
      timestamp: Date.now(),
      synced: false,
    };

    await this.db.put("words", record);
    return record;
  }

  async getTranslationWord(word, language = "en") {
    const id = `${language}:${word}`;
    return await this.db.get("words", id);
  }

  async searchTranslationWords(query, language = "en", limit = 20) {
    const tx = this.db.transaction("words", "readonly");
    const index = tx.store.index("word");
    const results = [];

    for await (const cursor of index.iterate()) {
      if (
        cursor.value.language === language &&
        cursor.value.word.toLowerCase().includes(query.toLowerCase())
      ) {
        results.push(cursor.value);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  // User translations operations
  async saveUserTranslation(reference, translation, status = "draft") {
    const id = `user:${reference}`;
    const record = {
      id,
      reference,
      translation,
      status, // draft, review, final
      lastModified: Date.now(),
      synced: false,
    };

    await this.db.put("translations", record);
    await this.queueForSync("save_translation", record);
    return record;
  }

  async getUserTranslation(reference) {
    const id = `user:${reference}`;
    return await this.db.get("translations", id);
  }

  async getUserTranslations(status = null) {
    const tx = this.db.transaction("translations", "readonly");
    const results = [];

    if (status) {
      const index = tx.store.index("status");
      for await (const cursor of index.iterate(status)) {
        results.push(cursor.value);
      }
    } else {
      for await (const cursor of tx.store) {
        results.push(cursor.value);
      }
    }

    return results.sort((a, b) => b.lastModified - a.lastModified);
  }

  // Sync queue operations
  async queueForSync(action, data) {
    const record = {
      action,
      data,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3,
    };

    await this.db.add("syncQueue", record);
    return record;
  }

  async getSyncQueue() {
    const tx = this.db.transaction("syncQueue", "readonly");
    const results = [];

    for await (const cursor of tx.store) {
      if (cursor.value.attempts < cursor.value.maxAttempts) {
        results.push(cursor.value);
      }
    }

    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  async removeSyncItem(id) {
    await this.db.delete("syncQueue", id);
  }

  async incrementSyncAttempts(id) {
    const item = await this.db.get("syncQueue", id);
    if (item) {
      item.attempts++;
      await this.db.put("syncQueue", item);
    }
  }

  // Download queue operations
  async queueForDownload(type, reference, priority = 1) {
    const record = {
      type, // 'scripture', 'notes', 'questions', 'words'
      reference,
      priority, // 1 = high, 2 = medium, 3 = low
      status: "pending",
      timestamp: Date.now(),
    };

    await this.db.add("downloadQueue", record);
    return record;
  }

  async getDownloadQueue() {
    const tx = this.db.transaction("downloadQueue", "readonly");
    const index = tx.store.index("priority");
    const results = [];

    for await (const cursor of index.iterate()) {
      if (cursor.value.status === "pending") {
        results.push(cursor.value);
      }
    }

    return results;
  }

  async updateDownloadStatus(id, status) {
    const item = await this.db.get("downloadQueue", id);
    if (item) {
      item.status = status;
      await this.db.put("downloadQueue", item);
    }
  }

  // Metadata operations
  async setMetadata(key, value) {
    await this.db.put("metadata", { key, value, timestamp: Date.now() });
  }

  async getMetadata(key) {
    const record = await this.db.get("metadata", key);
    return record ? record.value : null;
  }

  // Storage management
  async getStorageUsage() {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage,
      quota: estimate.quota,
      percentage: Math.round((estimate.usage / estimate.quota) * 100),
    };
  }

  async clearCache() {
    const stores = ["scripture", "notes", "words", "questions"];
    const tx = this.db.transaction(stores, "readwrite");

    await Promise.all(stores.map((store) => tx.objectStore(store).clear()));
  }

  async exportData() {
    const data = {};
    const stores = ["scripture", "notes", "words", "questions", "translations"];

    for (const storeName of stores) {
      const tx = this.db.transaction(storeName, "readonly");
      const results = [];

      for await (const cursor of tx.store) {
        results.push(cursor.value);
      }

      data[storeName] = results;
    }

    return data;
  }

  async importData(data) {
    const stores = Object.keys(data);
    const tx = this.db.transaction(stores, "readwrite");

    for (const storeName of stores) {
      const store = tx.objectStore(storeName);
      for (const record of data[storeName]) {
        await store.put(record);
      }
    }
  }
}

export default new OfflineStorage();
```

## Step 4: Implement Background Sync

```javascript
// js/sync.js
class BackgroundSync {
  constructor(storage, api) {
    this.storage = storage;
    this.api = api;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;

    this.setupEventListeners();
    this.startPeriodicSync();
  }

  setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    // Listen for sync events from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data.type === "BACKGROUND_SYNC") {
        this.triggerSync();
      }
    });
  }

  startPeriodicSync() {
    // Sync every 5 minutes when online
    setInterval(
      () => {
        if (this.isOnline && !this.syncInProgress) {
          this.triggerSync();
        }
      },
      5 * 60 * 1000
    );
  }

  async triggerSync() {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      await this.syncUserData();
      await this.downloadQueuedContent();
      await this.updateLastSync();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncUserData() {
    const syncQueue = await this.storage.getSyncQueue();

    for (const item of syncQueue) {
      try {
        switch (item.action) {
          case "save_translation":
            await this.syncTranslation(item.data);
            await this.storage.removeSyncItem(item.id);
            break;

          case "delete_translation":
            await this.deleteTranslation(item.data);
            await this.storage.removeSyncItem(item.id);
            break;

          default:
            console.warn("Unknown sync action:", item.action);
        }
      } catch (error) {
        console.error("Sync item failed:", item, error);
        await this.storage.incrementSyncAttempts(item.id);
      }
    }
  }

  async syncTranslation(translation) {
    // In a real app, this would sync to a backend
    // For demo purposes, we'll just mark as synced
    translation.synced = true;
    await this.storage.saveUserTranslation(
      translation.reference,
      translation.translation,
      translation.status
    );
  }

  async deleteTranslation(translation) {
    // Sync deletion to backend
    console.log("Syncing deletion:", translation);
  }

  async downloadQueuedContent() {
    const downloadQueue = await this.storage.getDownloadQueue();

    for (const item of downloadQueue.slice(0, 5)) {
      // Limit concurrent downloads
      try {
        await this.storage.updateDownloadStatus(item.id, "downloading");

        switch (item.type) {
          case "scripture":
            await this.downloadScripture(item.reference);
            break;
          case "notes":
            await this.downloadNotes(item.reference);
            break;
          case "questions":
            await this.downloadQuestions(item.reference);
            break;
          case "words":
            await this.downloadWords(item.reference);
            break;
        }

        await this.storage.updateDownloadStatus(item.id, "completed");
      } catch (error) {
        console.error("Download failed:", item, error);
        await this.storage.updateDownloadStatus(item.id, "failed");
      }
    }
  }

  async downloadScripture(reference) {
    try {
      const response = await this.api.getScripture(reference);
      await this.storage.saveScripture(reference, response);
    } catch (error) {
      throw new Error(`Failed to download scripture for ${reference}: ${error.message}`);
    }
  }

  async downloadNotes(reference) {
    try {
      const response = await this.api.getTranslationNotes(reference);
      await this.storage.saveTranslationNotes(reference, response.notes);
    } catch (error) {
      throw new Error(`Failed to download notes for ${reference}: ${error.message}`);
    }
  }

  async downloadQuestions(reference) {
    try {
      const response = await this.api.getTranslationQuestions(reference);
      await this.storage.saveTranslationQuestions(reference, response.questions);
    } catch (error) {
      throw new Error(`Failed to download questions for ${reference}: ${error.message}`);
    }
  }

  async downloadWords(query) {
    try {
      const response = await this.api.browseWords(query);
      for (const word of response.words) {
        await this.storage.saveTranslationWord(word.word, word.definition);
      }
    } catch (error) {
      throw new Error(`Failed to download words for ${query}: ${error.message}`);
    }
  }

  async updateLastSync() {
    await this.storage.setMetadata("lastSync", Date.now());
  }

  async getLastSync() {
    return await this.storage.getMetadata("lastSync");
  }

  // Smart preloading based on usage patterns
  async smartPreload(currentReference) {
    const book = currentReference.split(" ")[0];
    const chapter = parseInt(currentReference.split(" ")[1].split(":")[0]);

    // Queue adjacent chapters for download
    const adjacentRefs = [`${book} ${chapter - 1}`, `${book} ${chapter + 1}`].filter(
      (ref) => chapter > 1 || !ref.includes("0")
    );

    for (const ref of adjacentRefs) {
      await this.storage.queueForDownload("scripture", ref, 2);
      await this.storage.queueForDownload("notes", ref, 2);
    }
  }

  // Batch operations for efficiency
  async batchDownload(references, types = ["scripture", "notes"]) {
    const downloads = [];

    for (const reference of references) {
      for (const type of types) {
        downloads.push(this.storage.queueForDownload(type, reference, 1));
      }
    }

    await Promise.all(downloads);
    await this.triggerSync();
  }
}

export default BackgroundSync;
```

## Step 5: Advanced Service Worker

```javascript
// sw.js
const CACHE_NAME = "translation-helps-v1";
const STATIC_CACHE = "static-v1";
const DYNAMIC_CACHE = "dynamic-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/mobile.css",
  "/js/app.js",
  "/js/storage.js",
  "/js/sync.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const API_BASE = "https://translation.tools/api";

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event with advanced caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - cache-first with network fallback
  if (url.origin === API_BASE || request.url.includes("/api/")) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Static assets - cache-first
  if (STATIC_ASSETS.some((asset) => request.url.endsWith(asset))) {
    event.respondWith(caches.match(request).then((response) => response || fetch(request)));
    return;
  }

  // Other requests - network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `${url.pathname}${url.search}`;

  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(cacheKey, networkResponse.clone());

      return networkResponse;
    }

    throw new Error("Network response not ok");
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(cacheKey);

    if (cachedResponse) {
      // Add header to indicate cached response
      const response = cachedResponse.clone();
      response.headers.set("X-Served-From", "cache");
      return response;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "This content is not available offline",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Background sync
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(notifyMainApp());
  }
});

async function notifyMainApp() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "BACKGROUND_SYNC",
      timestamp: Date.now(),
    });
  });
}

// Push notifications (for future use)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New translation resources available",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open App",
        icon: "/icons/checkmark.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/cross.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("Translation Helps", options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Periodic background sync (experimental)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "translation-sync") {
    event.waitUntil(notifyMainApp());
  }
});

// Share target (for sharing verses/translations)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/share-target" && event.request.method === "POST") {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const sharedText = formData.get("text") || "";
  const sharedTitle = formData.get("title") || "";

  // Store shared content for the app to process
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: "SHARED_CONTENT",
      text: sharedText,
      title: sharedTitle,
    });
  });

  return Response.redirect("/", 302);
}
```

## Step 6: Mobile-Optimized UI

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#3498db" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="TransHelps" />

    <title>Translation Helps Offline</title>
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/icons/icon-192.png" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <link rel="stylesheet" href="/css/mobile.css" />
  </head>
  <body>
    <div class="app" id="app">
      <!-- Loading Screen -->
      <div class="loading-screen" id="loadingScreen">
        <div class="loading-spinner"></div>
        <h2>Translation Helps</h2>
        <p>Preparing offline resources...</p>
      </div>

      <!-- Header -->
      <header class="header">
        <div class="header-content">
          <h1>Translation Helps</h1>
          <div class="connection-status" id="connectionStatus">
            <span class="status-indicator"></span>
            <span class="status-text">Online</span>
          </div>
        </div>

        <nav class="tab-nav">
          <button class="tab-btn active" data-tab="scripture">Scripture</button>
          <button class="tab-btn" data-tab="translate">Translate</button>
          <button class="tab-btn" data-tab="helps">Helps</button>
          <button class="tab-btn" data-tab="library">Library</button>
        </nav>
      </header>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Scripture Tab -->
        <section class="tab-content active" id="scripture-tab">
          <div class="search-container">
            <div class="search-input-container">
              <input
                type="text"
                id="referenceInput"
                placeholder="Enter reference (e.g., John 3:16)"
                value="John 3:16"
                autocomplete="off"
              />
              <button class="search-btn" id="searchBtn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  />
                </svg>
              </button>
            </div>

            <div class="quick-references">
              <button class="ref-btn" data-ref="John 3:16">John 3:16</button>
              <button class="ref-btn" data-ref="Romans 3:23">Rom 3:23</button>
              <button class="ref-btn" data-ref="Ephesians 2:8">Eph 2:8</button>
              <button class="ref-btn" data-ref="1 John 1:9">1 John 1:9</button>
            </div>
          </div>

          <div class="scripture-content" id="scriptureContent">
            <div class="verse-container">
              <div class="verse-header">
                <h3 id="verseReference">John 3:16</h3>
                <div class="verse-actions">
                  <button class="action-btn" id="bookmarkBtn">⭐</button>
                  <button class="action-btn" id="shareBtn">📤</button>
                  <button class="action-btn" id="downloadBtn">⬇️</button>
                </div>
              </div>

              <div class="translation-switcher">
                <button class="translation-btn active" data-translation="ult">ULT</button>
                <button class="translation-btn" data-translation="ust">UST</button>
                <button class="translation-btn" data-translation="both">Both</button>
              </div>

              <div class="scripture-text">
                <div class="translation-content ult-content" id="ultContent">
                  <h4>ULT (Literal)</h4>
                  <p id="ultText">Loading...</p>
                </div>
                <div class="translation-content ust-content" id="ustContent">
                  <h4>UST (Simplified)</h4>
                  <p id="ustText">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Translation Tab -->
        <section class="tab-content" id="translate-tab">
          <div class="translation-workspace">
            <div class="current-reference">
              <h3 id="translateReference">Select a verse to translate</h3>
            </div>

            <div class="translation-editor">
              <label for="translationInput">Your Translation:</label>
              <textarea
                id="translationInput"
                placeholder="Enter your translation here..."
                rows="4"
              ></textarea>

              <div class="editor-toolbar">
                <button class="tool-btn" id="saveBtn">💾 Save</button>
                <button class="tool-btn" id="clearBtn">🗑️ Clear</button>
                <button class="tool-btn" id="checkBtn">✓ Check</button>
              </div>
            </div>

            <div class="translation-status" id="translationStatus">
              <div class="status-item">
                <span class="status-label">Status:</span>
                <span class="status-value" id="statusValue">Draft</span>
              </div>
              <div class="status-item">
                <span class="status-label">Last saved:</span>
                <span class="status-value" id="lastSaved">Not saved</span>
              </div>
              <div class="status-item">
                <span class="status-label">Sync:</span>
                <span class="status-value sync-status" id="syncStatus">Pending</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Helps Tab -->
        <section class="tab-content" id="helps-tab">
          <div class="helps-container">
            <div class="helps-nav">
              <button class="help-btn active" data-help="notes">Notes</button>
              <button class="help-btn" data-help="questions">Questions</button>
              <button class="help-btn" data-help="words">Words</button>
            </div>

            <div class="help-content" id="notesHelp">
              <h4>Translation Notes</h4>
              <div id="notesContent">No notes available</div>
            </div>

            <div class="help-content" id="questionsHelp" style="display: none;">
              <h4>Translation Questions</h4>
              <div id="questionsContent">No questions available</div>
            </div>

            <div class="help-content" id="wordsHelp" style="display: none;">
              <h4>Key Words</h4>
              <div class="word-search">
                <input type="text" id="wordSearch" placeholder="Search words..." />
                <button id="wordSearchBtn">Search</button>
              </div>
              <div id="wordsContent">No words available</div>
            </div>
          </div>
        </section>

        <!-- Library Tab -->
        <section class="tab-content" id="library-tab">
          <div class="library-container">
            <div class="library-stats">
              <div class="stat-card">
                <h4>Downloaded</h4>
                <span class="stat-value" id="downloadedCount">0</span>
              </div>
              <div class="stat-card">
                <h4>Translations</h4>
                <span class="stat-value" id="translationCount">0</span>
              </div>
              <div class="stat-card">
                <h4>Storage</h4>
                <span class="stat-value" id="storageUsed">0%</span>
              </div>
            </div>

            <div class="library-sections">
              <div class="section-header">
                <h4>Recent Translations</h4>
                <button class="section-btn" id="viewAllTranslations">View All</button>
              </div>
              <div class="recent-list" id="recentTranslations">
                <!-- Populated by JS -->
              </div>

              <div class="section-header">
                <h4>Downloaded Resources</h4>
                <button class="section-btn" id="manageDownloads">Manage</button>
              </div>
              <div class="downloads-list" id="downloadsList">
                <!-- Populated by JS -->
              </div>

              <div class="section-header">
                <h4>Quick Actions</h4>
              </div>
              <div class="action-buttons">
                <button class="action-button" id="exportData">📤 Export Data</button>
                <button class="action-button" id="importData">📥 Import Data</button>
                <button class="action-button" id="clearCache">🗑️ Clear Cache</button>
                <button class="action-button" id="forceSync">🔄 Force Sync</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- Floating Action Button -->
      <button class="fab" id="fab">+</button>

      <!-- Bottom Sheet for Quick Actions -->
      <div class="bottom-sheet" id="bottomSheet">
        <div class="sheet-handle"></div>
        <div class="sheet-content">
          <h4>Quick Actions</h4>
          <div class="quick-actions">
            <button class="quick-action" data-action="bookmark">⭐ Bookmark</button>
            <button class="quick-action" data-action="share">📤 Share</button>
            <button class="quick-action" data-action="download">⬇️ Download</button>
            <button class="quick-action" data-action="translate">✏️ Translate</button>
          </div>
        </div>
      </div>

      <!-- Toast Notifications -->
      <div class="toast-container" id="toastContainer"></div>
    </div>

    <!-- Install Prompt -->
    <div class="install-prompt" id="installPrompt" style="display: none;">
      <div class="prompt-content">
        <h3>Install Translation Helps</h3>
        <p>Install this app for offline access and better performance</p>
        <div class="prompt-actions">
          <button class="prompt-btn cancel" id="cancelInstall">Cancel</button>
          <button class="prompt-btn install" id="confirmInstall">Install</button>
        </div>
      </div>
    </div>

    <script type="module" src="/js/app.js"></script>
  </body>
</html>
```

## Step 7: Main Application Logic

```javascript
// js/app.js
import OfflineStorage from "./storage.js";
import BackgroundSync from "./sync.js";

class TranslationApp {
  constructor() {
    this.storage = null;
    this.sync = null;
    this.currentReference = "John 3:16";
    this.currentTranslation = "ult";
    this.isOnline = navigator.onLine;
    this.deferredPrompt = null;

    this.init();
  }

  async init() {
    try {
      // Initialize storage
      this.storage = OfflineStorage;
      await this.storage.init();

      // Initialize API client
      this.api = new TranslationAPI();

      // Initialize sync
      this.sync = new BackgroundSync(this.storage, this.api);

      // Set up service worker
      await this.registerServiceWorker();

      // Set up event listeners
      this.setupEventListeners();

      // Load initial data
      await this.loadInitialData();

      // Hide loading screen
      this.hideLoading();

      // Check for app updates
      this.checkForUpdates();
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.showToast("Failed to initialize app", "error");
    }
  }

  async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered:", registration);

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              this.showUpdatePrompt();
            }
          });
        });

        // Register for background sync
        if ("sync" in window.ServiceWorkerRegistration.prototype) {
          await registration.sync.register("background-sync");
        }
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Search functionality
    document.getElementById("searchBtn").addEventListener("click", () => {
      this.searchReference();
    });

    document.getElementById("referenceInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.searchReference();
      }
    });

    // Quick references
    document.querySelectorAll(".ref-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.getElementById("referenceInput").value = e.target.dataset.ref;
        this.searchReference();
      });
    });

    // Translation switcher
    document.querySelectorAll(".translation-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTranslation(e.target.dataset.translation);
      });
    });

    // Translation editor
    document.getElementById("saveBtn").addEventListener("click", () => {
      this.saveTranslation();
    });

    document.getElementById("clearBtn").addEventListener("click", () => {
      this.clearTranslation();
    });

    document.getElementById("checkBtn").addEventListener("click", () => {
      this.checkTranslation();
    });

    // Helps navigation
    document.querySelectorAll(".help-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchHelp(e.target.dataset.help);
      });
    });

    // Word search
    document.getElementById("wordSearchBtn").addEventListener("click", () => {
      this.searchWords();
    });

    // Library actions
    document.getElementById("exportData").addEventListener("click", () => {
      this.exportData();
    });

    document.getElementById("importData").addEventListener("click", () => {
      this.importData();
    });

    document.getElementById("clearCache").addEventListener("click", () => {
      this.clearCache();
    });

    document.getElementById("forceSync").addEventListener("click", () => {
      this.forceSync();
    });

    // FAB and bottom sheet
    document.getElementById("fab").addEventListener("click", () => {
      this.toggleBottomSheet();
    });

    // Quick actions
    document.querySelectorAll(".quick-action").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.handleQuickAction(e.target.dataset.action);
      });
    });

    // Connection status
    window.addEventListener("online", () => {
      this.updateConnectionStatus(true);
    });

    window.addEventListener("offline", () => {
      this.updateConnectionStatus(false);
    });

    // Install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    document.getElementById("confirmInstall").addEventListener("click", () => {
      this.installApp();
    });

    document.getElementById("cancelInstall").addEventListener("click", () => {
      this.hideInstallPrompt();
    });

    // Service worker messages
    navigator.serviceWorker.addEventListener("message", (event) => {
      this.handleServiceWorkerMessage(event.data);
    });

    // Auto-save translation
    document.getElementById("translationInput").addEventListener(
      "input",
      this.debounce(() => {
        this.autoSaveTranslation();
      }, 2000)
    );
  }

  async loadInitialData() {
    // Load initial scripture
    await this.loadScripture(this.currentReference);

    // Update library stats
    await this.updateLibraryStats();

    // Load recent translations
    await this.loadRecentTranslations();

    // Update connection status
    this.updateConnectionStatus(this.isOnline);
  }

  async loadScripture(reference) {
    try {
      this.currentReference = reference;
      document.getElementById("verseReference").textContent = reference;
      document.getElementById("translateReference").textContent = reference;

      // Try local storage first
      let scripture = await this.storage.getScripture(reference);

      if (!scripture && this.isOnline) {
        // Fetch from API if online
        const response = await this.api.getSourceTexts(reference);
        scripture = await this.storage.saveScripture(reference, response);

        // Queue for smart preloading
        await this.sync.smartPreload(reference);
      }

      if (scripture) {
        this.displayScripture(scripture.data);
        await this.loadTranslationHelps(reference);
        await this.loadUserTranslation(reference);
      } else {
        this.showOfflineMessage("Scripture not available offline");
      }
    } catch (error) {
      console.error("Failed to load scripture:", error);
      this.showToast("Failed to load scripture", "error");
    }
  }

  displayScripture(data) {
    const ultText = document.getElementById("ultText");
    const ustText = document.getElementById("ustText");

    if (data.ult) {
      ultText.innerHTML = this.formatTextWithHighlights(data.ult);
    } else {
      ultText.innerHTML = "<em>ULT not available offline</em>";
    }

    if (data.ust) {
      ustText.innerHTML = this.formatTextWithHighlights(data.ust);
    } else {
      ustText.innerHTML = "<em>UST not available offline</em>";
    }

    this.updateTranslationView();
  }

  formatTextWithHighlights(text) {
    // Add click handlers for key terms
    const keyTerms = ["God", "Lord", "Jesus", "Christ", "Spirit", "faith", "grace", "love"];
    let formatted = text;

    keyTerms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      formatted = formatted.replace(
        regex,
        `<span class="key-term" onclick="app.lookupWord('${term}')">${term}</span>`
      );
    });

    return formatted;
  }

  async loadTranslationHelps(reference) {
    try {
      // Load from storage first
      let notes = await this.storage.getTranslationNotes(reference);
      let questions = await this.storage.getTranslationQuestions(reference);

      // Fetch if not available and online
      if (!notes && this.isOnline) {
        const response = await this.api.getTranslationHelps(reference);
        notes = await this.storage.saveTranslationNotes(reference, response.notes);
        questions = await this.storage.saveTranslationQuestions(reference, response.questions);
      }

      this.displayTranslationHelps(notes, questions);
    } catch (error) {
      console.error("Failed to load translation helps:", error);
    }
  }

  displayTranslationHelps(notes, questions) {
    const notesContent = document.getElementById("notesContent");
    const questionsContent = document.getElementById("questionsContent");

    if (notes && notes.notes) {
      notesContent.innerHTML = notes.notes
        .map(
          (note) => `
        <div class="note-item">
          <div class="note-text">${note.text}</div>
        </div>
      `
        )
        .join("");
    } else {
      notesContent.innerHTML = '<div class="offline-message">Notes not available offline</div>';
    }

    if (questions && questions.questions) {
      questionsContent.innerHTML = questions.questions
        .map(
          (q) => `
        <div class="question-item">
          <div class="question-text"><strong>Q:</strong> ${q.question}</div>
          ${q.answer ? `<div class="answer-text"><strong>A:</strong> ${q.answer}</div>` : ""}
        </div>
      `
        )
        .join("");
    } else {
      questionsContent.innerHTML =
        '<div class="offline-message">Questions not available offline</div>';
    }
  }

  // More methods would continue here...
  // Including: saveTranslation, switchTab, updateConnectionStatus, etc.

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const container = document.getElementById("toastContainer");
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 100);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, 3000);
  }

  hideLoading() {
    document.getElementById("loadingScreen").style.display = "none";
  }
}

// Simple API client for demonstration
class TranslationAPI {
  constructor() {
    this.baseUrl = "https://translation.tools/api";
  }

  async getSourceTexts(reference) {
    const response = await fetch(
      `${this.baseUrl}/fetch-scripture?reference=${encodeURIComponent(reference)}`
    );
    if (!response.ok) throw new Error("Network error");
    return await response.json();
  }

  async getTranslationHelps(reference) {
    const [notes, questions] = await Promise.all([
      fetch(`${this.baseUrl}/fetch-translation-notes?reference=${encodeURIComponent(reference)}`),
      fetch(
        `${this.baseUrl}/fetch-translation-questions?reference=${encodeURIComponent(reference)}`
      ),
    ]);

    return {
      notes: notes.ok ? (await notes.json()).notes : [],
      questions: questions.ok ? (await questions.json()).questions : [],
    };
  }
}

// Initialize app
const app = new TranslationApp();
window.app = app; // Make available globally for onclick handlers
```

## Step 8: Mobile CSS

```css
/* css/mobile.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

:root {
  --primary-color: #3498db;
  --primary-dark: #2980b9;
  --success-color: #2ecc71;
  --warning-color: #f39c12;
  --error-color: #e74c3c;
  --text-color: #2c3e50;
  --text-light: #7f8c8d;
  --bg-color: #ffffff;
  --bg-light: #f8f9fa;
  --border-color: #dee2e6;
  --shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  --border-radius: 12px;
  --header-height: 120px;
  --tab-height: 50px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background: var(--bg-light);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Loading Screen */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-color);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* App Layout */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: var(--bg-color);
  box-shadow: var(--shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
}

.header h1 {
  font-size: 1.5em;
  color: var(--text-color);
  font-weight: 600;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--success-color);
  transition: background 0.3s;
}

.status-indicator.offline {
  background: var(--error-color);
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  border-top: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  padding: 15px;
  background: none;
  border: none;
  color: var(--text-light);
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-btn:active {
  background: var(--bg-light);
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 20px;
  padding-bottom: 80px; /* Space for FAB */
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

/* Search Container */
.search-container {
  margin-bottom: 20px;
}

.search-input-container {
  display: flex;
  margin-bottom: 15px;
}

.search-input-container input {
  flex: 1;
  padding: 15px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius) 0 0 var(--border-radius);
  font-size: 16px;
  background: var(--bg-color);
}

.search-input-container input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.search-btn {
  padding: 15px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn:active {
  background: var(--primary-dark);
}

/* Quick References */
.quick-references {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.ref-btn {
  padding: 8px 16px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-color);
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.3s;
}

.ref-btn:active {
  background: var(--primary-color);
  color: white;
}

/* Scripture Content */
.verse-container {
  background: var(--bg-color);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

.verse-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.verse-header h3 {
  font-size: 1.3em;
  color: var(--text-color);
}

.verse-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:active {
  background: var(--bg-light);
  transform: scale(0.95);
}

/* Translation Switcher */
.translation-switcher {
  display: flex;
  margin-bottom: 20px;
  background: var(--bg-light);
  border-radius: 8px;
  padding: 4px;
}

.translation-btn {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-light);
  font-weight: 500;
  transition: all 0.3s;
}

.translation-btn.active {
  background: var(--bg-color);
  color: var(--text-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Scripture Text */
.scripture-text {
  font-size: 16px;
  line-height: 1.8;
}

.translation-content {
  margin-bottom: 20px;
}

.translation-content.ust-content {
  display: none;
}

.translation-content h4 {
  color: var(--text-light);
  font-size: 0.9em;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.key-term {
  background: rgba(52, 152, 219, 0.1);
  color: var(--primary-color);
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.key-term:active {
  background: rgba(52, 152, 219, 0.2);
}

/* Translation Editor */
.translation-workspace {
  background: var(--bg-color);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

.current-reference h3 {
  font-size: 1.2em;
  color: var(--text-color);
  margin-bottom: 20px;
  text-align: center;
}

.translation-editor label {
  display: block;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.translation-editor textarea {
  width: 100%;
  padding: 15px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  resize: none;
  min-height: 120px;
  background: var(--bg-color);
}

.translation-editor textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.editor-toolbar {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.tool-btn {
  padding: 12px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.tool-btn:active {
  background: var(--primary-dark);
}

/* Translation Status */
.translation-status {
  margin-top: 20px;
  padding: 15px;
  background: var(--bg-light);
  border-radius: 8px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-weight: 500;
  color: var(--text-light);
}

.status-value {
  color: var(--text-color);
}

.sync-status.pending {
  color: var(--warning-color);
}

.sync-status.synced {
  color: var(--success-color);
}

/* Helps */
.helps-container {
  background: var(--bg-color);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

.helps-nav {
  display: flex;
  margin-bottom: 20px;
  background: var(--bg-light);
  border-radius: 8px;
  padding: 4px;
}

.help-btn {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-light);
  font-weight: 500;
  transition: all 0.3s;
}

.help-btn.active {
  background: var(--bg-color);
  color: var(--text-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.help-content h4 {
  color: var(--text-color);
  margin-bottom: 15px;
  font-size: 1.1em;
}

.note-item,
.question-item {
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 15px;
  background: var(--bg-light);
}

.note-item:last-child,
.question-item:last-child {
  margin-bottom: 0;
}

.offline-message {
  text-align: center;
  color: var(--text-light);
  font-style: italic;
  padding: 40px 20px;
}

/* Word Search */
.word-search {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}

.word-search input {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
}

.word-search button {
  padding: 12px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Library */
.library-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--bg-color);
  padding: 20px;
  border-radius: var(--border-radius);
  text-align: center;
  box-shadow: var(--shadow);
}

.stat-card h4 {
  color: var(--text-light);
  font-size: 0.9em;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.8em;
  font-weight: 600;
  color: var(--primary-color);
}

.library-sections {
  background: var(--bg-color);
  border-radius: var(--border-radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.section-header h4 {
  color: var(--text-color);
  font-size: 1.1em;
}

.section-btn {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 20px;
}

.action-button {
  padding: 15px;
  background: var(--bg-light);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.action-button:active {
  background: var(--border-color);
}

/* Floating Action Button */
.fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
  z-index: 1000;
}

.fab:active {
  transform: scale(0.95);
  background: var(--primary-dark);
}

/* Bottom Sheet */
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-color);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 1001;
}

.bottom-sheet.open {
  transform: translateY(0);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  margin: 15px auto 20px;
}

.sheet-content {
  padding: 0 20px 20px;
}

.sheet-content h4 {
  color: var(--text-color);
  margin-bottom: 20px;
  text-align: center;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.quick-action {
  padding: 15px;
  background: var(--bg-light);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.quick-action:active {
  background: var(--border-color);
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
}

.toast {
  background: var(--text-color);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  transform: translateX(100%);
  opacity: 0;
  transition: all 0.3s ease;
  max-width: 300px;
  word-wrap: break-word;
}

.toast.show {
  transform: translateX(0);
  opacity: 1;
}

.toast-success {
  background: var(--success-color);
}

.toast-warning {
  background: var(--warning-color);
}

.toast-error {
  background: var(--error-color);
}

/* Install Prompt */
.install-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: var(--bg-color);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1500;
}

.prompt-content {
  padding: 20px;
}

.prompt-content h3 {
  color: var(--text-color);
  margin-bottom: 8px;
}

.prompt-content p {
  color: var(--text-light);
  margin-bottom: 20px;
  font-size: 0.9em;
}

.prompt-actions {
  display: flex;
  gap: 10px;
}

.prompt-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.prompt-btn.cancel {
  background: var(--bg-light);
  color: var(--text-color);
}

.prompt-btn.install {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.prompt-btn:active {
  transform: scale(0.98);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .main-content {
    padding: 15px;
  }

  .library-stats {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --text-color: #ffffff;
    --text-light: #a0a0a0;
    --bg-color: #1a1a1a;
    --bg-light: #2a2a2a;
    --border-color: #404040;
  }
}
```

## Step 9: Testing and Deployment

### Local Testing

```bash
# Start development server
npm start

# Test offline functionality
# 1. Load the app
# 2. Open DevTools > Application > Service Workers
# 3. Check "Offline" checkbox
# 4. Test app functionality
```

### Production Deployment

1. **Build optimization**
2. **Service worker precaching**
3. **CDN setup for assets**
4. **HTTPS enforcement**
5. **App store submission** (if desired)

---

**Congratulations!** You've built a comprehensive offline-first mobile translation app that works seamlessly offline, syncs data in the background, and provides a native app-like experience for field translators.
