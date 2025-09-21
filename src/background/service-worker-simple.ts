// Service Worker for Smart Bookmark Extension
// Simplified version without module imports to avoid build issues

// Helper function to get storage data
async function getStorageData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['bookmarks', 'tags'], (result) => {
      resolve({
        bookmarks: result.bookmarks || [],
        tags: result.tags || []
      });
    });
  });
}

// Helper function to save bookmark
async function saveBookmark(bookmarkData: any) {
  const storageData = await getStorageData() as any;
  const bookmarks = storageData.bookmarks;

  const newBookmark = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...bookmarkData
  };

  bookmarks.push(newBookmark);

  await chrome.storage.local.set({ bookmarks });
  return newBookmark;
}

// Background script setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Smart Bookmark Extension installed/updated');

  // Initialize storage on first install
  if (details.reason === 'install') {
    try {
      await chrome.storage.local.set({
        bookmarks: [],
        tags: []
      });
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

  // Create direct bookmark context menu
  chrome.contextMenus.create({
    id: 'quick-bookmark',
    title: '🔖 快速收藏',
    contexts: ['page', 'link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;

  try {
    const url = info.linkUrl || tab.url;
    const title = tab.title || 'Untitled';
    const favicon = tab.favIconUrl;

    if (!url) {
      console.error('No URL to bookmark');
      return;
    }

    if (info.menuItemId === 'smart-bookmark') {
      // Open popup for advanced bookmarking
      chrome.action.openPopup();

      // Store the context info for the popup to use
      await chrome.storage.session.set({
        contextBookmark: {
          url,
          title,
          favicon
        }
      });

    } else if (info.menuItemId === 'quick-bookmark') {
      // Quick bookmark with default settings
      try {
        const storageData = await getStorageData() as any;
        const bookmarks = storageData.bookmarks;

        // Check if already exists
        const existingBookmark = bookmarks.find((b: any) => b.url === url);
        if (existingBookmark) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: '收藏提醒',
            message: `"${title}" 已经收藏过了！`
          });
          return;
        }

        // Create new bookmark
        const newBookmark = await saveBookmark({
          url,
          title,
          note: '',
          tags: ['快速收藏'],
          favicon
        });

        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
          title: '收藏成功',
          message: `已收藏: ${title}`
        });

        console.log('Quick bookmark created:', newBookmark);

      } catch (error) {
        console.error('Failed to create quick bookmark:', error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
          title: '收藏失败',
          message: '收藏时出现错误，请稍后重试'
        });
      }
    }

  } catch (error) {
    console.error('Failed to handle context menu click:', error);
  }
});

// Handle keyboard shortcuts - Check if chrome.commands exists
if (chrome.commands && chrome.commands.onCommand) {
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
} else {
  console.warn('chrome.commands API not available');
}

// Handle extension icon click - only when popup is not set
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

// Export for type checking
export {};