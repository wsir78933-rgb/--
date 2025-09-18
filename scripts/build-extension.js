import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Ensure dist directories exist
const dirs = [
  'dist',
  'dist/popup',
  'dist/options',
  'dist/background',
  'dist/content',
  'dist/icons'
];

dirs.forEach(dir => {
  const fullPath = join(projectRoot, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
});

// Copy HTML files
copyFileSync(
  join(projectRoot, 'dist/src/popup/index.html'),
  join(projectRoot, 'dist/popup/index.html')
);

copyFileSync(
  join(projectRoot, 'dist/src/options/index.html'),
  join(projectRoot, 'dist/options/index.html')
);

// Copy JS files from assets
const distDir = join(projectRoot, 'dist/assets');
const files = readdirSync(distDir);

files.forEach(file => {
  if (file.includes('popup') && file.endsWith('.js')) {
    copyFileSync(
      join(distDir, file),
      join(projectRoot, 'dist/popup/popup.js')
    );
  }
  if (file.includes('options') && file.endsWith('.js')) {
    copyFileSync(
      join(distDir, file),
      join(projectRoot, 'dist/options/options.js')
    );
  }
  if (file.includes('globals') && file.endsWith('.js')) {
    copyFileSync(
      join(distDir, file),
      join(projectRoot, 'dist/popup/globals.js')
    );
    copyFileSync(
      join(distDir, file),
      join(projectRoot, 'dist/options/globals.js')
    );
  }
  if (file.endsWith('.css')) {
    copyFileSync(
      join(distDir, file),
      join(projectRoot, 'dist/popup/styles.css')
    );
    copyFileSync(
      join(distDir, file),
      join(projectRoot, 'dist/options/styles.css')
    );
  }
});

// Copy icons
const iconsSource = join(projectRoot, 'public/icons');
const iconsDest = join(projectRoot, 'dist/icons');

if (existsSync(iconsSource)) {
  const iconFiles = readdirSync(iconsSource);
  iconFiles.forEach(file => {
    if (file.endsWith('.png')) {
      copyFileSync(
        join(iconsSource, file),
        join(iconsDest, file)
      );
    }
  });
}

// Create a simple service worker
const serviceWorkerCode = `
// Service Worker for Smart Bookmark Extension
console.log('Smart Bookmark Extension - Service Worker Loaded');

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  // Initialize storage
  const storage = await chrome.storage.local.get(['bookmarks', 'tags', 'settings']);

  if (!storage.bookmarks) {
    await chrome.storage.local.set({ bookmarks: [] });
  }

  if (!storage.tags) {
    await chrome.storage.local.set({ tags: {} });
  }

  if (!storage.settings) {
    await chrome.storage.local.set({
      settings: {
        version: chrome.runtime.getManifest().version,
        theme: 'auto',
        dashboardCollapsed: false
      }
    });
  }

  // Create context menu
  chrome.contextMenus.create({
    id: 'quick-save',
    title: '快速收藏此页',
    contexts: ['page']
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.type) {
        case 'GET_BOOKMARKS':
          const bookmarks = await chrome.storage.local.get('bookmarks');
          sendResponse({ success: true, data: bookmarks.bookmarks || [] });
          break;

        case 'SAVE_BOOKMARK':
          const current = await chrome.storage.local.get('bookmarks');
          const list = current.bookmarks || [];
          list.push(request.bookmark);
          await chrome.storage.local.set({ bookmarks: list });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true;
});
`;

// Write service worker
import { writeFileSync } from 'fs';
writeFileSync(
  join(projectRoot, 'dist/background/service-worker.js'),
  serviceWorkerCode
);

// Create content script
const contentScriptCode = `
// Content Script for Smart Bookmark Extension
console.log('Smart Bookmark Extension - Content Script Loaded');

// Listen for messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_INFO') {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
    };
    sendResponse(pageInfo);
  }
});
`;

writeFileSync(
  join(projectRoot, 'dist/content/content.js'),
  contentScriptCode
);

// Update manifest to use correct paths
const manifestPath = join(projectRoot, 'dist/manifest.json');
const manifest = {
  "manifest_version": 3,
  "name": "智能收藏助手",
  "version": "1.0.0",
  "description": "现代化的网页收藏管理工具",

  "permissions": [
    "storage",
    "tabs",
    "contextMenus",
    "notifications",
    "alarms"
  ],

  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ],

  "background": {
    "service_worker": "background/service-worker.js"
  },

  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "default_title": "智能收藏助手"
  },

  "options_page": "options/index.html",

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ],

  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },

  "web_accessible_resources": [
    {
      "resources": ["popup/*", "options/*", "icons/*"],
      "matches": ["<all_urls>"]
    }
  ]
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('Extension build complete!');
console.log('The extension is ready in the dist/ folder');