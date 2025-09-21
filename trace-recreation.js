// 追踪标签重新创建问题
console.log('🕵️ 启动标签重建追踪器...');

(async function() {
  // 立即检查当前状态
  const initialData = await chrome.storage.local.get(null);
  console.log('🔍 当前存储状态:', {
    tags: Object.keys(initialData.tags || {}),
    deletedDefaultTags: initialData.deletedDefaultTags || [],
    hasYuLe: '娱乐' in (initialData.tags || {}),
    hasYule: 'yule' in (initialData.tags || {}),
    has娱乐: '娱乐' in (initialData.tags || {})
  });

  // 如果娱乐标签存在，尝试查找它的来源
  if ('娱乐' in (initialData.tags || {}) || 'yule' in (initialData.tags || {})) {
    console.log('⚠️ 娱乐标签已存在！');

    // 检查标签的详细信息
    const yuleTag = initialData.tags['娱乐'] || initialData.tags['yule'];
    if (yuleTag) {
      console.log('📋 娱乐标签详情:', yuleTag);
      console.log('创建时间:', yuleTag.createdAt);
      console.log('更新时间:', yuleTag.updatedAt);
    }

    // 检查删除记录
    if (initialData.deletedDefaultTags && initialData.deletedDefaultTags.includes('娱乐')) {
      console.log('❌ 严重问题：娱乐标签在删除记录中，但仍然存在！');
    } else {
      console.log('⚠️ 娱乐标签不在删除记录中');
    }
  }

  // 监控存储变化
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.tags) {
      console.log('📝 标签变化检测:', {
        时间: new Date().toISOString(),
        旧标签: changes.tags.oldValue ? Object.keys(changes.tags.oldValue) : null,
        新标签: changes.tags.newValue ? Object.keys(changes.tags.newValue) : null
      });

      // 检查娱乐标签是否被添加
      const oldHasYule = changes.tags.oldValue && ('娱乐' in changes.tags.oldValue || 'yule' in changes.tags.oldValue);
      const newHasYule = changes.tags.newValue && ('娱乐' in changes.tags.newValue || 'yule' in changes.tags.newValue);

      if (!oldHasYule && newHasYule) {
        console.error('🚨 娱乐标签被重新创建！');
        console.trace('调用堆栈:');
      }
    }

    if (changes.deletedDefaultTags) {
      console.log('🗑️ 删除记录变化:', {
        旧记录: changes.deletedDefaultTags.oldValue,
        新记录: changes.deletedDefaultTags.newValue
      });
    }
  });

  console.log('✅ 追踪器已启动，正在监控标签变化...');
})();