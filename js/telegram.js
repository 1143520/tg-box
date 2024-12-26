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

        console.log(`Sending file as ${apiMethod} with param ${fileParam}`);

        // 添加文件到表单
        formData.append(fileParam, blob, filename);

        // 发送请求
        const response = await fetch(`${this.apiBase}/${apiMethod}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log('Raw Telegram response:', JSON.stringify(result, null, 2));

        if (!result.ok) {
            throw new Error(`Failed to send file to Telegram: ${result.description}`);
        }

        // 获取文件ID
        let fileId;
        if (isImage) {
            const photo = result.result.photo;
            fileId = photo[photo.length - 1].file_id;
        } else if (isVideo) {
            fileId = result.result.video?.file_id;
        } else {
            fileId = result.result.document?.file_id;
        }

        if (!fileId) {
            throw new Error('No file_id in response');
        }

        // 获取文件的直接链接
        console.log('Getting file URL for file_id:', fileId);
        const fileInfo = await this.getFileUrl(fileId, requestUrl);
        console.log('File info from Telegram:', fileInfo);

        return {
            message_id: result.result.message_id,
            file_id: fileId,
            file_url: fileInfo.url,
            type: isImage ? 'photo' : (isVideo ? 'video' : 'document')
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
        // 从请求URL获取 origin
        let baseUrl;
        try {
            baseUrl = requestUrl ? new URL(requestUrl).origin : '';
        } catch (error) {
            baseUrl = '';  // 如果无法解析，使用空字符串
        }

        // 返回基于file_id的URL
        return {
            file_id: fileId,
            url: `${baseUrl}/images/proxy?file_id=${fileId}`
        };
    }
} 