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
        // 根据文件扩展名设置正确的 MIME 类型
        if (filePath.match(/\.(jpg|jpeg)$/i)) {
            contentType = 'image/jpeg';
        } else if (filePath.match(/\.png$/i)) {
            contentType = 'image/png';
        } else if (filePath.match(/\.gif$/i)) {
            contentType = 'image/gif';
        } else if (filePath.match(/\.webp$/i)) {
            contentType = 'image/webp';
        } else if (filePath.match(/\.mp4$/i)) {
            contentType = 'video/mp4';
        } else if (filePath.match(/\.webm$/i)) {
            contentType = 'video/webm';
        } else if (filePath.match(/\.avi$/i)) {
            contentType = 'video/x-msvideo';
        } else if (filePath.match(/\.mov$/i)) {
            contentType = 'video/quicktime';
        }

        // 读取文件内容
        const arrayBuffer = await response.arrayBuffer();

        // 获取文件大小
        const size = arrayBuffer.byteLength;
        
        // 检查是否是范围请求
        const rangeHeader = request.headers.get('Range');
        if (rangeHeader) {
            const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (matches) {
                const start = parseInt(matches[1], 10);
                const end = matches[2] ? parseInt(matches[2], 10) : size - 1;
                const chunk = arrayBuffer.slice(start, end + 1);
                
                return new Response(chunk, {
                    status: 206,
                    headers: {
                        'Content-Type': contentType || 'application/octet-stream',
                        'Content-Range': `bytes ${start}-${end}/${size}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunk.byteLength.toString(),
                        'Content-Disposition': 'inline',
                        'Cache-Control': 'public, max-age=31536000',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        }

        // 返回完整文件
        return new Response(arrayBuffer, {
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
                'Content-Length': size.toString(),
                'Accept-Ranges': 'bytes',
                'Content-Disposition': 'inline',
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*',
                'X-Content-Type-Options': 'nosniff'
            }
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response('Error fetching file: ' + error.message, { 
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