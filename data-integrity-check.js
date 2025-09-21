// 数据完整性检查脚本
console.log('=== 数据完整性检查 ===');

window.dataIntegrityCheck = {
  // 检查数据删除的完整性
  async checkDeletionIntegrity(tagName) {
    console.log(`=== 检查删除完整性: ${tagName} ===`);

    const normalizedTag = tagName.toLowerCase();

    // 1. 检查原始存储数据
    const rawData = await chrome.storage.local.get(null);
    console.log('原始存储数据:');
    console.log('- 标签总数:', Object.keys(rawData.tags || {}).length);
    console.log('- 目标标签键存在:', normalizedTag in (rawData.tags || {}));
    console.log('- 所有标签键:', Object.keys(rawData.tags || {}));

    // 2. 检查书签中的标签引用
    const bookmarksWithTargetTag = (rawData.bookmarks || []).filter(bookmark =>
      bookmark.tags && bookmark.tags.some(t => t.toLowerCase() === tagName.toLowerCase())
    );

    console.log('包含目标标签的书签:');
    console.log('- 数量:', bookmarksWithTargetTag.length);
    bookmarksWithTargetTag.forEach((bookmark, index) => {
      console.log(`- 书签${index + 1}:`, {
        id: bookmark.id,
        title: bookmark.title,
        tags: bookmark.tags,
        updatedAt: bookmark.updatedAt
      });
    });

    // 3. 检查是否有大小写不匹配的问题
    const allTagsInBookmarks = new Set();
    (rawData.bookmarks || []).forEach(bookmark => {
      if (bookmark.tags) {
        bookmark.tags.forEach(tag => allTagsInBookmarks.add(tag));
      }
    });

    const caseVariations = Array.from(allTagsInBookmarks).filter(tag =>
      tag.toLowerCase() === tagName.toLowerCase()
    );

    console.log('标签的大小写变体:', caseVariations);

    // 4. 检查标签数据中的键值对应关系
    const tagEntries = Object.entries(rawData.tags || {});
    const relatedEntries = tagEntries.filter(([key, value]) =>
      key.includes(normalizedTag) ||
      value.name.toLowerCase() === tagName.toLowerCase() ||
      normalizedTag.includes(key)
    );

    console.log('相关的标签条目:', relatedEntries);

    return {
      hasTagData: normalizedTag in (rawData.tags || {}),
      bookmarksWithTag: bookmarksWithTargetTag.length,
      caseVariations,
      relatedEntries
    };
  },

  // 执行彻底的清理
  async thoroughCleanup(tagName) {
    console.log(`=== 执行彻底清理: ${tagName} ===`);

    const data = await chrome.storage.local.get(null);
    const normalizedTag = tagName.toLowerCase();

    // 1. 清理标签数据（所有可能的键）
    const updatedTags = { ...data.tags };
    const keysToDelete = Object.keys(updatedTags).filter(key => {
      const tag = updatedTags[key];
      return key === normalizedTag ||
             (tag && tag.name && tag.name.toLowerCase() === tagName.toLowerCase());
    });

    console.log('要删除的标签键:', keysToDelete);
    keysToDelete.forEach(key => delete updatedTags[key]);

    // 2. 清理书签中的标签引用（处理所有大小写变体）
    const updatedBookmarks = (data.bookmarks || []).map(bookmark => {
      if (bookmark.tags && bookmark.tags.length > 0) {
        const originalTags = [...bookmark.tags];
        const cleanedTags = bookmark.tags.filter(t =>
          t.toLowerCase() !== tagName.toLowerCase()
        );

        if (originalTags.length !== cleanedTags.length) {
          console.log(`清理书签 "${bookmark.title}" 的标签:`, originalTags, '->', cleanedTags);
          return {
            ...bookmark,
            tags: cleanedTags,
            updatedAt: new Date().toISOString()
          };
        }
      }
      return bookmark;
    });

    // 3. 保存清理后的数据
    const cleanData = {
      ...data,
      tags: updatedTags,
      bookmarks: updatedBookmarks
    };

    await chrome.storage.local.set(cleanData);
    console.log('彻底清理完成');

    // 4. 验证清理结果
    await new Promise(resolve => setTimeout(resolve, 100));
    const verifyData = await chrome.storage.local.get(null);

    console.log('清理验证:');
    console.log('- 标签数据中还有目标标签:', normalizedTag in (verifyData.tags || {}));

    const remainingBookmarksWithTag = (verifyData.bookmarks || []).filter(bookmark =>
      bookmark.tags && bookmark.tags.some(t => t.toLowerCase() === tagName.toLowerCase())
    );
    console.log('- 书签中还有目标标签的数量:', remainingBookmarksWithTag.length);

    return {
      deletedKeys: keysToDelete,
      cleanedBookmarks: updatedBookmarks.filter((b, i) => b !== data.bookmarks[i]).length,
      verificationPassed:
        !(normalizedTag in (verifyData.tags || {})) &&
        remainingBookmarksWithTag.length === 0
    };
  },

  // 监控清理后的数据变化
  async monitorAfterCleanup(tagName, duration = 5000) {
    console.log(`=== 监控清理后数据变化 (${duration}ms) ===`);

    const normalizedTag = tagName.toLowerCase();
    let changeCount = 0;

    const originalSet = chrome.storage.local.set;
    chrome.storage.local.set = function(items, callback) {
      changeCount++;
      console.log(`第${changeCount}次存储变化:`, items);

      // 检查是否重新创建了标签
      if (items.tags && items.tags[normalizedTag]) {
        console.log('⚠️ 检测到标签被重新创建!');
        console.log('重新创建的标签数据:', items.tags[normalizedTag]);
        console.trace('重新创建的调用堆栈:');
      }

      return originalSet.call(this, items, callback);
    };

    // 监控一段时间
    await new Promise(resolve => setTimeout(resolve, duration));

    // 恢复原始方法
    chrome.storage.local.set = originalSet;

    console.log(`监控结束，共发生 ${changeCount} 次存储变化`);

    // 最终检查
    const finalData = await chrome.storage.local.get(null);
    const finalCheck = normalizedTag in (finalData.tags || {});
    console.log('最终检查 - 标签是否存在:', finalCheck);

    return { changeCount, finalCheck };
  },

  // 完整的诊断流程
  async runCompleteDiagnosis(tagName) {
    console.log(`=== 完整诊断流程: ${tagName} ===`);

    console.log('\n1. 删除前检查:');
    const beforeCheck = await this.checkDeletionIntegrity(tagName);

    console.log('\n2. 执行彻底清理:');
    const cleanupResult = await this.thoroughCleanup(tagName);

    console.log('\n3. 监控清理后变化:');
    const monitorResult = await this.monitorAfterCleanup(tagName, 3000);

    console.log('\n4. 最终完整性检查:');
    const finalCheck = await this.checkDeletionIntegrity(tagName);

    console.log('\n=== 诊断总结 ===');
    console.log('清理是否成功:', cleanupResult.verificationPassed);
    console.log('监控期间变化次数:', monitorResult.changeCount);
    console.log('最终状态:', monitorResult.finalCheck ? '标签仍存在' : '标签已删除');

    return {
      beforeCheck,
      cleanupResult,
      monitorResult,
      finalCheck
    };
  }
};

console.log('数据完整性检查器已加载！');
console.log('使用: await dataIntegrityCheck.runCompleteDiagnosis("标签名")');