// 详细的标签重建问题分析脚本
// 这个脚本会深入分析标签重建的确切原因和时机

console.log('=== 详细标签重建分析脚本 ===');

window.debugDetailed = {
  // 分析所有可能导致标签重建的代码路径
  async analyzeTagCreationPaths() {
    console.log('=== 分析标签创建路径 ===');

    const data = await chrome.storage.local.get(null);
    const bookmarks = data.bookmarks || [];
    const currentTags = data.tags || {};

    console.log('当前标签:', Object.keys(currentTags));
    console.log('当前书签数量:', bookmarks.length);

    // 分析书签中存在但标签数据中缺失的标签
    const allTagsInBookmarks = new Set();
    bookmarks.forEach(bookmark => {
      if (bookmark.tags && Array.isArray(bookmark.tags)) {
        bookmark.tags.forEach(tag => allTagsInBookmarks.add(tag));
      }
    });

    const missingTags = Array.from(allTagsInBookmarks).filter(tag => {
      const normalizedTag = tag.toLowerCase();
      return !currentTags[normalizedTag];
    });

    console.log('书签中存在但标签数据中缺失的标签:', missingTags);

    if (missingTags.length > 0) {
      console.log('⚠️ 这些标签可能会被自动重建！');
      missingTags.forEach(tag => {
        const bookmarksWithTag = bookmarks.filter(b =>
          b.tags && b.tags.includes(tag)
        );
        console.log(`  - 标签"${tag}": 被${bookmarksWithTag.length}个书签使用`);
      });
    }

    return { missingTags, allTagsInBookmarks: Array.from(allTagsInBookmarks) };
  },

  // 检查DEFAULT_TAGS的影响
  async checkDefaultTags() {
    console.log('=== 检查DEFAULT_TAGS的影响 ===');

    // 尝试获取DEFAULT_TAGS（如果可用）
    try {
      // 检查是否有默认标签在重建
      const data = await chrome.storage.local.get(null);
      const currentTags = Object.values(data.tags || {});

      // 查找可能的默认标签
      const potentialDefaultTags = currentTags.filter(tag =>
        tag.count === 0 ||
        ['娱乐', '学习', '工作', '工具', '开发', '生活'].includes(tag.name)
      );

      console.log('可能的默认标签:', potentialDefaultTags);

      return potentialDefaultTags;
    } catch (error) {
      console.error('检查默认标签失败:', error);
    }
  },

  // 模拟StorageManager初始化过程
  async simulateStorageManagerInit() {
    console.log('=== 模拟StorageManager初始化过程 ===');

    const data = await chrome.storage.local.get(null);
    const originalTags = { ...data.tags };
    const bookmarks = data.bookmarks || [];

    console.log('初始化前标签:', Object.keys(originalTags));

    // 模拟重新计算标签统计的逻辑
    const tagCounts = {};
    bookmarks.forEach(bookmark => {
      if (bookmark.tags && Array.isArray(bookmark.tags)) {
        bookmark.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    console.log('从书签计算出的标签计数:', tagCounts);

    // 检查会被重新创建的标签
    const tagsToRecreate = [];
    Object.keys(tagCounts).forEach(tagName => {
      const normalizedTag = tagName.toLowerCase();
      if (!originalTags[normalizedTag]) {
        tagsToRecreate.push({
          name: tagName,
          count: tagCounts[tagName],
          normalizedKey: normalizedTag
        });
      }
    });

    console.log('会被重新创建的标签:', tagsToRecreate);

    return { tagCounts, tagsToRecreate };
  },

  // 分析具体的标签
  async analyzeSpecificTag(tagName) {
    console.log(`=== 详细分析标签: ${tagName} ===`);

    const data = await chrome.storage.local.get(null);
    const normalizedTag = tagName.toLowerCase();
    const tagData = data.tags?.[normalizedTag];

    console.log('标签数据:', tagData);

    // 查找使用此标签的书签
    const bookmarksWithTag = (data.bookmarks || []).filter(bookmark =>
      bookmark.tags && bookmark.tags.some(t => t.toLowerCase() === tagName.toLowerCase())
    );

    console.log(`使用此标签的书签数量: ${bookmarksWithTag.length}`);
    bookmarksWithTag.forEach((bookmark, index) => {
      console.log(`  书签${index + 1}:`, {
        title: bookmark.title,
        tags: bookmark.tags,
        id: bookmark.id
      });
    });

    // 检查标签键的变化
    const allTagKeys = Object.keys(data.tags || {});
    const relatedKeys = allTagKeys.filter(key =>
      key.includes(normalizedTag) || normalizedTag.includes(key)
    );

    console.log('相关的标签键:', relatedKeys);

    return {
      tagData,
      bookmarksWithTag,
      relatedKeys,
      actualCount: bookmarksWithTag.length,
      recordedCount: tagData?.count || 0
    };
  },

  // 全面的删除测试
  async comprehensiveDeleteTest(tagName) {
    console.log(`=== 全面删除测试: ${tagName} ===`);

    // 第一步：记录删除前状态
    console.log('\n📊 删除前状态分析');
    const beforeAnalysis = await this.analyzeSpecificTag(tagName);
    const beforeCreationAnalysis = await this.analyzeTagCreationPaths();

    // 第二步：执行删除
    console.log('\n🗑️ 执行删除操作');
    const deleteResult = await this.performCleanDelete(tagName);

    if (!deleteResult.success) {
      console.log('删除失败，停止测试');
      return;
    }

    // 第三步：立即检查删除后状态
    console.log('\n📊 删除后立即状态');
    const afterAnalysis = await this.analyzeSpecificTag(tagName);

    // 第四步：模拟各种可能触发重建的操作
    console.log('\n🔄 测试重建触发点');

    // 4.1 清除缓存并重新获取数据
    console.log('4.1 清除缓存测试');
    if (window.StorageManager) {
      const sm = window.StorageManager.getInstance();
      sm.invalidateCache();
      await sm.getData();
    }
    const afterCacheClear = await this.analyzeSpecificTag(tagName);

    // 4.2 模拟页面刷新（重新初始化）
    console.log('4.2 模拟初始化测试');
    await this.simulateStorageManagerInit();
    const afterInit = await this.analyzeSpecificTag(tagName);

    // 4.3 触发存储变化监听
    console.log('4.3 存储变化监听测试');
    await chrome.storage.local.set({ testKey: Date.now() });
    await new Promise(resolve => setTimeout(resolve, 100));
    const afterStorageChange = await this.analyzeSpecificTag(tagName);

    // 第五步：总结结果
    console.log('\n📋 测试结果总结');
    console.log('删除前:', beforeAnalysis.tagData ? '存在' : '不存在');
    console.log('删除后立即:', afterAnalysis.tagData ? '存在' : '不存在');
    console.log('清除缓存后:', afterCacheClear.tagData ? '存在' : '不存在');
    console.log('模拟初始化后:', afterInit.tagData ? '存在' : '不存在');
    console.log('存储变化后:', afterStorageChange.tagData ? '存在' : '不存在');

    // 如果标签被重建，分析原因
    if (afterInit.tagData || afterStorageChange.tagData) {
      console.log('\n⚠️ 标签被重建！分析原因：');
      const finalCreationAnalysis = await this.analyzeTagCreationPaths();
      console.log('重建后的创建路径分析:', finalCreationAnalysis);
    }

    return {
      beforeAnalysis,
      afterAnalysis,
      afterCacheClear,
      afterInit,
      afterStorageChange
    };
  },

  // 执行彻底的删除
  async performCleanDelete(tagName) {
    console.log(`执行彻底删除: ${tagName}`);

    try {
      const data = await chrome.storage.local.get(null);
      const normalizedTag = tagName.toLowerCase();

      // 删除标签数据
      const updatedTags = { ...data.tags };
      delete updatedTags[normalizedTag];

      // 从所有书签中移除标签
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

      console.log('删除操作成功完成');
      return { success: true };
    } catch (error) {
      console.error('删除操作失败:', error);
      return { success: false, error };
    }
  },

  // 一键运行所有分析
  async runAllAnalysis() {
    console.log('=== 运行所有分析 ===');

    console.log('\n1. 标签创建路径分析');
    await this.analyzeTagCreationPaths();

    console.log('\n2. 默认标签检查');
    await this.checkDefaultTags();

    console.log('\n3. StorageManager初始化模拟');
    await this.simulateStorageManagerInit();

    console.log('\n分析完成！');
  }
};

console.log(`
=== 详细分析脚本使用说明 ===

1. 分析当前状态:
   await debugDetailed.runAllAnalysis()

2. 分析特定标签:
   await debugDetailed.analyzeSpecificTag('标签名')

3. 全面删除测试:
   await debugDetailed.comprehensiveDeleteTest('标签名')

4. 单独分析:
   await debugDetailed.analyzeTagCreationPaths()
   await debugDetailed.checkDefaultTags()
   await debugDetailed.simulateStorageManagerInit()

建议操作流程:
1. 先运行 debugDetailed.runAllAnalysis() 了解整体情况
2. 选择一个要测试的标签
3. 运行 debugDetailed.comprehensiveDeleteTest('标签名') 进行全面测试
`);