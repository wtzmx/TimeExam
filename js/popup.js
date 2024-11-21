document.addEventListener('DOMContentLoaded', function() {
  // 打开控制面板
  document.getElementById('openDashboard').addEventListener('click', function() {
    chrome.tabs.create({
      url: 'dashboard.html'
    });
  });

  // 添加考试按钮
  document.getElementById('addExam').addEventListener('click', function() {
    chrome.tabs.create({
      url: 'dashboard.html#add-exam'
    });
  });
}); 