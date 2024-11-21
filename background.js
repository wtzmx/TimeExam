// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
  // 初始化存储
  chrome.storage.local.set({
    recentSearches: [],
    apiSettings: {
      baseUrl: '',
      apiKey: ''
    }
  });
});

// 监听来自popup和dashboard的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEARCH') {
    // 处理搜索请求
    handleSearch(request.query).then(sendResponse);
    return true;
  }
});

async function handleSearch(query) {
  // 搜索处理逻辑将在这里实现
  return {
    success: true,
    data: []
  };
} 