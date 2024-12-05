import TelegramStorage from '../js/telegram.js';

export async function onRequestPost({ request, env }) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        
        if (!imageFile) {
            throw new Error('No image file provided');
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

            const arrayBuffer = await imageFile.arrayBuffer();
            const result = await telegram.sendFile(arrayBuffer, imageFile.name, request.url);
            
            // 确保获取到了文件URL
            if (!result.file_url) {
                throw new Error('未能获取到文件URL');
            }
            url = result.file_url;
        } else {
            // 使用KV存储
            if (!env.IMAGES) {
                throw new Error('IMAGES binding not found');
            }

            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const extension = imageFile.name.split('.').pop().toLowerCase();
            const filename = `${timestamp}-${randomString}.${extension}`;

            const arrayBuffer = await imageFile.arrayBuffer();
            await env.IMAGES.put(filename, arrayBuffer, {
                metadata: {
                    contentType: imageFile.type,
                    filename: imageFile.name,
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
                filename: imageFile.name,
                size: imageFile.size,
                type: imageFile.type
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