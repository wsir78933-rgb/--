// Service Worker for Smart Bookmark Extension
import { StorageManager } from '../lib/storage';

// Background script setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Smart Bookmark Extension installed/updated');

  // Initialize storage on first install
  if (details.reason === 'install') {
    try {
      const storageManager = StorageManager.getInstance();
      await storageManager.getData(); // This will initialize storage if needed
      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  // Create context menu
  chrome.contextMenus.create({
    id: 'smart-bookmark',
    title: '智能收藏此页面',
    contexts: ['page', 'link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'smart-bookmark' && tab) {
    try {
      const url = info.linkUrl || tab.url;
      const title = tab.title || 'Untitled';
      const favicon = tab.favIconUrl;

      if (!url) {
        console.error('No URL to bookmark');
        return;
      }

      // Open popup or handle bookmark creation
      chrome.action.openPopup();

      // Store the context info for the popup to use
      await chrome.storage.session.set({
        contextBookmark: {
          url,
          title,
          favicon
        }
      });

    } catch (error) {
      console.error('Failed to handle context menu click:', error);
    }
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-popup') {
    try {
      // Open the popup
      chrome.action.openPopup();
    } catch (error) {
      console.error('Failed to handle keyboard shortcut:', error);
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (_tab) => {
  try {
    // This shouldn't be called if popup is set, but keeping it as fallback
    chrome.action.openPopup();
  } catch (error) {
    console.error('Failed to handle action click:', error);
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'GET_CURRENT_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url && tab.title) {
          sendResponse({
            success: true,
            data: {
              url: tab.url,
              title: tab.title,
              favicon: tab.favIconUrl
            }
          });
        } else {
          sendResponse({
            success: false,
            error: 'No active tab found'
          });
        }
      });
      return true; // Keep the message channel open for async response

    case 'BOOKMARK_ADDED':
      // Optional: Show notification or update badge
      console.log('Bookmark added:', message.data);
      break;

    case 'GET_CONTEXT_BOOKMARK':
      chrome.storage.session.get('contextBookmark', (result) => {
        sendResponse({
          success: true,
          data: result.contextBookmark || null
        });
      });
      return true;

    case 'CLEAR_CONTEXT_BOOKMARK':
      chrome.storage.session.remove('contextBookmark', () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Handle storage errors
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    console.log('Storage changed:', changes);
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Smart Bookmark Extension started');
});

// Handle uninstall
chrome.runtime.setUninstallURL('https://feedback-form-url.com', () => {
  console.log('Uninstall URL set');
});

// Export for type checking (won't be executed)
export {};