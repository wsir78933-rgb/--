import { Bookmark, Tag, StorageData } from '../types';
import { generateId, normalizeTag, DEFAULT_TAGS } from './utils';

export class StorageManager {
  private static instance: StorageManager;
  private storage: chrome.storage.StorageArea;
  private cache: StorageData | null = null;
  private listeners: Set<(data: StorageData) => void> = new Set();

  private constructor() {
    // 检查Chrome API是否可用
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      this.storage = chrome.storage.local;
    } else {
      throw new Error('Chrome storage API is not available');
    }
    this.initializeStorage();
    this.setupStorageListener();
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      try {
        StorageManager.instance = new StorageManager();
      } catch (error) {
        console.error('Failed to create StorageManager instance:', error);
        throw error;
      }
    }
    return StorageManager.instance;
  }

  private async initializeStorage(): Promise<void> {
    try {
      const data = await this.storage.get(null);
      if (!data || !data.bookmarks || !data.tags || !data.settings) {
        // 创建预设标签
        const defaultTagsData: Record<string, Tag> = {};
        DEFAULT_TAGS.forEach(tagName => {
          const normalizedTag = normalizeTag(tagName);
          defaultTagsData[normalizedTag] = {
            id: generateId(),
            name: tagName,
            count: 0,
            createdAt: new Date().toISOString()
          };
        });

        const initialData: StorageData = {
          bookmarks: [],
          tags: defaultTagsData,
          settings: {
            version: '1.0.0',
            theme: 'auto',
            dashboardCollapsed: false
          }
        };
        await this.storage.set(initialData);
        this.cache = initialData;
      } else {
        // 验证和修复数据格式
        let needsUpdate = false;

        // 确保 bookmarks 是数组格式
        if (!Array.isArray(data.bookmarks)) {
          console.warn('Invalid bookmarks format detected, converting to array');
          if (typeof data.bookmarks === 'object' && data.bookmarks !== null) {
            // 如果是对象格式，转换为数组
            data.bookmarks = Object.values(data.bookmarks);
          } else {
            // 如果不是有效格式，初始化为空数组
            data.bookmarks = [];
          }
          needsUpdate = true;
        }

        // 确保 tags 是对象格式
        if (!data.tags || typeof data.tags !== 'object') {
          console.warn('Invalid tags format detected, initializing');
          data.tags = {};
          needsUpdate = true;
        }

        // 确保 settings 存在
        if (!data.settings || typeof data.settings !== 'object') {
          data.settings = {
            version: '1.0.0',
            theme: 'auto',
            dashboardCollapsed: false
          };
          needsUpdate = true;
        }

        this.cache = data as StorageData;

        // 检查并添加缺失的预设标签
        DEFAULT_TAGS.forEach(tagName => {
          const normalizedTag = normalizeTag(tagName);
          if (!this.cache!.tags[normalizedTag]) {
            this.cache!.tags[normalizedTag] = {
              id: generateId(),
              name: tagName,
              count: 0,
              createdAt: new Date().toISOString()
            };
            needsUpdate = true;
          }
        });

        // 重新计算标签统计以确保准确性
        const tagCounts: Record<string, number> = {};
        this.cache.bookmarks.forEach(bookmark => {
          if (bookmark.tags && Array.isArray(bookmark.tags)) {
            bookmark.tags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });

        // 更新标签计数
        Object.values(this.cache.tags).forEach(tag => {
          const newCount = tagCounts[tag.name] || 0;
          if (tag.count !== newCount) {
            tag.count = newCount;
            needsUpdate = true;
          }
        });

        if (needsUpdate) {
          console.log('Updating storage with corrected data format');
          await this.storage.set(this.cache);
        }
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      // 创建最小化的默认数据作为回退
      const fallbackData: StorageData = {
        bookmarks: [],
        tags: {},
        settings: {
          version: '1.0.0',
          theme: 'auto',
          dashboardCollapsed: false
        }
      };
      this.cache = fallbackData;
      try {
        await this.storage.set(fallbackData);
      } catch (setError) {
        console.error('Failed to set fallback data:', setError);
      }
    }
  }

  private setupStorageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((_changes, namespace) => {
        if (namespace === 'local') {
          this.invalidateCache();
          this.getData().then(data => {
            this.notifyListeners(data);
          }).catch(error => {
            console.error('Failed to get data in storage listener:', error);
          });
        }
      });
    }
  }

  public invalidateCache(): void {
    this.cache = null;
  }

  private notifyListeners(data: StorageData): void {
    this.listeners.forEach(listener => listener(data));
  }

  public addListener(listener: (data: StorageData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async getData(): Promise<StorageData> {
    if (!this.cache) {
      const data = await this.storage.get(null);
      // 验证数据完整性，确保所有必要字段存在
      if (!data || !data.bookmarks || !data.tags || !data.settings) {
        // 如果数据不完整，重新初始化
        await this.initializeStorage();
      } else {
        // 额外的数据格式验证
        let needsUpdate = false;

        // 确保 bookmarks 是数组格式
        if (!Array.isArray(data.bookmarks)) {
          console.warn('getData: Invalid bookmarks format detected, converting to array');
          if (typeof data.bookmarks === 'object' && data.bookmarks !== null) {
            data.bookmarks = Object.values(data.bookmarks);
          } else {
            data.bookmarks = [];
          }
          needsUpdate = true;
        }

        // 确保 tags 是对象格式
        if (!data.tags || typeof data.tags !== 'object') {
          console.warn('getData: Invalid tags format detected');
          data.tags = {};
          needsUpdate = true;
        }

        this.cache = data as StorageData;

        // 如果数据格式有问题，更新存储
        if (needsUpdate) {
          console.log('getData: Updating storage with corrected format');
          await this.storage.set(this.cache);
        }
      }
    }
    return this.cache!;
  }

  public async getBookmarks(): Promise<Bookmark[]> {
    const data = await this.getData();

    // 额外的安全检查，确保 bookmarks 是数组
    if (!Array.isArray(data.bookmarks)) {
      console.error('getBookmarks: bookmarks is not an array, returning empty array');
      return [];
    }

    return data.bookmarks.filter(bookmark => bookmark && !bookmark.deleted);
  }

  public async getTags(): Promise<Record<string, Tag>> {
    const data = await this.getData();
    return data.tags || {};
  }

  public async addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<Bookmark> {
    const data = await this.getData();
    const newBookmark: Bookmark = {
      ...bookmark,
      id: generateId(),
      createdAt: new Date().toISOString()
    };

    data.bookmarks.push(newBookmark);

    // Update tag counts
    for (const tagName of bookmark.tags) {
      const normalizedTag = normalizeTag(tagName);
      if (!data.tags[normalizedTag]) {
        data.tags[normalizedTag] = {
          id: generateId(),
          name: tagName,
          count: 0,
          createdAt: new Date().toISOString()
        };
      }
      data.tags[normalizedTag].count++;
    }

    await this.storage.set(data);
    this.cache = data;
    return newBookmark;
  }

  public async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<void> {
    const data = await this.getData();
    const bookmarkIndex = data.bookmarks.findIndex(b => b.id === id);

    if (bookmarkIndex === -1) {
      throw new Error('Bookmark not found');
    }

    const oldBookmark = data.bookmarks[bookmarkIndex];
    const updatedBookmark = {
      ...oldBookmark,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Update tag counts if tags changed
    if (updates.tags) {
      // Decrease count for old tags
      for (const tagName of oldBookmark.tags) {
        const normalizedTag = normalizeTag(tagName);
        if (data.tags[normalizedTag]) {
          data.tags[normalizedTag].count--;
          if (data.tags[normalizedTag].count <= 0) {
            delete data.tags[normalizedTag];
          }
        }
      }

      // Increase count for new tags
      for (const tagName of updates.tags) {
        const normalizedTag = normalizeTag(tagName);
        if (!data.tags[normalizedTag]) {
          data.tags[normalizedTag] = {
            id: generateId(),
            name: tagName,
            count: 0,
            createdAt: new Date().toISOString()
          };
        }
        data.tags[normalizedTag].count++;
      }
    }

    data.bookmarks[bookmarkIndex] = updatedBookmark;
    await this.storage.set(data);
    this.cache = data;
  }

  public async deleteBookmark(id: string): Promise<void> {
    const data = await this.getData();
    const bookmarkIndex = data.bookmarks.findIndex(b => b.id === id);

    if (bookmarkIndex === -1) {
      throw new Error('Bookmark not found');
    }

    const bookmark = data.bookmarks[bookmarkIndex];

    // Soft delete
    bookmark.deleted = true;
    bookmark.deletedAt = new Date().toISOString();

    // Update tag counts
    for (const tagName of bookmark.tags) {
      const normalizedTag = normalizeTag(tagName);
      if (data.tags[normalizedTag]) {
        data.tags[normalizedTag].count--;
        if (data.tags[normalizedTag].count <= 0) {
          delete data.tags[normalizedTag];
        }
      }
    }

    await this.storage.set(data);
    this.cache = data;
  }

  public async searchBookmarks(query: string, tags?: string[]): Promise<Bookmark[]> {
    const bookmarks = await this.getBookmarks();
    const lowercaseQuery = query.toLowerCase();

    return bookmarks.filter(bookmark => {
      const matchesQuery = !query ||
        bookmark.title.toLowerCase().includes(lowercaseQuery) ||
        bookmark.url.toLowerCase().includes(lowercaseQuery) ||
        bookmark.note.toLowerCase().includes(lowercaseQuery);

      const matchesTags = !tags || tags.length === 0 ||
        tags.every(tag => bookmark.tags.some(bookmarkTag =>
          normalizeTag(bookmarkTag) === normalizeTag(tag)
        ));

      return matchesQuery && matchesTags;
    });
  }

  public async exportToJSON(): Promise<string> {
    const data = await this.getData();
    return JSON.stringify({
      bookmarks: data.bookmarks.filter(b => !b.deleted),
      tags: data.tags,
      exportedAt: new Date().toISOString(),
      version: data.settings.version
    }, null, 2);
  }

  public async exportToCSV(): Promise<string> {
    const bookmarks = await this.getBookmarks();
    const headers = ['Title', 'URL', 'Note', 'Tags', 'Created At'];
    const rows = bookmarks.map(bookmark => [
      bookmark.title,
      bookmark.url,
      bookmark.note,
      bookmark.tags.join('; '),
      bookmark.createdAt
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  public async importFromJSON(jsonData: string): Promise<{ imported: number; errors: string[] }> {
    try {
      const importData = JSON.parse(jsonData);
      let imported = 0;
      const errors: string[] = [];

      if (importData.bookmarks && Array.isArray(importData.bookmarks)) {
        for (const bookmark of importData.bookmarks) {
          try {
            await this.addBookmark({
              url: bookmark.url,
              title: bookmark.title || 'Untitled',
              note: bookmark.note || '',
              tags: bookmark.tags || [],
              favicon: bookmark.favicon
            });
            imported++;
          } catch (error) {
            errors.push(`Failed to import bookmark: ${bookmark.title || bookmark.url}`);
          }
        }
      }

      return { imported, errors };
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  public async clearAllData(): Promise<void> {
    const initialData: StorageData = {
      bookmarks: [],
      tags: {},
      settings: {
        version: '1.0.0',
        theme: 'auto',
        dashboardCollapsed: false
      }
    };

    await this.storage.clear();
    await this.storage.set(initialData);
    this.cache = initialData;
  }
}