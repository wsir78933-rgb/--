import { useState, useEffect } from 'react';

interface TabInfo {
  url: string;
  title: string;
  favicon?: string;
}

export function useCurrentTab() {
  const [currentTab, setCurrentTab] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        setLoading(true);

        // Check if we're in a Chrome extension context
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

          if (tab && tab.url && tab.title) {
            setCurrentTab({
              url: tab.url,
              title: tab.title,
              favicon: tab.favIconUrl
            });
          } else {
            setError('No active tab found');
          }
        } else {
          // Fallback for development or non-extension environments
          setCurrentTab({
            url: window.location.href,
            title: document.title,
            favicon: document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href
          });
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get current tab');
      } finally {
        setLoading(false);
      }
    };

    getCurrentTab();
  }, []);

  const refreshTab = () => {
    setLoading(true);
    setError(null);

    const getCurrentTab = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

          if (tab && tab.url && tab.title) {
            setCurrentTab({
              url: tab.url,
              title: tab.title,
              favicon: tab.favIconUrl
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to refresh tab');
      } finally {
        setLoading(false);
      }
    };

    getCurrentTab();
  };

  return {
    currentTab,
    loading,
    error,
    refreshTab
  };
}