class TelegramStorage {
    constructor(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
        this.apiBase = `https://api.telegram.org/bot${botToken}`;
    }

    async sendMessage(text) {
        try {
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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Telegram API error: ${errorData.description || response.status}`);
            }

            const data = await response.json();
            return {
                messageId: data.result.message_id,
                url: `https://t.me/${this.chatId}/${data.result.message_id}`
            };
        } catch (error) {
            console.error('Error sending message to Telegram:', error);
            throw error;
        }
    }

    async sendFile(file, filename) {
        try {
            const formData = new FormData();
            formData.append('chat_id', this.chatId);
            
            // 根据文件类型决定使用哪个API方法
            const fileType = this.getFileType(filename);
            let method = 'sendDocument';
            let fileKey = 'document';
            
            if (fileType === 'image') {
                method = 'sendPhoto';
                fileKey = 'photo';
            } else if (fileType === 'video') {
                method = 'sendVideo';
                fileKey = 'video';
            }

            formData.append('caption', filename);
            formData.append(fileKey, new Blob([file]), filename);

            const response = await fetch(`${this.apiBase}/${method}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Telegram API error: ${errorData.description || response.status}`);
            }

            const data = await response.json();
            
            // 获取消息ID
            const messageId = data.result.message_id;
            
            return {
                messageId: messageId,
                url: `https://t.me/${this.chatId}/${messageId}`
            };
        } catch (error) {
            console.error('Error sending file to Telegram:', error);
            throw error;
        }
    }

    getFileType(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
        
        if (imageExts.includes(ext)) return 'image';
        if (videoExts.includes(ext)) return 'video';
        return 'document';
    }
}

export default TelegramStorage; 