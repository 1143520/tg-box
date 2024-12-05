async function uploadFile(file, type = 'file') {
    const formData = new FormData();
    const fieldName = type === 'image' ? 'image' : 'file';
    formData.append(fieldName, file);

    // 获取当前存储类型
    const storageType = getCurrentStorage();
    console.log(`使用存储类型: ${storageType}`);

    const endpoint = type === 'image' ? '/images' : '/files/upload';
    try {
        // 创建请求头对象
        const headers = new Headers();
        headers.append('X-Storage-Type', storageType);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,  // 使用 Headers 对象
            body: formData
        });

        console.log('上传响应状态:', response.status);
        const data = await response.json();
        console.log('上传响应内容:', data);

        if (!response.ok) {
            throw new Error(data.error || '上传失败');
        }

        if (!data.url) {
            throw new Error('上传成功但未返回文件URL');
        }

        return data;
    } catch (error) {
        console.error('上传错误:', error);
        throw error;
    }
}

// 获取当前存储类型
function getCurrentStorage() {
    return localStorage.getItem('storageType') || 'KV';
}

// 添加存储类型切换功能
async function initStorageToggle() {
    // 创建切换按钮
    const storageToggle = document.createElement('button');
    storageToggle.className = 'storage-toggle';
    storageToggle.setAttribute('aria-label', '切换存储类型');
    
    // 从 localStorage 获取存储类型，如果没有则从服务器获取默认值
    let currentStorage = localStorage.getItem('storageType');
    if (!currentStorage) {
        try {
            const response = await fetch('/vars/STORAGE_TYPE');
            currentStorage = await response.text();
            localStorage.setItem('storageType', currentStorage);
        } catch (error) {
            console.error('获取默认存储类型失败:', error);
            currentStorage = 'KV';
            localStorage.setItem('storageType', currentStorage);
        }
    }

    // 更新按钮文本
    updateStorageButtonText(storageToggle, currentStorage);

    // 添加切换事件
    storageToggle.addEventListener('click', () => {
        const newStorage = currentStorage === 'KV' ? 'TELEGRAM' : 'KV';
        localStorage.setItem('storageType', newStorage);
        currentStorage = newStorage;
        updateStorageButtonText(storageToggle, currentStorage);
        console.log('存储类型已切换为:', newStorage);
    });

    // 添加到页面
    document.body.appendChild(storageToggle);
}

// 更新存储切换按钮的文本
function updateStorageButtonText(button, storageType) {
    button.textContent = storageType === 'KV' ? '当前：KV存储' : '当前：TG存储';
} 