import { Bookmark, Tag, StorageData } from '../types';
import { generateId, normalizeTag, DEFAULT_TAGS } from './utils';

export class StorageManager {
  private static instance: StorageManager;
  private storage: chrome.storage.StorageArea;
  private cache: StorageData | null = null;
  private listeners: Set<(data: StorageData) => void> = new Set();

  private constructor() {
    this.storage = chrome.storage.local;
    this.initializeStorage();
    this.setupStorageListener();
  }

  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private async initializeStorage(): Promise<void> {
    const data = await this.storage.get(null);
    if (!data.bookmarks || !data.tags || !data.settings) {
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
      this.cache = data as StorageData;

      // 检查并添加缺失的预设标签
      let needsUpdate = false;
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

      if (needsUpdate) {
        await this.storage.set(this.cache);
      }
    }
  }

  private setupStorageListener(): void {
    chrome.storage.onChanged.addListener((_changes, namespace) => {
      if (namespace === 'local') {
        this.invalidateCache();
        this.getData().then(data => {
          this.notifyListeners(data);
        });
      }
    });
  }

  private invalidateCache(): void {
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
      this.cache = data as StorageData;
    }
    return this.cache;
  }

  public async getBookmarks(): Promise<Bookmark[]> {
    const data = await this.getData();
    return data.bookmarks.filter(bookmark => !bookmark.deleted);
  }

  public async getTags(): Promise<Record<string, Tag>> {
    const data = await this.getData();
    return data.tags;
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