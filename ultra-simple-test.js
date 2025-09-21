// 最简单的测试脚本
console.log('=== 最简单测试脚本 ===');

// 不使用复杂的监控，直接测试删除效果
window.ultraSimpleTest = async function(tagName) {
  console.log(`🧪 测试删除标签: ${tagName}`);

  try {
    // 1. 删除前状态
    console.log('1️⃣ 检查删除前状态...');
    const beforeData = await chrome.storage.local.get(null);
    const normalizedTag = tagName.toLowerCase();
    const existsBefore = normalizedTag in (beforeData.tags || {});

    console.log(`删除前标签"${tagName}"存在:`, existsBefore);
    console.log('删除前所有标签:', Object.keys(beforeData.tags || {}));

    if (!existsBefore) {
      console.log('❌ 标签不存在，无法测试删除');
      return;
    }

    // 2. 执行删除
    console.log('2️⃣ 执行删除操作...');
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

    await chrome.storage.local.set({
      ...beforeData,
      tags: updatedTags,
      bookmarks: updatedBookmarks
    });

    // 3. 立即检查
    console.log('3️⃣ 立即检查删除后状态...');
    const immediateData = await chrome.storage.local.get(null);
    const existsImmediately = normalizedTag in (immediateData.tags || {});

    console.log(`删除后立即检查"${tagName}"存在:`, existsImmediately);
    console.log('删除后立即所有标签:', Object.keys(immediateData.tags || {}));

    // 4. 等待2秒后再检查
    console.log('4️⃣ 等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const afterWaitData = await chrome.storage.local.get(null);
    const existsAfterWait = normalizedTag in (afterWaitData.tags || {});

    console.log(`等待2秒后"${tagName}"存在:`, existsAfterWait);
    console.log('等待后所有标签:', Object.keys(afterWaitData.tags || {}));

    // 5. 刷新页面前最后检查
    console.log('5️⃣ 模拟页面刷新...');

    // 清除任何可能的内存缓存
    if (window.StorageManager) {
      try {
        const sm = window.StorageManager.getInstance();
        sm.invalidateCache && sm.invalidateCache();
      } catch (e) {
        console.log('清除StorageManager缓存失败:', e.message);
      }
    }

    const finalData = await chrome.storage.local.get(null);
    const existsFinal = normalizedTag in (finalData.tags || {});

    console.log(`最终检查"${tagName}"存在:`, existsFinal);
    console.log('最终所有标签:', Object.keys(finalData.tags || {}));

    // 6. 总结
    console.log('📊 测试总结:');
    console.log('- 删除前:', existsBefore);
    console.log('- 删除后立即:', existsImmediately);
    console.log('- 等待2秒后:', existsAfterWait);
    console.log('- 最终状态:', existsFinal);

    if (existsFinal) {
      console.log('❌ 问题确认：标签被重新创建了');
      console.log('重新创建的标签数据:', finalData.tags[normalizedTag]);
    } else {
      console.log('✅ 删除成功：标签已彻底删除');
    }

    return {
      before: existsBefore,
      immediately: existsImmediately,
      afterWait: existsAfterWait,
      final: existsFinal
    };

  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    return { error: error.message };
  }
};

console.log('✅ 最简单测试脚本已加载');
console.log('使用方法: await ultraSimpleTest("娱乐")');