import TelegramStorage from '../../js/telegram.js';

export async function onRequest(context) {
    try {
        const formData = await context.request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ error: '没有找到文件' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 获取存储类型
        const storageType = context.env.STORAGE_TYPE || 'KV';

        let url;
        if (storageType === 'TELEGRAM') {
            // 使用Telegram存储
            const telegram = new TelegramStorage(
                context.env.TELEGRAM_BOT_TOKEN,
                context.env.TELEGRAM_CHAT_ID
            );

            try {
                console.log(`Starting file upload to Telegram: ${file.name}`);
                const arrayBuffer = await file.arrayBuffer();
                console.log('File converted to array buffer, size:', arrayBuffer.byteLength);
                
                const result = await telegram.sendFile(arrayBuffer, file.name, context.request.url);
                console.log('Telegram upload result:', JSON.stringify(result, null, 2));
                
                // 确保获取到了文件URL
                if (!result || !result.file_url) {
                    console.error('Missing file_url in result:', result);
                    throw new Error('未能获取到文件URL');
                }

                return new Response(JSON.stringify({ 
                    url: result.file_url,
                    filename: file.name,
                    size: file.size,
                    type: file.type,
                    telegram_type: result.type,
                    file_id: result.file_id
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            } catch (error) {
                console.error('Telegram upload error:', error);
                console.error('Error details:', error.stack);
                throw new Error(`文件上传失败: ${error.message}`);
            }
        } else {
            // 使用KV存储
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const originalName = file.name;
            const extension = originalName.split('.').pop();
            const filename = `${timestamp}-${randomString}.${extension}`;

            const arrayBuffer = await file.arrayBuffer();
            await context.env.FILES.put(filename, arrayBuffer, {
                metadata: {
                    contentType: file.type,
                    filename: originalName,
                    size: arrayBuffer.byteLength,
                    httpMetadata: {
                        contentType: file.type,
                        contentDisposition: `attachment; filename="${originalName}"`
                    }
                }
            });

            url = `${new URL(context.request.url).origin}/files/${filename}`;
        }

        return new Response(JSON.stringify({ 
            url,
            filename: file.name,
            size: file.size,
            type: file.type
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
} 