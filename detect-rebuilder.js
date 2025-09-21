// 检测标签重建者的脚本
console.log('=== 标签重建检测器 ===');

window.rebuildDetector = {
  // 监控所有可能的标签重建源
  async startMonitoring() {
    console.log('开始监控标签重建...');

    // 监控chrome.storage.onChanged
    let originalListeners = [];

    if (chrome.storage.onChanged.hasListeners) {
      console.log('检测到现有的存储监听器');
    }

    // 拦截addListener调用
    const originalAddListener = chrome.storage.onChanged.addListener;
    chrome.storage.onChanged.addListener = function(listener) {
      console.log('新的存储监听器被添加:', listener.toString());
      originalListeners.push(listener);
      return originalAddListener.call(this, function(...args) {
        console.log('存储监听器被触发:', args);
        return listener.apply(this, args);
      });
    };

    // 监控chrome.storage.local.set调用
    const originalSet = chrome.storage.local.set;
    chrome.storage.local.set = function(items, callback) {
      console.log('storage.local.set被调用:', items);
      console.trace('调用堆栈:');
      return originalSet.call(this, items, callback);
    };

    console.log('监控已启动');
  },

  // 检测当前的重建逻辑
  async detectRebuilder() {
    console.log('=== 检测重建逻辑 ===');

    // 1. 创建一个测试场景
    const testTagName = 'test-tag-' + Date.now();

    // 2. 先添加一个带有测试标签的书签
    const data = await chrome.storage.local.get(null);
    const testBookmark = {
      id: 'test-bookmark-' + Date.now(),
      title: '测试书签',
      url: 'https://test.com',
      tags: [testTagName],
      createdAt: new Date().toISOString()
    };

    const updatedBookmarks = [...(data.bookmarks || []), testBookmark];

    await chrome.storage.local.set({
      ...data,
      bookmarks: updatedBookmarks
    });

    console.log(`已添加测试书签，包含标签: ${testTagName}`);

    // 3. 等待一下看是否自动创建标签
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. 检查标签是否被创建
    const afterData = await chrome.storage.local.get(null);
    const normalizedTestTag = testTagName.toLowerCase();
    const wasCreated = afterData.tags && afterData.tags[normalizedTestTag];

    console.log(`测试标签是否被自动创建: ${wasCreated ? '是' : '否'}`);

    if (wasCreated) {
      console.log('发现自动创建标签的逻辑！');
      console.log('创建的标签数据:', afterData.tags[normalizedTestTag]);
    }

    // 5. 清理测试数据
    const cleanData = await chrome.storage.local.get(null);
    const cleanBookmarks = cleanData.bookmarks.filter(b => b.id !== testBookmark.id);
    const cleanTags = { ...cleanData.tags };
    delete cleanTags[normalizedTestTag];

    await chrome.storage.local.set({
      ...cleanData,
      bookmarks: cleanBookmarks,
      tags: cleanTags
    });

    console.log('测试数据已清理');

    return { wasCreated, testTagName };
  },

  // 深度分析重建时机
  async analyzeRebuildTiming() {
    console.log('=== 分析重建时机 ===');

    const originalConsoleLog = console.log;
    const logs = [];

    // 拦截所有console.log
    console.log = function(...args) {
      const message = args.join(' ');
      logs.push({ timestamp: Date.now(), message });
      originalLog.apply(console, arguments);
    };

    // 执行一系列可能触发重建的操作
    console.log('开始时机分析...');

    // 1. 触发存储变化
    await chrome.storage.local.set({ trigger1: Date.now() });
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. 获取数据
    await chrome.storage.local.get(null);
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. 如果StorageManager可用，触发它
    try {
      if (window.StorageManager) {
        const sm = window.StorageManager.getInstance();
        await sm.getData();
      }
    } catch (e) {
      console.log('StorageManager触发失败:', e.message);
    }

    // 恢复console.log
    console.log = originalConsoleLog;

    console.log('时机分析完成，捕获的日志:');
    logs.forEach(log => console.log(`[${log.timestamp}] ${log.message}`));

    return logs;
  },

  // 完整的重建源检测
  async runFullDetection() {
    console.log('=== 运行完整检测 ===');

    console.log('\n1. 启动监控');
    await this.startMonitoring();

    console.log('\n2. 检测重建逻辑');
    const rebuildResult = await this.detectRebuilder();

    console.log('\n3. 分析时机');
    await this.analyzeRebuildTiming();

    console.log('\n检测完成！');
    return rebuildResult;
  }
};

console.log('重建检测器已加载！使用: await rebuildDetector.runFullDetection()');