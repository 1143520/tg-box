export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const filePath = url.searchParams.get('path');
        const fileId = url.searchParams.get('file_id');
        
        if (!filePath && !fileId) {
            return new Response('Missing file path or file_id', { 
                status: 400,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        let telegramUrl;
        
        if (fileId) {
            // 如果有file_id，先获取最新的file_path
            const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile`, {
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

            telegramUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${result.result.file_path}`;
        } else {
            // 向后兼容，支持直接使用file_path
            telegramUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
        }

        // 尝试从缓存获取
        const cache = caches.default;
        const cacheKey = new Request(fileId ? `${request.url.split('?')[0]}?file_id=${fileId}` : request.url);
        let response = await cache.match(cacheKey);

        if (!response) {
            // 如果缓存中没有，从Telegram获取
            response = await fetch(telegramUrl);
            
            // 确定内容类型
            let contentType = response.headers.get('content-type');
            // 根据文件扩展名设置正确的MIME类型
            if (telegramUrl.match(/\.(jpg|jpeg)$/i)) {
                contentType = 'image/jpeg';
            } else if (telegramUrl.match(/\.png$/i)) {
                contentType = 'image/png';
            } else if (telegramUrl.match(/\.gif$/i)) {
                contentType = 'image/gif';
            } else if (telegramUrl.match(/\.webp$/i)) {
                contentType = 'image/webp';
            }

            // 创建新的响应以添加自定义头部
            response = new Response(response.body, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Max-Age': '86400',
                }
            });

            // 将响应存入缓存
            await cache.put(cacheKey, response.clone());
        }

        return response;
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response('Error fetching image: ' + error.message, { 
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}