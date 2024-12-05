export default class TelegramStorage {
    constructor(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.apiBase = 'https://api.telegram.org/bot' + botToken;
        this.fileApiBase = 'https://api.telegram.org/file/bot' + botToken;
    }

    async sendFile(arrayBuffer, filename) {
        const formData = new FormData();
        const blob = new Blob([arrayBuffer]);
        formData.append('chat_id', this.chatId);
        formData.append('document', blob, filename);

        const response = await fetch(`${this.apiBase}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!result.ok) {
            throw new Error('Failed to send file to Telegram: ' + result.description);
        }

        // 获取文件ID
        const fileId = result.result.document?.file_id;
        if (fileId) {
            // 获取文件的直接下载链接
            const fileInfo = await this.getFileUrl(fileId);
            return {
                ...result.result,
                file_url: fileInfo.url
            };
        }

        return result.result;
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

        return result.result;
    }

    async getFileUrl(fileId) {
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

        // 返回文件的直接下载链接
        return {
            ...result.result,
            url: `${this.fileApiBase}/${result.result.file_path}`
        };
    }
} 