export default class TelegramStorage {
    constructor(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.apiBase = 'https://api.telegram.org/bot' + botToken;
        this.fileApiBase = 'https://api.telegram.org/file/bot' + botToken;
    }

    isImageFile(filename) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return imageExtensions.includes(ext);
    }

    isVideoFile(filename) {
        const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return videoExtensions.includes(ext);
    }

    async sendFile(arrayBuffer, filename, requestUrl = '') {
        const formData = new FormData();
        const blob = new Blob([arrayBuffer]);
        formData.append('chat_id', this.chatId);

        // 判断文件类型
        const isImage = this.isImageFile(filename);
        const isVideo = this.isVideoFile(filename);

        let apiMethod, fileParam;
        if (isImage) {
            apiMethod = 'sendPhoto';
            fileParam = 'photo';
        } else if (isVideo) {
            apiMethod = 'sendVideo';
            fileParam = 'video';
        } else {
            apiMethod = 'sendDocument';
            fileParam = 'document';
        }

        // 添加文件到表单
        formData.append(fileParam, blob, filename);

        // 发送请求
        const response = await fetch(`${this.apiBase}/${apiMethod}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!result.ok) {
            throw new Error(`Failed to send file to Telegram: ${result.description}`);
        }

        console.log('Telegram response:', JSON.stringify(result, null, 2));

        // 从响应中获取文件ID
        let fileId;
        if (isImage) {
            // 图片文件
            const photo = result.result.photo;
            fileId = photo[photo.length - 1].file_id;
        } else if (isVideo) {
            // 视频文件
            fileId = result.result.video?.file_id;
        } else {
            // 其他文件
            fileId = result.result.document?.file_id;
        }

        if (!fileId) {
            console.error('No file_id in response:', result);
            throw new Error('Failed to get file ID from Telegram');
        }

        // 获取文件的直接链接
        const fileInfo = await this.getFileUrl(fileId, requestUrl);
        if (!fileInfo || !fileInfo.url) {
            throw new Error('Failed to get file URL from Telegram');
        }

        return {
            ...result.result,
            file_url: fileInfo.url
        };
    }

    async sendMessage(text) {
        const response = await fetch(`${this.apiBase}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: this.chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });

        const result = await response.json();
        if (!result.ok) {
            throw new Error('Failed to send message to Telegram: ' + result.description);
        }

        // 返回消息ID和原始文本
        return {
            message_id: result.result.message_id,
            text: text,  // 返回原始文本内容
            url: `https://t.me/c/${this.chatId}/${result.result.message_id}`
        };
    }

    async getFileUrl(fileId, requestUrl = '') {
        // 获取文件信息
        const response = await fetch(`${this.apiBase}/getFile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: fileId
            })
        });

        const result = await response.json();
        if (!result.ok) {
            throw new Error('Failed to get file info from Telegram: ' + result.description);
        }

        // 从请求URL或环境中获取 origin
        let baseUrl;
        try {
            baseUrl = requestUrl ? new URL(requestUrl).origin : '';
        } catch (error) {
            baseUrl = '';  // 如果无法解析，使用空字符串
        }

        return {
            ...result.result,
            url: `${baseUrl}/images/proxy?path=${result.result.file_path}`
        };
    }
} 