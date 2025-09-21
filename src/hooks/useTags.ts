import { useState, useEffect } from 'react';
import { Tag } from '../types';
import { StorageManager } from '../lib/storage';

export function useTags() {
  const [tags, setTags] = useState<Record<string, Tag>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let storageManager: StorageManager | null = null;

  try {
    storageManager = StorageManager.getInstance();
  } catch (err) {
    console.error('Failed to initialize StorageManager:', err);
    setError('Storage initialization failed');
  }

  const loadTags = async () => {
    if (!storageManager) {
      setError('Storage manager not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await storageManager.getTags();
      setTags(data || {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();

    if (!storageManager) return;

    // Listen for storage changes
    const unsubscribe = storageManager.addListener((data) => {
      setTags(data.tags || {});
    });

    return unsubscribe;
  }, [storageManager]);

  const getTagList = () => {
    return Object.values(tags || {}).sort((a, b) => {
      // 首先按order排序（如果有）
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // 如果只有一个有order，有order的排在前面
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      // 都没有order，按count排序
      return b.count - a.count;
    });
  };

  const getTagNames = () => {
    return Object.values(tags || {}).map(tag => tag.name);
  };

  const getPopularTags = (limit = 10) => {
    return getTagList().slice(0, limit);
  };

  // 强制更新标签状态
  const forceUpdate = async () => {
    console.log('强制更新标签数据...');
    if (!storageManager) return;

    try {
      // 先清除缓存，确保获取最新数据
      storageManager.invalidateCache();
      const data = await storageManager.getTags();
      console.log('获取到新的标签数据:', data);
      setTags(data || {});
    } catch (err) {
      console.error('强制更新失败:', err);
    }
  };

  return {
    tags,
    loading,
    error,
    getTagList,
    getTagNames,
    getPopularTags,
    reload: loadTags,
    forceUpdate
  };
}