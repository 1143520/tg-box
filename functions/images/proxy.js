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

        // 获取文件
        const response = await fetch(telegramUrl);
        
        // 确定内容类型
        let contentType = response.headers.get('content-type');
        // 如果是图片文件，确保使用正确的 MIME 类型
        if (filePath.match(/\.(jpg|jpeg)$/i)) {
            contentType = 'image/jpeg';
        } else if (filePath.match(/\.png$/i)) {
            contentType = 'image/png';
        } else if (filePath.match(/\.gif$/i)) {
            contentType = 'image/gif';
        } else if (filePath.match(/\.webp$/i)) {
            contentType = 'image/webp';
        }

        // 读取文件内容
        const arrayBuffer = await response.arrayBuffer();

        // 返回文件，设置正确的 Content-Type 和其他头部
        return new Response(arrayBuffer, {
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
                'Content-Disposition': 'inline',  // 这里使用 inline 而不是 attachment
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*',
                'X-Content-Type-Options': 'nosniff'  // 防止浏览器猜测内容类型
            }
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response('Error fetching image', { 
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}