import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '../types';
import { StorageManager } from '../lib/storage';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageManager = StorageManager.getInstance();

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const data = await storageManager.getBookmarks();
      setBookmarks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();

    // Listen for storage changes
    const unsubscribe = storageManager.addListener((data) => {
      const activeBookmarks = data.bookmarks.filter(b => !b.deleted);
      setBookmarks(activeBookmarks);
    });

    return unsubscribe;
  }, [storageManager]);

  const addBookmark = useCallback(async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    try {
      await storageManager.addBookmark(bookmark);
      // Bookmarks will be updated via the storage listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bookmark');
      throw err;
    }
  }, [storageManager]);

  const updateBookmark = useCallback(async (id: string, updates: Partial<Bookmark>) => {
    try {
      await storageManager.updateBookmark(id, updates);
      // Bookmarks will be updated via the storage listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bookmark');
      throw err;
    }
  }, [storageManager]);

  const deleteBookmark = useCallback(async (id: string) => {
    try {
      await storageManager.deleteBookmark(id);
      // Bookmarks will be updated via the storage listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
      throw err;
    }
  }, [storageManager]);

  const searchBookmarks = useCallback(async (query: string, tags?: string[]) => {
    try {
      const results = await storageManager.searchBookmarks(query, tags);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search bookmarks');
      return [];
    }
  }, [storageManager]);

  return {
    bookmarks,
    loading,
    error,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    searchBookmarks,
    reload: loadBookmarks
  };
}