// 简化的实时监控脚本
console.log('=== 简化监控脚本启动 ===');

window.simpleMonitor = {
  originalSet: null,
  isMonitoring: false,

  // 开始监控
  start() {
    if (this.isMonitoring) {
      console.log('监控已在运行...');
      return;
    }

    console.log('🔍 开始监控存储变化...');
    this.isMonitoring = true;

    // 保存原始方法
    this.originalSet = chrome.storage.local.set;

    // 拦截存储操作
    chrome.storage.local.set = (items, callback) => {
      console.log('🔄 存储被修改:', items);

      // 检查标签变化
      if (items && items.tags) {
        const tagNames = Object.keys(items.tags);
        console.log('📝 标签变化 - 数量:', tagNames.length);
        console.log('📝 标签列表:', tagNames);

        // 显示调用位置
        console.trace('📍 修改来源:');
      }

      // 调用原始方法
      return this.originalSet.call(chrome.storage.local, items, callback);
    };

    console.log('✅ 监控已启动');
  },

  // 停止监控
  stop() {
    if (!this.isMonitoring) return;

    console.log('🛑 停止监控...');

    if (this.originalSet) {
      chrome.storage.local.set = this.originalSet;
    }

    this.isMonitoring = false;
    console.log('✅ 监控已停止');
  },

  // 简单的删除测试
  async simpleDeleteTest(tagName) {
    console.log(`🧪 简单删除测试: ${tagName}`);

    // 开始监控
    this.start();

    try {
      // 获取当前数据
      console.log('📖 获取当前数据...');
      const data = await chrome.storage.local.get(null);

      const normalizedTag = tagName.toLowerCase();
      console.log('删除前标签存在:', normalizedTag in (data.tags || {}));

      // 删除标签
      console.log('🗑️ 执行删除操作...');
      const updatedTags = { ...data.tags };
      delete updatedTags[normalizedTag];

      // 更新书签
      const updatedBookmarks = (data.bookmarks || []).map(bookmark => {
        if (bookmark.tags && bookmark.tags.includes(tagName)) {
          return {
            ...bookmark,
            tags: bookmark.tags.filter(t => t !== tagName),
            updatedAt: new Date().toISOString()
          };
        }
        return bookmark;
      });

      // 保存更改
      console.log('💾 保存更改...');
      await chrome.storage.local.set({
        ...data,
        tags: updatedTags,
        bookmarks: updatedBookmarks
      });

      console.log('✅ 删除操作完成，开始观察...');

      // 观察5秒
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 检查结果
      console.log('🔍 检查最终结果...');
      const finalData = await chrome.storage.local.get(null);
      const stillExists = normalizedTag in (finalData.tags || {});

      console.log('📊 最终结果:');
      console.log('- 标签仍存在:', stillExists);

      if (stillExists) {
        console.log('⚠️ 标签被重新创建了！');
        console.log('重新创建的标签数据:', finalData.tags[normalizedTag]);
      } else {
        console.log('✅ 标签成功删除');
      }

      return stillExists;

    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    }
  }
};

console.log(`
🚀 简化监控器已加载！

使用方法:
1. 启动监控: simpleMonitor.start()
2. 删除测试: await simpleMonitor.simpleDeleteTest('娱乐')
3. 停止监控: simpleMonitor.stop()

直接运行: await simpleMonitor.simpleDeleteTest('娱乐')
`);