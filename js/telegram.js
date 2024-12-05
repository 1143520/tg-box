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

    async sendFile(arrayBuffer, filename, requestUrl = '') {
        const formData = new FormData();
        const blob = new Blob([arrayBuffer]);
        formData.append('chat_id', this.chatId);

        // 判断是否为图片文件
        const isImage = this.isImageFile(filename);
        if (isImage) {
            formData.append('photo', blob, filename);
            const response = await fetch(`${this.apiBase}/sendPhoto`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!result.ok) {
                throw new Error('Failed to send photo to Telegram: ' + result.description);
            }

            // 获取最大尺寸的图片
            const photo = result.result.photo;
            const largestPhoto = photo[photo.length - 1];
            
            // 获取图片的直接链接
            const fileInfo = await this.getFileUrl(largestPhoto.file_id, requestUrl);
            return {
                ...result.result,
                file_url: fileInfo.url
            };
        } else {
            // 非图片文件使用 sendDocument
            formData.append('document', blob, filename);
            const response = await fetch(`${this.apiBase}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!result.ok) {
                throw new Error('Failed to send file to Telegram: ' + result.description);
            }

            console.log('Telegram response:', JSON.stringify(result, null, 2));

            // 从响应中获取文件ID
            let fileId;
            if (result.result.document) {
                fileId = result.result.document.file_id;
            } else if (result.result.file_id) {
                fileId = result.result.file_id;
            } else {
                console.error('Unexpected Telegram response:', result);
                throw new Error('Unexpected response format from Telegram');
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