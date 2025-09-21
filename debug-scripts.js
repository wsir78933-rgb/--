// 标签删除和编辑问题调试脚本集合
// 在浏览器Console中逐个运行这些脚本来找到问题根源

console.log('=== 标签删除编辑问题调试脚本集合 ===');

// ====== 脚本1: 查看当前存储数据结构 ======
window.debugStorage = {
  // 1.1 查看完整存储数据
  async viewAll() {
    console.log('=== 当前完整存储数据 ===');
    const data = await chrome.storage.local.get(null);
    console.log('完整数据:', data);
    console.log('书签数量:', data.bookmarks?.length || 0);
    console.log('标签数量:', Object.keys(data.tags || {}).length);
    console.log('标签列表:', Object.values(data.tags || {}));
    return data;
  },

  // 1.2 查看特定标签
  async viewTag(tagName) {
    console.log(`=== 查看标签: ${tagName} ===`);
    const data = await chrome.storage.local.get(null);
    const normalizedTag = tagName.toLowerCase();
    const tag = data.tags?.[normalizedTag];

    console.log('标签数据:', tag);

    // 查看包含此标签的书签
    const bookmarksWithTag = (data.bookmarks || []).filter(bookmark =>
      bookmark.tags && bookmark.tags.some(t => t.toLowerCase() === tagName.toLowerCase())
    );
    console.log(`包含标签"${tagName}"的书签:`, bookmarksWithTag);
    console.log(`实际计数: ${bookmarksWithTag.length}, 标签记录的计数: ${tag?.count || 0}`);

    return { tag, bookmarksWithTag };
  },

  // 1.3 对比标签数据和书签数据的一致性
  async checkConsistency() {
    console.log('=== 检查数据一致性 ===');
    const data = await chrome.storage.local.get(null);
    const bookmarks = data.bookmarks || [];
    const tags = data.tags || {};

    // 统计书签中的标签
    const tagCountsFromBookmarks = {};
    bookmarks.forEach(bookmark => {
      if (bookmark.tags && Array.isArray(bookmark.tags)) {
        bookmark.tags.forEach(tag => {
          tagCountsFromBookmarks[tag] = (tagCountsFromBookmarks[tag] || 0) + 1;
        });
      }
    });

    console.log('从书签统计的标签计数:', tagCountsFromBookmarks);
    console.log('标签数据中记录的计数:');
    Object.values(tags).forEach(tag => {
      console.log(`  ${tag.name}: ${tag.count}`);
    });

    // 找出不一致的地方
    const inconsistencies = [];
    Object.values(tags).forEach(tag => {
      const actualCount = tagCountsFromBookmarks[tag.name] || 0;
      if (tag.count !== actualCount) {
        inconsistencies.push({
          tagName: tag.name,
          recordedCount: tag.count,
          actualCount: actualCount
        });
      }
    });

    // 找出书签中存在但标签数据中不存在的标签
    const orphanTags = [];
    Object.keys(tagCountsFromBookmarks).forEach(tagName => {
      const normalizedTag = tagName.toLowerCase();
      if (!tags[normalizedTag]) {
        orphanTags.push({
          tagName: tagName,
          count: tagCountsFromBookmarks[tagName]
        });
      }
    });

    console.log('计数不一致的标签:', inconsistencies);
    console.log('书签中存在但标签数据中缺失的标签:', orphanTags);

    return { inconsistencies, orphanTags };
  }
};

// ====== 脚本2: 监控存储变化 ======
window.debugListener = {
  isListening: false,

  // 2.1 开始监听存储变化
  start() {
    if (this.isListening) {
      console.log('已经在监听中...');
      return;
    }

    console.log('=== 开始监听存储变化 ===');
    this.isListening = true;

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        console.log('=== 存储发生变化 ===');
        console.log('变化详情:', changes);

        if (changes.tags) {
          console.log('标签变化:');
          console.log('  旧值:', changes.tags.oldValue);
          console.log('  新值:', changes.tags.newValue);

          // 分析标签变化
          const oldTags = changes.tags.oldValue || {};
          const newTags = changes.tags.newValue || {};

          const oldTagNames = Object.values(oldTags).map(t => t.name);
          const newTagNames = Object.values(newTags).map(t => t.name);

          const deletedTags = oldTagNames.filter(name => !newTagNames.includes(name));
          const addedTags = newTagNames.filter(name => !oldTagNames.includes(name));

          console.log('  删除的标签:', deletedTags);
          console.log('  新增的标签:', addedTags);
        }

        if (changes.bookmarks) {
          console.log('书签变化:');
          console.log('  旧值数量:', changes.bookmarks.oldValue?.length || 0);
          console.log('  新值数量:', changes.bookmarks.newValue?.length || 0);
        }
      }
    });
  },

  // 2.2 停止监听
  stop() {
    console.log('=== 停止监听存储变化 ===');
    this.isListening = false;
    // 注意: 这里无法直接移除特定监听器，需要重新加载页面才能完全停止
  }
};

// ====== 脚本3: 测试标签删除流程 ======
window.debugDelete = {
  // 3.1 安全删除标签（带详细日志）
  async deleteTagWithLogging(tagName) {
    console.log(`=== 开始删除标签: ${tagName} ===`);

    // 删除前状态
    console.log('删除前状态:');
    const beforeData = await chrome.storage.local.get(null);
    console.log('删除前标签数据:', beforeData.tags);
    console.log('删除前书签数据:', beforeData.bookmarks?.length);

    try {
      // 执行删除
      const data = await chrome.storage.local.get(null);
      const updatedTags = { ...data.tags };
      const tagKey = Object.keys(updatedTags).find(key =>
        updatedTags[key].name.toLowerCase() === tagName.toLowerCase()
      );

      if (tagKey) {
        delete updatedTags[tagKey];
        console.log(`删除标签键: ${tagKey}`);
      } else {
        console.log('未找到要删除的标签');
        return;
      }

      // 更新书签
      const updatedBookmarks = (data.bookmarks || []).map(bookmark => {
        if (bookmark.tags && bookmark.tags.some(t => t.toLowerCase() === tagName.toLowerCase())) {
          return {
            ...bookmark,
            tags: bookmark.tags.filter(t => t.toLowerCase() !== tagName.toLowerCase()),
            updatedAt: new Date().toISOString()
          };
        }
        return bookmark;
      });

      // 保存更改
      await chrome.storage.local.set({
        ...data,
        tags: updatedTags,
        bookmarks: updatedBookmarks
      });

      console.log('删除操作完成');

      // 删除后状态
      console.log('删除后状态:');
      const afterData = await chrome.storage.local.get(null);
      console.log('删除后标签数据:', afterData.tags);
      console.log('删除后书签数据:', afterData.bookmarks?.length);

      return true;
    } catch (error) {
      console.error('删除失败:', error);
      return false;
    }
  },

  // 3.2 模拟页面刷新后的数据检查
  async checkAfterRefresh() {
    console.log('=== 模拟页面刷新后检查 ===');

    // 清除所有缓存，模拟页面刷新
    if (window.StorageManager) {
      const storageManager = window.StorageManager.getInstance();
      storageManager.invalidateCache();
    }

    // 重新获取数据
    const data = await chrome.storage.local.get(null);
    console.log('刷新后的完整数据:', data);

    // 检查是否有标签被重新创建
    return debugStorage.checkConsistency();
  }
};

// ====== 脚本4: 跟踪StorageManager行为 ======
window.debugStorageManager = {
  // 4.1 监控StorageManager的初始化
  monitorInit() {
    console.log('=== 监控StorageManager初始化 ===');

    // 重写console.log以捕获StorageManager的日志
    const originalLog = console.log;
    console.log = function(...args) {
      if (args[0] && args[0].includes && (
        args[0].includes('重新计算标签') ||
        args[0].includes('Updating storage') ||
        args[0].includes('标签') ||
        args[0].includes('tags')
      )) {
        originalLog.apply(console, ['[StorageManager]', ...args]);
      } else {
        originalLog.apply(console, args);
      }
    };

    // 恢复原始log的方法
    window.restoreConsoleLog = () => {
      console.log = originalLog;
    };
  },

  // 4.2 强制触发StorageManager初始化
  async forceInit() {
    console.log('=== 强制触发StorageManager初始化 ===');

    if (window.StorageManager) {
      const storageManager = window.StorageManager.getInstance();

      // 清除缓存
      storageManager.invalidateCache();

      // 强制重新获取数据（这会触发初始化逻辑）
      const data = await storageManager.getData();
      console.log('强制初始化后的数据:', data);

      return data;
    } else {
      console.log('StorageManager不可用');
    }
  }
};

// ====== 脚本5: 完整测试流程 ======
window.debugFullTest = {
  async runFullTest(tagName) {
    console.log(`=== 开始完整测试流程: ${tagName} ===`);

    // 1. 检查初始状态
    console.log('\n1. 检查初始状态');
    await debugStorage.viewTag(tagName);

    // 2. 开始监听
    console.log('\n2. 开始监听存储变化');
    debugListener.start();

    // 3. 删除标签
    console.log('\n3. 删除标签');
    await debugDelete.deleteTagWithLogging(tagName);

    // 4. 等待一会
    console.log('\n4. 等待存储变化...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. 检查删除后状态
    console.log('\n5. 检查删除后状态');
    await debugStorage.viewTag(tagName);

    // 6. 模拟页面刷新
    console.log('\n6. 模拟页面刷新');
    await debugDelete.checkAfterRefresh();

    // 7. 强制触发StorageManager初始化
    console.log('\n7. 强制触发StorageManager初始化');
    await debugStorageManager.forceInit();

    // 8. 最终检查
    console.log('\n8. 最终检查');
    await debugStorage.viewTag(tagName);
    await debugStorage.checkConsistency();

    console.log('\n=== 完整测试流程结束 ===');
  }
};

// ====== 使用说明 ======
console.log(`
=== 调试脚本使用说明 ===

1. 查看当前数据:
   await debugStorage.viewAll()
   await debugStorage.viewTag('标签名')
   await debugStorage.checkConsistency()

2. 监听存储变化:
   debugListener.start()  // 开始监听
   debugListener.stop()   // 停止监听

3. 测试删除:
   await debugDelete.deleteTagWithLogging('标签名')
   await debugDelete.checkAfterRefresh()

4. 监控StorageManager:
   debugStorageManager.monitorInit()  // 监控初始化日志
   await debugStorageManager.forceInit()  // 强制初始化

5. 完整测试:
   await debugFullTest.runFullTest('标签名')

开始调试前，建议先运行: await debugStorage.viewAll()
`);