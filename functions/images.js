import TelegramStorage from '../js/telegram.js';

export async function onRequestPost({ request, env }) {
    try {
        const formData = await request.formData();
        const file = formData.get('image');
        
        if (!file) {
            throw new Error('No file provided');
        }

        // 获取存储类型
        const storageType = env.STORAGE_TYPE || 'KV';

        let url;
        if (storageType === 'TELEGRAM') {
            // 使用Telegram存储
            const telegram = new TelegramStorage(
                env.TELEGRAM_BOT_TOKEN,
                env.TELEGRAM_CHAT_ID
            );

            try {
                console.log(`Starting file upload to Telegram: ${file.name}`);
                const arrayBuffer = await file.arrayBuffer();
                console.log('File converted to array buffer, size:', arrayBuffer.byteLength);
                
                const result = await telegram.sendFile(arrayBuffer, file.name, request.url);
                console.log('Telegram upload result:', JSON.stringify(result, null, 2));
                
                // 确保获取到了文件URL
                if (!result || !result.file_url) {
                    console.error('Missing file_url in result:', result);
                    throw new Error('未能获取到文件URL');
                }

                // 返回统一的响应格式
                return new Response(
                    JSON.stringify({
                        url: result.file_url,
                        filename: file.name,
                        size: file.size,
                        type: file.type,
                        telegram_type: result.type,  // 添加 Telegram 文件类型信息
                        file_id: result.file_id      // 添加 Telegram 文件ID
                    }), {
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    }
                );
            } catch (error) {
                console.error('Telegram upload error:', error);
                console.error('Error details:', error.stack);
                throw new Error(`文件上传失败: ${error.message}`);
            }
        } else {
            // 使用KV存储
            if (!env.IMAGES) {
                throw new Error('IMAGES binding not found');
            }

            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const extension = file.name.split('.').pop().toLowerCase();
            const filename = `${timestamp}-${randomString}.${extension}`;

            const arrayBuffer = await file.arrayBuffer();
            await env.IMAGES.put(filename, arrayBuffer, {
                metadata: {
                    contentType: file.type,
                    filename: file.name,
                    size: arrayBuffer.byteLength
                }
            });

            const baseUrl = new URL(request.url).origin;
            url = `${baseUrl}/images/${filename}`;
        }

        // 确保有URL才返回成功响应
        if (!url) {
            throw new Error('未能获取到文件URL');
        }

        return new Response(
            JSON.stringify({
                url: url,
                filename: file.name,
                size: file.size,
                type: file.type
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({
                error: error.message
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    }
}

export async function onRequestGet({ request, env }) {
    try {
        if (!env.IMAGES) {
            throw new Error('IMAGES binding not found');
        }

        const url = new URL(request.url);
        const filename = url.pathname.split('/').pop();
        
        // 从KV存储获取图片
        const metadata = await env.IMAGES.getWithMetadata(filename);
        if (!metadata.value) {
            return new Response('Image not found', { status: 404 });
        }

        // 返回图片
        return new Response(metadata.value, {
            headers: {
                'Content-Type': metadata.metadata?.contentType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Get image error:', error);
        return new Response('Error fetching image', { status: 500 });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
} 