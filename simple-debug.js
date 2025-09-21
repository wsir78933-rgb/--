console.log('=== 标签删除调试脚本 ===');

// 简化的调试工具
window.tagDebug = {
  async checkAll() {
    console.log('=== 完整数据检查 ===');
    const data = await chrome.storage.local.get(null);
    console.log('书签数量:', data.bookmarks?.length || 0);
    console.log('标签数量:', Object.keys(data.tags || {}).length);
    console.log('所有标签:', Object.values(data.tags || {}).map(t => ({ name: t.name, count: t.count })));
    return data;
  },

  async checkTag(tagName) {
    console.log(`=== 检查标签: ${tagName} ===`);
    const data = await chrome.storage.local.get(null);
    const normalizedTag = tagName.toLowerCase();
    const tag = data.tags?.[normalizedTag];

    console.log('标签数据:', tag);

    const bookmarksWithTag = (data.bookmarks || []).filter(bookmark =>
      bookmark.tags && bookmark.tags.some(t => t.toLowerCase() === tagName.toLowerCase())
    );
    console.log(`包含此标签的书签数量: ${bookmarksWithTag.length}`);
    console.log('书签详情:', bookmarksWithTag.map(b => ({ title: b.title, tags: b.tags })));

    return { tag, bookmarksWithTag };
  },

  async deleteTag(tagName) {
    console.log(`=== 删除标签: ${tagName} ===`);

    const beforeData = await chrome.storage.local.get(null);
    console.log('删除前:', beforeData.tags?.[tagName.toLowerCase()] ? '存在' : '不存在');

    try {
      const data = await chrome.storage.local.get(null);
      const normalizedTag = tagName.toLowerCase();

      // 删除标签
      const updatedTags = { ...data.tags };
      delete updatedTags[normalizedTag];

      // 从书签中移除标签
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

      await chrome.storage.local.set({
        ...data,
        tags: updatedTags,
        bookmarks: updatedBookmarks
      });

      console.log('删除完成');

      // 检查删除后状态
      const afterData = await chrome.storage.local.get(null);
      console.log('删除后:', afterData.tags?.[normalizedTag] ? '仍存在' : '已删除');

      return true;
    } catch (error) {
      console.error('删除失败:', error);
      return false;
    }
  },

  async testRegeneration() {
    console.log('=== 测试标签重新生成 ===');

    // 清除缓存（如果StorageManager可用）
    try {
      if (window.StorageManager) {
        const sm = window.StorageManager.getInstance();
        sm.invalidateCache();
        console.log('缓存已清除');

        // 强制重新获取数据
        await sm.getData();
        console.log('数据已重新获取');
      }
    } catch (error) {
      console.log('StorageManager不可用:', error.message);
    }

    // 触发存储变化
    await chrome.storage.local.set({ testTrigger: Date.now() });
    console.log('存储变化已触发');

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 500));

    // 检查当前状态
    return await this.checkAll();
  },

  async fullTest(tagName) {
    console.log(`=== 完整测试: ${tagName} ===`);

    console.log('\n1. 初始状态:');
    await this.checkTag(tagName);

    console.log('\n2. 删除标签:');
    await this.deleteTag(tagName);

    console.log('\n3. 检查删除后:');
    await this.checkTag(tagName);

    console.log('\n4. 测试重新生成:');
    await this.testRegeneration();

    console.log('\n5. 最终检查:');
    await this.checkTag(tagName);

    console.log('\n测试完成！');
  }
};

console.log('调试工具已加载！使用方法:');
console.log('await tagDebug.checkAll() - 查看所有数据');
console.log('await tagDebug.checkTag("标签名") - 检查特定标签');
console.log('await tagDebug.deleteTag("标签名") - 删除标签');
console.log('await tagDebug.fullTest("标签名") - 完整测试流程');