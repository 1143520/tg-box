export async function onRequestGet({ request, env }) {
    try {
        const url = new URL(request.url);
        const filePath = url.searchParams.get('path');
        
        if (!filePath) {
            return new Response('Missing file path', { 
                status: 400,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 构造 Telegram 文件 URL
        const telegramUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;

        // 尝试从缓存获取
        const cache = caches.default;
        const cacheKey = new Request(request.url);
        let response = await cache.match(cacheKey);

        if (!response) {
            // 如果缓存中没有，从 Telegram 获取
            response = await fetch(telegramUrl);
            
            // 确定内容类型
            let contentType = response.headers.get('content-type');
            // 根据文件扩展名设置正确的 MIME 类型
            if (filePath.match(/\.(jpg|jpeg)$/i)) {
                contentType = 'image/jpeg';
            } else if (filePath.match(/\.png$/i)) {
                contentType = 'image/png';
            } else if (filePath.match(/\.gif$/i)) {
                contentType = 'image/gif';
            } else if (filePath.match(/\.webp$/i)) {
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