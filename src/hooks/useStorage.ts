import { useState, useEffect } from 'react';
import { StorageData } from '../types';
import { StorageManager } from '../lib/storage';

export function useStorage() {
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storageManager = StorageManager.getInstance();

    const loadData = async () => {
      try {
        setLoading(true);
        const storageData = await storageManager.getData();
        setData(storageData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen for storage changes
    const unsubscribe = storageManager.addListener(setData);

    return unsubscribe;
  }, []);

  return {
    data,
    loading,
    error,
    reload: () => {
      setLoading(true);
      StorageManager.getInstance().getData().then(setData).finally(() => setLoading(false));
    }
  };
}