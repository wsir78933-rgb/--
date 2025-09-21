// 实时监控脚本 - 找出标签重现的确切原因
console.log('=== 实时监控脚本启动 ===');

window.realtimeMonitor = {
  isMonitoring: false,
  originalMethods: {},

  // 启动全方位监控
  startFullMonitoring() {
    if (this.isMonitoring) {
      console.log('监控已在运行中...');
      return;
    }

    console.log('🔍 启动全方位监控...');
    this.isMonitoring = true;

    // 1. 监控所有chrome.storage.local操作
    this.monitorStorage();

    // 2. 监控所有可能的标签创建点
    this.monitorTagCreation();

    // 3. 监控React组件状态变化
    this.monitorReactState();

    console.log('✅ 全方位监控已启动');
  },

  // 监控存储操作
  monitorStorage() {
    console.log('📦 开始监控存储操作...');

    // 保存原始方法
    this.originalMethods.storageSet = chrome.storage.local.set;
    this.originalMethods.storageGet = chrome.storage.local.get;

    // 拦截 set 操作
    chrome.storage.local.set = (items, callback) => {
      console.log('🔄 storage.set 被调用:', items);

      // 检查是否涉及标签
      if (items.tags) {
        console.log('📝 标签数据变化:', items.tags);
        console.log('🔍 标签数量:', Object.keys(items.tags).length);

        // 打印调用堆栈
        console.trace('📍 storage.set 调用堆栈:');
      }

      return this.originalMethods.storageSet.call(chrome.storage.local, items, callback);
    };

    // 拦截 get 操作
    chrome.storage.local.get = (keys, callback) => {
      const result = this.originalMethods.storageGet.call(chrome.storage.local, keys, (data) => {
        if (keys === null || (Array.isArray(keys) && keys.includes('tags')) || keys === 'tags') {
          console.log('📖 storage.get 获取标签数据:', data.tags ? Object.keys(data.tags) : 'undefined');
        }
        if (callback) callback(data);
      });
      return result;
    };
  },

  // 监控标签创建
  monitorTagCreation() {
    console.log('🏷️ 开始监控标签创建...');

    // 监控可能的标签创建函数
    if (window.StorageManager) {
      try {
        const sm = window.StorageManager.getInstance();

        // 监控 addBookmark 方法
        if (sm.addBookmark) {
          const originalAddBookmark = sm.addBookmark;
          sm.addBookmark = function(bookmark) {
            console.log('📚 addBookmark 被调用:', bookmark);
            if (bookmark.tags && bookmark.tags.length > 0) {
              console.log('🔗 书签包含标签:', bookmark.tags);
            }
            return originalAddBookmark.call(this, bookmark);
          };
        }

        // 监控 updateBookmark 方法
        if (sm.updateBookmark) {
          const originalUpdateBookmark = sm.updateBookmark;
          sm.updateBookmark = function(id, updates) {
            console.log('✏️ updateBookmark 被调用:', { id, updates });
            if (updates.tags) {
              console.log('🔄 标签更新:', updates.tags);
            }
            return originalUpdateBookmark.call(this, id, updates);
          };
        }

        // 监控 getData 方法
        if (sm.getData) {
          const originalGetData = sm.getData;
          sm.getData = function() {
            console.log('📊 StorageManager.getData 被调用');
            const result = originalGetData.call(this);

            if (result && typeof result.then === 'function') {
              return result.then(data => {
                console.log('📊 getData 返回的标签数量:', Object.keys(data.tags || {}).length);
                return data;
              });
            }

            return result;
          };
        }

      } catch (error) {
        console.log('⚠️ StorageManager 监控设置失败:', error);
      }
    }
  },

  // 监控React状态
  monitorReactState() {
    console.log('⚛️ 开始监控React状态...');

    // 尝试找到React组件实例并监控状态变化
    const checkReactState = () => {
      // 查找可能的标签组件
      const tagElements = document.querySelectorAll('[class*="tag"], [data-testid*="tag"]');
      console.log('🎯 找到可能的标签元素:', tagElements.length);

      tagElements.forEach((el, index) => {
        const fiber = el._reactInternalFiber || el._reactInternals;
        if (fiber) {
          console.log(`⚛️ 标签元素${index + 1}的React状态:`, fiber.memoizedState);
        }
      });
    };

    // 定期检查React状态
    setInterval(checkReactState, 2000);
  },

  // 停止监控
  stopMonitoring() {
    if (!this.isMonitoring) return;

    console.log('🛑 停止监控...');

    // 恢复原始方法
    if (this.originalMethods.storageSet) {
      chrome.storage.local.set = this.originalMethods.storageSet;
    }
    if (this.originalMethods.storageGet) {
      chrome.storage.local.get = this.originalMethods.storageGet;
    }

    this.isMonitoring = false;
    console.log('✅ 监控已停止');
  },

  // 执行测试删除操作
  async testDeleteWithMonitoring(tagName) {
    console.log(`🧪 开始监控删除测试: ${tagName}`);

    // 启动监控
    this.startFullMonitoring();

    // 等待一下让监控生效
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`🗑️ 开始删除标签: ${tagName}`);

    try {
      // 获取当前数据
      const beforeData = await chrome.storage.local.get(null);
      const normalizedTag = tagName.toLowerCase();

      console.log('删除前标签列表:', Object.keys(beforeData.tags || {}));

      // 执行删除
      const updatedTags = { ...beforeData.tags };
      delete updatedTags[normalizedTag];

      const updatedBookmarks = (beforeData.bookmarks || []).map(bookmark => {
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
        ...beforeData,
        tags: updatedTags,
        bookmarks: updatedBookmarks
      });

      console.log('✅ 删除操作完成');

      // 等待一段时间观察变化
      console.log('⏳ 观察10秒内的变化...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // 检查最终状态
      const finalData = await chrome.storage.local.get(null);
      const stillExists = normalizedTag in (finalData.tags || {});

      console.log('🔍 最终检查结果:');
      console.log('- 标签是否仍存在:', stillExists);
      console.log('- 最终标签列表:', Object.keys(finalData.tags || {}));

      return { success: !stillExists, stillExists };

    } catch (error) {
      console.error('❌ 测试过程中出错:', error);
      return { success: false, error };
    }
  }
};

console.log(`
🚀 实时监控器已加载！

使用方法:
1. 启动监控: realtimeMonitor.startFullMonitoring()
2. 测试删除: await realtimeMonitor.testDeleteWithMonitoring('标签名')
3. 停止监控: realtimeMonitor.stopMonitoring()

建议直接运行: await realtimeMonitor.testDeleteWithMonitoring('娱乐')
`);