// UI相关函数
function toggleSettings(e) {
    // 阻止事件冒泡，防止触发document的点击事件
    e && e.stopPropagation();
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('show');
}

// 改进的Toast显示函数 - 支持队列显示多个Toast
const toastQueue = [];
let isShowingToast = false;

function showToast(message, type = 'error') {
    // 将新的toast添加到队列
    toastQueue.push({ message, type });
    
    // 如果当前没有显示中的toast，则开始显示
    if (!isShowingToast) {
        showNextToast();
    }
}

function showNextToast() {
    if (toastQueue.length === 0) {
        isShowingToast = false;
        return;
    }
    
    isShowingToast = true;
    const { message, type } = toastQueue.shift();
    
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    const bgColors = {
        'error': 'bg-red-500',
        'success': 'bg-green-500',
        'info': 'bg-blue-500',
        'warning': 'bg-yellow-500'
    };
    
    const bgColor = bgColors[type] || bgColors.error;
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${bgColor} text-white`;
    toastMessage.textContent = message;
    
    // 显示提示
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-100%)';
        
        // 等待动画完成后显示下一个toast
        setTimeout(() => {
            showNextToast();
        }, 300);
    }, 3000);
}

// 添加显示/隐藏 loading 的函数
let loadingTimeoutId = null;

function showLoading(message = '加载中...') {
    // 清除任何现有的超时
    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
    }
    
    const loading = document.getElementById('loading');
    const messageEl = loading.querySelector('p');
    messageEl.textContent = message;
    loading.style.display = 'flex';
    
    // 设置30秒后自动关闭loading，防止无限loading
    loadingTimeoutId = setTimeout(() => {
        hideLoading();
        showToast('操作超时，请稍后重试', 'warning');
    }, 30000);
}

function hideLoading() {
    // 清除超时
    if (loadingTimeoutId) {
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    }
    
    const loading = document.getElementById('loading');
    loading.style.display = 'none';
}

function updateSiteStatus(isAvailable) {
    const statusEl = document.getElementById('siteStatus');
    if (isAvailable) {
        statusEl.innerHTML = '<span class="text-green-500">●</span> 可用';
    } else {
        statusEl.innerHTML = '<span class="text-red-500">●</span> 不可用';
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    // 清除 iframe 内容
    document.getElementById('modalContent').innerHTML = '';
}

// 获取搜索历史的增强版本 - 支持新旧格式
function getSearchHistory() {
    try {
        const data = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (!data) return [];
        
        const parsed = JSON.parse(data);
        
        // 检查是否是数组
        if (!Array.isArray(parsed)) return [];
        
        // 支持旧格式（字符串数组）和新格式（对象数组）
        return parsed.map(item => {
            if (typeof item === 'string') {
                return { text: item, timestamp: 0 };
            }
            return item;
        }).filter(item => item && item.text);
    } catch (e) {
        console.error('获取搜索历史出错:', e);
        return [];
    }
}

// 保存搜索历史的增强版本 - 添加时间戳和最大数量限制，现在缓存2个月
function saveSearchHistory(query) {
    if (!query || !query.trim()) return;
    
    // 清理输入，防止XSS
    query = query.trim().substring(0, 50).replace(/</g, '<').replace(/>/g, '>');
    
    let history = getSearchHistory();
    
    // 获取当前时间
    const now = Date.now();
    
    // 过滤掉超过2个月的记录（约60天，60*24*60*60*1000 = 5184000000毫秒）
    history = history.filter(item => 
        typeof item === 'object' && item.timestamp && (now - item.timestamp < 5184000000)
    );
    
    // 删除已存在的相同项
    history = history.filter(item => 
        typeof item === 'object' ? item.text !== query : item !== query
    );
    
    // 新项添加到开头，包含时间戳
    history.unshift({
        text: query,
        timestamp: now
    });
    
    // 限制历史记录数量
    if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
    }
    
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('保存搜索历史失败:', e);
        // 如果存储失败（可能是localStorage已满），尝试清理旧数据
        try {
            localStorage.removeItem(SEARCH_HISTORY_KEY);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 3)));
        } catch (e2) {
            console.error('再次保存搜索历史失败:', e2);
        }
    }
    
    renderSearchHistory();
}

// 渲染最近搜索历史的增强版本
function renderSearchHistory() {
    const historyContainer = document.getElementById('recentSearches');
    if (!historyContainer) return;
    
    const history = getSearchHistory();
    
    if (history.length === 0) {
        historyContainer.innerHTML = '';
        return;
    }
    
    historyContainer.innerHTML = '<div class="text-gray-500 w-full mb-2">最近搜索:</div>';
    
    history.forEach(item => {
        const tag = document.createElement('button');
        tag.className = 'search-tag';
        tag.textContent = item.text;
        
        // 添加时间提示（如果有时间戳）
        if (item.timestamp) {
            const date = new Date(item.timestamp);
            tag.title = `搜索于: ${date.toLocaleString()}`;
        }
        
        tag.onclick = function() {
            document.getElementById('searchInput').value = item.text;
            search();
        };
        historyContainer.appendChild(tag);
    });
}

// 增加清除搜索历史功能
function clearSearchHistory() {
    try {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        renderSearchHistory();
        showToast('搜索历史已清除', 'success');
    } catch (e) {
        console.error('清除搜索历史失败:', e);
        showToast('清除搜索历史失败', 'error');
    }
}

// 新增密钥验证逻辑
// 预设密钥（请替换为您的实际密钥）
const SECRET_KEY = "aihezhuang"; // Guest 密钥
const VIP_CREDENTIALS = { username: "vipuser", password: "hezhuanglove" }; // VIP 账号密码 (A)
const SVIP_CREDENTIALS = { username: "svipuser", password: "Hertzsuperlove" }; // SVIP 账号密码 (B)
const LOGIN_DURATION = 24 * 60 * 60 * 1000;
// 初始化页面状态
function initSettings() {
    const guestLogin = JSON.parse(localStorage.getItem('guestLogin'));
    const vipLogin = JSON.parse(localStorage.getItem('vipLogin'));
    const svipLogin = JSON.parse(localStorage.getItem('svipLogin'));
    const currentTime = Date.now();
    const logoutBtn = document.getElementById('logoutBtn');
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    const adFilterToggle = document.getElementById('adFilterToggle');

    // 确保开关元素存在
    if (!yellowFilterToggle || !adFilterToggle) {
        console.error("开关元素未找到:", { yellowFilterToggle, adFilterToggle });
        return;
    }

    // SVIP 已登录
    if (svipLogin && (currentTime - svipLogin.timestamp) < LOGIN_DURATION) {
        document.getElementById('apiSourceContainer').classList.remove('hidden');
        document.getElementById('yellowFilterContainer').classList.remove('hidden');
        document.getElementById('yellowFilterSwitch').classList.remove('hidden');
        document.getElementById('adFilterSwitch').classList.remove('hidden');
        document.getElementById('keyVerification').classList.add('hidden');
        document.getElementById('vipLogin').classList.add('hidden');
        document.getElementById('userStatus').textContent = "用户: SVIP";
        logoutBtn.classList.remove('hidden');
        console.log("SVIP 登录状态恢复");
    }
    // VIP 已登录
    else if (vipLogin && (currentTime - vipLogin.timestamp) < LOGIN_DURATION) {
        document.getElementById('apiSourceContainer').classList.add('hidden');
        document.getElementById('yellowFilterContainer').classList.remove('hidden');
        document.getElementById('yellowFilterSwitch').classList.remove('hidden');
        document.getElementById('adFilterSwitch').classList.remove('hidden');
        document.getElementById('keyVerification').classList.add('hidden');
        document.getElementById('vipLogin').classList.add('hidden');
        document.getElementById('userStatus').textContent = "用户: VIP";
        logoutBtn.classList.remove('hidden');
        console.log("VIP 登录状态恢复");
    }
    // Guest 已登录
    else if (guestLogin && (currentTime - guestLogin.timestamp) < LOGIN_DURATION) {
        document.getElementById('apiSourceContainer').classList.add('hidden');
        document.getElementById('yellowFilterContainer').classList.remove('hidden');
        document.getElementById('yellowFilterSwitch').classList.add('hidden');
        document.getElementById('adFilterSwitch').classList.remove('hidden');
        document.getElementById('keyVerification').classList.add('hidden');
        document.getElementById('userStatus').textContent = "用户: Guest 未登录";
        logoutBtn.classList.remove('hidden');
        bindVipLoginEvent();
        console.log("Guest 登录状态恢复");
    }
    // 未登录
    else {
        localStorage.removeItem('guestLogin');
        localStorage.removeItem('vipLogin');
        localStorage.removeItem('svipLogin');
        localStorage.removeItem('yellowFilterEnabled');
        localStorage.removeItem(PLAYER_CONFIG.adFilteringStorage);
        document.getElementById('apiSourceContainer').classList.add('hidden');
        document.getElementById('yellowFilterContainer').classList.add('hidden');
        document.getElementById('yellowFilterSwitch').classList.add('hidden');
        document.getElementById('adFilterSwitch').classList.add('hidden');
        document.getElementById('keyVerification').classList.remove('hidden');
        document.getElementById('userStatus').textContent = "用户: 未登录";
        logoutBtn.classList.add('hidden');
        console.log("未登录状态");
    }

    // 恢复保存的开关状态（在登录逻辑之后）
    const yellowFilterState = localStorage.getItem('yellowFilterEnabled');
    const adFilterState = localStorage.getItem(PLAYER_CONFIG.adFilteringStorage);
    yellowFilterToggle.checked = yellowFilterState === 'true' || yellowFilterState === null; // 默认 true
    adFilterToggle.checked = adFilterState === 'true'; // 默认 false
    console.log("恢复开关状态 - 黄色内容:", yellowFilterToggle.checked, "分片广告:", adFilterToggle.checked);
}

// 绑定 VIP 登录点击事件
function bindVipLoginEvent() {
    const vipLogin = document.getElementById('vipLogin');
    if (vipLogin) {
        vipLogin.removeEventListener('click', showVipModal);
        vipLogin.addEventListener('click', showVipModal);
    }
}

// 验证 Guest 密钥
function verifyKey() {
    const keyInput = document.getElementById('keyInput');
    const inputValue = keyInput.value;

    if (inputValue === SECRET_KEY) {
        localStorage.setItem('guestLogin', JSON.stringify({ timestamp: Date.now() }));
        localStorage.removeItem('vipLogin');
        localStorage.removeItem('svipLogin');
        document.getElementById('adFilterSwitch').classList.remove('hidden');
        document.getElementById('yellowFilterContainer').classList.remove('hidden');
        document.getElementById('yellowFilterSwitch').classList.add('hidden');
        document.getElementById('keyVerification').classList.add('hidden');
        document.getElementById('userStatus').textContent = "用户: Guest 未登录";
        document.getElementById('logoutBtn').classList.remove('hidden');
        showToast('Guest 验证成功', 'success');
        bindVipLoginEvent();
    } else {
        showToast('密钥错误', 'error');
    }
    keyInput.value = '';
}

// 显示 VIP/SVIP 登录模态框
function showVipModal() {
    document.getElementById('vipModal').classList.remove('hidden');
}

// 关闭 VIP/SVIP 登录模态框
function closeVipModal() {
    document.getElementById('vipModal').classList.add('hidden');
    document.getElementById('vipUsername').value = '';
    document.getElementById('vipPassword').value = '';
}

// 验证 VIP/SVIP 登录
function verifyVipLogin() {
    const username = document.getElementById('vipUsername').value;
    const password = document.getElementById('vipPassword').value;

    if (username === VIP_CREDENTIALS.username && password === VIP_CREDENTIALS.password) {
        localStorage.setItem('vipLogin', JSON.stringify({ timestamp: Date.now() }));
        localStorage.removeItem('guestLogin');
        localStorage.removeItem('svipLogin');
        document.getElementById('yellowFilterSwitch').classList.remove('hidden');
        document.getElementById('vipLogin').classList.add('hidden');
        document.getElementById('adFilterSwitch').classList.remove('hidden');
        document.getElementById('keyVerification').classList.add('hidden');
        document.getElementById('userStatus').textContent = "用户: VIP";
        document.getElementById('logoutBtn').classList.remove('hidden');
        closeVipModal();
        showToast('VIP 登录成功', 'success');
    } else if (username === SVIP_CREDENTIALS.username && password === SVIP_CREDENTIALS.password) {
        localStorage.setItem('svipLogin', JSON.stringify({ timestamp: Date.now() }));
        localStorage.removeItem('guestLogin');
        localStorage.removeItem('vipLogin');
        document.getElementById('yellowFilterSwitch').classList.remove('hidden');
        document.getElementById('vipLogin').classList.add('hidden');
        document.getElementById('apiSourceContainer').classList.remove('hidden');
        document.getElementById('adFilterSwitch').classList.remove('hidden');
        document.getElementById('keyVerification').classList.add('hidden');
        document.getElementById('userStatus').textContent = "用户: SVIP";
        document.getElementById('logoutBtn').classList.remove('hidden');
        closeVipModal();
        showToast('SVIP 登录成功', 'success');
    } else {
        showToast('用户名或密码错误', 'error');
    }
    document.getElementById('vipUsername').value = '';
    document.getElementById('vipPassword').value = '';
}

// 退出登录
function logout() {
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    const adFilterToggle = document.getElementById('adFilterToggle');

    localStorage.removeItem('guestLogin');
    localStorage.removeItem('vipLogin');
    localStorage.removeItem('svipLogin');
    localStorage.removeItem('yellowFilterEnabled');
    localStorage.removeItem(PLAYER_CONFIG.adFilteringStorage);
    document.getElementById('apiSourceContainer').classList.add('hidden');
    document.getElementById('yellowFilterContainer').classList.add('hidden');
    document.getElementById('yellowFilterSwitch').classList.add('hidden');
    document.getElementById('adFilterSwitch').classList.add('hidden');
    document.getElementById('keyVerification').classList.remove('hidden');
    document.getElementById('userStatus').textContent = "用户: 未登录";
    document.getElementById('logoutBtn').classList.add('hidden');
    yellowFilterToggle.checked = true; // 恢复默认打开
    adFilterToggle.checked = false; // 恢复默认关闭
    showToast('已退出登录', 'success');
}

// 保存开关状态
function saveFilterState() {
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (yellowFilterToggle && adFilterToggle) {
        localStorage.setItem('yellowFilterEnabled', yellowFilterToggle.checked);
        localStorage.setItem(PLAYER_CONFIG.adFilteringStorage, adFilterToggle.checked);
        console.log("保存开关状态 - 黄色内容:", yellowFilterToggle.checked, "分片广告:", adFilterToggle.checked);
    } else {
        console.error("保存开关状态失败，元素未找到");
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    document.getElementById('keyInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') verifyKey();
    });
    document.getElementById('vipPassword').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') verifyVipLogin();
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 添加搜索框回车事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                search(); // 调用现有的 search() 函数
            }
        });
    }
    
    // 监听开关状态变化
    const yellowFilterToggle = document.getElementById('yellowFilterToggle');
    const adFilterToggle = document.getElementById('adFilterToggle');
    if (yellowFilterToggle) {
        yellowFilterToggle.addEventListener('change', saveFilterState);
    } else {
        console.error("yellowFilterToggle 未找到");
    }
    if (adFilterToggle) {
        adFilterToggle.addEventListener('change', saveFilterState);
    } else {
        console.error("adFilterToggle 未找到");
    }
});



// 其他函数
function toggleSettings(e) {
    e && e.stopPropagation();
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('show');
}

function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const bgColors = { 'error': 'bg-red-500', 'success': 'bg-green-500' };
    toast.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${bgColors[type] || bgColors.error} text-white`;
    toastMessage.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-100%)';
    }, 3000);
}
