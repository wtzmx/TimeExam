document.addEventListener('DOMContentLoaded', function() {
  // 侧边栏导航处理
  const navItems = document.querySelectorAll('.sidebar-nav li');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault(); // 阻止默认的链接行为
      
      // 移除其他项目的active类
      navItems.forEach(i => i.classList.remove('active'));
      // 添加当前项目的active类
      this.classList.add('active');
      
      // 获取目标section的id
      const targetId = this.querySelector('a').getAttribute('href').slice(1);
      showSection(targetId);
    });
  });

  // 添加考试管理相关的事件监听
  initExamManagement();

  // 检查URL hash并显示对应页面
  checkUrlHash();

  // 添加 hash 变化监听
  window.addEventListener('hashchange', checkUrlHash);

  // 设置默认的时间段模式
  const defaultRangeToggles = ['register', 'payment', 'admission'];
  defaultRangeToggles.forEach(id => {
    const toggle = document.getElementById(`${id}_toggle`);
    if (toggle) {
      toggle.checked = true;
      handleTimeTypeChange({ target: toggle });
    }
  });
});

function initExamManagement() {
  // 新增考试按钮
  const addExamBtn = document.getElementById('addExamBtn');
  if (addExamBtn) {
    addExamBtn.addEventListener('click', () => {
      showAddExamModal();
    });
  }

  // 导出备份按钮
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportExamBackup);
  }

  // 导入备份按钮
  const importBtn = document.getElementById('importBtn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => handleImportFile(e.target.files[0]);
      input.click();
    });
  }

  // 搜索框
  const searchInput = document.getElementById('examSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterExamList(searchTerm);
    });
  }

  // 初始加载考试列表
  loadExamList();
}

async function loadExamList() {
  const tableBody = document.getElementById('examTableBody');
  if (!tableBody) return;

  try {
    const { exams = [] } = await chrome.storage.local.get('exams');
    
    tableBody.innerHTML = exams.map(exam => {
      const findTimeNode = (id) => exam.timeNodes.find(node => node.id === id);
      const status = getExamStatus(exam);
      
      return `
        <tr data-exam-id="${exam.id}">
          <td>${exam.examName}</td>
          <td>
            <div class="exam-status ${status.class}">
              <span class="status-text">${status.text}</span>
              <span class="status-detail">${status.detail}</span>
            </div>
          </td>
          <td>${formatTimeNode(findTimeNode('announcement'))}</td>
          <td>${formatTimeNode(findTimeNode('registration'))}</td>
          <td>${formatTimeNode(findTimeNode('payment'))}</td>
          <td>${formatTimeNode(findTimeNode('admission'))}</td>
          <td>${formatTimeNode(findTimeNode('written'))}</td>
          <td>${formatTimeNode(findTimeNode('interview'))}</td>
          <td>
            <a href="${exam.announcementUrl}" target="_blank" class="exam-link" title="公告链接">
              <span class="material-icons">link</span>
            </a>
            ${exam.registrationUrl ? `
              <a href="${exam.registrationUrl}" target="_blank" class="exam-link" title="报名链接">
                <span class="material-icons">how_to_reg</span>
              </a>
            ` : ''}
          </td>
          <td>
            <div class="exam-actions">
              <button class="exam-action-button edit-exam" title="编辑">
                <span class="material-icons">edit</span>
              </button>
              <button class="exam-action-button delete-exam" title="删除">
                <span class="material-icons">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // 添加事件监听器
    addExamActionListeners();

  } catch (error) {
    console.error('加载考试列表失败:', error);
  }
}

// 添加新函数来处理考试操作的事件监听
function addExamActionListeners() {
  const examRows = document.querySelectorAll('#examTableBody tr');
  
  examRows.forEach(row => {
    const examId = row.dataset.examId;
    
    // 编辑按钮
    const editBtn = row.querySelector('.edit-exam');
    if (editBtn) {
      editBtn.addEventListener('click', () => editExam(examId));
    }
    
    // 删除按钮
    const deleteBtn = row.querySelector('.delete-exam');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteExam(examId));
    }
  });
}

// 编辑考试函数
async function editExam(examId) {
  try {
    const { exams = [] } = await chrome.storage.local.get('exams');
    const exam = exams.find(e => e.id.toString() === examId.toString());
    if (exam) {
      // TODO: 实现编辑功能
      console.log('编辑考试:', exam);
    }
  } catch (error) {
    console.error('编辑考试失败:', error);
  }
}

// 删除考试函数
async function deleteExam(examId) {
  if (confirm('确定要删除这条考试记录吗？')) {
    try {
      const { exams = [] } = await chrome.storage.local.get('exams');
      const newExams = exams.filter(e => e.id.toString() !== examId.toString());
      await chrome.storage.local.set({ exams: newExams });
      loadExamList(); // 重新加载列表
    } catch (error) {
      console.error('删除考试失败:', error);
    }
  }
}

function filterExamList(searchTerm) {
  const rows = document.querySelectorAll('#examTableBody tr');
  rows.forEach(row => {
    const examName = row.cells[0].textContent.toLowerCase();
    row.style.display = examName.includes(searchTerm) ? '' : 'none';
  });
}

function calculateCountdown(date) {
  const diff = new Date(date) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? `${days}天` : '已结束';
}

// 修改考试状态判断函数
function getExamStatus(exam) {
  const now = new Date();
  
  // 找到所有有时间的节点（排除未设置时间的节点）
  const validTimeNodes = exam.timeNodes.filter(node => 
    node.startTime && (node.type === 'single' || node.endTime)
  );

  if (validTimeNodes.length === 0) return '未设置';

  // 按时间排序，找到最早和最晚的时间点
  const sortedNodes = validTimeNodes.sort((a, b) => {
    const aTime = new Date(a.startTime);
    const bTime = new Date(b.startTime);
    return aTime - bTime;
  });

  const firstNode = sortedNodes[0];
  const lastNode = sortedNodes[sortedNodes.length - 1];
  const examStartTime = new Date(firstNode.startTime);
  const examEndTime = new Date(lastNode.type === 'single' ? lastNode.startTime : lastNode.endTime);

  // 状态判断
  if (now < examStartTime) {
    // 考试还未开始
    const daysToStart = Math.ceil((examStartTime - now) / (1000 * 60 * 60 * 24));
    return {
      text: '未开始',
      class: 'status-upcoming',
      detail: `${daysToStart}天后开始`
    };
  } else if (now > examEndTime) {
    // 考试已结束
    return {
      text: '已结束',
      class: 'status-ended',
      detail: '考试已结束'
    };
  } else {
    // 考试进行中
    const daysToEnd = Math.ceil((examEndTime - now) / (1000 * 60 * 60 * 24));
    return {
      text: '进行中',
      class: 'status-ongoing',
      detail: `剩余${daysToEnd}天`
    };
  }
}

// 添加显示对应section的函数
function showSection(sectionId) {
  // 隐藏所有section
  document.querySelectorAll('.section, .active-section').forEach(section => {
    section.style.display = 'none';
    section.classList.remove('active-section');
  });
  
  // 显示目标section
  let targetSection;
  switch(sectionId) {
    case 'search':
      targetSection = document.getElementById('search-results');
      break;
    case 'favorites':
      targetSection = document.getElementById('exam-management');
      break;
    case 'history':
      targetSection = document.getElementById('calendar-view');
      break;
    case 'settings':
      targetSection = document.getElementById('settings-panel');
      break;
    default:
      targetSection = document.getElementById('search-results');
  }
  
  if (targetSection) {
    targetSection.style.display = 'block';
    targetSection.classList.add('active-section');
  }
}

// 检查URL hash并显示对应页面
function checkUrlHash() {
  const hash = window.location.hash.slice(1) || 'search';
  const correspondingNav = document.querySelector(`.sidebar-nav a[href="#${hash}"]`);
  if (correspondingNav) {
    correspondingNav.parentElement.click();
  }
}

// 添加日期格式化函数
function formatDate(date) {
  if (!date) return '待定';
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 添加日期范围格式化函数
function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '待定';
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

// 添加状态样式的 CSS
const statusStyles = {
  '已结束': 'status-ended',
  '报名中': 'status-registering',
  '未开始': 'status-pending',
  '准考证打印': 'status-admission',
  '缴费阶段': 'status-payment',
  '即将试': 'status-upcoming',
  '未设置': 'status-unset'
};

function showAddExamModal() {
  const modal = document.getElementById('addExamModal');
  const closeBtn = document.getElementById('closeModal');
  const expandBtn = document.getElementById('expandModal');
  const cancelBtn = document.getElementById('cancelExam');
  const saveBtn = document.getElementById('saveExam');
  const modalContent = modal.querySelector('.modal-content');

  // 移除之前可能存在的事件监听器
  const cleanupListeners = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // 移除所有事件监听器
    closeBtn?.removeEventListener('click', closeModal);
    cancelBtn?.removeEventListener('click', closeModal);
    expandBtn?.removeEventListener('click', toggleExpand);
    modal.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', escKeyPress);
  };

  // 关闭模态框函数
  const closeModal = () => {
    cleanupListeners();
  };

  // 切换展开状态函数
  const toggleExpand = () => {
    modalContent.classList.toggle('expanded');
    expandBtn.querySelector('.material-icons').textContent = 
      modalContent.classList.contains('expanded') ? 'close_fullscreen' : 'open_in_full';
  };

  // 点击外部区域函数
  const outsideClick = (e) => {
    if (e.target === modal) {
      cleanupListeners();
    }
  };

  // ESC键按下函数
  const escKeyPress = (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      cleanupListeners();
    }
  };

  // 显示模态框
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // 添加事件监听器
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  expandBtn?.addEventListener('click', toggleExpand);
  modal.addEventListener('click', outsideClick);
  document.addEventListener('keydown', escKeyPress);

  // 添加时间节点类型切换处理
  const toggleInputs = document.querySelectorAll('.toggle-input');
  toggleInputs.forEach(toggle => {
    toggle.addEventListener('change', handleTimeTypeChange);
  });

  // 添加自定义时间节点按钮处理
  const addTimePointBtn = document.getElementById('addTimePoint');
  if (addTimePointBtn) {
    addTimePointBtn.addEventListener('click', addCustomTimePoint);
  }

  // 表单提交处理
  const examForm = document.getElementById('examForm');
  if (examForm) {
    examForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(examForm);
      const result = await saveExamData(formData);
      
      if (result.success) {
        // 重新加载考试列表
        loadExamList();
        // 关闭模态框
        cleanupListeners();
        // 可以添加成功提示
        alert('考试信息保存成功！');
      } else {
        alert('保失败：' + result.error);
      }
    });
  }
}

// 修改处理时间类型切换的函数
function handleTimeTypeChange(event) {
  const toggle = event.target;
  const timePointItem = toggle.closest('.time-point-item');
  const inputsContainer = timePointItem.querySelector('.time-point-inputs');
  const timePointId = timePointItem.dataset.id;
  const isRequired = timePointItem.querySelector('.required') !== null;
  const requiredAttr = isRequired ? 'required' : '';

  if (toggle.checked) {
    // 时间段模式
    inputsContainer.innerHTML = `
      <input type="datetime-local" name="${timePointId}StartDate" ${requiredAttr}>
      <span class="date-separator">至</span>
      <input type="datetime-local" name="${timePointId}EndDate" ${requiredAttr}>
    `;
    inputsContainer.classList.add('range');
  } else {
    // 时间点模式
    inputsContainer.innerHTML = `
      <input type="datetime-local" name="${timePointId}Date" ${requiredAttr}>
    `;
    inputsContainer.classList.remove('range');
  }
}

// 修改添加自定义时间节点的函数
function addCustomTimePoint() {
  const container = document.getElementById('timePointsContainer');
  const timePointId = 'custom_' + Date.now();
  const addButton = container.querySelector('.add-time-point-btn');
  
  const timePointElement = document.createElement('div');
  timePointElement.className = 'time-point-item';
  timePointElement.dataset.id = timePointId;
  
  timePointElement.innerHTML = `
    <div class="time-point-header">
      <input type="text" class="time-point-name" placeholder="输入时间节点名称">
      <div class="toggle-switch">
        <input type="checkbox" id="${timePointId}_toggle" class="toggle-input">
        <label for="${timePointId}_toggle" class="toggle-label">
          <span class="toggle-text">时间点</span>
          <span class="toggle-text">时间段</span>
        </label>
      </div>
    </div>
    <div class="time-point-inputs">
      <input type="datetime-local" name="${timePointId}Date">
    </div>
  `;

  // 将新时间节点插入到添加按钮之前
  container.insertBefore(timePointElement, addButton);
  
  // 添加事件监听
  const toggle = timePointElement.querySelector('.toggle-input');
  toggle.addEventListener('change', handleTimeTypeChange);
}

// 添加保存考试数据的函数
async function saveExamData(formData) {
  try {
    const examId = Date.now();
    const timeNodes = [];
    const timePointItems = document.querySelectorAll('.time-point-item');
    
    timePointItems.forEach(item => {
      const id = item.dataset.id;
      // 修正ID映射 - 确保与备份文件格式一致
      const nodeId = {
        'announce': 'announcement',
        'register': 'registration',
        'payment': 'payment',
        'admission': 'admission',
        'written': 'written',
        'interview': 'interview'
      }[id] || id;
      
      const label = item.querySelector('label')?.textContent.replace(' *', '') || 
                   item.querySelector('.time-point-name')?.value;
      const isRange = item.querySelector('.toggle-input')?.checked;
      
      let timeNode = {
        id: nodeId,
        label: label,
        type: isRange ? 'range' : 'single'
      };

      if (isRange) {
        timeNode.startTime = item.querySelector(`[name="${id}StartDate"]`)?.value || '';
        timeNode.endTime = item.querySelector(`[name="${id}EndDate"]`)?.value || '';
      } else {
        const singleTime = item.querySelector(`[name="${id}Date"]`)?.value || '';
        timeNode.startTime = singleTime;
        timeNode.endTime = singleTime;
      }

      timeNodes.push(timeNode);
    });

    // 构建考试数据对象
    const examData = {
      id: examId,
      examName: formData.get('examName'),
      examType: 'civil',
      announcementUrl: formData.get('examUrl'),
      registrationUrl: formData.get('registerUrl'),
      timeNodes: timeNodes,
      notes: formData.get('notes'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 获取现有数据
    const { exams = [] } = await chrome.storage.local.get('exams');
    
    // 添加新数据
    exams.push(examData);
    
    // 保存到存储
    await chrome.storage.local.set({ exams });
    
    return { success: true, examId };
  } catch (error) {
    console.error('保存考试数据失败:', error);
    return { success: false, error: error.message };
  }
}

// 修改时间节点格式化函数
function formatTimeNode(node) {
  if (!node || (!node.startTime && !node.endTime)) return '待定';
  
  // 特殊处理公告发布日期
  if (node.id === 'announcement') {
    return `<div class="time-node-display">
      <div>${formatDateTime(node.startTime)}</div>
    </div>`;
  }
  
  const now = new Date();
  const startDate = new Date(node.startTime);
  const endDate = new Date(node.type === 'single' ? node.startTime : node.endTime);
  
  // 计算时间差（天数）
  const diffToStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
  const diffToEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  
  // 确定状态和提示文本
  let statusClass = '';
  let statusText = '';
  
  if (now > endDate) {
    statusClass = 'time-status-ended';
    statusText = '已结束';
  } else if (now >= startDate && now <= endDate) {
    statusClass = 'time-status-ongoing';
    statusText = `进行中 剩${diffToEnd}天`;
  } else {
    statusClass = 'time-status-upcoming';
    statusText = `${diffToStart}天后 开始`;
  }

  if (node.type === 'single' || node.startTime === node.endTime) {
    return `
      <div class="time-node-display">
        <div>${formatDateTime(node.startTime)}</div>
        <div class="time-status ${statusClass}">${statusText}</div>
      </div>
    `;
  }
  
  return `
    <div class="time-node-display">
      <div class="date-range-display">
        <div>${formatDateTime(node.startTime)}</div>
        <div>${formatDateTime(node.endTime)}</div>
      </div>
      <div class="time-status ${statusClass}">${statusText}</div>
    </div>
  `;
}

// 修改日期时间格式化函数
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  
  const date = new Date(dateTimeStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace('/', '-');
}

// 添加处理导入文件的函数
async function handleImportFile(file) {
  if (!file) return;

  try {
    // 读取文件内容
    const text = await file.text();
    const data = JSON.parse(text);

    // 验证备份文件格式
    if (!data.examRecords || !Array.isArray(data.examRecords)) {
      throw new Error('无效的备份文件格式');
    }

    // 确认导入
    if (!confirm(`确认导入 ${data.examRecords.length} 条考试记录？\n注意：这将覆盖现有数据！`)) {
      return;
    }

    // 获取现有数据
    const { exams = [] } = await chrome.storage.local.get('exams');

    // 处理每条记录
    const processedRecords = data.examRecords.map(record => {
      // 确保每条记录都有必要的字段
      return {
        id: record.id || Date.now(),
        examName: record.examName,
        examType: record.examType || 'civil',
        announcementUrl: record.announcementUrl,
        registrationUrl: record.registrationUrl || '',
        timeNodes: record.timeNodes.map(node => ({
          id: node.id,
          label: node.label,
          type: node.type,
          startTime: node.startTime || '',
          endTime: node.endTime || ''
        })),
        notes: record.notes || '',
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString()
      };
    });

    // 合并数据（可以选择不同的合并策略）
    const mergeStrategy = await showMergeDialog();
    let newExams;

    switch (mergeStrategy) {
      case 'replace':
        newExams = processedRecords;
        break;
      case 'append':
        newExams = [...exams, ...processedRecords];
        break;
      case 'merge':
        newExams = mergeExamRecords(exams, processedRecords);
        break;
      default:
        return; // 用户取消操作
    }

    // 保存到存储
    await chrome.storage.local.set({ exams: newExams });

    // 重新加载列表
    loadExamList();

    // 显示成功消息
    alert(`成功导入 ${processedRecords.length} 条考试记录！`);

  } catch (error) {
    console.error('导入失败:', error);
    alert('导入失败: ' + error.message);
  }
}

// 显示合并策略选择对话框
function showMergeDialog() {
  return new Promise((resolve) => {
    const result = confirm(
      '请选择导入方式：\n' +
      '确定 - 替换现有数据\n' +
      '取消 - 追加到现有数据'
    );
    resolve(result ? 'replace' : 'append');
  });
}

// 合并考试记录
function mergeExamRecords(existing, imported) {
  const merged = [...existing];
  const existingIds = new Set(existing.map(exam => exam.id));

  imported.forEach(importedExam => {
    const index = merged.findIndex(exam => exam.id === importedExam.id);
    if (index !== -1) {
      // 更新现有记录
      merged[index] = {
        ...merged[index],
        ...importedExam,
        updatedAt: new Date().toISOString()
      };
    } else {
      // 添加新记录
      merged.push(importedExam);
    }
  });

  return merged;
}

// 修改导出备份函数，使其格式与导入一致
async function exportExamBackup() {
  try {
    const { exams = [] } = await chrome.storage.local.get('exams');
    const backupData = {
      exportDate: new Date().toISOString(),
      examRecords: exams
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_records_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + error.message);
  }
} 