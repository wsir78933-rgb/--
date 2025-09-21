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
    // 不在构造函数中初始化，避免每次创建实例都重新初始化
    // this.initializeStorage(); // 移除：这会导致标签被重新创建
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
    console.log('🔧 [StorageManager] 开始初始化存储...');
    try {
      const data = await this.storage.get(null);
      console.log('🔧 [StorageManager] 获取到原始数据:', {
        hasBookmarks: !!data?.bookmarks,
        hasSettings: !!data?.settings,
        hasTags: !!data?.tags,
        tagCount: data?.tags ? Object.keys(data.tags).length : 0
      });

      if (!data || !data.bookmarks || !data.tags || !data.settings) {
        console.log('🔧 [StorageManager] 数据不完整，创建初始数据...');

        // 保留现有的 deletedDefaultTags 记录
        const existingDeletedDefaultTags = data?.deletedDefaultTags || [];
        console.log('🗑️ [StorageManager] 保留已删除的默认标签记录:', existingDeletedDefaultTags);

        // 创建预设标签，但跳过已删除的
        const defaultTagsData: Record<string, Tag> = {};
        DEFAULT_TAGS.forEach(tagName => {
          const normalizedTag = normalizeTag(tagName);

          // 检查是否已被用户删除（检查原始名称和规范化名称）
          if (existingDeletedDefaultTags.includes(tagName) || existingDeletedDefaultTags.includes(normalizedTag)) {
            console.log(`🚫 [StorageManager] 跳过已删除的默认标签: ${tagName} (规范化: ${normalizedTag})`);
            return;
          }
          console.log(`🏷️ [StorageManager] 创建默认标签: ${tagName} -> ${normalizedTag}`);
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
          deletedDefaultTags: existingDeletedDefaultTags, // 保留删除记录
          settings: {
            version: '1.0.0',
            theme: 'auto',
            dashboardCollapsed: false
          }
        };
        console.log('💾 [StorageManager] 保存初始数据到存储...');
        await this.storage.set(initialData);
        this.cache = initialData;
        console.log('✅ [StorageManager] 初始化完成，创建了默认标签');
      } else {
        console.log('🔧 [StorageManager] 数据完整，进行验证和修复...');
        // 验证和修复数据格式
        let needsUpdate = false;

        // 确保 bookmarks 是数组格式
        if (!Array.isArray(data.bookmarks)) {
          console.warn('⚠️ [StorageManager] 书签格式错误，转换为数组');
          if (typeof data.bookmarks === 'object' && data.bookmarks !== null) {
            data.bookmarks = Object.values(data.bookmarks);
          } else {
            data.bookmarks = [];
          }
          needsUpdate = true;
        }

        // 确保 tags 是对象格式
        if (!data.tags || typeof data.tags !== 'object') {
          console.warn('⚠️ [StorageManager] 标签格式错误，重新初始化');
          data.tags = {};
          needsUpdate = true;
        }

        // 确保 settings 存在
        if (!data.settings || typeof data.settings !== 'object') {
          console.log('🔧 [StorageManager] 设置不存在，创建默认设置');
          data.settings = {
            version: '1.0.0',
            theme: 'auto',
            dashboardCollapsed: false
          };
          needsUpdate = true;
        }

        this.cache = data as StorageData;
        console.log('📊 [StorageManager] 当前数据状态:', {
          bookmarkCount: this.cache.bookmarks.length,
          tagCount: Object.keys(this.cache.tags).length,
          existingTags: Object.keys(this.cache.tags)
        });

        // 确保删除记录存在
        if (!this.cache.deletedDefaultTags) {
          this.cache.deletedDefaultTags = [];
        }

        // 检查并添加缺失的预设标签
        console.log('🔍 [StorageManager] 检查默认标签...');
        console.log('🗑️ [StorageManager] 已删除的默认标签:', this.cache.deletedDefaultTags);

        DEFAULT_TAGS.forEach(tagName => {
          const normalizedTag = normalizeTag(tagName);

          // 检查是否已被用户删除（检查原始名称和规范化名称）
          const normalizedTagCheck = normalizeTag(tagName);
          if (this.cache!.deletedDefaultTags!.includes(tagName) || this.cache!.deletedDefaultTags!.includes(normalizedTagCheck)) {
            console.log(`🚫 [StorageManager] 跳过已删除的默认标签: ${tagName} (规范化: ${normalizedTagCheck})`);
            return;
          }

          if (!this.cache!.tags[normalizedTag]) {
            console.log(`➕ [StorageManager] 添加缺失的默认标签: ${tagName} -> ${normalizedTag}`);
            this.cache!.tags[normalizedTag] = {
              id: generateId(),
              name: tagName,
              count: 0,
              createdAt: new Date().toISOString()
            };
            needsUpdate = true;
          } else {
            console.log(`✅ [StorageManager] 默认标签已存在: ${tagName}`);
          }
        });

        // 重新计算标签统计以确保准确性
        console.log('📊 [StorageManager] 重新计算标签统计...');
        const tagCounts: Record<string, number> = {};
        this.cache.bookmarks.forEach((bookmark, index) => {
          if (bookmark.tags && Array.isArray(bookmark.tags)) {
            console.log(`📝 [StorageManager] 书签${index + 1} "${bookmark.title}" 的标签:`, bookmark.tags);
            bookmark.tags.forEach(tag => {
              // 只统计仍然存在于标签列表中的标签
              const normalizedTag = normalizeTag(tag);
              if (this.cache!.tags[normalizedTag]) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                console.log(`📊 [StorageManager] 标签 "${tag}" 计数: ${tagCounts[tag]}`);
              } else {
                console.warn(`⚠️ [StorageManager] 书签中的标签 "${tag}" 在标签列表中不存在`);
              }
            });
          }
        });

        console.log('📊 [StorageManager] 统计结果:', tagCounts);

        // 更新标签计数，并清理计数为0的标签
        console.log('🔄 [StorageManager] 更新标签计数...');
        Object.values(this.cache.tags).forEach(tag => {
          const newCount = tagCounts[tag.name] || 0;
          const oldCount = tag.count;
          if (tag.count !== newCount) {
            console.log(`🔄 [StorageManager] 标签 "${tag.name}" 计数更新: ${oldCount} -> ${newCount}`);
            tag.count = newCount;
            needsUpdate = true;
          }
        });

        // 移除计数为0的标签
        console.log('🗑️ [StorageManager] 清理计数为0的标签...');
        Object.keys(this.cache.tags).forEach(tagKey => {
          const tag = this.cache!.tags[tagKey];
          if (tag.count === 0) {
            console.log(`🗑️ [StorageManager] 删除计数为0的标签: "${tag.name}" (${tagKey})`);
            delete this.cache!.tags[tagKey];
            needsUpdate = true;
          }
        });

        if (needsUpdate) {
          console.log('💾 [StorageManager] 数据已修复，更新存储...');
          await this.storage.set(this.cache);
          console.log('✅ [StorageManager] 存储更新完成');
        } else {
          console.log('✅ [StorageManager] 数据无需更新');
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
      let isProcessing = false; // 防止重复处理

      chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && !isProcessing) {
          isProcessing = true;
          console.log('🔄 [StorageListener] 存储发生变化:', {
            hasTagChanges: !!changes.tags,
            hasBookmarkChanges: !!changes.bookmarks,
            changeKeys: Object.keys(changes)
          });

          if (changes.tags) {
            console.log('🏷️ [StorageListener] 标签数据变化详情:', {
              oldTagCount: changes.tags.oldValue ? Object.keys(changes.tags.oldValue).length : 0,
              newTagCount: changes.tags.newValue ? Object.keys(changes.tags.newValue).length : 0,
              oldTags: changes.tags.oldValue ? Object.keys(changes.tags.oldValue) : [],
              newTags: changes.tags.newValue ? Object.keys(changes.tags.newValue) : []
            });
          }

          try {
            // 立即清除缓存
            console.log('🗑️ [StorageListener] 清除缓存...');
            this.invalidateCache();

            // 直接从存储获取数据，不触发 getData() 的初始化逻辑
            console.log('📖 [StorageListener] 获取最新存储数据...');
            const rawData = await this.storage.get(null);
            this.cache = rawData as StorageData;

            console.log('📊 [StorageListener] 获取到的数据:', {
              tagCount: Object.keys(this.cache.tags || {}).length,
              bookmarkCount: (this.cache.bookmarks || []).length,
              tags: Object.keys(this.cache.tags || {})
            });

            console.log('📢 [StorageListener] 通知UI组件更新...');
            // 立即通知所有监听器
            this.notifyListeners(this.cache);
          } catch (error) {
            console.error('❌ [StorageListener] 处理存储变化失败:', error);
          } finally {
            // 短暂延迟后重置处理状态
            setTimeout(() => {
              console.log('✅ [StorageListener] 处理完成，重置状态');
              isProcessing = false;
            }, 100);
          }
        } else if (isProcessing) {
          console.log('⏳ [StorageListener] 正在处理中，跳过此次变化');
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
    console.log('📖 [getData] 开始获取数据，缓存状态:', !!this.cache);

    if (!this.cache) {
      console.log('📖 [getData] 缓存为空，从存储获取数据...');
      const data = await this.storage.get(null);

      console.log('📖 [getData] 原始数据检查:', {
        hasData: !!data,
        hasBookmarks: !!data?.bookmarks,
        hasTags: !!data?.tags,
        hasSettings: !!data?.settings,
        tagCount: data?.tags ? Object.keys(data.tags).length : 0
      });

      // 验证数据完整性，确保所有必要字段存在
      if (!data || !data.bookmarks || !data.tags || !data.settings) {
        console.log('📖 [getData] 数据不完整，调用初始化...');
        // 如果数据不完整，重新初始化
        await this.initializeStorage();
      } else {
        console.log('📖 [getData] 数据完整，进行格式验证...');
        // 额外的数据格式验证
        let needsUpdate = false;

        // 确保 bookmarks 是数组格式
        if (!Array.isArray(data.bookmarks)) {
          console.warn('⚠️ [getData] 书签格式无效，转换为数组');
          if (typeof data.bookmarks === 'object' && data.bookmarks !== null) {
            data.bookmarks = Object.values(data.bookmarks);
          } else {
            data.bookmarks = [];
          }
          needsUpdate = true;
        }

        // 确保 tags 是对象格式
        if (!data.tags || typeof data.tags !== 'object') {
          console.warn('⚠️ [getData] 标签格式无效');
          data.tags = {};
          needsUpdate = true;
        }

        this.cache = data as StorageData;
        console.log('📊 [getData] 缓存已设置，数据概况:', {
          bookmarkCount: this.cache.bookmarks.length,
          tagCount: Object.keys(this.cache.tags).length,
          tags: Object.keys(this.cache.tags)
        });

        // 🚨 移除标签重新计算逻辑以避免循环
        // 不再在 getData 中重新计算标签，只在真正的初始化时计算

        // 如果数据格式有问题，更新存储
        if (needsUpdate) {
          console.log('💾 [getData] 数据格式已修复，更新存储...');
          await this.storage.set(this.cache);
          console.log('✅ [getData] 存储更新完成');
        }
      }
    } else {
      console.log('✅ [getData] 使用缓存数据，标签数量:', Object.keys(this.cache.tags).length);
    }

    console.log('📖 [getData] 返回数据，最终标签列表:', Object.keys(this.cache!.tags));
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

  public async createTag(tagName: string): Promise<Tag> {
    const data = await this.getData();
    const normalizedTag = normalizeTag(tagName);

    if (data.tags[normalizedTag]) {
      throw new Error('Tag already exists');
    }

    const newTag: Tag = {
      id: generateId(),
      name: tagName,
      count: 0,
      createdAt: new Date().toISOString()
    };

    data.tags[normalizedTag] = newTag;
    await this.storage.set(data);
    this.cache = data;

    return newTag;
  }

  public async deleteTag(tagName: string): Promise<void> {
    console.log(`🗑️ [deleteTag] 开始删除标签: ${tagName}`);
    const data = await this.getData();
    const normalizedTag = normalizeTag(tagName);

    if (!data.tags[normalizedTag]) {
      console.error(`❌ [deleteTag] 标签不存在: ${tagName}`);
      throw new Error('Tag not found');
    }

    console.log(`🗑️ [deleteTag] 找到标签，准备删除: ${normalizedTag}`);

    // 删除标签
    delete data.tags[normalizedTag];

    // 如果是默认标签，记录到删除列表
    if (!data.deletedDefaultTags) {
      data.deletedDefaultTags = [];
    }

    // 同时记录原始名称和规范化名称，确保删除记录的完整性
    if (DEFAULT_TAGS.includes(tagName as any)) {
      console.log(`📝 [deleteTag] 记录删除的默认标签: ${tagName} (规范化: ${normalizedTag})`);

      // 记录原始标签名
      if (!data.deletedDefaultTags.includes(tagName)) {
        data.deletedDefaultTags.push(tagName);
      }

      // 也记录规范化后的标签名，以防不同地方使用不同格式
      if (!data.deletedDefaultTags.includes(normalizedTag)) {
        data.deletedDefaultTags.push(normalizedTag);
      }

      console.log(`📝 [deleteTag] 删除记录更新: ${data.deletedDefaultTags.join(', ')}`);
    }

    // 从所有书签中移除该标签
    console.log(`🔄 [deleteTag] 从书签中移除标签引用...`);
    let updatedBookmarkCount = 0;
    data.bookmarks.forEach(bookmark => {
      if (bookmark.tags && bookmark.tags.includes(tagName)) {
        bookmark.tags = bookmark.tags.filter(t => t !== tagName);
        bookmark.updatedAt = new Date().toISOString();
        updatedBookmarkCount++;
      }
    });

    console.log(`🔄 [deleteTag] 更新了 ${updatedBookmarkCount} 个书签`);
    console.log(`💾 [deleteTag] 保存更改...`);

    await this.storage.set(data);
    this.cache = data;

    console.log(`✅ [deleteTag] 标签删除完成: ${tagName}`);
    console.log(`📊 [deleteTag] 当前删除记录:`, data.deletedDefaultTags);
  }

  public async addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<Bookmark> {
    const data = await this.getData();
    const newBookmark: Bookmark = {
      ...bookmark,
      id: generateId(),
      createdAt: new Date().toISOString()
    };

    data.bookmarks.push(newBookmark);

    // Update tag counts - 为新标签创建标签数据
    for (const tagName of bookmark.tags) {
      const normalizedTag = normalizeTag(tagName);
      if (!data.tags[normalizedTag]) {
        // 只有在用户主动添加书签时才创建新标签
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

      // Increase count for new tags - 为新标签创建标签数据
      for (const tagName of updates.tags) {
        const normalizedTag = normalizeTag(tagName);
        if (!data.tags[normalizedTag]) {
          // 只有在用户主动编辑书签时才创建新标签
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