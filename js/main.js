// API配置
const API_BASE_URL = '/contents';
const IMAGES_API_URL = '/images';
const FILES_API_URL = '/files';
const FILES_UPLOAD_URL = '/files/upload';
const DOWNLOAD_API_URL = '/download';

// 全局变量
let currentEditId = null;
let lastUpdateTime = Date.now();
let updateCheckInterval;
let contentCache = [];
let contentContainer;
let syncInterval = 30000; // 默认30秒

// 获取同步间隔配置
async function getSyncInterval() {
    try {
        const response = await fetch('/_vars/SYNC_INTERVAL');
        if (response.ok) {
            const interval = await response.text();
            // 确保interval是一个有效的数字且不小于5秒
            const parsedInterval = parseInt(interval);
            if (!isNaN(parsedInterval) && parsedInterval >= 5000) {
                syncInterval = parsedInterval;
                console.log('已从环境变量加载同步间隔:', syncInterval, 'ms');
            }
        }
    } catch (error) {
        console.warn('无法获取同步间隔配置，使用默认值:', syncInterval, 'ms');
    }
}

// 工具函数
function getFileIcon(filename) {
    // 取文件扩展名
    const ext = filename.toLowerCase().split('.').pop();
    
    // Markdown文件
    if (['md', 'markdown', 'mdown', 'mkd'].includes(ext)) return 'markdown';
    
    // 图片文件
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'heic'].includes(ext)) return 'image';
    
    // 文档文件
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'rtf', 'odt', 'pages'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(ext)) return 'excel';
    if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'powerpoint';
    if (['txt', 'log', 'ini', 'conf', 'cfg'].includes(ext)) return 'text';
    
    // 应用程序文件
    if (ext === 'exe') return 'windows';
    if (ext === 'msi') return 'windows-installer';
    if (ext === 'apk') return 'android';
    if (ext === 'app' || ext === 'dmg') return 'macos';
    if (ext === 'deb' || ext === 'rpm') return 'linux';
    if (['appx', 'msix'].includes(ext)) return 'windows-store';
    if (['ipa', 'pkg'].includes(ext)) return 'ios';
    
    // 代码文件
    if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'scss', 'less', 'sass', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'swift', 'kt', 'rs', 'dart', 'vue', 'sql', 'sh', 'bash', 'yml', 'yaml', 'xml'].includes(ext)) return 'code';
    
    // 压缩文件
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz'].includes(ext)) return 'archive';
    
    // 视频文件
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg', 'ogv'].includes(ext)) return 'video';
    
    // 音频文件
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus', 'mid', 'midi'].includes(ext)) return 'audio';
    
    return 'generic';
}

function getFileTypeDescription(filename) {
    // 获取文件扩展名
    const ext = filename.toLowerCase().split('.').pop();
    
    // Markdown文件
    if (['md', 'markdown', 'mdown', 'mkd'].includes(ext)) return 'Markdown文档';
    
    // 图片文件
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'heic'].includes(ext)) return '图片文件';
    
    // 文档文件
    if (ext === 'pdf') return 'PDF文档';
    if (['doc', 'docx', 'rtf', 'odt', 'pages'].includes(ext)) return 'Word文档';
    if (['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(ext)) return 'Excel表格';
    if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'PowerPoint演示文稿';
    if (['txt', 'log'].includes(ext)) return '文本文件';
    if (['ini', 'conf', 'cfg'].includes(ext)) return '配置文件';
    
    // 应用程序文件
    if (ext === 'exe') return 'Windows可执行程序';
    if (ext === 'msi') return 'Windows安装程序';
    if (ext === 'apk') return 'Android应用程序';
    if (ext === 'app') return 'macOS应用程序';
    if (ext === 'dmg') return 'macOS安装镜像';
    if (ext === 'deb') return 'Debian/Ubuntu安装包';
    if (ext === 'rpm') return 'RedHat/Fedora安装包';
    if (['appx', 'msix'].includes(ext)) return 'Windows商店应用';
    if (ext === 'ipa') return 'iOS应用程序';
    if (ext === 'pkg') return 'macOS安装包';
    
    // 代码文件
    if (['js', 'ts'].includes(ext)) return 'JavaScript/TypeScript文件';
    if (['jsx', 'tsx'].includes(ext)) return 'React组件';
    if (ext === 'vue') return 'Vue组件';
    if (ext === 'html') return 'HTML文件';
    if (['css', 'scss', 'less', 'sass'].includes(ext)) return '样式表';
    if (ext === 'php') return 'PHP文件';
    if (ext === 'py') return 'Python文件';
    if (ext === 'java') return 'Java文件';
    if (['c', 'cpp'].includes(ext)) return 'C/C++文件';
    if (ext === 'cs') return 'C#文件';
    if (ext === 'go') return 'Go文件';
    if (ext === 'rb') return 'Ruby文件';
    if (ext === 'swift') return 'Swift文件';
    if (ext === 'kt') return 'Kotlin文件';
    if (ext === 'rs') return 'Rust文件';
    if (ext === 'dart') return 'Dart文件';
    if (ext === 'sql') return 'SQL文件';
    if (['sh', 'bash'].includes(ext)) return 'Shell脚本';
    if (['yml', 'yaml'].includes(ext)) return 'YAML配置';
    if (ext === 'xml') return 'XML文件';
    
    // 压缩文件
    if (['zip', 'rar', '7z'].includes(ext)) return '压缩文件';
    if (['tar', 'gz', 'bz2', 'xz', 'tgz'].includes(ext)) return '归档文件';
    
    // 视频文件
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp', 'mpg', 'mpeg', 'ogv'].includes(ext)) return '视频文件';
    
    // 音频文件
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus'].includes(ext)) return '音频文件';
    if (['mid', 'midi'].includes(ext)) return 'MIDI音乐';
    
    return `${ext.toUpperCase()}文件`;
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '未知大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function encodeContent(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

function decodeContent(encoded) {
    return decodeURIComponent(escape(atob(encoded)));
}

// 显示提示函数
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 复制函数
function copyText(encodedText, type) {
    const text = decodeContent(encodedText);
    let copyContent = text;
    
    if (type === 'poetry') {
        copyContent = text.split('\n').join('\r\n');
    } else if (type === 'image') {
        copyContent = text;
    }
    
    navigator.clipboard.writeText(copyContent).then(() => {
        showToast('复制成功！');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = copyContent;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('复制成功！');
        } catch (e) {
            showToast('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textarea);
    });
}

// 显示确认对话框
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        
        dialog.innerHTML = `
            <div class="confirm-dialog-content">
                <div class="confirm-dialog-title">${title}</div>
                <div class="confirm-dialog-message">${message}</div>
                <div class="confirm-dialog-buttons">
                    <button class="btn btn-cancel">取消</button>
                    <button class="btn btn-primary">确定</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const buttons = dialog.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                dialog.remove();
                resolve(button.classList.contains('btn-primary'));
            });
        });
    });
}

// 获取文件图标URL
function getFileIconUrl(filename) {
    // 获取文件扩展名
    const ext = filename.toLowerCase().split('.').pop();
    // 使用在线图标服务
    return `https://cdn.jsdelivr.net/gh/PKief/vscode-material-icon-theme@main/icons/${ext}.svg`;
}

// 下载文件函数
async function downloadFile(url, filename) {
    try {
        showToast('准备下载文件...');
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': '*/*'
            }
        });
        
        if (!response.ok) {
            throw new Error(`下载失败: ${response.status} ${response.statusText}`);
        }

        // 获取响应头中的文件名
        const contentDisposition = response.headers.get('content-disposition');
        const match = contentDisposition?.match(/filename="(.+)"/);
        const actualFilename = match ? decodeURIComponent(match[1]) : filename;

        // 使用 streams API 处理大文件下载
        const reader = response.body.getReader();
        const contentLength = response.headers.get('content-length');
        let receivedLength = 0;
        const chunks = [];

        while(true) {
            const {done, value} = await reader.read();
            
            if (done) {
                break;
            }
            
            chunks.push(value);
            receivedLength += value.length;
            
            // 更新下载进度
            if (contentLength) {
                const progress = ((receivedLength / contentLength) * 100).toFixed(2);
                showToast(`下载进度: ${progress}%`);
            }
        }

        // 合并所有chunks
        const blob = new Blob(chunks);
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = actualFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        showToast('文件下载完成');
    } catch (error) {
        console.error('下载失败:', error);
        showToast('下载失败: ' + error.message, 'error');
    }
}

// 格式化日期
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 渲染内容函数
function renderContents(contents) {
    if (!contentContainer) {
        contentContainer = document.getElementById('content-container');
    }
    
    if (!contents || contents.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty">
                <div class="empty-icon">📝</div>
                <div class="empty-text">还没有任何内容</div>
                <div class="empty-hint">点击"添加新内容"开始创建</div>
            </div>
        `;
        return;
    }

    // 使用DocumentFragment提升性能
    const fragment = document.createDocumentFragment();
    contents.forEach(content => {
        const section = document.createElement('section');
        section.className = 'text-block';
        
        let contentHtml = '';
        let downloadButton = '';
        
        if (content.type === 'image' || content.type === 'file') {
            if (content.type === 'image') {
                contentHtml = `<div class="image"><img src="${content.content}" alt="${content.title}" loading="lazy"></div>`;
            } else {
                const fileIcon = getFileIcon(content.title);
                const fileType = getFileTypeDescription(content.title);
                contentHtml = `
                    <div class="file">
                        <i class="file-icon ${fileIcon}"></i>
                        <div class="file-details">
                            <div class="file-name">${content.title}</div>
                            <div class="file-type">${fileType}</div>
                        </div>
                    </div>`;
            }
            downloadButton = `<button class="btn btn-download" onclick="downloadFile('${content.content}', '${content.title}')">下载</button>`;
        } else if (content.type === 'code') {
            contentHtml = `<pre><code class="language-javascript">${content.content}</code></pre>`;
        } else if (content.type === 'poetry') {
            contentHtml = content.content.split('\n').map(line => `<p>${line}</p>`).join('');
        } else {
            contentHtml = content.content.split('\n').map(line => `<p>${line}</p>`).join('');
        }

        const encodedContent = encodeContent(content.content);
        const modifiedDate = formatDate(content.updatedAt || content.createdAt || Date.now());

        section.innerHTML = `
            <div class="text-block-header">
                <h2>${content.title}</h2>
                <div class="text-block-meta">
                    <span class="modified-date">修改于 ${modifiedDate}</span>
                </div>
            </div>
            <div class="${content.type}">
                ${contentHtml}
            </div>
            <div class="text-block-actions">
                <button class="btn btn-copy" onclick="copyText('${encodedContent}', '${content.type}')">复制</button>
                ${downloadButton}
                <button class="btn btn-edit" onclick="editContent(${content.id})">编辑</button>
                <button class="btn btn-delete" onclick="deleteContent(${content.id})">删除</button>
            </div>
        `;
        
        fragment.appendChild(section);
    });

    // 一次性更新DOM
    contentContainer.innerHTML = '';
    contentContainer.appendChild(fragment);
    
    // 延迟高亮代码
    requestAnimationFrame(() => {
        Prism.highlightAll();
    });
}

// 删除内容函数
window.deleteContent = async function(id) {
    const confirmed = await showConfirmDialog(
        '确认删除',
        '确定要删除这条内容吗？此操作无法撤销。'
    );
    
    if (confirmed) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除失败');
            }
            
            contentCache = contentCache.filter(item => item.id !== id);
            renderContents(contentCache);
            showToast('删除成功！');
        } catch (error) {
            console.error('删除失败:', error);
            showToast(error.message, 'error');
        }
    }
}

// 类型切换函数
window.handleTypeChange = function(type) {
    const contentGroup = document.getElementById('contentGroup');
    const imageGroup = document.getElementById('imageGroup');
    const fileGroup = document.getElementById('fileGroup');
    const editContent = document.getElementById('editContent');
    const editImage = document.getElementById('editImage');
    const editFile = document.getElementById('editFile');
    const titleInput = document.getElementById('editTitle');
    const titleGroup = document.getElementById('titleGroup');
    const fileInfo = document.querySelector('.file-info');

    contentGroup.style.display = 'none';
    imageGroup.style.display = 'none';
    fileGroup.style.display = 'none';
    titleGroup.style.display = 'block';
    editContent.required = false;
    editImage.required = false;
    editFile.required = false;
    titleInput.required = true;

    if (type === 'image') {
        imageGroup.style.display = 'block';
        editImage.required = true;
        titleGroup.style.display = 'none';
        titleInput.required = false;
    } else if (type === 'file') {
        fileGroup.style.display = 'block';
        editFile.required = true;
        
        // 如果没有选择文件，显示默认的文件信息
        if (!editFile.files || !editFile.files[0]) {
            fileInfo.innerHTML = `
                <div class="file-preview">
                    <i class="file-icon generic"></i>
                    <div class="file-details">
                        <div class="file-type">支持所有类型的文件</div>
                    </div>
                </div>
            `;
        }
    } else {
        contentGroup.style.display = 'block';
        editContent.required = true;
    }
}

// 编辑内容函数
window.editContent = function(id) {
    const content = contentCache.find(item => item.id === id);
    if (!content) return;

    const form = document.createElement('form');
    form.className = 'edit-form';
    form.innerHTML = `
        <div class="form-group">
            <label for="edit-title">标题</label>
            <input type="text" id="edit-title" value="${content.title}" required>
        </div>
        <div class="form-group">
            <label for="edit-type">类型</label>
            <select id="edit-type">
                <option value="text" ${content.type === 'text' ? 'selected' : ''}>普通文本</option>
                <option value="code" ${content.type === 'code' ? 'selected' : ''}>代码</option>
                <option value="poetry" ${content.type === 'poetry' ? 'selected' : ''}>诗歌</option>
            </select>
        </div>
        <div class="form-group">
            <label for="edit-content">内容</label>
            <textarea id="edit-content" required>${content.content}</textarea>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-cancel" onclick="cancelEdit()">取消</button>
            <button type="submit" class="btn btn-save">保存</button>
        </div>
    `;

    currentEditId = content.id;
    document.getElementById('editType').value = content.type;
    document.getElementById('editTitle').value = content.title;
    document.getElementById('editContent').value = content.content;
    
    // 如果是图片类型，显示预览
    if (content.type === 'image') {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${content.content}" alt="预览">`;
    }
    
    handleTypeChange(content.type);
    document.getElementById('editModal').style.display = 'block';
}

// DOM元素
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化前先获取同步间隔
    await getSyncInterval();
    
    contentContainer = document.getElementById('content-container');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const addNewBtn = document.getElementById('addNewBtn');
    const editImage = document.getElementById('editImage');

    // 初始化
    await loadContents(true);
    setupEventListeners();
    startUpdateCheck();

    // 设置事件监听器
    function setupEventListeners() {
        if (addNewBtn) {
            addNewBtn.addEventListener('click', () => openModal());
        }
        editForm.addEventListener('submit', handleFormSubmit);
        editImage.addEventListener('change', handleImagePreview);
        
        // 添加全局粘贴事件监听
        document.addEventListener('paste', handlePaste);
    }

    // 处理粘贴事件
    async function handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;
        
        for (const item of items) {
            console.log('粘贴类型:', item.type);
            
            // 处理图片
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    // 创建一个新的 FileList 对象
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    
                    // 重置表单
                    currentEditId = null;
                    const editType = document.getElementById('editType');
                    const editTitle = document.getElementById('editTitle');
                    const editImage = document.getElementById('editImage');
                    const imagePreview = document.getElementById('imagePreview');
                    
                    editType.value = 'image';
                    editTitle.value = `粘贴的图片_${new Date().getTime()}.png`;
                    editImage.files = dataTransfer.files;
                    
                    // 预览图片
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        imagePreview.innerHTML = `<img src="${e.target.result}" alt="预览">`;
                    };
                    reader.readAsDataURL(file);
                    
                    handleTypeChange('image');
                    document.getElementById('editModal').style.display = 'block';
                    return;
                }
            }
            
            // 处理文件
            else if (item.kind === 'file' && !item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    // 创建一个新的 FileList 对象
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    
                    // 重置表单
                    currentEditId = null;
                    const editType = document.getElementById('editType');
                    const editTitle = document.getElementById('editTitle');
                    const editFile = document.getElementById('editFile');
                    
                    editType.value = 'file';
                    editTitle.value = file.name;
                    editFile.files = dataTransfer.files;
                    
                    handleTypeChange('file');
                    
                    // 使用统一的文件信息显示函数
                    updateFileInfo(file);
                    
                    document.getElementById('editModal').style.display = 'block';
                    return;
                }
            }
            
            // 处理文本
            else if (item.type === 'text/plain') {
                item.getAsString(async (text) => {
                    // 检测是否为代码
                    const isCode = detectCodeContent(text);
                    
                    currentEditId = null;
                    document.getElementById('editType').value = isCode ? 'code' : 'text';
                    document.getElementById('editTitle').value = '';
                    document.getElementById('editContent').value = text;
                    
                    handleTypeChange(isCode ? 'code' : 'text');
                    document.getElementById('editModal').style.display = 'block';
                });
                return;
            }
        }
    }

    // 检文本是否为代码
    function detectCodeContent(text) {
        // 代码特征检测规则
        const codePatterns = [
            /^(const|let|var|function|class|import|export|if|for|while)\s/m,  // 常见的代码关键字
            /{[\s\S]*}/m,  // 包含花括号的代码块
            /\(\s*\)\s*=>/m,  // 箭头函数
            /\b(function|class)\s+\w+\s*\(/m,  // 函数或类声明
            /\b(if|for|while)\s*\([^)]*\)/m,  // 控制结构
            /\b(return|break|continue)\s/m,  // 控制流关键字
            /[{};]\s*$/m,  // 行尾的分号或花括号
            /^\s*(public|private|protected)\s/m,  // 访问修饰符
            /\b(try|catch|finally)\s*{/m,  // 异常处理
            /\b(async|await|Promise)\b/m,  // 异步编程关键字
            /\b(import|export)\s+.*\bfrom\s+['"][^'"]+['"]/m,  // ES6 模块语法
            /\b(const|let|var)\s+\w+\s*=\s*require\s*\(/m,  // CommonJS 模块语法
        ];

        // 如果文本匹配任何一个代码模式，就认为是代码
        return codePatterns.some(pattern => pattern.test(text));
    }

    // 处理图片预览和标题
    function handleImagePreview(event) {
        const file = event.target.files[0];
        if (file) {
            // 立即设置标题
            const titleInput = document.getElementById('editTitle');
            titleInput.value = file.name;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="预览">`;
            };
            reader.readAsDataURL(file);
        }
    }

    // 处理文件选择和标题
    window.handleFileSelect = function(event) {
        const file = event.target.files[0];
        if (file) {
            // 立即设置标题
            const titleInput = document.getElementById('editTitle');
            titleInput.value = file.name;
            
            // 使用统一的文件信息显示函数
            updateFileInfo(file);
        }
    }

    // 统一的文件信息更新函数
    function updateFileInfo(file) {
        const fileInfo = document.querySelector('.file-info');
        const fileIcon = getFileIcon(file.name);
        fileInfo.innerHTML = `
            <div class="file-preview">
                <i class="file-icon ${fileIcon}"></i>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-type">${getFileTypeDescription(file.name)}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
    }

    // 开始更新检查
    function startUpdateCheck() {
        updateCheckInterval = setInterval(() => loadContents(false), syncInterval);
    }

    // 加载有内容
    async function loadContents(showLoading = true) {
        if (!contentContainer) {
            contentContainer = document.getElementById('content-container');
        }

        try {
            const response = await fetch(API_BASE_URL, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.details || data.error || '加载失败');
            }
            
            const data = await response.json();
            
            // 只有当数据发生变化时才重新渲染
            if (JSON.stringify(contentCache) !== JSON.stringify(data)) {
                contentCache = data || [];
                renderContents(contentCache);
            }
            
            lastUpdateTime = Date.now();
        } catch (error) {
            console.error('加载内容失败:', error);
            if (showLoading) {
                showError(`加载内容失败: ${error.message}`);
            }
        }
    }

    // 显示错误信息
    function showError(message) {
        contentContainer.innerHTML = `
            <div class="error">
                ${message}
                <button class="btn" onclick="location.reload()">重试</button>
            </div>
        `;
    }

    // 打开模态框
    window.openModal = function() {
        currentEditId = null;
        const editForm = document.getElementById('editForm');
        const editType = document.getElementById('editType');
        const editTitle = document.getElementById('editTitle');
        const editContent = document.getElementById('editContent');
        const imagePreview = document.getElementById('imagePreview');
        const editImage = document.getElementById('editImage');
        const editFile = document.getElementById('editFile');
        const fileInfo = document.querySelector('.file-info');

        // 重置所有表单元素
        editForm.reset();
        editType.value = 'text';
        editTitle.value = '';
        editContent.value = '';
        
        // 清除图片预览
        imagePreview.innerHTML = '';
        
        // 重置文件信息为默认状态
        if (fileInfo) {
            fileInfo.innerHTML = `
                <div class="file-preview">
                    <i class="file-icon generic"></i>
                    <div class="file-details">
                        <div class="file-type">支持所有类型的文件</div>
                    </div>
                </div>
            `;
        }
        
        // 清除文件输入框的值
        if (editImage) {
            editImage.value = '';
        }
        if (editFile) {
            editFile.value = '';
        }

        handleTypeChange('text');
        document.getElementById('editModal').style.display = 'block';
    }

    // 关闭模态框
    window.closeModal = function() {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('editForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        currentEditId = null;
    }

    // 处理表单提交
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        const submitButton = event.submitter;
        submitButton.disabled = true;
        const originalText = submitButton.textContent;
        submitButton.innerHTML = '保存中... <span class="loading-spinner"></span>';
        
        try {
            const type = document.getElementById('editType').value;
            const title = document.getElementById('editTitle').value;
            let content = '';
            
            if (type === 'image') {
                const imageFile = document.getElementById('editImage').files[0];
                const existingContent = document.getElementById('editContent').value;
                
                if (!imageFile && existingContent) {
                    content = existingContent;
                } else if (imageFile) {
                    // 确保设置标题
                    if (!title) {
                        document.getElementById('editTitle').value = imageFile.name;
                    }
                    
                    const formData = new FormData();
                    formData.append('image', imageFile);
                    
                    const uploadResponse = await fetch(IMAGES_API_URL, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!uploadResponse.ok) {
                        const errorData = await uploadResponse.json();
                        throw new Error(errorData.error || '图片上传失败');
                    }
                    
                    const { url } = await uploadResponse.json();
                    content = url;
                } else {
                    throw new Error('请选择图片文件');
                }
            } else if (type === 'file') {
                const file = document.getElementById('editFile').files[0];
                const existingContent = document.getElementById('editContent').value;
                
                if (!file && existingContent) {
                    content = existingContent;
                } else if (file) {
                    // 确保设置标题
                    if (!title) {
                        document.getElementById('editTitle').value = file.name;
                    }
                    
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    console.log('开始上传文件:', file.name);
                    const uploadResponse = await fetch(FILES_UPLOAD_URL, {
                        method: 'POST',
                        body: formData
                    });

                    console.log('上传响应状态:', uploadResponse.status);
                    const responseText = await uploadResponse.text();
                    console.log('上传响应内容:', responseText);

                    let responseData;
                    try {
                        responseData = JSON.parse(responseText);
                    } catch (e) {
                        console.error('解析响应失败:', e);
                        throw new Error('服务器响应格式错误');
                    }
                    
                    if (!uploadResponse.ok) {
                        throw new Error(responseData.error || '文件上传失败');
                    }
                    
                    if (!responseData.url) {
                        console.error('响应数据:', responseData);
                        throw new Error('上传成功但未返回文件URL');
                    }

                    content = responseData.url;
                    console.log('文件上传成功:', content);
                } else {
                    throw new Error('请选择文件');
                }
            } else {
                content = document.getElementById('editContent').value;
            }

            // 重新获取标题，因为可能在上传过程中被设置
            const finalTitle = document.getElementById('editTitle').value;
            
            if (!type || !finalTitle || !content) {
                throw new Error('请填写所有必要字段');
            }
            
            const formData = { type, title: finalTitle, content };
            
            if (currentEditId) {
                await updateContent(currentEditId, formData);
            } else {
                await createContent(formData);
            }
            
            closeModal();
            await loadContents(false);
            showToast('保存成功！');
        } catch (error) {
            console.error('保存失败:', error);
            showToast(error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    // 创建新内容
    async function createContent(data) {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '创建内容失败');
        }
        
        return await response.json();
    }

    // 更新内容
    async function updateContent(id, data) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '更新内容败');
        }
        
        return await response.json();
    }
}); 