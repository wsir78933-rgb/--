import { useState, useEffect } from 'react';
import { Tag } from '../types';
import { StorageManager } from '../lib/storage';

export function useTags() {
  const [tags, setTags] = useState<Record<string, Tag>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageManager = StorageManager.getInstance();

  const loadTags = async () => {
    try {
      setLoading(true);
      const data = await storageManager.getTags();
      setTags(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();

    // Listen for storage changes
    const unsubscribe = storageManager.addListener((data) => {
      setTags(data.tags);
    });

    return unsubscribe;
  }, [storageManager]);

  const getTagList = () => {
    return Object.values(tags).sort((a, b) => b.count - a.count);
  };

  const getTagNames = () => {
    return Object.values(tags).map(tag => tag.name);
  };

  const getPopularTags = (limit = 10) => {
    return getTagList().slice(0, limit);
  };

  return {
    tags,
    loading,
    error,
    getTagList,
    getTagNames,
    getPopularTags,
    reload: loadTags
  };
}