// 内容脚本 - 用于页面内容交互
console.log('Smart Bookmark Extension - Content Script Loaded');

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_INFO') {
    // 获取页面信息
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
    };
    sendResponse(pageInfo);
  }
});

// 监听页面选中文本
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText && selectedText.length > 0) {
    // 存储选中的文本，供扩展使用
    chrome.storage.local.set({ selectedText });
  }
});